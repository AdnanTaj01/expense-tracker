from datetime import datetime, timezone


def _register_and_login(client, email: str, password: str = "StrongPass123!") -> str:
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


def _make_account(client, token: str, balance: str = "100000.00") -> dict:
    return client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": "Meezan", "type": "checking", "currency": "PKR", "balance": balance},
    ).json()


def _find_category(client, token: str, name: str, kind: str) -> dict:
    cats = client.get(
        f"/api/v1/categories?kind={kind}", headers=_auth(token)
    ).json()
    for c in cats:
        if c["name"] == name:
            return c
    raise AssertionError(f"{name}/{kind} not found")


def _make_expense(
    client,
    token: str,
    account_id: int,
    category_id: int,
    amount: str,
    when: datetime | None = None,
) -> dict:
    when = when or datetime.now(timezone.utc)
    return client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": account_id,
            "category_id": category_id,
            "kind": "expense",
            "amount": amount,
            "note": "test",
            "occurred_at": when.isoformat(),
        },
    ).json()


# ---------- Basic CRUD ----------


def test_create_budget(client):
    token = _register_and_login(client, "budget_create@example.com")
    food = _find_category(client, token, "Food", "expense")

    now = datetime.now(timezone.utc)
    r = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "10000.00",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["category_id"] == food["id"]
    assert body["limit_amount"] == "10000.00"
    assert body["spent"] == "0.00"
    assert body["remaining"] == "10000.00"
    assert body["percentage"] == "0.00"
    assert body["is_exceeded"] is False
    assert body["category_name"] == "Food"


def test_budget_requires_expense_category(client):
    """Cannot set a budget on an income category."""
    token = _register_and_login(client, "budget_income@example.com")
    salary = _find_category(client, token, "Salary", "income")

    now = datetime.now(timezone.utc)
    r = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": salary["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "1000.00",
        },
    )
    assert r.status_code == 400
    assert "expense" in r.json()["detail"].lower()


def test_budget_duplicate_period(client):
    token = _register_and_login(client, "budget_dup@example.com")
    food = _find_category(client, token, "Food", "expense")
    now = datetime.now(timezone.utc)
    payload = {
        "category_id": food["id"],
        "year": now.year,
        "month": now.month,
        "limit_amount": "1000.00",
    }
    first = client.post("/api/v1/budgets", headers=_auth(token), json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/budgets", headers=_auth(token), json=payload)
    assert second.status_code == 400
    assert "already exists" in second.json()["detail"].lower()


def test_budget_invalid_category(client):
    token = _register_and_login(client, "budget_badcat@example.com")
    now = datetime.now(timezone.utc)
    r = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": 99999,
            "year": now.year,
            "month": now.month,
            "limit_amount": "1000.00",
        },
    )
    assert r.status_code == 400


def test_budget_rejects_zero_limit(client):
    token = _register_and_login(client, "budget_zero@example.com")
    food = _find_category(client, token, "Food", "expense")
    now = datetime.now(timezone.utc)
    r = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "0.00",
        },
    )
    assert r.status_code == 422


# ---------- Usage calculation ----------


def test_usage_reflects_transactions(client):
    token = _register_and_login(client, "budget_usage@example.com")
    account = _make_account(client, token)
    food = _find_category(client, token, "Food", "expense")
    now = datetime.now(timezone.utc)

    # Create budget for this month with 10000 limit
    budget = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "10000.00",
        },
    ).json()

    # Spend 2500 in two expenses
    _make_expense(client, token, account["id"], food["id"], "1500.00", now)
    _make_expense(client, token, account["id"], food["id"], "1000.00", now)

    r = client.get(f"/api/v1/budgets/{budget['id']}", headers=_auth(token))
    body = r.json()
    assert body["spent"] == "2500.00"
    assert body["remaining"] == "7500.00"
    assert body["percentage"] == "25.00"
    assert body["is_exceeded"] is False


def test_usage_exceeded(client):
    token = _register_and_login(client, "budget_exceed@example.com")
    account = _make_account(client, token)
    food = _find_category(client, token, "Food", "expense")
    now = datetime.now(timezone.utc)

    budget = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "1000.00",
        },
    ).json()

    _make_expense(client, token, account["id"], food["id"], "1500.00", now)

    r = client.get(f"/api/v1/budgets/{budget['id']}", headers=_auth(token))
    body = r.json()
    assert body["spent"] == "1500.00"
    assert body["is_exceeded"] is True
    assert body["remaining"] == "-500.00"
    assert body["percentage"] == "150.00"


