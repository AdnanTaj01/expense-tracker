from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.ai.llm.client import ChatMessage, chat_with_tools
from app.models.user import User
from app.schemas.agent import (
    AgentChatResponse,
    AgentConfirmResponse,
    AgentToolCallLog,
    PendingAction,
)

SYSTEM_PROMPT = (
    "You are a helpful financial assistant for a personal expense-tracker "
    "app. You have read-only tools to look up the user's real account "
    "balances, transactions, budgets, and categories, and write tools to "
    "propose creating a new transaction or budget. Always use a read tool "
    "to get current data before answering questions about the user's "
    "finances — never guess or make up numbers. When the user asks you to "
    "add, record, or create a transaction, first call list_categories and "
    "pick the category id whose name best matches the transaction's note "
    "or description (e.g. a 'lunch' or 'restaurant' note should use a "
    "Food/Dining-type category if one exists) — only leave category_id "
    "unset if nothing reasonably matches. Then call the appropriate write "
    "tool with your best interpretation of the details — the user will be "
    "asked to confirm before anything is actually created, so propose it "
    "even if some optional fields are missing. Be concise and use the "
    "user's currency symbol/code as returned by the tools."
)
MAX_TOOL_ROUNDS = 4


def ask(db: Session, user: User, message: str) -> AgentChatResponse:
    from app.ai.agent.tools import TOOL_DEFINITIONS, TOOL_REGISTRY
    from app.ai.agent.write_tools import (
        WRITE_TOOL_DEFINITIONS,
        WRITE_TOOL_DESCRIBERS,
        WRITE_TOOL_REGISTRY,
    )

    all_tool_definitions = TOOL_DEFINITIONS + WRITE_TOOL_DEFINITIONS

    messages: list[ChatMessage] = [
        ChatMessage(role="system", content=SYSTEM_PROMPT),
        ChatMessage(role="user", content=message),
    ]
    tool_log: list[AgentToolCallLog] = []

    for _ in range(MAX_TOOL_ROUNDS):
        result = chat_with_tools(messages, all_tool_definitions, max_tokens=800)

        if not result.tool_calls:
            return AgentChatResponse(answer=result.content or "", tool_calls=tool_log)

        for tc in result.tool_calls:
            if tc.name in WRITE_TOOL_REGISTRY:
                describe = WRITE_TOOL_DESCRIBERS.get(tc.name, lambda a: tc.name)
                pending = PendingAction(
                    tool=tc.name,
                    arguments=tc.arguments,
                    description=describe(tc.arguments),
                )
                answer = result.content or f"I'd like to: {pending.description}. Confirm?"
                return AgentChatResponse(
                    answer=answer, tool_calls=tool_log, pending_action=pending
                )

        messages.append(
            ChatMessage(
                role="assistant",
                content=result.content,
                tool_calls=[
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)},
                    }
                    for tc in result.tool_calls
                ],
            )
        )
        for tc in result.tool_calls:
            fn = TOOL_REGISTRY.get(tc.name)
            if fn is None:
                tool_result = {"error": f"Unknown tool: {tc.name}"}
            else:
                try:
                    tool_result = fn(db, user, tc.arguments)
                except Exception as exc:  # noqa: BLE001
                    tool_result = {"error": str(exc)}

            tool_log.append(
                AgentToolCallLog(tool=tc.name, arguments=tc.arguments, result=tool_result)
            )
            messages.append(
                ChatMessage(
                    role="tool", tool_call_id=tc.id, name=tc.name, content=json.dumps(tool_result)
                )
            )

    final = chat_with_tools(
        messages, all_tool_definitions, max_tokens=2000, tool_choice="none"
    )
    return AgentChatResponse(answer=final.content or "", tool_calls=tool_log)


def confirm(db: Session, user: User, tool: str, arguments: dict) -> AgentConfirmResponse:
    """Actually execute a previously proposed write action."""
    from app.ai.agent.write_tools import WRITE_TOOL_REGISTRY

    fn = WRITE_TOOL_REGISTRY.get(tool)
    if fn is None:
        return AgentConfirmResponse(result={"error": f"Unknown or non-write tool: {tool}"})
    result = fn(db, user, arguments)
    return AgentConfirmResponse(result=result)