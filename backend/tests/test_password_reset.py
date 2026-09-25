from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import PasswordResetToken, User
from app.services import password_reset_service


def _register_and_login(client, email: str, password: str = "OldPass123!") -> str:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Test User",
            "currency": "PKR",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    return login.json()["access_token"]


def _has_token_for(email: str) -> bool:
    """Return True if a reset token row exists for this user."""
    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.email == email)
        ).scalar_one()
        rows = (
            db.execute(
                select(PasswordResetToken)
                .where(PasswordResetToken.user_id == user.id)
                .order_by(PasswordResetToken.id.desc())
            )
            .scalars()
            .all()
        )
        return len(rows) > 0
    finally:
        db.close()


def test_forgot_password_returns_204_even_for_unknown_email(client):
    """Security: don't reveal whether an email exists."""
    r = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "does-not-exist@example.com"},
    )
    assert r.status_code == 204


def test_forgot_password_creates_token(client):
    _register_and_login(client, "reset1@example.com")
    r = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset1@example.com"},
    )
    assert r.status_code == 204
    assert _has_token_for("reset1@example.com")


def test_reset_password_happy_path(client):
    _register_and_login(client, "reset2@example.com", "OldPass123!")

    # Generate token directly via service so we get the raw value
    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.email == "reset2@example.com")
        ).scalar_one()
        raw = password_reset_service.create_reset_token(db, user)
    finally:
        db.close()

    r = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw, "new_password": "BrandNew123!"},
    )
    assert r.status_code == 204

    # Login with new password works
    ok = client.post(
        "/api/v1/auth/login",
        data={"username": "reset2@example.com", "password": "BrandNew123!"},
    )
    assert ok.status_code == 200

    # Login with old password fails
    fail = client.post(
        "/api/v1/auth/login",
        data={"username": "reset2@example.com", "password": "OldPass123!"},
    )
    assert fail.status_code == 401


def test_reset_password_rejects_bad_token(client):
    _register_and_login(client, "reset3@example.com")
    r = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": "not-a-real-token-at-all-but-long-enough",
            "new_password": "Whatever123!",
        },
    )
    assert r.status_code == 400


def test_reset_password_token_is_single_use(client):
    _register_and_login(client, "reset4@example.com", "OldPass123!")

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.email == "reset4@example.com")
        ).scalar_one()
        raw = password_reset_service.create_reset_token(db, user)
    finally:
        db.close()

    first = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw, "new_password": "First123!"},
    )
    assert first.status_code == 204

    second = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw, "new_password": "Second123!"},
    )
    assert second.status_code == 400


def test_reset_password_rejects_expired_token(client):
    _register_and_login(client, "reset5@example.com", "OldPass123!")

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.email == "reset5@example.com")
        ).scalar_one()
        raw = password_reset_service.create_reset_token(db, user)
        # Force expiry
        row = (
            db.execute(
                select(PasswordResetToken)
                .where(PasswordResetToken.user_id == user.id)
                .order_by(PasswordResetToken.id.desc())
            )
            .scalars()
            .first()
        )
        row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.add(row)
        db.commit()
    finally:
        db.close()

    r = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw, "new_password": "TooLate123!"},
    )
    assert r.status_code == 400


def test_new_forgot_invalidates_previous_token(client):
    _register_and_login(client, "reset6@example.com", "OldPass123!")

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.email == "reset6@example.com")
        ).scalar_one()
        first_raw = password_reset_service.create_reset_token(db, user)
        second_raw = password_reset_service.create_reset_token(db, user)
    finally:
        db.close()

    # First token should now be invalid
    r1 = client.post(
        "/api/v1/auth/reset-password",
        json={"token": first_raw, "new_password": "NoGood123!"},
    )
    assert r1.status_code == 400

    # Second should work
    r2 = client.post(
        "/api/v1/auth/reset-password",
        json={"token": second_raw, "new_password": "GoodOne123!"},
    )
    assert r2.status_code == 204