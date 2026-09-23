from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RecurringFrequency = Literal["daily", "weekly", "monthly", "yearly"]
TransactionKind = Literal["income", "expense"]


class RecurringRuleBase(BaseModel):
    account_id: int
    category_id: int | None = None
    kind: TransactionKind
    amount: Decimal = Field(
        gt=Decimal("0"), max_digits=12, decimal_places=2
    )
    note: str | None = Field(default=None, max_length=500)
    frequency: RecurringFrequency
    interval: int = Field(default=1, ge=1, le=365)
    next_run_at: datetime
    end_date: datetime | None = None
    is_active: bool = True


class RecurringRuleCreate(RecurringRuleBase):
    pass


class RecurringRuleUpdate(BaseModel):
    """All fields optional — PATCH semantics.

    Note: `next_run_at` and `last_run_at` are managed by the service
    during generation. Users can adjust them manually if needed.
    """
    account_id: int | None = None
    category_id: int | None = None
    kind: TransactionKind | None = None
    amount: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=12, decimal_places=2
    )
    note: str | None = Field(default=None, max_length=500)
    frequency: RecurringFrequency | None = None
    interval: int | None = Field(default=None, ge=1, le=365)
    next_run_at: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None


class RecurringRuleRead(RecurringRuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    last_run_at: datetime | None
    created_at: datetime
    updated_at: datetime


class GenerateResult(BaseModel):
    """Response for POST /api/v1/recurring/{id}/generate."""
    rule_id: int
    generated_count: int
    transactions: list[int]  # transaction ids created
    next_run_at: datetime