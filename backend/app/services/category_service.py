from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, User
from app.schemas.category import CategoryCreate, CategoryUpdate


# Seeded automatically when a new user registers.
DEFAULT_CATEGORIES: list[tuple[str, str]] = [
    ("Salary", "income"),
    ("Freelance", "income"),
    ("Investment", "income"),
    ("Food", "expense"),
    ("Transport", "expense"),
    ("Rent", "expense"),
    ("Utilities", "expense"),
    ("Shopping", "expense"),
    ("Health", "expense"),
    ("Entertainment", "expense"),
    ("Education", "expense"),
    ("Other", "expense"),
]


def list_categories(
    db: Session, user: User, kind: str | None = None
) -> list[Category]:
    stmt = select(Category).where(Category.user_id == user.id)
    if kind is not None:
        stmt = stmt.where(Category.kind == kind)
    stmt = stmt.order_by(Category.kind, Category.name)
    return list(db.execute(stmt).scalars().all())


def get_category(db: Session, user: User, category_id: int) -> Category | None:
    stmt = select(Category).where(
        Category.id == category_id, Category.user_id == user.id
    )
    return db.execute(stmt).scalar_one_or_none()


def create_category(
    db: Session, user: User, payload: CategoryCreate
) -> Category:
    category = Category(
        user_id=user.id,
        name=payload.name,
        kind=payload.kind,
        is_default=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, user: User, category_id: int, payload: CategoryUpdate
) -> Category | None:
    category = get_category(db, user, category_id)
    if category is None:
        return None

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(category, key, value)

    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, user: User, category_id: int) -> bool:
    category = get_category(db, user, category_id)
    if category is None:
        return False
    db.delete(category)
    db.commit()
    return True


def seed_default_categories(db: Session, user: User) -> None:
    """Create the default category set for a newly registered user.

    Idempotent — safe to call multiple times.
    """
    existing = db.execute(
        select(Category.name, Category.kind).where(Category.user_id == user.id)
    ).all()
    existing_set = {(row[0], row[1]) for row in existing}

    to_add = [
        Category(
            user_id=user.id,
            name=name,
            kind=kind,
            is_default=True,
        )
        for name, kind in DEFAULT_CATEGORIES
        if (name, kind) not in existing_set
    ]
    if to_add:
        db.add_all(to_add)
        db.commit()