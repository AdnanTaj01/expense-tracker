from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Account, Category, Transaction, User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
)


def _signed_delta(kind: str, amount: Decimal) -> Decimal:
    """Return the balance delta. Income adds, expense subtracts."""
    if kind == "income":
        return amount
    return -amount


def _reverse_delta(kind: str, amount: Decimal) -> Decimal:
    """Return the balance delta to UNDO a transaction."""
    return -_signed_delta(kind, amount)


def get_transaction(
    db: Session, user: User, transaction_id: int
) -> Transaction | None:
    stmt = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.user_id == user.id,
    )
    return db.execute(stmt).scalar_one_or_none()


def _get_owned_account(db: Session, user: User, account_id: int) -> Account | None:
    stmt = select(Account).where(
        Account.id == account_id, Account.user_id == user.id
    )
    return db.execute(stmt).scalar_one_or_none()


def _get_owned_category(
    db: Session, user: User, category_id: int
) -> Category | None:
    stmt = select(Category).where(
        Category.id == category_id, Category.user_id == user.id
    )
    return db.execute(stmt).scalar_one_or_none()


def _apply_balance_change(
    db: Session, account: Account, delta: Decimal
) -> None:
    """Update the account balance. Caller must commit."""
    account.balance = (account.balance or Decimal("0")) + delta
    db.add(account)


def create_transaction(
    db: Session, user: User, payload: TransactionCreate
) -> Transaction:
    """Create a transaction and update the account balance in the same DB transaction.

    Raises:
        ValueError: if the account or category is invalid / not owned by the user.
    """
    account = _get_owned_account(db, user, payload.account_id)
    if account is None:
        raise ValueError("Account not found or not owned by user")

    if payload.category_id is not None:
        category = _get_owned_category(db, user, payload.category_id)
        if category is None:
            raise ValueError("Category not found or not owned by user")
        # Optional cross-check: category kind should match transaction kind.
        # We allow mismatch for now (user might reclassify), but flag it in
        # a later phase if needed.
    else:
        category = None

    transaction = Transaction(
        user_id=user.id,
        account_id=account.id,
        category_id=category.id if category else None,
        kind=payload.kind,
        amount=payload.amount,
        note=payload.note,
        occurred_at=payload.occurred_at,
    )
    db.add(transaction)

    _apply_balance_change(db, account, _signed_delta(payload.kind, payload.amount))

    # Single atomic commit — transaction row AND balance change together.
    db.commit()
    db.refresh(transaction)
    return transaction


def update_transaction(
    db: Session,
    user: User,
    transaction_id: int,
    payload: TransactionUpdate,
) -> Transaction | None:
    """Update a transaction and correctly re-balance the affected accounts.

    Handles all combinations:
    - amount change only
    - kind change only (income <-> expense)
    - account change (old account gets reversed, new one gets applied)
    - category change
    """
    transaction = get_transaction(db, user, transaction_id)
    if transaction is None:
        return None

    data = payload.model_dump(exclude_unset=True)

    # Resolve the OLD and NEW account
    old_account_id = transaction.account_id
    new_account_id = data.get("account_id", old_account_id)

    old_account = _get_owned_account(db, user, old_account_id)
    if old_account is None:
        # Should never happen if data is consistent, but be defensive.
        return None

    new_account: Account | None = old_account
    if new_account_id != old_account_id:
        new_account = _get_owned_account(db, user, new_account_id)
        if new_account is None:
            raise ValueError("New account not found or not owned by user")

    # Resolve the NEW category if provided
    if "category_id" in data:
        if data["category_id"] is not None:
            category = _get_owned_category(db, user, data["category_id"])
            if category is None:
                raise ValueError("Category not found or not owned by user")

    # Compute old and new (kind, amount)
    old_kind, old_amount = transaction.kind, transaction.amount
    new_kind = data.get("kind", old_kind)
    new_amount = data.get("amount", old_amount)

    # 1) Reverse the old effect on the old account
    _apply_balance_change(db, old_account, _reverse_delta(old_kind, old_amount))

    # 2) Apply the new effect on the new account
    _apply_balance_change(db, new_account, _signed_delta(new_kind, new_amount))

    # 3) Update the transaction row fields
    for key, value in data.items():
        setattr(transaction, key, value)
    db.add(transaction)

    db.commit()
    db.refresh(transaction)
    return transaction


def delete_transaction(
    db: Session, user: User, transaction_id: int
) -> bool:
    """Delete a transaction and reverse its effect on the account balance."""
    transaction = get_transaction(db, user, transaction_id)
    if transaction is None:
        return False

    account = _get_owned_account(db, user, transaction.account_id)
    if account is not None:
        _apply_balance_change(
            db, account, _reverse_delta(transaction.kind, transaction.amount)
        )

    db.delete(transaction)
    db.commit()
    return True


def list_transactions(
    db: Session,
    user: User,
    *,
    account_id: int | None = None,
    category_id: int | None = None,
    kind: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Transaction], int]:
    """Return (items, total_count) after applying filters and pagination."""
    base = select(Transaction).where(Transaction.user_id == user.id)

    if account_id is not None:
        base = base.where(Transaction.account_id == account_id)
    if category_id is not None:
        base = base.where(Transaction.category_id == category_id)
    if kind is not None:
        base = base.where(Transaction.kind == kind)
    if from_date is not None:
        base = base.where(Transaction.occurred_at >= from_date)
    if to_date is not None:
        base = base.where(Transaction.occurred_at <= to_date)

    # Total count (without limit/offset)
    count_stmt = select(func.count()).select_from(base.subquery())
    total = db.execute(count_stmt).scalar_one()

    # Ordered + paginated
    items_stmt = (
        base.order_by(Transaction.occurred_at.desc(), Transaction.id.desc())
        .limit(limit)
        .offset(offset)
    )
    items = list(db.execute(items_stmt).scalars().all())

    return items, total


def recompute_account_balance(
    db: Session, user: User, account_id: int
) -> Decimal:
    """Recompute an account balance from all its transactions.

    Used in tests to verify that the stored balance matches reality.
    """
    account = _get_owned_account(db, user, account_id)
    if account is None:
        raise ValueError("Account not found or not owned by user")

    stmt = select(Transaction.kind, Transaction.amount).where(
        Transaction.account_id == account.id
    )
    rows = db.execute(stmt).all()

    total = Decimal("0")
    for kind, amount in rows:
        total += _signed_delta(kind, amount)
    return total