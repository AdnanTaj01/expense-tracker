def _register_and_login(client, email: str, password: str = "StrongPass123!") -> str:
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


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_create_account(client):
    token = _register_and_login(client, "acct_create@example.com")
    response = client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={
            "name": "Meezan Bank",
            "type": "checking",
            "currency": "PKR",
            "balance": "5000.00",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Meezan Bank"
    assert data["type"] == "checking"
    assert data["balance"] == "5000.00"
    assert data["is_active"] is True
    assert "id" in data


def test_create_account_invalid_type(client):
    token = _register_and_login(client, "acct_badtype@example.com")
    response = client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Bad", "type": "not_a_type"},
    )
    assert response.status_code == 422


def test_list_accounts(client):
    token = _register_and_login(client, "acct_list@example.com")
    client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "A", "type": "cash"},
    )
    client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "B", "type": "savings"},
    )

    response = client.get("/api/v1/accounts", headers=_auth(token))
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_update_account(client):
    token = _register_and_login(client, "acct_update@example.com")
    created = client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Old", "type": "cash"},
    ).json()

    response = client.patch(
        f"/api/v1/accounts/{created['id']}",
        headers=_auth(token),
        json={"name": "New"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_update_account_cannot_set_balance(client):
    """balance is not part of AccountUpdate — it should be ignored."""
    token = _register_and_login(client, "acct_balance@example.com")
    created = client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Wallet", "type": "cash", "balance": "100.00"},
    ).json()

    response = client.patch(
        f"/api/v1/accounts/{created['id']}",
        headers=_auth(token),
        json={"name": "Wallet", "balance": "9999.00"},
    )
    assert response.status_code == 200
    # Balance must remain unchanged.
    assert response.json()["balance"] == "100.00"


def test_delete_account(client):
    token = _register_and_login(client, "acct_del@example.com")
    created = client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Temp", "type": "cash"},
    ).json()

    response = client.delete(
        f"/api/v1/accounts/{created['id']}",
        headers=_auth(token),
    )
    assert response.status_code == 204

    # Confirm gone.
    get = client.get(
        f"/api/v1/accounts/{created['id']}",
        headers=_auth(token),
    )
    assert get.status_code == 404


def test_accounts_require_auth(client):
    assert client.get("/api/v1/accounts").status_code == 401
    assert client.post("/api/v1/accounts", json={"name": "X", "type": "cash"}).status_code == 401


def test_user_cannot_see_other_users_account(client):
    """Ownership check — user B must not see user A's account (Page 55)."""
    token_a = _register_and_login(client, "owner_a@example.com")
    token_b = _register_and_login(client, "owner_b@example.com")

    account_a = client.post(
        "/api/v1/accounts",
        headers=_auth(token_a),
        json={"name": "A's Meezan", "type": "checking"},
    ).json()

    # B cannot read it.
    get_b = client.get(
        f"/api/v1/accounts/{account_a['id']}",
        headers=_auth(token_b),
    )
    assert get_b.status_code == 404

    # B cannot update it.
    patch_b = client.patch(
        f"/api/v1/accounts/{account_a['id']}",
        headers=_auth(token_b),
        json={"name": "Hacked"},
    )
    assert patch_b.status_code == 404

    # B cannot delete it.
    del_b = client.delete(
        f"/api/v1/accounts/{account_a['id']}",
        headers=_auth(token_b),
    )
    assert del_b.status_code == 404

    # B's listing is empty.
    list_b = client.get("/api/v1/accounts", headers=_auth(token_b))
    assert list_b.json() == []

    # A still sees it.
    list_a = client.get("/api/v1/accounts", headers=_auth(token_a))
    assert len(list_a.json()) == 1