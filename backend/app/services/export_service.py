import csv
import io
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Account, Budget, Category, Transaction, User


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")


def export_transactions_csv(db: Session, user: User) -> tuple[str, str]:
    """Return (filename, csv_content)."""
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.occurred_at.desc())
    )
    txs = db.execute(stmt).scalars().all()

    # Build lookup maps for account and category names
    acc_map = {
        a.id: a.name
        for a in db.execute(
            select(Account).where(Account.user_id == user.id)
        ).scalars().all()
    }
    cat_map = {
        c.id: c.name
        for c in db.execute(
            select(Category).where(Category.user_id == user.id)
        ).scalars().all()
    }

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "Date",
            "Kind",
            "Amount",
            "Account",
            "Category",
            "Note",
        ]
    )
    for t in txs:
        writer.writerow(
            [
                t.occurred_at.strftime("%Y-%m-%d"),
                t.kind,
                f"{t.amount:.2f}",
                acc_map.get(t.account_id, "—"),
                cat_map.get(t.category_id, "") if t.category_id else "",
                t.note or "",
            ]
        )

    filename = f"transactions_{_now_iso()}.csv"
    return filename, buf.getvalue()


def export_accounts_csv(db: Session, user: User) -> tuple[str, str]:
    stmt = (
        select(Account)
        .where(Account.user_id == user.id)
        .order_by(Account.created_at.asc())
    )
    accounts = db.execute(stmt).scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Name", "Type", "Currency", "Balance", "Active"])
    for a in accounts:
        writer.writerow(
            [
                a.name,
                a.type,
                a.currency,
                f"{a.balance:.2f}",
                "yes" if a.is_active else "no",
            ]
        )

    filename = f"accounts_{_now_iso()}.csv"
    return filename, buf.getvalue()


def export_budgets_csv(
    db: Session, user: User, year: int, month: int
) -> tuple[str, str]:
    stmt = (
        select(Budget)
        .where(
            Budget.user_id == user.id,
            Budget.year == year,
            Budget.month == month,
        )
        .order_by(Budget.id.asc())
    )
    budgets = db.execute(stmt).scalars().all()

    cat_map = {
        c.id: c.name
        for c in db.execute(
            select(Category).where(Category.user_id == user.id)
        ).scalars().all()
    }

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "Category",
            "Year",
            "Month",
            "Limit",
            "Spent",
            "Remaining",
            "Percentage",
            "Over Budget",
        ]
    )
    for b in budgets:
        # We need spent from live transactions (same as budget_service)
        from app.services.budget_service import compute_usage

        usage = compute_usage(db, b)
        writer.writerow(
            [
                cat_map.get(b.category_id, "—"),
                b.year,
                b.month,
                f"{b.limit_amount:.2f}",
                f"{usage['spent']:.2f}",
                f"{usage['remaining']:.2f}",
                f"{usage['percentage']:.2f}",
                "yes" if usage["is_exceeded"] else "no",
            ]
        )

    filename = f"budgets_{year}_{month:02d}_{_now_iso()}.csv"
    return filename, buf.getvalue()