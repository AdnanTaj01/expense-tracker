from decimal import Decimal

from pydantic import BaseModel


class MonthComparison(BaseModel):
    """Current month vs previous month for income and expense."""
    current_year: int
    current_month: int
    current_income: Decimal
    current_expense: Decimal
    previous_year: int
    previous_month: int
    previous_income: Decimal
    previous_expense: Decimal
    income_change_pct: Decimal | None
    expense_change_pct: Decimal | None


class CategoryTrendPoint(BaseModel):
    year: int
    month: int
    total: Decimal
    transaction_count: int


class CategoryTrend(BaseModel):
    category_id: int
    category_name: str
    kind: str
    points: list[CategoryTrendPoint]
    total: Decimal


class AccountSpend(BaseModel):
    account_id: int
    account_name: str
    total_expense: Decimal
    total_income: Decimal
    transaction_count: int


class WeekdayHeatmapItem(BaseModel):
    weekday: int  # 0 = Monday, 6 = Sunday
    weekday_name: str
    total_expense: Decimal
    total_income: Decimal
    transaction_count: int