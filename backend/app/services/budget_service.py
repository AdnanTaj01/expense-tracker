from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Budget, Category, Transaction, User
from app.schemas.budget import BudgetCreate, BudgetUpdate


def _month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    """Return (first_instant_of_month, first_instant_of_next_month) in UTC."""
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


def _spent_for_budget(db: Session, budget: Budget) -> Decimal:
    """Sum of expense transactions in this budget's category and period."""
    start, end = _month_bounds(budget.year, budget.month)

    stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == budget.user_id,
        Transaction.category_id == budget.category_id,
        Transaction.kind == "expense",
        Transaction.occurred_at >= start,
        Transaction.occurred_at < end,
    )
    result = db.execute(stmt).scalar_one()
    # Ensure exactly 2 decimal places even when no transactions exist
    # (COALESCE returns integer 0, not Decimal, when the sum is empty).
    return Decimal(result).quantize(Decimal("0.01"))


def get_budget(db: Session, user: User, budget_id: int) -> Budget | None:
    stmt = select(Budget).where(
        Budget.id == budget_id, Budget.user_id == user.id
    )
    return db.execute(stmt).scalar_one_or_none()


def get_budget_for_period(
    db: Session, user: User, category_id: int, year: int, month: int
) -> Budget | None:
    stmt = select(Budget).where(
        Budget.user_id == user.id,
        Budget.category_id == category_id,
        Budget.year == year,
        Budget.month == month,
    )
    return db.execute(stmt).scalar_one_or_none()


def _get_owned_category(
    db: Session, user: User, category_id: int
) -> Category | None:
    stmt = select(Category).where(
        Category.id == category_id, Category.user_id == user.id
    )
    return db.execute(stmt).scalar_one_or_none()


def create_budget(
    db: Session, user: User, payload: BudgetCreate
) -> Budget:
    """Create a budget. Raises ValueError on invalid category or duplicate."""
    category = _get_owned_category(db, user, payload.category_id)
    if category is None:
        raise ValueError("Category not found or not owned by user")

    if category.kind != "expense":
        raise ValueError("Budgets can only be set on expense categories")

    existing = get_budget_for_period(
        db, user, payload.category_id, payload.year, payload.month
    )
    if existing is not None:
        raise ValueError(
            "Budget already exists for this category and period"
        )

    budget = Budget(
        user_id=user.id,
        category_id=payload.category_id,
        year=payload.year,
        month=payload.month,
        limit_amount=payload.limit_amount,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def update_budget(
    db: Session, user: User, budget_id: int, payload: BudgetUpdate
) -> Budget | None:
    budget = get_budget(db, user, budget_id)
    if budget is None:
        return None
    budget.limit_amount = payload.limit_amount
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


def delete_budget(db: Session, user: User, budget_id: int) -> bool:
    budget = get_budget(db, user, budget_id)
    if budget is None:
        return False
    db.delete(budget)
    db.commit()
    return True


def compute_usage(db: Session, budget: Budget) -> dict:
    """Compute spent/remaining/percentage for a budget from live data."""
    spent = _spent_for_budget(db, budget)
    limit = budget.limit_amount
    remaining = limit - spent

    percentage: Decimal
    if limit == 0:
        percentage = Decimal("0")
    else:
        percentage = (spent / limit * Decimal("100")).quantize(
            Decimal("0.01")
        )

    return {
        "spent": spent,
        "remaining": remaining,
        "percentage": percentage,
        "is_exceeded": spent > limit,
    }


def list_budgets(
    db: Session,
    user: User,
    *,
    year: int | None = None,
    month: int | None = None,
) -> list[Budget]:
    stmt = select(Budget).where(Budget.user_id == user.id)
    if year is not None:
        stmt = stmt.where(Budget.year == year)
    if month is not None:
        stmt = stmt.where(Budget.month == month)
    stmt = stmt.order_by(Budget.year.desc(), Budget.month.desc())
    return list(db.execute(stmt).scalars().all())