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


def _make_account(
    client, token: str, name: str = "Meezan", balance: str = "0.00"
) -> dict:
    return client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={
            "name": name,
            "type": "checking",
            "currency": "PKR",
            "balance": balance,
        },
    ).json()


def _find_category(client, token: str, name: str, kind: str) -> dict:
    cats = client.get(
        f"/api/v1/categories?kind={kind}", headers=_auth(token)
    ).json()
    for c in cats:
        if c["name"] == name:
            return c
    raise AssertionError(f"{name}/{kind} not found")


def _make_tx(
    client,
    token: str,
    account_id: int,
    kind: str,
    amount: str,
    category_id: int | None = None,
    when: datetime | None = None,
) -> dict:
    when = when or datetime.now(timezone.utc)
    return client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": account_id,
            "category_id": category_id,
            "kind": kind,
            "amount": amount,
            "occurred_at": when.isoformat(),
        },
    ).json()


# ---------- Summary ----------


def test_summary_empty_user(client):
    token = _register_and_login(client, "dash_empty@example.com")
    _make_account(client, token, balance="1500.00")

    r = client.get("/api/v1/dashboard/summary", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["total_balance"] == "1500.00"
    assert body["month_income"] == "0.00"
    assert body["month_expense"] == "0.00"
    assert body["net"] == "0.00"
    assert body["year"] and body["month"]


def test_summary_totals(client):
    token = _register_and_login(client, "dash_totals@example.com")
    account = _make_account(client, token, balance="0.00")
    now = datetime.now(timezone.utc)

    _make_tx(client, token, account["id"], "income", "5000.00", when=now)
    _make_tx(client, token, account["id"], "expense", "1200.00", when=now)
    _make_tx(client, token, account["id"], "expense", "300.00", when=now)

    r = client.get("/api/v1/dashboard/summary", headers=_auth(token))
    body = r.json()
    # Balance after: 0 + 5000 - 1200 - 300 = 3500
    assert body["total_balance"] == "3500.00"
    assert body["month_income"] == "5000.00"
    assert body["month_expense"] == "1500.00"
    assert body["net"] == "3500.00"


def test_summary_ignores_other_months(client):
    token = _register_and_login(client, "dash_months@example.com")
    account = _make_account(client, token, balance="0.00")

    # Old transaction (last year)
    old = datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc)
    _make_tx(client, token, account["id"], "income", "9999.00", when=old)

    # Current month
    now = datetime.now(timezone.utc)
    _make_tx(client, token, account["id"], "expense", "100.00", when=now)

    r = client.get("/api/v1/dashboard/summary", headers=_auth(token))
    body = r.json()
    assert body["month_income"] == "0.00"
    assert body["month_expense"] == "100.00"
    # But total balance includes the old income
    assert body["total_balance"] == "9899.00"


def test_summary_can_target_specific_month(client):
    token = _register_and_login(client, "dash_target@example.com")
    account = _make_account(client, token, balance="0.00")

    _make_tx(
        client,
        token,
        account["id"],
        "income",
        "1000.00",
        when=datetime(2026, 3, 15, 12, 0, tzinfo=timezone.utc),
    )
    _make_tx(
        client,
        token,
        account["id"],
        "expense",
        "250.00",
        when=datetime(2026, 4, 10, 12, 0, tzinfo=timezone.utc),
    )

    r = client.get(
        "/api/v1/dashboard/summary?year=2026&month=3",
        headers=_auth(token),
    )
    body = r.json()
    assert body["month_income"] == "1000.00"
    assert body["month_expense"] == "0.00"


# ---------- Category breakdown ----------


def test_by_category_totals_and_percentages(client):
    token = _register_and_login(client, "dash_cat@example.com")
    account = _make_account(client, token)
    food = _find_category(client, token, "Food", "expense")
    rent = _find_category(client, token, "Rent", "expense")
    now = datetime.now(timezone.utc)

    _make_tx(client, token, account["id"], "expense", "300.00", food["id"], now)
    _make_tx(client, token, account["id"], "expense", "100.00", food["id"], now)
    _make_tx(client, token, account["id"], "expense", "600.00", rent["id"], now)
    # Income should not appear
    _make_tx(client, token, account["id"], "income", "5000.00", when=now)

    r = client.get("/api/v1/dashboard/by-category", headers=_auth(token))
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 2

    # Rent first (600), Food second (400)
    by_name = {i["category_name"]: i for i in items}
    assert by_name["Rent"]["total"] == "600.00"
    assert by_name["Food"]["total"] == "400.00"
    # 600/1000 = 60%, 400/1000 = 40%
    assert by_name["Rent"]["percentage"] == "60.00"
    assert by_name["Food"]["percentage"] == "40.00"
    assert by_name["Food"]["transaction_count"] == 2
    assert by_name["Rent"]["transaction_count"] == 1


def test_by_category_empty(client):
    token = _register_and_login(client, "dash_cat_empty@example.com")
    r = client.get("/api/v1/dashboard/by-category", headers=_auth(token))
    assert r.status_code == 200
    assert r.json() == []


