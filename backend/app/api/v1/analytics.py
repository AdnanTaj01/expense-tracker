from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.analytics import (
    AccountSpend,
    CategoryTrend,
    MonthComparison,
    WeekdayHeatmapItem,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _current_year_month() -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    return now.year, now.month


@router.get("/month-comparison", response_model=MonthComparison)
def month_comparison(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cy, cm = _current_year_month()
    return analytics_service.month_comparison(
        db,
        current_user,
        year if year is not None else cy,
        month if month is not None else cm,
    )


@router.get("/category-trend", response_model=CategoryTrend)
def category_trend(
    category_id: int = Query(..., ge=1),
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    months: int = Query(default=6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cy, cm = _current_year_month()
    result = analytics_service.category_trend(
        db,
        current_user,
        category_id,
        year if year is not None else cy,
        month if month is not None else cm,
        months,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return result


@router.get("/top-accounts", response_model=list[AccountSpend])
def top_accounts(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    months: int = Query(default=3, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cy, cm = _current_year_month()
    return analytics_service.top_accounts(
        db,
        current_user,
        year if year is not None else cy,
        month if month is not None else cm,
        months,
    )


@router.get("/weekday-heatmap", response_model=list[WeekdayHeatmapItem])
def weekday_heatmap(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    months: int = Query(default=3, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cy, cm = _current_year_month()
    return analytics_service.weekday_heatmap(
        db,
        current_user,
        year if year is not None else cy,
        month if month is not None else cm,
        months,
    )