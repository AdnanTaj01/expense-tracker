from datetime import datetime, timezone


def _register_and_login(client, email: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "StrongPass123!",
            "full_name": "Test",
            "currency": "PKR",
        },
    )
    return client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "StrongPass123!"},
    ).json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _make_account(client, token: str) -> dict:
    return client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Meezan", "type": "checking", "currency": "PKR", "balance": "0.00"},
    ).json()


def _make_tx(client, token: str, account_id: int) -> dict:
    return client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": account_id,
            "kind": "expense",
            "amount": "100.00",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    ).json()


def _png_bytes() -> bytes:
    return bytes.fromhex(
        "89504E470D0A1A0A0000000D494844520000000100000001080600000"
        "01F15C4890000000A49444154789C6360000002000100FFFF0300000600"
        "0557BFABD40000000049454E44AE426082"
    )


def test_upload_receipt(client):
    token = _register_and_login(client, "rec_up@example.com")
    r = client.post(
        "/api/v1/receipts",
        headers=_auth(token),
        files={"file": ("lunch.png", _png_bytes(), "image/png")},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["original_name"] == "lunch.png"
    assert body["content_type"] == "image/png"
    assert body["size_bytes"] > 0
    assert body["transaction_id"] is None


def test_upload_rejects_wrong_type(client):
    token = _register_and_login(client, "rec_bad@example.com")
    r = client.post(
        "/api/v1/receipts",
        headers=_auth(token),
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 400


def test_upload_rejects_empty_file(client):
    token = _register_and_login(client, "rec_empty@example.com")
    r = client.post(
        "/api/v1/receipts",
        headers=_auth(token),
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert r.status_code == 400


def test_upload_attach_to_transaction(client):
    token = _register_and_login(client, "rec_tx@example.com")
    acc = _make_account(client, token)
    tx = _make_tx(client, token, acc["id"])

    r = client.post(
        "/api/v1/receipts",
        headers=_auth(token),
        files={"file": ("lunch.png", _png_bytes(), "image/png")},
        data={"transaction_id": str(tx["id"])},
    )
    assert r.status_code == 201
    assert r.json()["transaction_id"] == tx["id"]


def test_upload_rejects_other_users_transaction(client):
    token_a = _register_and_login(client, "rec_cross_a@example.com")
    token_b = _register_and_login(client, "rec_cross_b@example.com")

    acc = _make_account(client, token_a)
    tx = _make_tx(client, token_a, acc["id"])

    r = client.post(
        "/api/v1/receipts",
        headers=_auth(token_b),
        files={"file": ("lunch.png", _png_bytes(), "image/png")},
        data={"transaction_id": str(tx["id"])},
    )
    assert r.status_code == 400


def test_list_download_delete(client):
    token = _register_and_login(client, "rec_dl@example.com")
    up = client.post(
        "/api/v1/receipts",
        headers=_auth(token),
        files={"file": ("lunch.png", _png_bytes(), "image/png")},
    ).json()

    r = client.get("/api/v1/receipts", headers=_auth(token))
    assert r.status_code == 200
    assert len(r.json()) == 1

    r2 = client.get(
        f"/api/v1/receipts/{up['id']}/download", headers=_auth(token)
    )
    assert r2.status_code == 200
    assert r2.content == _png_bytes()

    r3 = client.delete(
        f"/api/v1/receipts/{up['id']}", headers=_auth(token)
    )
    assert r3.status_code == 204

    r4 = client.get(f"/api/v1/receipts/{up['id']}", headers=_auth(token))
    assert r4.status_code == 404


def test_receipts_require_auth(client):
    assert client.get("/api/v1/receipts").status_code == 401


def test_user_cannot_see_other_users_receipt(client):
    token_a = _register_and_login(client, "rec_iso_a@example.com")
    token_b = _register_and_login(client, "rec_iso_b@example.com")

    up = client.post(
        "/api/v1/receipts",
        headers=_auth(token_a),
        files={"file": ("a.png", _png_bytes(), "image/png")},
    ).json()

    assert (
        client.get(
            f"/api/v1/receipts/{up['id']}", headers=_auth(token_b)
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/receipts/{up['id']}", headers=_auth(token_b)
        ).status_code
        == 404
    )
    assert client.get("/api/v1/receipts", headers=_auth(token_b)).json() == []