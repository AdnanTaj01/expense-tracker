from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TransactionKind = Literal["income", "expense"]


class TransactionBase(BaseModel):
    # amount is always POSITIVE. Sign is derived from `kind`.
    amount: Decimal = Field(
        gt=Decimal("0"),
        max_digits=12,
        decimal_places=2,
        description="Always positive. Sign is determined by `kind`.",
    )
    note: str | None = Field(default=None, max_length=500)
    occurred_at: datetime


class TransactionCreate(TransactionBase):
    account_id: int
    category_id: int | None = None
    kind: TransactionKind


class TransactionUpdate(BaseModel):
    """All fields optional — PATCH semantics.

    Changing `amount`, `kind`, `account_id`, or `category_id` will
    re-balance the affected account(s). The service handles that.
    """
    amount: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=12, decimal_places=2
    )
    kind: TransactionKind | None = None
    account_id: int | None = None
    category_id: int | None = None
    note: str | None = Field(default=None, max_length=500)
    occurred_at: datetime | None = None


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    account_id: int
    category_id: int | None
    kind: TransactionKind
    created_at: datetime
    updated_at: datetime


class TransactionList(BaseModel):
    """Paginated response for listing transactions."""
    items: list[TransactionRead]
    total: int
    limit: int
    offset: int