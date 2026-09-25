from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    ChangePassword,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
)
from app.schemas.user import UserCreate, UserRead
from app.services import password_reset_service, user_service

router = APIRouter(prefix="/auth", tags=["auth"])


# ----------------------------------------------------------------------------
# Register / login / me / change-password
# ----------------------------------------------------------------------------


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    try:
        return user_service.create_user(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    user = user_service.authenticate(db, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.id)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        user_service.change_password(
            db,
            current_user,
            payload.current_password,
            payload.new_password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


# ----------------------------------------------------------------------------
# Password reset flow
# ----------------------------------------------------------------------------


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> Response:
    """Request a password reset link.

    Always returns 204 regardless of whether the email exists, so that
    callers cannot enumerate registered users.

    In development the reset link is printed to the backend console
    (DEBUG_RESET_LINKS=true). In production this becomes an email send.
    """
    user = user_service.get_user_by_email(db, payload.email)
    if user is not None:
        raw_token = password_reset_service.create_reset_token(db, user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"

        if settings.DEBUG_RESET_LINKS:
            print("\n" + "=" * 70)
            print(f"[DEV] Password reset link for {user.email}:")
            print(reset_url)
            print("=" * 70 + "\n")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> Response:
    ok = password_reset_service.consume_reset_token(
        db,
        payload.token,
        payload.new_password,
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)