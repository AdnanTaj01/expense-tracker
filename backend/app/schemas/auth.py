from pydantic import BaseModel


class Token(BaseModel):
    """Response from /auth/login."""
    access_token: str
    token_type: str = "bearer"


class ChangePassword(BaseModel):
    """Payload for /auth/change-password."""
    current_password: str
    new_password: str