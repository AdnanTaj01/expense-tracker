from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.ai.agent.tools import TOOL_DEFINITIONS, TOOL_REGISTRY
from app.ai.llm.client import ChatMessage, chat_with_tools
from app.models.user import User
from app.schemas.agent import AgentChatResponse, AgentToolCallLog

SYSTEM_PROMPT = (
    "You are a helpful financial assistant for a personal expense-tracker "
    "app. You have read-only tools to look up the user's real account "
    "balances, transactions, and budgets. Always use a tool to get current "
    "data before answering questions about the user's finances — never "
    "guess or make up numbers. Be concise and use the user's currency "
    "symbol/code as returned by the tools."
)

MAX_TOOL_ROUNDS = 4


def ask(db: Session, user: User, message: str) -> AgentChatResponse:
    messages: list[ChatMessage] = [
        ChatMessage(role="system", content=SYSTEM_PROMPT),
        ChatMessage(role="user", content=message),
    ]
    tool_log: list[AgentToolCallLog] = []

    for _ in range(MAX_TOOL_ROUNDS):
        result = chat_with_tools(messages, TOOL_DEFINITIONS)

        if not result.tool_calls:
            return AgentChatResponse(answer=result.content or "", tool_calls=tool_log)

        # Record the assistant's tool-call request in the conversation.
        messages.append(
            ChatMessage(
                role="assistant",
                content=result.content,
                tool_calls=[
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.name,
                            "arguments": json.dumps(tc.arguments),
                        },
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
                    role="tool",
                    tool_call_id=tc.id,
                    name=tc.name,
                    content=json.dumps(tool_result),
                )
            )

    # Ran out of tool-call rounds — ask once more for a final answer.
    final = chat_with_tools(messages, TOOL_DEFINITIONS)
    return AgentChatResponse(answer=final.content or "", tool_calls=tool_log)