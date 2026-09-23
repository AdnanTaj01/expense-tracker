from datetime import datetime, timedelta, timezone


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


def _make_rule(
    client,
    token: str,
    account_id: int,
    kind: str = "expense",
    amount: str = "100.00",
    frequency: str = "monthly",
    interval: int = 1,
    next_run_at: datetime | None = None,
    end_date: datetime | None = None,
    category_id: int | None = None,
) -> dict:
    next_run_at = next_run_at or datetime.now(timezone.utc) + timedelta(days=1)
    body = {
        "account_id": account_id,
        "category_id": category_id,
        "kind": kind,
        "amount": amount,
        "note": "recurring",
        "frequency": frequency,
        "interval": interval,
        "next_run_at": next_run_at.isoformat(),
        "end_date": end_date.isoformat() if end_date else None,
        "is_active": True,
    }
    return client.post("/api/v1/recurring", headers=_auth(token), json=body).json()


def _get_balance(client, token: str, account_id: int) -> str:
    r = client.get(f"/api/v1/accounts/{account_id}", headers=_auth(token))
    return r.json()["balance"]


# ---------- CRUD ----------


def test_create_recurring_rule(client):
    token = _register_and_login(client, "rec_create@example.com")
    account = _make_account(client, token)
    food = _find_category(client, token, "Food", "expense")

    rule = _make_rule(
        client, token, account["id"], category_id=food["id"]
    )
    assert rule["id"]
    assert rule["kind"] == "expense"
    assert rule["amount"] == "100.00"
    assert rule["frequency"] == "monthly"
    assert rule["is_active"] is True


