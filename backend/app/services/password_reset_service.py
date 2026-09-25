import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import PasswordResetToken, User

TOKEN_TTL_MINUTES = 15
TOKEN_BYTES = 32


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_reset_token(db: Session, user: User) -> str:
    """Create a reset token for `user` and return the RAW token.

    Any previous unused tokens for this user are marked as used, so
    only one active reset link exists at a time.
    """
    db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=datetime.now(timezone.utc))
    )

    raw = secrets.token_urlsafe(TOKEN_BYTES)
    token_hash = _hash_token(raw)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)

    row = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()
    return raw


def consume_reset_token(
    db: Session, raw_token: str, new_password: str
) -> bool:
    """Validate the token and reset the user's password.

    Returns True on success, False if the token is invalid/expired/used.
    """
    token_hash = _hash_token(raw_token)
    row = db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash
        )
    ).scalar_one_or_none()

    if row is None:
        return False
    if row.used_at is not None:
        return False
    if row.expires_at < datetime.now(timezone.utc):
        return False

    user = db.get(User, row.user_id)
    if user is None:
        return False

    user.password_hash = hash_password(new_password)
    row.used_at = datetime.now(timezone.utc)

    db.add(user)
    db.add(row)
    db.commit()
    return True