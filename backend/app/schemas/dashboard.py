from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.transaction import TransactionRead


class DashboardSummary(BaseModel):
    year: int
    month: int
    total_balance: Decimal       # sum of all active account balances
    month_income: Decimal        # sum of income transactions this month
    month_expense: Decimal       # sum of expense transactions this month
    net: Decimal                 # month_income - month_expense


class CategoryBreakdownItem(BaseModel):
    category_id: int | None
    category_name: str
    total: Decimal
    percentage: Decimal          # share of total expense this month
    transaction_count: int


class TrendPoint(BaseModel):
    year: int
    month: int
    income: Decimal
    expense: Decimal


class DashboardOverview(BaseModel):
    summary: DashboardSummary
    top_categories: list[CategoryBreakdownItem]
    trend: list[TrendPoint]
    recent_transactions: list[TransactionRead]
    generated_at: datetime