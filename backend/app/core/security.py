from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

# Argon2id is the current recommendation (Section 1, decision #5).
password_hasher = PasswordHash.recommended()

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return password_hasher.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Check a plaintext password against an Argon2id hash."""
    return password_hasher.verify(plain_password, password_hash)


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    `subject` is normally the user id. We store it in the `sub` claim.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT. Raises jwt.PyJWTError on any failure."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])