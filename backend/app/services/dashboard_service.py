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


def _prev_months(year: int, month: int, count: int) -> list[tuple[int, int]]:
    """Return list of (year, month) for the last `count` months, oldest first."""
    out: list[tuple[int, int]] = []
    y, m = year, month
    for _ in range(count):
        out.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(out))


def get_summary(
    db: Session, user: User, year: int, month: int
) -> dict:
    # Total balance across active accounts
    bal_stmt = select(func.coalesce(func.sum(Account.balance), 0)).where(
        Account.user_id == user.id,
        Account.is_active.is_(True),
    )
    total_balance = Decimal(db.execute(bal_stmt).scalar_one()).quantize(
        Decimal("0.01")
    )

    start, end = _month_bounds(year, month)

    def _sum_kind(kind: str) -> Decimal:
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user.id,
            Transaction.kind == kind,
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        return Decimal(db.execute(stmt).scalar_one()).quantize(
            Decimal("0.01")
        )

    month_income = _sum_kind("income")
    month_expense = _sum_kind("expense")
    net = (month_income - month_expense).quantize(Decimal("0.01"))

    return {
        "year": year,
        "month": month,
        "total_balance": total_balance,
        "month_income": month_income,
        "month_expense": month_expense,
        "net": net,
    }


def get_category_breakdown(
    db: Session,
    user: User,
    year: int,
    month: int,
    limit: int = 10,
) -> list[dict]:
    """Expense breakdown by category for the given month."""
    start, end = _month_bounds(year, month)

    stmt = (
        select(
            Transaction.category_id,
            func.coalesce(Category.name, "Uncategorized").label("category_name"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("cnt"),
        )
        .select_from(Transaction)
        .outerjoin(Category, Category.id == Transaction.category_id)
        .where(
            Transaction.user_id == user.id,
            Transaction.kind == "expense",
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        .group_by(Transaction.category_id, Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
    )

    rows = db.execute(stmt).all()

    grand_total = sum(
        (Decimal(row.total) for row in rows), Decimal("0")
    )

    out: list[dict] = []
    for row in rows:
        total = Decimal(row.total).quantize(Decimal("0.01"))
        if grand_total > 0:
            percentage = (total / grand_total * Decimal("100")).quantize(
                Decimal("0.01")
            )
        else:
            percentage = Decimal("0.00")
        out.append(
            {
                "category_id": row.category_id,
                "category_name": row.category_name,
                "total": total,
                "percentage": percentage,
                "transaction_count": int(row.cnt),
            }
        )
    return out


def get_trend(
    db: Session, user: User, year: int, month: int, months: int = 6
) -> list[dict]:
    """Income and expense totals for the last N months, oldest first."""
    points: list[dict] = []
    for y, m in _prev_months(year, month, months):
        start, end = _month_bounds(y, m)

        def _sum_kind(kind: str, _s=start, _e=end) -> Decimal:
            stmt = select(
                func.coalesce(func.sum(Transaction.amount), 0)
            ).where(
                Transaction.user_id == user.id,
                Transaction.kind == kind,
                Transaction.occurred_at >= _s,
                Transaction.occurred_at < _e,
            )
            return Decimal(db.execute(stmt).scalar_one()).quantize(
                Decimal("0.01")
            )

        points.append(
            {
                "year": y,
                "month": m,
                "income": _sum_kind("income"),
                "expense": _sum_kind("expense"),
            }
        )
    return points


def get_recent_transactions(
    db: Session, user: User, limit: int = 5
) -> list[Transaction]:
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.occurred_at.desc(), Transaction.id.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def get_overview(
    db: Session,
    user: User,
    year: int,
    month: int,
    trend_months: int = 6,
    recent_limit: int = 5,
) -> dict:
    return {
        "summary": get_summary(db, user, year, month),
        "top_categories": get_category_breakdown(db, user, year, month),
        "trend": get_trend(db, user, year, month, trend_months),
        "recent_transactions": get_recent_transactions(db, user, recent_limit),
        "generated_at": datetime.now(timezone.utc),
    }