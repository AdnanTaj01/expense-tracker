"""Groq LLM client wrapper.

The app must keep working when the AI is down. This module exposes a
small interface so the provider can be swapped later.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from groq import Groq

from app.core.config import settings


class LLMUnavailableError(RuntimeError):
    """Raised when the LLM cannot be reached or is not configured."""


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant" | "tool"
    content: str | None = None
    tool_calls: list[dict] | None = None  # only on assistant messages
    tool_call_id: str | None = None  # only on tool messages
    name: str | None = None  # only on tool messages


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict = field(default_factory=dict)


@dataclass
class ChatCompletionResult:
    content: str | None
    tool_calls: list[ToolCall]


_client: Groq | None = None


def _get_client() -> Groq:
    if not settings.llm_enabled:
        raise LLMUnavailableError("GROQ_API_KEY is not set")
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def _message_to_dict(m: ChatMessage) -> dict:
    d: dict = {"role": m.role}
    if m.content is not None:
        d["content"] = m.content
    if m.tool_calls is not None:
        d["tool_calls"] = m.tool_calls
    if m.tool_call_id is not None:
        d["tool_call_id"] = m.tool_call_id
    if m.name is not None:
        d["name"] = m.name
    return d


def chat(
    messages: list[ChatMessage],
    *,
    temperature: float = 0.2,
    max_tokens: int = 2000,
) -> str:
    """Send a chat completion request and return the assistant's text.

    Raises LLMUnavailableError if the AI is down or not configured.
    """
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[_message_to_dict(m) for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
    except LLMUnavailableError:
        raise
    except Exception as exc:  # noqa: BLE001 — wrap any provider error
        raise LLMUnavailableError(str(exc)) from exc


def chat_with_tools(
    messages: list[ChatMessage],
    tools: list[dict],
    *,
    temperature: float = 0.2,
    max_tokens: int = 2000,
) -> ChatCompletionResult:
    """Send a chat completion request with tool/function definitions.

    Returns either plain text content, or a list of tool calls the
    model wants to make (never both populated meaningfully at once
    in practice, but both fields are always present).

    Raises LLMUnavailableError if the AI is down or not configured.
    """
    import json

    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[_message_to_dict(m) for m in messages],
            tools=tools,
            tool_choice="auto",
            temperature=temperature,
            max_tokens=max_tokens,
        )
        message = response.choices[0].message
        tool_calls: list[ToolCall] = []
        for tc in message.tool_calls or []:
            try:
                args = json.loads(tc.function.arguments)
            except (json.JSONDecodeError, TypeError):
                args = {}
            tool_calls.append(ToolCall(id=tc.id, name=tc.function.name, arguments=args))
        return ChatCompletionResult(content=message.content, tool_calls=tool_calls)
    except LLMUnavailableError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise LLMUnavailableError(str(exc)) from exc