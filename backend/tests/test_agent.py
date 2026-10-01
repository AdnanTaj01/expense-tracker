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

def test_agent_chat_write_tool_requires_confirmation(client: TestClient):
    token = _register_and_login(client, "agentuser5@example.com")

    tool_call_response = ChatCompletionResult(
        content="I'd like to add this expense.",
        tool_calls=[
            ToolCall(
                id="call_1",
                name="create_transaction",
                arguments={"account_id": 1, "kind": "expense", "amount": "500.00", "note": "lunch"},
            )
        ],
    )

    with patch(
        "app.services.agent_service.chat_with_tools",
        return_value=tool_call_response,
    ):
        resp = client.post(
            "/api/v1/agent/chat",
            headers=_auth(token),
            json={"message": "Add a 500 lunch expense"},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["pending_action"] is not None
    assert data["pending_action"]["tool"] == "create_transaction"
    assert "500.00" in data["pending_action"]["description"]
    # Nothing should have been created yet.
    assert data["tool_calls"] == []


def test_agent_confirm_creates_transaction(client: TestClient):
    token = _register_and_login(client, "agentuser6@example.com")

    account = client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Cash", "type": "cash"},
    ).json()

    resp = client.post(
        "/api/v1/agent/confirm",
        headers=_auth(token),
        json={
            "tool": "create_transaction",
            "arguments": {
                "account_id": account["id"],
                "kind": "expense",
                "amount": "500.00",
                "note": "lunch",
                "occurred_at": "2026-09-30T00:00:00",
            },
        },
    )

    assert resp.status_code == 200
    result = resp.json()["result"]
    assert result["amount"] == "500.00"
    assert result["note"] == "lunch"

    # Confirm it actually landed in the transactions list.
    txs = client.get("/api/v1/transactions", headers=_auth(token)).json()
    assert txs["total"] == 1


def test_agent_confirm_rejects_non_write_tool(client: TestClient):
    token = _register_and_login(client, "agentuser7@example.com")
    resp = client.post(
        "/api/v1/agent/confirm",
        headers=_auth(token),
        json={"tool": "list_accounts", "arguments": {}},
    )
    assert resp.status_code == 200
    assert "error" in resp.json()["result"]