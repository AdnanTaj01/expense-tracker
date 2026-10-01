"""Write agent tools (Phase 20).

Unlike read tools, these are NEVER executed directly from the model's
tool call. agent_service intercepts any call to a tool in this
registry, returns it as a `pending_action` for the user to confirm,
and only /api/v1/agent/confirm actually invokes these functions.

Each tool validates arguments through the same Pydantic schema the
regular REST endpoint uses, so an AI-provided payload gets exactly
the same validation as a normal API request — never raw SQL, never
skipped validation.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.budget import BudgetCreate
from app.schemas.transaction import TransactionCreate
from app.services.budget_service import create_budget
from app.services.transaction_service import create_transaction


def create_transaction_tool(db: Session, user: User, args: dict) -> dict:
    args = {**args}
    args.setdefault("occurred_at", datetime.now(UTC).isoformat())
    try:
        payload = TransactionCreate(**args)
    except ValidationError as exc:
        return {"error": f"Invalid transaction data: {exc.errors()}"}

    transaction = create_transaction(db, user, payload)
    return {
        "id": transaction.id,
        "kind": transaction.kind,
        "amount": str(transaction.amount),
        "note": transaction.note,
        "occurred_at": transaction.occurred_at.isoformat(),
        "account_id": transaction.account_id,
        "category_id": transaction.category_id,
    }


def create_budget_tool(db: Session, user: User, args: dict) -> dict:
    today = datetime.now(UTC)
    args = {**args}
    args.setdefault("year", today.year)
    args.setdefault("month", today.month)
    try:
        payload = BudgetCreate(**args)
    except ValidationError as exc:
        return {"error": f"Invalid budget data: {exc.errors()}"}

    budget = create_budget(db, user, payload)
    return {
        "id": budget.id,
        "category_id": budget.category_id,
        "year": budget.year,
        "month": budget.month,
        "limit_amount": str(budget.limit_amount),
    }


def _describe_create_transaction(args: dict) -> str:
    kind = args.get("kind", "transaction")
    amount = args.get("amount", "?")
    note = args.get("note")
    suffix = f' ("{note}")' if note else ""
    return f"Create a {kind} of {amount}{suffix}"


def _describe_create_budget(args: dict) -> str:
    amount = args.get("limit_amount", "?")
    year = args.get("year", "?")
    month = args.get("month", "?")
    return f"Create a budget of {amount} for {month}/{year}"


WRITE_TOOL_REGISTRY = {
    "create_transaction": create_transaction_tool,
    "create_budget": create_budget_tool,
}

WRITE_TOOL_DESCRIBERS = {
    "create_transaction": _describe_create_transaction,
    "create_budget": _describe_create_budget,
}

WRITE_TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "create_transaction",
            "description": (
                "Propose creating a new income or expense transaction for the "
                "user. This requires user confirmation before it takes effect."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "account_id": {"type": "integer", "description": "The account this transaction belongs to."},
                    "category_id": {"type": "integer", "description": "Optional category id."},
                    "kind": {"type": "string", "enum": ["income", "expense"]},
                    "amount": {"type": "string", "description": "Positive decimal amount, e.g. '500.00'."},
                    "note": {"type": "string", "description": "Optional note/description."},
                    "occurred_at": {
                        "type": "string",
                        "description": "ISO 8601 datetime, e.g. '2026-09-30T00:00:00'. Defaults to now if omitted.",
                    },
                },
                "required": ["account_id", "kind", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_budget",
            "description": (
                "Propose creating a new monthly budget limit for an expense "
                "category. This requires user confirmation before it takes effect."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category_id": {"type": "integer"},
                    "year": {"type": "integer", "description": "Optional. Defaults to current year."},
                    "month": {"type": "integer", "description": "Optional. Defaults to current month."},
                    "limit_amount": {"type": "string", "description": "Positive decimal amount, e.g. '15000.00'."},
                },
                "required": ["category_id", "limit_amount"],
            },
        },
    },
]