def test_usage_ignores_other_months(client):
    token = _register_and_login(client, "budget_months@example.com")
    account = _make_account(client, token)
    food = _find_category(client, token, "Food", "expense")

    # Budget for Sept 2026
    budget = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": 2026,
            "month": 9,
            "limit_amount": "10000.00",
        },
    ).json()

    sept = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)
    oct_ = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)

    _make_expense(client, token, account["id"], food["id"], "500.00", sept)
    _make_expense(client, token, account["id"], food["id"], "999.00", oct_)

    r = client.get(f"/api/v1/budgets/{budget['id']}", headers=_auth(token))
    assert r.json()["spent"] == "500.00"


def test_usage_ignores_income(client):
    """Income transactions must not reduce a budget."""
    token = _register_and_login(client, "budget_income_ignore@example.com")
    account = _make_account(client, token)
    food = _find_category(client, token, "Food", "expense")
    now = datetime.now(timezone.utc)

    budget = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "10000.00",
        },
    ).json()

    # Expense 300 (should count) + income 500 (should NOT count)
    _make_expense(client, token, account["id"], food["id"], "300.00", now)
    client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": account["id"],
            "category_id": food["id"],
            "kind": "income",
            "amount": "500.00",
            "occurred_at": now.isoformat(),
        },
    )

    r = client.get(f"/api/v1/budgets/{budget['id']}", headers=_auth(token))
    assert r.json()["spent"] == "300.00"


# ---------- Update / Delete ----------


def test_update_budget_limit(client):
    token = _register_and_login(client, "budget_update@example.com")
    food = _find_category(client, token, "Food", "expense")
    now = datetime.now(timezone.utc)
    budget = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "1000.00",
        },
    ).json()

    r = client.patch(
        f"/api/v1/budgets/{budget['id']}",
        headers=_auth(token),
        json={"limit_amount": "5000.00"},
    )
    assert r.status_code == 200
    assert r.json()["limit_amount"] == "5000.00"


def test_delete_budget(client):
    token = _register_and_login(client, "budget_del@example.com")
    food = _find_category(client, token, "Food", "expense")
    now = datetime.now(timezone.utc)
    budget = client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "1000.00",
        },
    ).json()

    assert (
        client.delete(
            f"/api/v1/budgets/{budget['id']}", headers=_auth(token)
        ).status_code
        == 204
    )
    assert (
        client.get(
            f"/api/v1/budgets/{budget['id']}", headers=_auth(token)
        ).status_code
        == 404
    )


# ---------- List + filters + auth + ownership ----------


def test_list_budgets_filter_by_period(client):
    token = _register_and_login(client, "budget_list@example.com")
    food = _find_category(client, token, "Food", "expense")
    rent = _find_category(client, token, "Rent", "expense")

    client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": food["id"],
            "year": 2026,
            "month": 9,
            "limit_amount": "1000.00",
        },
    )
    client.post(
        "/api/v1/budgets",
        headers=_auth(token),
        json={
            "category_id": rent["id"],
            "year": 2026,
            "month": 10,
            "limit_amount": "2000.00",
        },
    )

    sept = client.get(
        "/api/v1/budgets?year=2026&month=9", headers=_auth(token)
    ).json()
    assert len(sept) == 1
    assert sept[0]["category_name"] == "Food"


def test_budgets_require_auth(client):
    assert client.get("/api/v1/budgets").status_code == 401


def test_user_cannot_see_other_users_budget(client):
    token_a = _register_and_login(client, "budget_owner_a@example.com")
    token_b = _register_and_login(client, "budget_owner_b@example.com")

    food_a = _find_category(client, token_a, "Food", "expense")
    now = datetime.now(timezone.utc)

    budget_a = client.post(
        "/api/v1/budgets",
        headers=_auth(token_a),
        json={
            "category_id": food_a["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "1000.00",
        },
    ).json()

    assert (
        client.get(
            f"/api/v1/budgets/{budget_a['id']}", headers=_auth(token_b)
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/budgets/{budget_a['id']}",
            headers=_auth(token_b),
            json={"limit_amount": "9999.00"},
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/budgets/{budget_a['id']}", headers=_auth(token_b)
        ).status_code
        == 404
    )

    # B's listing is empty.
    assert client.get("/api/v1/budgets", headers=_auth(token_b)).json() == []


def test_cannot_use_other_users_category(client):
    token_a = _register_and_login(client, "budget_cross_a@example.com")
    token_b = _register_and_login(client, "budget_cross_b@example.com")

    food_a = _find_category(client, token_a, "Food", "expense")
    now = datetime.now(timezone.utc)

    r = client.post(
        "/api/v1/budgets",
        headers=_auth(token_b),
        json={
            "category_id": food_a["id"],
            "year": now.year,
            "month": now.month,
            "limit_amount": "1000.00",
        },
    )
    assert r.status_code == 400