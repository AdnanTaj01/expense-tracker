from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Account, User
from app.schemas.account import AccountCreate, AccountUpdate


def list_accounts(db: Session, user: User, only_active: bool = False) -> list[Account]:
    stmt = select(Account).where(Account.user_id == user.id)
    if only_active:
        stmt = stmt.where(Account.is_active.is_(True))
    stmt = stmt.order_by(Account.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def get_account(db: Session, user: User, account_id: int) -> Account | None:
    """Ownership-scoped fetch — a user can never see another user's account."""
    stmt = select(Account).where(
        Account.id == account_id, Account.user_id == user.id
    )
    return db.execute(stmt).scalar_one_or_none()


def create_account(db: Session, user: User, payload: AccountCreate) -> Account:
    account = Account(
        user_id=user.id,
        name=payload.name,
        type=payload.type,
        currency=payload.currency,
        balance=payload.balance,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update_account(
    db: Session, user: User, account_id: int, payload: AccountUpdate
) -> Account | None:
    account = get_account(db, user, account_id)
    if account is None:
        return None

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(account, key, value)

    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, user: User, account_id: int) -> bool:
    account = get_account(db, user, account_id)
    if account is None:
        return False
    db.delete(account)
    db.commit()
    return True