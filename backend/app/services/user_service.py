from sqlalchemy import select
from sqlalchemy.orm import Session

from app.services import category_service
from app.services.category_service import seed_default_categories
from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.user import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    stmt = select(User).where(User.email == email)
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def create_user(db: Session, payload: UserCreate) -> User:
    """Create a user. Raises ValueError if email already exists."""
    if get_user_by_email(db, payload.email) is not None:
        raise ValueError("Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        currency=payload.currency,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Give every new user a starter set of categories.
    seed_default_categories(db, user)
    return user

def authenticate(db: Session, email: str, password: str) -> User | None:
    """Return the user if credentials match, else None."""
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def change_password(db: Session, user: User, current: str, new: str) -> None:
    """Change a user's password. Raises ValueError if current is wrong."""
    if not verify_password(current, user.password_hash):
        raise ValueError("Current password is incorrect")
    user.password_hash = hash_password(new)
    db.add(user)
    db.commit()