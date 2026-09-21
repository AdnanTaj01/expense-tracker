from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=120)
    currency: str = Field(default="PKR", min_length=3, max_length=3)


class UserCreate(UserBase):
    """Payload for registration. Plain password — hashed in the service layer."""
    password: str = Field(min_length=8, max_length=128)


class UserRead(UserBase):
    """Public user representation. Never includes password_hash."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime