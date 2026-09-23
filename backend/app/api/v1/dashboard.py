from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.dashboard import (
    CategoryBreakdownItem,
    DashboardOverview,
    DashboardSummary,
    TrendPoint,
)
from app.schemas.transaction import TransactionRead
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _current_year_month() -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    return now.year, now.month


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cy, cm = _current_year_month()
    year = year if year is not None else cy
    month = month if month is not None else cm
    return dashboard_service.get_summary(db, current_user, year, month)


@router.get("/by-category", response_model=list[CategoryBreakdownItem])
def get_by_category(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cy, cm = _current_year_month()
    year = year if year is not None else cy
    month = month if month is not None else cm
    return dashboard_service.get_category_breakdown(
        db, current_user, year, month, limit=limit
    )


@router.get("/trend", response_model=list[TrendPoint])
def get_trend(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    months: int = Query(default=6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cy, cm = _current_year_month()
    year = year if year is not None else cy
    month = month if month is not None else cm
    return dashboard_service.get_trend(db, current_user, year, month, months)


@router.get("/recent", response_model=list[TransactionRead])
def get_recent(
    limit: int = Query(default=5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return dashboard_service.get_recent_transactions(db, current_user, limit)


@router.get("/overview", response_model=DashboardOverview)
def get_overview(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    trend_months: int = Query(default=6, ge=1, le=24),
    recent_limit: int = Query(default=5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Everything the frontend needs for the dashboard in one call."""
    cy, cm = _current_year_month()
    year = year if year is not None else cy
    month = month if month is not None else cm
    return dashboard_service.get_overview(
        db,
        current_user,
        year,
        month,
        trend_months=trend_months,
        recent_limit=recent_limit,
    )