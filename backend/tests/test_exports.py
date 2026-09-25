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


def test_transactions_csv(client):
    token = _register_and_login(client, "exp_tx@example.com")
    acc = client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Meezan", "type": "checking", "currency": "PKR", "balance": "0.00"},
    ).json()
    cats = client.get("/api/v1/categories?kind=expense", headers=_auth(token)).json()
    food = next(c for c in cats if c["name"] == "Food")

    client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": acc["id"],
            "category_id": food["id"],
            "kind": "expense",
            "amount": "250.50",
            "note": "Lunch, with team",
            "occurred_at": datetime(2026, 9, 20, 12, 0, tzinfo=timezone.utc).isoformat(),
        },
    )

    r = client.get("/api/v1/exports/transactions.csv", headers=_auth(token))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"]
    body = r.text
    # Header
    assert "Date,Kind,Amount,Account,Category,Note" in body
    # Row with quoted note (contains comma)
    assert "2026-09-20,expense,250.50,Meezan,Food," in body
    assert '"Lunch, with team"' in body


def test_accounts_csv(client):
    token = _register_and_login(client, "exp_acct@example.com")
    client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Meezan", "type": "checking", "currency": "PKR", "balance": "1000.00"},
    )
    client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Cash", "type": "cash", "currency": "PKR", "balance": "500.00"},
    )

    r = client.get("/api/v1/exports/accounts.csv", headers=_auth(token))
    assert r.status_code == 200
    body = r.text
    assert "Name,Type,Currency,Balance,Active" in body
    assert "Meezan,checking,PKR,1000.00,yes" in body
    assert "Cash,cash,PKR,500.00,yes" in body


def test_budgets_csv(client):
    token = _register_and_login(client, "exp_bud@example.com")
    cats = client.get("/api/v1/categories?kind=expense", headers=_auth(token)).json()
    food = next(c for c in cats if c["name"] == "Food")

    client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": 2026,
            "month": 9,
            "limit_amount": "5000.00",
        },
    )

    r = client.get(
        "/api/v1/exports/budgets.csv?year=2026&month=9",
        headers=_auth(token),
    )
    assert r.status_code == 200
    body = r.text
    assert "Category,Year,Month,Limit,Spent,Remaining,Percentage,Over Budget" in body
    assert "Food,2026,9,5000.00,0.00,5000.00,0.00,no" in body


def test_exports_require_auth(client):
    assert client.get("/api/v1/exports/transactions.csv").status_code == 401
    assert client.get("/api/v1/exports/accounts.csv").status_code == 401
    assert client.get("/api/v1/exports/budgets.csv").status_code == 401


def test_exports_isolated_between_users(client):
    token_a = _register_and_login(client, "exp_iso_a@example.com")
    token_b = _register_and_login(client, "exp_iso_b@example.com")

    client.post(
        "/api/v1/accounts",
        headers=_auth(token_a),
        json={"name": "Secret", "type": "cash", "currency": "PKR", "balance": "0.00"},
    )

    r = client.get("/api/v1/exports/accounts.csv", headers=_auth(token_b))
    assert r.status_code == 200
    assert "Secret" not in r.text