from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        # Same user cannot have two categories with the same name and kind.
        UniqueConstraint("user_id", "name", "kind", name="uq_category_user_name_kind"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(80), nullable=False)

    # "income" | "expense"
    kind: Mapped[str] = mapped_column(String(10), nullable=False, index=True)

    # Seed categories are created automatically on registration.
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
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

    user: Mapped["User"] = relationship(back_populates="categories")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name!r} kind={self.kind}>"