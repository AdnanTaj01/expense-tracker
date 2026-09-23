from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BudgetBase(BaseModel):
    category_id: int
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    limit_amount: Decimal = Field(
        gt=Decimal("0"), max_digits=12, decimal_places=2
    )


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    """Only the limit can be updated; period and category are fixed."""
    limit_amount: Decimal = Field(
        gt=Decimal("0"), max_digits=12, decimal_places=2
    )


class BudgetRead(BudgetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class BudgetWithUsage(BudgetRead):
    """Budget + live usage computed from transactions."""
    spent: Decimal
    remaining: Decimal
    percentage: Decimal  # spent / limit * 100
    is_exceeded: bool
    category_name: str | None = None