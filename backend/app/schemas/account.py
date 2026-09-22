from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Supported account types — validated by Pydantic.
AccountType = Literal["checking", "savings", "cash", "credit_card", "wallet"]


class AccountBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: AccountType
    currency: str = Field(default="PKR", min_length=3, max_length=3)


class AccountCreate(AccountBase):
    """Opening balance can be set when the account is created."""
    balance: Decimal = Field(
        default=Decimal("0"), max_digits=12, decimal_places=2
    )


class AccountUpdate(BaseModel):
    """Balance is intentionally excluded — it changes via transactions
    (Section 1, decision #3)."""
    name: str | None = Field(default=None, min_length=1, max_length=120)
    type: AccountType | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    is_active: bool | None = None


class AccountRead(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    balance: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime