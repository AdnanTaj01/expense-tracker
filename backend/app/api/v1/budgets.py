from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.budget import (
    BudgetCreate,
    BudgetRead,
    BudgetUpdate,
    BudgetWithUsage,
)
from app.services import budget_service

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _to_with_usage(db: Session, budget) -> BudgetWithUsage:
    """Attach live usage numbers to a budget row."""
    usage = budget_service.compute_usage(db, budget)
    return BudgetWithUsage(
        id=budget.id,
        user_id=budget.user_id,
        category_id=budget.category_id,
        year=budget.year,
        month=budget.month,
        limit_amount=budget.limit_amount,
        created_at=budget.created_at,
        updated_at=budget.updated_at,
        category_name=budget.category.name if budget.category else None,
        spent=usage["spent"],
        remaining=usage["remaining"],
        percentage=usage["percentage"],
        is_exceeded=usage["is_exceeded"],
    )


@router.get("", response_model=list[BudgetWithUsage])
def list_budgets(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budgets = budget_service.list_budgets(
        db, current_user, year=year, month=month
    )
    return [_to_with_usage(db, b) for b in budgets]


@router.post(
    "",
    response_model=BudgetWithUsage,
    status_code=status.HTTP_201_CREATED,
)
def create_budget(
    payload: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        budget = budget_service.create_budget(db, current_user, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return _to_with_usage(db, budget)


@router.get("/{budget_id}", response_model=BudgetWithUsage)
def get_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = budget_service.get_budget(db, current_user, budget_id)
    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    return _to_with_usage(db, budget)


@router.patch("/{budget_id}", response_model=BudgetWithUsage)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = budget_service.update_budget(db, current_user, budget_id, payload)
    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )
    return _to_with_usage(db, budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if not budget_service.delete_budget(db, current_user, budget_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found",
        )