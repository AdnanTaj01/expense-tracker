from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CategoryKind = Literal["income", "expense"]


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    kind: CategoryKind


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    kind: CategoryKind | None = None


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    is_default: bool
    created_at: datetime
    updated_at: datetime