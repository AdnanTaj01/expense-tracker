"""Phase 18A — AI foundation tests.

These tests verify configuration wiring and error handling.
They do NOT call the real Groq API or load the real embedding
model — that would be slow and require a live API key.
"""
from unittest.mock import MagicMock, patch

import pytest

from app.ai.llm.client import (
    ChatMessage,
    LLMUnavailableError,
    chat,
)
from app.ai.rag.embeddings import dimension
from app.core.config import settings


def test_settings_has_llm_config():
    assert settings.GROQ_MODEL
    assert settings.EMBEDDING_MODEL
    assert settings.EMBEDDING_DIM == 384


def test_llm_enabled_flag_reads_api_key():
    assert isinstance(settings.llm_enabled, bool)


def test_chat_raises_when_disabled():
    with patch.object(settings, "GROQ_API_KEY", ""):
        with pytest.raises(LLMUnavailableError):
            chat([ChatMessage(role="user", content="hi")])


def test_chat_calls_groq_with_correct_args():
    fake_response = MagicMock()
    fake_response.choices = [MagicMock()]
    fake_response.choices[0].message.content = "pong"

    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = fake_response

    with patch.object(settings, "GROQ_API_KEY", "fake-key"):
        with patch("app.ai.llm.client._client", fake_client):
            out = chat([ChatMessage(role="user", content="ping")])

    assert out == "pong"
    fake_client.chat.completions.create.assert_called_once()
    _, kwargs = fake_client.chat.completions.create.call_args
    assert kwargs["model"] == settings.GROQ_MODEL
    assert kwargs["messages"][0]["content"] == "ping"
    assert kwargs["messages"][0]["role"] == "user"


def test_embedding_dimension():
    assert dimension() == 384