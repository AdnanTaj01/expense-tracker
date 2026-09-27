"""Phase 18D — chat (RAG) endpoint tests.

Mocks search_chunks (no real embedding model) and the LLM call
(no real Groq API) so these tests are fast and deterministic.
"""
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.ai.llm.client import LLMUnavailableError
from app.ai.rag.search import SearchResult
from app.models.document import Document
from app.models.user import User


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


def _make_document(db_session, email: str, name: str = "budget.txt") -> Document:
    user = db_session.query(User).filter(User.email == email).one()
    document = Document(
        user_id=user.id,
        stored_name="fake-stored-name.txt",
        original_name=name,
        content_type="text/plain",
        size_bytes=100,
        status="ready",
        text_content="fake content",
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


def test_chat_requires_auth(client: TestClient):
    resp = client.post("/api/v1/chat", json={"message": "hi"})
    assert resp.status_code == 401


def test_chat_returns_answer_from_mocked_search_and_llm(client: TestClient, db_session):
    token = _register_and_login(client, "chatuser1@example.com")
    doc = _make_document(db_session, email="chatuser1@example.com", name="budget.txt")

    fake_results = [
        SearchResult(
            chunk_id=1,
            document_id=doc.id,
            chunk_index=0,
            content="Last month I spent 15000 on food delivery.",
            distance=0.1,
        )
    ]

    with patch("app.services.chat_service.search_chunks", return_value=fake_results):
        with patch("app.services.chat_service.llm_chat", return_value="You spent 15000 on food delivery."):
            resp = client.post(
                "/api/v1/chat",
                headers=_auth(token),
                json={"message": "How much did I spend on food delivery?"},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "You spent 15000 on food delivery."
    assert len(data["sources"]) == 1
    assert data["sources"][0]["document_id"] == doc.id
    assert data["sources"][0]["document_name"] == "budget.txt"


def test_chat_with_no_relevant_chunks_skips_llm_call(client: TestClient):
    token = _register_and_login(client, "chatuser2@example.com")

    with patch("app.services.chat_service.search_chunks", return_value=[]):
        with patch("app.services.chat_service.llm_chat") as mock_llm:
            resp = client.post(
                "/api/v1/chat",
                headers=_auth(token),
                json={"message": "Anything in my documents?"},
            )

    assert resp.status_code == 200
    data = resp.json()
    assert data["sources"] == []
    assert "couldn't find" in data["answer"].lower()
    mock_llm.assert_not_called()


def test_chat_returns_503_when_llm_unavailable(client: TestClient, db_session):
    token = _register_and_login(client, "chatuser3@example.com")
    doc = _make_document(db_session, email="chatuser3@example.com", name="notes.txt")

    fake_results = [
        SearchResult(
            chunk_id=1,
            document_id=doc.id,
            chunk_index=0,
            content="Some content.",
            distance=0.2,
        )
    ]

    with patch("app.services.chat_service.search_chunks", return_value=fake_results):
        with patch(
            "app.services.chat_service.llm_chat",
            side_effect=LLMUnavailableError("no api key"),
        ):
            resp = client.post(
                "/api/v1/chat",
                headers=_auth(token),
                json={"message": "What's in my notes?"},
            )

    assert resp.status_code == 503
    assert "unavailable" in resp.json()["detail"].lower()


def test_chat_rejects_empty_message(client: TestClient):
    token = _register_and_login(client, "chatuser4@example.com")
    resp = client.post(
        "/api/v1/chat",
        headers=_auth(token),
        json={"message": ""},
    )
    assert resp.status_code == 422