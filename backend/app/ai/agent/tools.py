"""Read-only agent tools (Phase 19B).

Each tool wraps an existing service function — never raw SQL — so
ownership scoping and validation are inherited automatically.
Tool definitions follow the OpenAI/Groq function-calling JSON schema.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models.user import User
from app.services import (
    account_service,
    budget_service,
    category_service,
    dashboard_service,
    transaction_service,
)


def _jsonable(value: Any) -> Any:
    """Recursively convert Decimal/datetime values to JSON-safe types."""
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return value


# --- Tool implementations ---------------------------------------------


def get_dashboard_summary(db: Session, user: User, args: dict) -> dict:
    today = date.today()
    year = args.get("year", today.year)
    month = args.get("month", today.month)
    summary = dashboard_service.get_summary(db, user, year, month)
    return _jsonable(summary)


def list_recent_transactions(db: Session, user: User, args: dict) -> dict:
    limit = min(int(args.get("limit", 10)), 50)
    kind = args.get("kind")
    items, total = transaction_service.list_transactions(
        db, user, kind=kind, limit=limit, offset=0
    )
    return {
        "total": total,
        "transactions": [
            {
                "id": t.id,
                "kind": t.kind,
                "amount": str(t.amount),
                "note": t.note,
                "occurred_at": t.occurred_at.isoformat(),
                "account_id": t.account_id,
                "category_id": t.category_id,
            }
            for t in items
        ],
    }


def get_budget_usage(db: Session, user: User, args: dict) -> dict:
    today = date.today()
    year = args.get("year", today.year)
    month = args.get("month", today.month)
    budgets = budget_service.list_budgets(db, user, year=year, month=month)
    result = []
    for b in budgets:
        usage = budget_service.compute_usage(db, b)
        result.append(
            _jsonable(
                {
                    "category_id": b.category_id,
                    "limit_amount": b.limit_amount,
                    **usage,
                }
            )
        )
    return {"year": year, "month": month, "budgets": result}


def list_accounts(db: Session, user: User, args: dict) -> dict:
    accounts = account_service.list_accounts(db, user)
    return {
        "accounts": [
            {
                "id": a.id,
                "name": a.name,
                "type": a.type,
                "balance": str(a.balance),
                "currency": a.currency,
            }
            for a in accounts
        ]
    }

def list_categories(db: Session, user: User, args: dict) -> dict:
    kind = args.get("kind")
    categories = category_service.list_categories(db, user, kind=kind)
    return {
        "categories": [
            {"id": c.id, "name": c.name, "kind": c.kind} for c in categories
        ]
    }
# --- Tool registry + JSON schema definitions ----------------------------

TOOL_REGISTRY = {
    "get_dashboard_summary": get_dashboard_summary,
    "list_recent_transactions": list_recent_transactions,
    "get_budget_usage": get_budget_usage,
    "list_accounts": list_accounts,
    "list_categories": list_categories,
}

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_dashboard_summary",
            "description": (
                "Get the user's total balance and this (or a given) month's "
                "income, expense, and net total."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "year": {"type": "integer", "description": "Optional. Defaults to current year."},
                    "month": {"type": "integer", "description": "Optional. Defaults to current month."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_recent_transactions",
            "description": "List the user's most recent transactions, optionally filtered by kind.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Max transactions to return (default 10, max 50)."},
                    "kind": {"type": "string", "enum": ["income", "expense"], "description": "Optional filter."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_budget_usage",
            "description": "Get the user's budgets and spending usage for a given month (defaults to current month).",
            "parameters": {
                "type": "object",
                "properties": {
                    "year": {"type": "integer"},
                    "month": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_accounts",
            "description": "List all of the user's accounts with their current balances.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
        {
        "type": "function",
        "function": {
            "name": "list_categories",
            "description": "List the user's income or expense categories, with their ids and names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "kind": {"type": "string", "enum": ["income", "expense"], "description": "Optional filter."},
                },
            },
        },
    },
]