def test_by_category_handles_uncategorized(client):
    token = _register_and_login(client, "dash_uncat@example.com")
    account = _make_account(client, token)
    now = datetime.now(timezone.utc)

    # Transaction with no category
    _make_tx(client, token, account["id"], "expense", "100.00", None, now)

    r = client.get("/api/v1/dashboard/by-category", headers=_auth(token))
    items = r.json()
    assert len(items) == 1
    assert items[0]["category_name"] == "Uncategorized"
    assert items[0]["category_id"] is None


# ---------- Trend ----------


def test_trend_returns_requested_months(client):
    token = _register_and_login(client, "dash_trend@example.com")

    r = client.get(
        "/api/v1/dashboard/trend?months=6", headers=_auth(token)
    )
    assert r.status_code == 200
    points = r.json()
    assert len(points) == 6
    # All zeros for a fresh user
    for p in points:
        assert p["income"] == "0.00"
        assert p["expense"] == "0.00"


def test_trend_orders_oldest_first(client):
    token = _register_and_login(client, "dash_trend_order@example.com")
    r = client.get(
        "/api/v1/dashboard/trend?year=2026&month=6&months=3",
        headers=_auth(token),
    )
    points = r.json()
    assert len(points) == 3
    # Oldest first: April, May, June 2026
    assert (points[0]["year"], points[0]["month"]) == (2026, 4)
    assert (points[1]["year"], points[1]["month"]) == (2026, 5)
    assert (points[2]["year"], points[2]["month"]) == (2026, 6)


def test_trend_includes_values(client):
    token = _register_and_login(client, "dash_trend_vals@example.com")
    account = _make_account(client, token)

    _make_tx(
        client,
        token,
        account["id"],
        "income",
        "1000.00",
        when=datetime(2026, 5, 10, 12, 0, tzinfo=timezone.utc),
    )
    _make_tx(
        client,
        token,
        account["id"],
        "expense",
        "200.00",
        when=datetime(2026, 5, 15, 12, 0, tzinfo=timezone.utc),
    )

    r = client.get(
        "/api/v1/dashboard/trend?year=2026&month=5&months=1",
        headers=_auth(token),
    )
    points = r.json()
    assert len(points) == 1
    assert points[0]["income"] == "1000.00"
    assert points[0]["expense"] == "200.00"


# ---------- Recent ----------


def test_recent_returns_latest_first(client):
    token = _register_and_login(client, "dash_recent@example.com")
    account = _make_account(client, token)

    _make_tx(
        client,
        token,
        account["id"],
        "expense",
        "10.00",
        when=datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
    )
    _make_tx(
        client,
        token,
        account["id"],
        "expense",
        "20.00",
        when=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
    )
    _make_tx(
        client,
        token,
        account["id"],
        "expense",
        "30.00",
        when=datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc),
    )

    r = client.get("/api/v1/dashboard/recent", headers=_auth(token))
    items = r.json()
    assert len(items) == 3
    amounts = [i["amount"] for i in items]
    assert amounts == ["20.00", "30.00", "10.00"]


def test_recent_limit(client):
    token = _register_and_login(client, "dash_recent_limit@example.com")
    account = _make_account(client, token)
    now = datetime.now(timezone.utc)
    for i in range(5):
        _make_tx(client, token, account["id"], "expense", "10.00", when=now)

    r = client.get("/api/v1/dashboard/recent?limit=2", headers=_auth(token))
    assert len(r.json()) == 2


# ---------- Overview ----------


def test_overview_contains_all_sections(client):
    token = _register_and_login(client, "dash_ov@example.com")
    account = _make_account(client, token, balance="100.00")
    now = datetime.now(timezone.utc)
    _make_tx(client, token, account["id"], "income", "500.00", when=now)

    r = client.get("/api/v1/dashboard/overview", headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert "summary" in body
    assert "top_categories" in body
    assert "trend" in body
    assert "recent_transactions" in body
    assert "generated_at" in body
    assert body["summary"]["month_income"] == "500.00"
    assert len(body["trend"]) == 6
    assert len(body["recent_transactions"]) == 1


# ---------- Auth + ownership ----------


def test_dashboard_requires_auth(client):
    assert client.get("/api/v1/dashboard/summary").status_code == 401
    assert client.get("/api/v1/dashboard/overview").status_code == 401


def test_dashboard_is_isolated_between_users(client):
    token_a = _register_and_login(client, "dash_iso_a@example.com")
    token_b = _register_and_login(client, "dash_iso_b@example.com")

    account_a = _make_account(client, token_a, balance="0.00")
    now = datetime.now(timezone.utc)
    _make_tx(client, token_a, account_a["id"], "income", "5000.00", when=now)

    r_b = client.get("/api/v1/dashboard/summary", headers=_auth(token_b))
    body_b = r_b.json()
    # B sees nothing from A
    assert body_b["total_balance"] == "0.00"
    assert body_b["month_income"] == "0.00"

    # B's overview has empty sections
    ov_b = client.get("/api/v1/dashboard/overview", headers=_auth(token_b)).json()
    assert ov_b["top_categories"] == []
    assert ov_b["recent_transactions"] == []

    # A sees their own data
    r_a = client.get("/api/v1/dashboard/summary", headers=_auth(token_a))
    assert r_a.json()["month_income"] == "5000.00"