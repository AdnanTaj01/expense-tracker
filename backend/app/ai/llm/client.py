"""Groq LLM client wrapper.

The app must keep working when the AI is down. This module exposes a
small interface so the provider can be swapped later.
"""
from __future__ import annotations

from dataclasses import dataclass

from groq import Groq

from app.core.config import settings


class LLMUnavailableError(RuntimeError):
    """Raised when the LLM cannot be reached or is not configured."""


@dataclass
class ChatMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


_client: Groq | None = None


def _get_client() -> Groq:
    if not settings.llm_enabled:
        raise LLMUnavailableError("GROQ_API_KEY is not set")
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def chat(
    messages: list[ChatMessage],
    *,
    temperature: float = 0.2,
    max_tokens: int = 800,
) -> str:
    """Send a chat completion request and return the assistant's text.

    Raises LLMUnavailableError if the AI is down or not configured.
    """
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""
    except LLMUnavailableError:
        raise
    except Exception as exc:  # noqa: BLE001 — wrap any provider error
        raise LLMUnavailableError(str(exc)) from exc