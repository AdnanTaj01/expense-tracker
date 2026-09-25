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


def _make_account(client, token: str, name: str = "Meezan") -> dict:
    return client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": name, "type": "checking", "currency": "PKR", "balance": "0.00"},
    ).json()


def _make_tx(
    client,
    token: str,
    account_id: int,
    kind: str,
    amount: str,
    when: datetime,
    category_id: int | None = None,
) -> dict:
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


def test_month_comparison(client):
    token = _register_and_login(client, "an_comp@example.com")
    acc = _make_account(client, token)

    _make_tx(
        client, token, acc["id"], "income", "1000.00",
        datetime(2026, 8, 10, 12, 0, tzinfo=timezone.utc),
    )
    _make_tx(
        client, token, acc["id"], "expense", "500.00",
        datetime(2026, 8, 15, 12, 0, tzinfo=timezone.utc),
    )

    _make_tx(
        client, token, acc["id"], "income", "1500.00",
        datetime(2026, 9, 10, 12, 0, tzinfo=timezone.utc),
    )
    _make_tx(
        client, token, acc["id"], "expense", "750.00",
        datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc),
    )

    r = client.get(
        "/api/v1/analytics/month-comparison?year=2026&month=9",
        headers=_auth(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["current_income"] == "1500.00"
    assert body["previous_income"] == "1000.00"
    assert body["current_expense"] == "750.00"
    assert body["previous_expense"] == "500.00"
    # 1500 vs 1000 -> +50%
    assert body["income_change_pct"] == "50.00"
    # 750 vs 500 -> +50%
    assert body["expense_change_pct"] == "50.00"


def test_month_comparison_handles_zero_previous(client):
    token = _register_and_login(client, "an_zerop@example.com")
    acc = _make_account(client, token)

    _make_tx(
        client, token, acc["id"], "income", "500.00",
        datetime(2026, 9, 10, 12, 0, tzinfo=timezone.utc),
    )

    r = client.get(
        "/api/v1/analytics/month-comparison?year=2026&month=9",
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert r.json()["income_change_pct"] is None


def test_category_trend(client):
    token = _register_and_login(client, "an_cat@example.com")
    acc = _make_account(client, token)

    cats = client.get("/api/v1/categories?kind=expense", headers=_auth(token)).json()
    food = next(c for c in cats if c["name"] == "Food")

    _make_tx(
        client, token, acc["id"], "expense", "100.00",
        datetime(2026, 7, 5, 12, 0, tzinfo=timezone.utc),
        category_id=food["id"],
    )
    _make_tx(
        client, token, acc["id"], "expense", "200.00",
        datetime(2026, 8, 5, 12, 0, tzinfo=timezone.utc),
        category_id=food["id"],
    )
    _make_tx(
        client, token, acc["id"], "expense", "300.00",
        datetime(2026, 9, 5, 12, 0, tzinfo=timezone.utc),
        category_id=food["id"],
    )

    r = client.get(
        f"/api/v1/analytics/category-trend?category_id={food['id']}&year=2026&month=9&months=3",
        headers=_auth(token),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["category_name"] == "Food"
    assert len(body["points"]) == 3
    assert body["points"][0]["total"] == "100.00"
    assert body["points"][1]["total"] == "200.00"
    assert body["points"][2]["total"] == "300.00"
    assert body["total"] == "600.00"


def test_category_trend_not_found(client):
    token = _register_and_login(client, "an_catbad@example.com")
    r = client.get(
        "/api/v1/analytics/category-trend?category_id=99999",
        headers=_auth(token),
    )
    assert r.status_code == 404


def test_top_accounts(client):
    token = _register_and_login(client, "an_top@example.com")
    a = _make_account(client, token, "Meezan")
    b = _make_account(client, token, "Cash")

    _make_tx(
        client, token, a["id"], "expense", "5000.00",
        datetime(2026, 9, 10, 12, 0, tzinfo=timezone.utc),
    )
    _make_tx(
        client, token, b["id"], "expense", "500.00",
        datetime(2026, 9, 10, 12, 0, tzinfo=timezone.utc),
    )

    r = client.get(
        "/api/v1/analytics/top-accounts?year=2026&month=9&months=1",
        headers=_auth(token),
    )
    assert r.status_code == 200
    items = r.json()
    assert items[0]["account_name"] == "Meezan"
    assert items[0]["total_expense"] == "5000.00"
    assert items[1]["account_name"] == "Cash"


def test_weekday_heatmap(client):
    token = _register_and_login(client, "an_wd@example.com")
    acc = _make_account(client, token)

    # Monday Sept 7, 2026
    _make_tx(
        client, token, acc["id"], "expense", "100.00",
        datetime(2026, 9, 7, 12, 0, tzinfo=timezone.utc),
    )
    # Tuesday Sept 8, 2026
    _make_tx(
        client, token, acc["id"], "expense", "200.00",
        datetime(2026, 9, 8, 12, 0, tzinfo=timezone.utc),
    )

    r = client.get(
        "/api/v1/analytics/weekday-heatmap?year=2026&month=9&months=1",
        headers=_auth(token),
    )
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 7
    by_name = {i["weekday_name"]: i for i in items}
    assert by_name["Monday"]["total_expense"] == "100.00"
    assert by_name["Tuesday"]["total_expense"] == "200.00"


def test_analytics_requires_auth(client):
    assert client.get("/api/v1/analytics/month-comparison").status_code == 401
    assert client.get("/api/v1/analytics/top-accounts").status_code == 401
    assert client.get("/api/v1/analytics/weekday-heatmap").status_code == 401


def test_analytics_is_isolated_between_users(client):
    token_a = _register_and_login(client, "an_iso_a@example.com")
    token_b = _register_and_login(client, "an_iso_b@example.com")

    acc = _make_account(client, token_a)
    _make_tx(
        client, token_a, acc["id"], "expense", "999.00",
        datetime(2026, 9, 10, 12, 0, tzinfo=timezone.utc),
    )

    r = client.get(
        "/api/v1/analytics/month-comparison?year=2026&month=9",
        headers=_auth(token_b),
    )
    assert r.status_code == 200
    assert r.json()["current_expense"] == "0.00"

    tops = client.get(
        "/api/v1/analytics/top-accounts?year=2026&month=9&months=1",
        headers=_auth(token_b),
    ).json()
    # B has no accounts, so empty list
    assert tops == []