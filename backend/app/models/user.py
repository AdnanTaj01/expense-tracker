from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

from app.models.document import Document

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.budget import Budget
    from app.models.category import Category
    from app.models.password_reset_token import PasswordResetToken
    from app.models.recurring import RecurringRule
    from app.models.transaction import Transaction
    from app.models.receipt import Receipt


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # One currency per user, per Section 1 decision #2.
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="PKR"
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    accounts: Mapped[list[Account]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    categories: Mapped[list[Category]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    transactions: Mapped[list[Transaction]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    budgets: Mapped[list[Budget]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    recurring_rules: Mapped[list[RecurringRule]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    reset_tokens: Mapped[list[PasswordResetToken]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    receipts: Mapped[list[Receipt]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list[Document]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"