from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Account,
    Category,
    RecurringRule,
    Transaction,
    User,
)
from app.schemas.recurring import RecurringRuleCreate, RecurringRuleUpdate


def _advance(dt: datetime, frequency: str, interval: int) -> datetime:
    """Return the next occurrence after `dt`."""
    if frequency == "daily":
        return dt + timedelta(days=interval)
    if frequency == "weekly":
        return dt + timedelta(weeks=interval)
    if frequency == "monthly":
        # Approximate: 30 * interval days. Good enough for MVP.
        return dt + timedelta(days=30 * interval)
    if frequency == "yearly":
        return dt + timedelta(days=365 * interval)
    raise ValueError(f"Unknown frequency: {frequency}")


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


def _apply_balance_delta(
    account: Account, kind: str, amount: Decimal
) -> None:
    delta = amount if kind == "income" else -amount
    account.balance = (account.balance or Decimal("0")) + delta


def get_rule(db: Session, user: User, rule_id: int) -> RecurringRule | None:
    stmt = select(RecurringRule).where(
        RecurringRule.id == rule_id, RecurringRule.user_id == user.id
    )
    return db.execute(stmt).scalar_one_or_none()


def list_rules(db: Session, user: User) -> list[RecurringRule]:
    stmt = (
        select(RecurringRule)
        .where(RecurringRule.user_id == user.id)
        .order_by(RecurringRule.next_run_at.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_rule(
    db: Session, user: User, payload: RecurringRuleCreate
) -> RecurringRule:
    if _get_owned_account(db, user, payload.account_id) is None:
        raise ValueError("Account not found or not owned by user")

    if payload.category_id is not None:
        if _get_owned_category(db, user, payload.category_id) is None:
            raise ValueError("Category not found or not owned by user")

    rule = RecurringRule(
        user_id=user.id,
        account_id=payload.account_id,
        category_id=payload.category_id,
        kind=payload.kind,
        amount=payload.amount,
        note=payload.note,
        frequency=payload.frequency,
        interval=payload.interval,
        next_run_at=payload.next_run_at,
        end_date=payload.end_date,
        is_active=payload.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def update_rule(
    db: Session,
    user: User,
    rule_id: int,
    payload: RecurringRuleUpdate,
) -> RecurringRule | None:
    rule = get_rule(db, user, rule_id)
    if rule is None:
        return None

    data = payload.model_dump(exclude_unset=True)

    if "account_id" in data:
        if _get_owned_account(db, user, data["account_id"]) is None:
            raise ValueError("Account not found or not owned by user")

    if data.get("category_id") is not None:
        if _get_owned_category(db, user, data["category_id"]) is None:
            raise ValueError("Category not found or not owned by user")

    for key, value in data.items():
        setattr(rule, key, value)

    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def delete_rule(db: Session, user: User, rule_id: int) -> bool:
    rule = get_rule(db, user, rule_id)
    if rule is None:
        return False
    db.delete(rule)
    db.commit()
    return True


def generate_due_transactions(
    db: Session,
    user: User,
    rule_id: int,
    *,
    now: datetime | None = None,
) -> dict:
    """Materialize all due occurrences as real transactions.

    Walks `next_run_at` forward by `interval` until it passes `now`
    (or `end_date`). Each occurrence becomes a Transaction row and
    updates the account balance in the same commit.

    Returns:
        dict with keys: rule_id, generated_count, transactions, next_run_at
    """
    rule = get_rule(db, user, rule_id)
    if rule is None:
        raise ValueError("Recurring rule not found")

    if not rule.is_active:
        raise ValueError("Recurring rule is not active")

    now = now or datetime.now(timezone.utc)

    account = _get_owned_account(db, user, rule.account_id)
    if account is None:
        raise ValueError("Account not found or not owned by user")

    generated_ids: list[int] = []
    safety = 1000  # hard cap to avoid infinite loops on bad data
    count = 0

    while rule.next_run_at <= now:
        # Stop if past end_date.
        if rule.end_date is not None and rule.next_run_at > rule.end_date:
            break

        tx = Transaction(
            user_id=user.id,
            account_id=rule.account_id,
            category_id=rule.category_id,
            kind=rule.kind,
            amount=rule.amount,
            note=rule.note,
            occurred_at=rule.next_run_at,
        )
        db.add(tx)
        _apply_balance_delta(account, rule.kind, rule.amount)
        db.add(account)

        # Flush to get the id without committing.
        db.flush()
        generated_ids.append(tx.id)

        rule.last_run_at = rule.next_run_at
        rule.next_run_at = _advance(
            rule.next_run_at, rule.frequency, rule.interval
        )

        count += 1
        if count >= safety:
            break

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return {
        "rule_id": rule.id,
        "generated_count": len(generated_ids),
        "transactions": generated_ids,
        "next_run_at": rule.next_run_at,
    }