def test_create_rule_invalid_account(client):
    token = _register_and_login(client, "rec_badacct@example.com")
    r = client.post(
        "/api/v1/recurring",
        headers=_auth(token),
        json={
            "account_id": 99999,
            "kind": "expense",
            "amount": "10.00",
            "frequency": "monthly",
            "interval": 1,
            "next_run_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 400


def test_create_rule_rejects_zero_amount(client):
    token = _register_and_login(client, "rec_zero@example.com")
    account = _make_account(client, token)
    r = client.post(
        "/api/v1/recurring",
        headers=_auth(token),
        json={
            "account_id": account["id"],
            "kind": "expense",
            "amount": "0.00",
            "frequency": "monthly",
            "interval": 1,
            "next_run_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 422


def test_list_and_get_rule(client):
    token = _register_and_login(client, "rec_list@example.com")
    account = _make_account(client, token)
    _make_rule(client, token, account["id"])

    r = client.get("/api/v1/recurring", headers=_auth(token))
    assert r.status_code == 200
    assert len(r.json()) == 1

    rule_id = r.json()[0]["id"]
    g = client.get(f"/api/v1/recurring/{rule_id}", headers=_auth(token))
    assert g.status_code == 200
    assert g.json()["id"] == rule_id


def test_update_rule(client):
    token = _register_and_login(client, "rec_update@example.com")
    account = _make_account(client, token)
    rule = _make_rule(client, token, account["id"], amount="100.00")

    r = client.patch(
        f"/api/v1/recurring/{rule['id']}",
        headers=_auth(token),
        json={"amount": "250.00", "interval": 2},
    )
    assert r.status_code == 200
    assert r.json()["amount"] == "250.00"
    assert r.json()["interval"] == 2


def test_pause_rule(client):
    token = _register_and_login(client, "rec_pause@example.com")
    account = _make_account(client, token)
    rule = _make_rule(client, token, account["id"])

    r = client.patch(
        f"/api/v1/recurring/{rule['id']}",
        headers=_auth(token),
        json={"is_active": False},
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False


def test_delete_rule(client):
    token = _register_and_login(client, "rec_del@example.com")
    account = _make_account(client, token)
    rule = _make_rule(client, token, account["id"])

    assert (
        client.delete(
            f"/api/v1/recurring/{rule['id']}", headers=_auth(token)
        ).status_code
        == 204
    )
    assert (
        client.get(
            f"/api/v1/recurring/{rule['id']}", headers=_auth(token)
        ).status_code
        == 404
    )


# ---------- Generation ----------


def test_generate_single_occurrence(client):
    """If next_run_at is in the past, one transaction is generated."""
    token = _register_and_login(client, "rec_gen1@example.com")
    account = _make_account(client, token, balance="1000.00")
    now = datetime.now(timezone.utc)
    past = now - timedelta(hours=1)

    rule = _make_rule(
        client, token, account["id"], amount="100.00", next_run_at=past
    )

    r = client.post(
        f"/api/v1/recurring/{rule['id']}/generate", headers=_auth(token)
    )
    assert r.status_code == 200
    body = r.json()
    assert body["generated_count"] == 1
    assert len(body["transactions"]) == 1
    assert _get_balance(client, token, account["id"]) == "900.00"


def test_generate_multiple_missed_occurrences(client):
    """If two months passed, generating creates two transactions."""
    token = _register_and_login(client, "rec_gen2@example.com")
    account = _make_account(client, token, balance="1000.00")
    now = datetime.now(timezone.utc)
    # First run two months ago
    start = now - timedelta(days=60)

    rule = _make_rule(
        client, token, account["id"], amount="50.00", next_run_at=start
    )

    r = client.post(
        f"/api/v1/recurring/{rule['id']}/generate", headers=_auth(token)
    )
    body = r.json()
    # With monthly interval and 60 days elapsed, we expect 2 generations
    assert body["generated_count"] >= 2
    assert _get_balance(client, token, account["id"]) != "1000.00"


def test_generate_nothing_due(client):
    """Future next_run_at yields zero transactions."""
    token = _register_and_login(client, "rec_gen_future@example.com")
    account = _make_account(client, token, balance="1000.00")
    future = datetime.now(timezone.utc) + timedelta(days=30)

    rule = _make_rule(
        client, token, account["id"], amount="100.00", next_run_at=future
    )

    r = client.post(
        f"/api/v1/recurring/{rule['id']}/generate", headers=_auth(token)
    )
    assert r.status_code == 200
    assert r.json()["generated_count"] == 0
    assert _get_balance(client, token, account["id"]) == "1000.00"


def test_generate_income_increases_balance(client):
    token = _register_and_login(client, "rec_gen_income@example.com")
    account = _make_account(client, token, balance="1000.00")
    past = datetime.now(timezone.utc) - timedelta(hours=1)

    rule = _make_rule(
        client,
        token,
        account["id"],
        kind="income",
        amount="500.00",
        next_run_at=past,
    )

    r = client.post(
        f"/api/v1/recurring/{rule['id']}/generate", headers=_auth(token)
    )
    assert r.json()["generated_count"] == 1
    assert _get_balance(client, token, account["id"]) == "1500.00"


def test_generate_stops_at_end_date(client):
    """Occurrences past end_date are not generated. end_date is inclusive."""
    token = _register_and_login(client, "rec_gen_end@example.com")
    account = _make_account(client, token, balance="1000.00")
    now = datetime.now(timezone.utc)
    # Monthly interval = 30 days. end_date = start + 30 days means
    # the occurrence exactly on end_date IS generated, but the next
    # one (start + 60 days) is not.
    start = now - timedelta(days=90)
    end = start + timedelta(days=30)

    rule = _make_rule(
        client,
        token,
        account["id"],
        amount="100.00",
        next_run_at=start,
        end_date=end,
    )

    r = client.post(
        f"/api/v1/recurring/{rule['id']}/generate", headers=_auth(token)
    )
    assert r.status_code == 200
    # Two generations: day 0 and day 30 (both <= end_date)
    assert r.json()["generated_count"] == 2
    assert _get_balance(client, token, account["id"]) == "800.00"

def test_generate_rejects_inactive(client):
    token = _register_and_login(client, "rec_gen_inactive@example.com")
    account = _make_account(client, token)
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    rule = _make_rule(client, token, account["id"], next_run_at=past)

    client.patch(
        f"/api/v1/recurring/{rule['id']}",
        headers=_auth(token),
        json={"is_active": False},
    )

    r = client.post(
        f"/api/v1/recurring/{rule['id']}/generate", headers=_auth(token)
    )
    assert r.status_code == 400


def test_second_generate_no_duplicates(client):
    """After generating, next_run_at moves forward so second call is a no-op."""
    token = _register_and_login(client, "rec_gen_idem@example.com")
    account = _make_account(client, token, balance="1000.00")
    past = datetime.now(timezone.utc) - timedelta(hours=1)

    rule = _make_rule(
        client, token, account["id"], amount="100.00", next_run_at=past
    )

    first = client.post(
        f"/api/v1/recurring/{rule['id']}/generate", headers=_auth(token)
    ).json()
    assert first["generated_count"] == 1

    second = client.post(
        f"/api/v1/recurring/{rule['id']}/generate", headers=_auth(token)
    ).json()
    assert second["generated_count"] == 0

    assert _get_balance(client, token, account["id"]) == "900.00"


# ---------- Auth + ownership ----------


def test_recurring_requires_auth(client):
    assert client.get("/api/v1/recurring").status_code == 401


def test_user_cannot_see_other_users_rule(client):
    token_a = _register_and_login(client, "rec_owner_a@example.com")
    token_b = _register_and_login(client, "rec_owner_b@example.com")

    account_a = _make_account(client, token_a)
    rule_a = _make_rule(client, token_a, account_a["id"])

    assert (
        client.get(
            f"/api/v1/recurring/{rule_a['id']}", headers=_auth(token_b)
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/recurring/{rule_a['id']}",
            headers=_auth(token_b),
            json={"amount": "999.00"},
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/v1/recurring/{rule_a['id']}", headers=_auth(token_b)
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/v1/recurring/{rule_a['id']}/generate",
            headers=_auth(token_b),
        ).status_code
        == 400  # not found -> ValueError
    )

    assert client.get("/api/v1/recurring", headers=_auth(token_b)).json() == []


def test_cannot_create_rule_for_other_users_account(client):
    token_a = _register_and_login(client, "rec_cross_a@example.com")
    token_b = _register_and_login(client, "rec_cross_b@example.com")

    account_a = _make_account(client, token_a)

    r = client.post(
        "/api/v1/recurring",
        headers=_auth(token_b),
        json={
            "account_id": account_a["id"],
            "kind": "expense",
            "amount": "10.00",
            "frequency": "monthly",
            "interval": 1,
            "next_run_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 400