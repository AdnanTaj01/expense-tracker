"""Phase 18B — document upload, extraction, and CRUD tests."""

import io

from fastapi.testclient import TestClient


def _register_and_login(
    client: TestClient, email: str = "docuser@example.com", password: str = "StrongPass123!"
) -> str:
    """Helper: register a user and return their Bearer token."""
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

def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_upload_txt_document_extracts_text(client: TestClient):
    token = _register_and_login(client)
    file_content = b"Hello, this is a test document for RAG."
    resp = client.post(
        "/api/v1/documents",
        headers=_auth_headers(token),
        files={"file": ("notes.txt", io.BytesIO(file_content), "text/plain")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["original_name"] == "notes.txt"
    assert data["status"] == "ready"
    assert data["error_message"] is None
    assert data["page_count"] is None


def test_upload_rejects_unsupported_extension(client: TestClient):
    token = _register_and_login(client, "docuser2@example.com")
    resp = client.post(
        "/api/v1/documents",
        headers=_auth_headers(token),
        files={"file": ("resume.docx", io.BytesIO(b"fake"), "application/octet-stream")},
    )
    assert resp.status_code == 400


def test_upload_rejects_oversized_file(client: TestClient, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "DOCUMENT_MAX_SIZE_MB", 0)
    token = _register_and_login(client, "docuser3@example.com")
    resp = client.post(
        "/api/v1/documents",
        headers=_auth_headers(token),
        files={"file": ("big.txt", io.BytesIO(b"some content"), "text/plain")},
    )
    assert resp.status_code == 400


def test_list_documents_returns_only_own(client: TestClient):
    token_a = _register_and_login(client, "docuser4@example.com")
    token_b = _register_and_login(client, "docuser5@example.com")

    client.post(
        "/api/v1/documents",
        headers=_auth_headers(token_a),
        files={"file": ("a.txt", io.BytesIO(b"file a"), "text/plain")},
    )

    resp_b = client.get("/api/v1/documents", headers=_auth_headers(token_b))
    assert resp_b.status_code == 200
    assert resp_b.json() == []

    resp_a = client.get("/api/v1/documents", headers=_auth_headers(token_a))
    assert resp_a.status_code == 200
    assert len(resp_a.json()) == 1


def test_get_document_not_found_for_other_user(client: TestClient):
    token_a = _register_and_login(client, "docuser6@example.com")
    token_b = _register_and_login(client, "docuser7@example.com")

    upload = client.post(
        "/api/v1/documents",
        headers=_auth_headers(token_a),
        files={"file": ("a.txt", io.BytesIO(b"file a"), "text/plain")},
    )
    doc_id = upload.json()["id"]

    resp = client.get(f"/api/v1/documents/{doc_id}", headers=_auth_headers(token_b))
    assert resp.status_code == 404


def test_download_document(client: TestClient):
    token = _register_and_login(client, "docuser8@example.com")
    content = b"downloadable content"
    upload = client.post(
        "/api/v1/documents",
        headers=_auth_headers(token),
        files={"file": ("d.txt", io.BytesIO(content), "text/plain")},
    )
    doc_id = upload.json()["id"]

    resp = client.get(
        f"/api/v1/documents/{doc_id}/download", headers=_auth_headers(token)
    )
    assert resp.status_code == 200
    assert resp.content == content


def test_delete_document(client: TestClient):
    token = _register_and_login(client, "docuser9@example.com")
    upload = client.post(
        "/api/v1/documents",
        headers=_auth_headers(token),
        files={"file": ("e.txt", io.BytesIO(b"delete me"), "text/plain")},
    )
    doc_id = upload.json()["id"]

    resp = client.delete(f"/api/v1/documents/{doc_id}", headers=_auth_headers(token))
    assert resp.status_code == 204

    resp2 = client.get(f"/api/v1/documents/{doc_id}", headers=_auth_headers(token))
    assert resp2.status_code == 404