from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.services import export_service

router = APIRouter(prefix="/exports", tags=["exports"])


def _csv_response(filename: str, content: str) -> Response:
    return Response(
        content=content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/transactions.csv")
def export_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    filename, content = export_service.export_transactions_csv(db, current_user)
    return _csv_response(filename, content)


@router.get("/accounts.csv")
def export_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    filename, content = export_service.export_accounts_csv(db, current_user)
    return _csv_response(filename, content)


@router.get("/budgets.csv")
def export_budgets(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    now = datetime.now(timezone.utc)
    y = year if year is not None else now.year
    m = month if month is not None else now.month
    filename, content = export_service.export_budgets_csv(db, current_user, y, m)
    return _csv_response(filename, content)