"""Phase 19 — agent chat (finance tools) endpoint tests.

Mocks chat_with_tools (no real Groq call) so these tests are fast
and deterministic. Tool functions themselves are exercised for real
against the test DB (they're simple, ownership-scoped reads).
"""
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.ai.llm.client import ChatCompletionResult, LLMUnavailableError, ToolCall


def _register_and_login(client: TestClient, email: str, password: str = "StrongPass123!") -> str:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Test User",
            "currency": "PKR",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    return login.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_agent_chat_requires_auth(client: TestClient):
    resp = client.post("/api/v1/agent/chat", json={"message": "hi"})
    assert resp.status_code == 401


def test_agent_chat_answers_directly_without_tools(client: TestClient):
    token = _register_and_login(client, "agentuser1@example.com")

    with patch(
        "app.services.agent_service.chat_with_tools",
        return_value=ChatCompletionResult(content="Hello there!", tool_calls=[]),
    ):
        resp = client.post(
            "/api/v1/agent/chat",
            headers=_auth(token),
            json={"message": "hi"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "Hello there!"
    assert data["tool_calls"] == []


def test_agent_chat_calls_a_tool_and_returns_final_answer(client: TestClient):
    token = _register_and_login(client, "agentuser2@example.com")

    tool_call_response = ChatCompletionResult(
        content=None,
        tool_calls=[ToolCall(id="call_1", name="list_accounts", arguments={})],
    )
    final_response = ChatCompletionResult(
        content="You have 0 accounts.", tool_calls=[]
    )

    with patch(
        "app.services.agent_service.chat_with_tools",
        side_effect=[tool_call_response, final_response],
    ):
        resp = client.post(
            "/api/v1/agent/chat",
            headers=_auth(token),
            json={"message": "How many accounts do I have?"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "You have 0 accounts."
    assert len(data["tool_calls"]) == 1
    assert data["tool_calls"][0]["tool"] == "list_accounts"
    assert data["tool_calls"][0]["result"] == {"accounts": []}


def test_agent_chat_returns_503_when_llm_unavailable(client: TestClient):
    token = _register_and_login(client, "agentuser3@example.com")

    with patch(
        "app.services.agent_service.chat_with_tools",
        side_effect=LLMUnavailableError("no api key"),
    ):
        resp = client.post(
            "/api/v1/agent/chat",
            headers=_auth(token),
            json={"message": "What's my balance?"},
        )

    assert resp.status_code == 503
    assert "unavailable" in resp.json()["detail"].lower()


def test_agent_chat_rejects_empty_message(client: TestClient):
    token = _register_and_login(client, "agentuser4@example.com")
    resp = client.post(
        "/api/v1/agent/chat",
        headers=_auth(token),
        json={"message": ""},
    )
    assert resp.status_code == 422