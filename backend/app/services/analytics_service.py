from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Account, Category, Transaction, User


def _month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


def _prev_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def _sum_kind(
    db: Session, user: User, kind: str, year: int, month: int
) -> Decimal:
    start, end = _month_bounds(year, month)
    stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == user.id,
        Transaction.kind == kind,
        Transaction.occurred_at >= start,
        Transaction.occurred_at < end,
    )
    return Decimal(db.execute(stmt).scalar_one()).quantize(Decimal("0.01"))


def _pct_change(current: Decimal, previous: Decimal) -> Decimal | None:
    if previous == 0:
        return None
    return ((current - previous) / previous * Decimal("100")).quantize(
        Decimal("0.01")
    )


def month_comparison(
    db: Session, user: User, year: int, month: int
) -> dict:
    py, pm = _prev_month(year, month)

    cur_income = _sum_kind(db, user, "income", year, month)
    cur_expense = _sum_kind(db, user, "expense", year, month)
    prev_income = _sum_kind(db, user, "income", py, pm)
    prev_expense = _sum_kind(db, user, "expense", py, pm)

    return {
        "current_year": year,
        "current_month": month,
        "current_income": cur_income,
        "current_expense": cur_expense,
        "previous_year": py,
        "previous_month": pm,
        "previous_income": prev_income,
        "previous_expense": prev_expense,
        "income_change_pct": _pct_change(cur_income, prev_income),
        "expense_change_pct": _pct_change(cur_expense, prev_expense),
    }


def _recent_months(year: int, month: int, count: int) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    y, m = year, month
    for _ in range(count):
        out.append((y, m))
        y, m = _prev_month(y, m)
    return list(reversed(out))


def category_trend(
    db: Session, user: User, category_id: int, year: int, month: int, months: int
) -> dict | None:
    cat = db.execute(
        select(Category).where(
            Category.id == category_id, Category.user_id == user.id
        )
    ).scalar_one_or_none()
    if cat is None:
        return None

    points: list[dict] = []
    running_total = Decimal("0.00")

    for y, m in _recent_months(year, month, months):
        start, end = _month_bounds(y, m)
        stmt = select(
            func.coalesce(func.sum(Transaction.amount), 0),
            func.count(Transaction.id),
        ).where(
            Transaction.user_id == user.id,
            Transaction.category_id == category_id,
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        row = db.execute(stmt).one()
        total = Decimal(row[0]).quantize(Decimal("0.01"))
        count = int(row[1])
        running_total += total
        points.append(
            {"year": y, "month": m, "total": total, "transaction_count": count}
        )

    return {
        "category_id": cat.id,
        "category_name": cat.name,
        "kind": cat.kind,
        "points": points,
        "total": running_total,
    }


def top_accounts(
    db: Session, user: User, year: int, month: int, months: int = 3
) -> list[dict]:
    """Rank user's accounts by expense total over the last N months."""
    oldest_y, oldest_m = _recent_months(year, month, months)[0]
    start, _ = _month_bounds(oldest_y, oldest_m)
    _, end = _month_bounds(year, month)

    stmt = (
        select(
            Account.id,
            Account.name,
            func.coalesce(func.sum(Transaction.amount).filter(
                Transaction.kind == "expense"
            ), 0).label("expense"),
            func.coalesce(func.sum(Transaction.amount).filter(
                Transaction.kind == "income"
            ), 0).label("income"),
            func.count(Transaction.id).label("cnt"),
        )
        .select_from(Account)
        .outerjoin(Transaction, Transaction.account_id == Account.id)
        .where(
            Account.user_id == user.id,
            (Transaction.occurred_at >= start) | (Transaction.id.is_(None)),
            (Transaction.occurred_at < end) | (Transaction.id.is_(None)),
        )
        .group_by(Account.id, Account.name)
        .order_by(func.coalesce(
            func.sum(Transaction.amount).filter(Transaction.kind == "expense"), 0
        ).desc())
    )

    rows = db.execute(stmt).all()
    out: list[dict] = []
    for row in rows:
        out.append(
            {
                "account_id": int(row.id),
                "account_name": row.name,
                "total_expense": Decimal(row.expense).quantize(Decimal("0.01")),
                "total_income": Decimal(row.income).quantize(Decimal("0.01")),
                "transaction_count": int(row.cnt),
            }
        )
    return out


_WEEKDAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
]


def weekday_heatmap(
    db: Session, user: User, year: int, month: int, months: int = 3
) -> list[dict]:
    """Aggregate expense/income by weekday over the last N months.

    Note: we compute this in Python to keep it portable across
    PostgreSQL and SQLite (tests).
    """
    oldest_y, oldest_m = _recent_months(year, month, months)[0]
    start, _ = _month_bounds(oldest_y, oldest_m)
    _, end = _month_bounds(year, month)

    stmt = select(
        Transaction.occurred_at, Transaction.kind, Transaction.amount
    ).where(
        Transaction.user_id == user.id,
        Transaction.occurred_at >= start,
        Transaction.occurred_at < end,
    )
    rows = db.execute(stmt).all()

    # weekday -> {expense, income, count}
    bucket: list[dict] = [
        {"expense": Decimal("0"), "income": Decimal("0"), "count": 0}
        for _ in range(7)
    ]
    for occurred_at, kind, amount in rows:
        wd = occurred_at.weekday()  # Monday = 0
        if kind == "expense":
            bucket[wd]["expense"] += Decimal(amount)
        else:
            bucket[wd]["income"] += Decimal(amount)
        bucket[wd]["count"] += 1

    out: list[dict] = []
    for i in range(7):
        out.append(
            {
                "weekday": i,
                "weekday_name": _WEEKDAY_NAMES[i],
                "total_expense": bucket[i]["expense"].quantize(Decimal("0.01")),
                "total_income": bucket[i]["income"].quantize(Decimal("0.01")),
                "transaction_count": bucket[i]["count"],
            }
        )
    return out