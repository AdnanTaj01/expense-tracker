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


def _make_account(client, token: str, name: str = "Meezan", balance: str = "10000.00") -> dict:
    return client.post(
        "/api/v1/accounts",
        headers=_auth(token),
        json={"name": name, "type": "checking", "currency": "PKR", "balance": balance},
    ).json()


def _make_transaction(
    client,
    token: str,
    account_id: int,
    kind: str,
    amount: str,
    category_id: int | None = None,
    note: str | None = None,
) -> dict:
    return client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": account_id,
            "category_id": category_id,
            "kind": kind,
            "amount": amount,
            "note": note,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    ).json()


def _get_balance(client, token: str, account_id: int) -> str:
    r = client.get(f"/api/v1/accounts/{account_id}", headers=_auth(token))
    return r.json()["balance"]


# ---------- Basic CRUD ----------


def test_create_expense_decreases_balance(client):
    token = _register_and_login(client, "tx_exp@example.com")
    account = _make_account(client, token, balance="1000.00")

    _make_transaction(client, token, account["id"], "expense", "250.00")

    assert _get_balance(client, token, account["id"]) == "750.00"


def test_create_income_increases_balance(client):
    token = _register_and_login(client, "tx_inc@example.com")
    account = _make_account(client, token, balance="1000.00")

    _make_transaction(client, token, account["id"], "income", "500.00")

    assert _get_balance(client, token, account["id"]) == "1500.00"


def test_create_transaction_invalid_account(client):
    token = _register_and_login(client, "tx_badacct@example.com")
    r = client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": 99999,
            "kind": "expense",
            "amount": "10.00",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 400


def test_create_transaction_invalid_category(client):
    token = _register_and_login(client, "tx_badcat@example.com")
    account = _make_account(client, token)
    r = client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": account["id"],
            "category_id": 99999,
            "kind": "expense",
            "amount": "10.00",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 400


def test_create_transaction_rejects_negative_amount(client):
    token = _register_and_login(client, "tx_neg@example.com")
    account = _make_account(client, token)
    r = client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": account["id"],
            "kind": "expense",
            "amount": "-5.00",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 422


def test_create_transaction_rejects_zero_amount(client):
    token = _register_and_login(client, "tx_zero@example.com")
    account = _make_account(client, token)
    r = client.post(
        "/api/v1/transactions",
        headers=_auth(token),
        json={
            "account_id": account["id"],
            "kind": "expense",
            "amount": "0.00",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 422


def test_get_transaction(client):
    token = _register_and_login(client, "tx_get@example.com")
    account = _make_account(client, token)
    tx = _make_transaction(client, token, account["id"], "expense", "10.00")

    r = client.get(f"/api/v1/transactions/{tx['id']}", headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["amount"] == "10.00"


# ---------- Update semantics ----------


def test_update_amount_rebalances(client):
    token = _register_and_login(client, "tx_upd_amt@example.com")
    account = _make_account(client, token, balance="1000.00")
    tx = _make_transaction(client, token, account["id"], "expense", "100.00")

    assert _get_balance(client, token, account["id"]) == "900.00"

    r = client.patch(
        f"/api/v1/transactions/{tx['id']}",
        headers=_auth(token),
        json={"amount": "300.00"},
    )
    assert r.status_code == 200
    assert _get_balance(client, token, account["id"]) == "700.00"


def test_update_kind_reverses_and_applies(client):
    token = _register_and_login(client, "tx_upd_kind@example.com")
    account = _make_account(client, token, balance="1000.00")
    tx = _make_transaction(client, token, account["id"], "expense", "100.00")

    assert _get_balance(client, token, account["id"]) == "900.00"

    r = client.patch(
        f"/api/v1/transactions/{tx['id']}",
        headers=_auth(token),
        json={"kind": "income"},
    )
    assert r.status_code == 200
        # Old expense reversed (+100), new income applied (+100) -> 1100
    assert _get_balance(client, token, account["id"]) == "1100.00"


def test_update_account_moves_effect(client):
    token = _register_and_login(client, "tx_upd_acct@example.com")
    a = _make_account(client, token, name="Cash", balance="100.00")
    b = _make_account(client, token, name="Bank", balance="500.00")
    tx = _make_transaction(client, token, a["id"], "expense", "50.00")

    assert _get_balance(client, token, a["id"]) == "50.00"
    assert _get_balance(client, token, b["id"]) == "500.00"

    r = client.patch(
        f"/api/v1/transactions/{tx['id']}",
        headers=_auth(token),
        json={"account_id": b["id"]},
    )
    assert r.status_code == 200
    # A gets old expense reversed (+50), B gets expense applied (-50)
    assert _get_balance(client, token, a["id"]) == "100.00"
    assert _get_balance(client, token, b["id"]) == "450.00"


# ---------- Delete semantics ----------


def test_delete_reverses_balance(client):
    token = _register_and_login(client, "tx_del@example.com")
    account = _make_account(client, token, balance="1000.00")
    tx = _make_transaction(client, token, account["id"], "expense", "100.00")

    assert _get_balance(client, token, account["id"]) == "900.00"

    r = client.delete(f"/api/v1/transactions/{tx['id']}", headers=_auth(token))
    assert r.status_code == 204
    assert _get_balance(client, token, account["id"]) == "1000.00"


# ---------- Listing, filters, pagination ----------


def test_list_and_pagination(client):
    token = _register_and_login(client, "tx_list@example.com")
    account = _make_account(client, token)
    for i in range(5):
        _make_transaction(client, token, account["id"], "expense", "10.00")

    r = client.get("/api/v1/transactions", headers=_auth(token))
    body = r.json()
    assert body["total"] == 5
    assert len(body["items"]) == 5

    r2 = client.get("/api/v1/transactions?limit=2&offset=0", headers=_auth(token))
    body2 = r2.json()
    assert body2["total"] == 5
    assert len(body2["items"]) == 2
    assert body2["limit"] == 2
    assert body2["offset"] == 0


def test_filter_by_kind(client):
    token = _register_and_login(client, "tx_kind@example.com")
    account = _make_account(client, token)
    _make_transaction(client, token, account["id"], "expense", "10.00")
    _make_transaction(client, token, account["id"], "expense", "20.00")
    _make_transaction(client, token, account["id"], "income", "30.00")

    r = client.get("/api/v1/transactions?kind=expense", headers=_auth(token))
    assert r.json()["total"] == 2

    r2 = client.get("/api/v1/transactions?kind=income", headers=_auth(token))
    assert r2.json()["total"] == 1


def test_filter_by_account(client):
    token = _register_and_login(client, "tx_filter_acct@example.com")
    a = _make_account(client, token, name="A")
    b = _make_account(client, token, name="B")
    _make_transaction(client, token, a["id"], "expense", "10.00")
    _make_transaction(client, token, b["id"], "expense", "20.00")
    _make_transaction(client, token, b["id"], "expense", "30.00")

    r = client.get(f"/api/v1/transactions?account_id={a['id']}", headers=_auth(token))
    assert r.json()["total"] == 1

    r2 = client.get(f"/api/v1/transactions?account_id={b['id']}", headers=_auth(token))
    assert r2.json()["total"] == 2


# ---------- Auth + ownership ----------


def test_transactions_require_auth(client):
    assert client.get("/api/v1/transactions").status_code == 401


def test_user_cannot_see_other_users_transaction(client):
    token_a = _register_and_login(client, "tx_owner_a@example.com")
    token_b = _register_and_login(client, "tx_owner_b@example.com")

    account_a = _make_account(client, token_a)
    tx_a = _make_transaction(client, token_a, account_a["id"], "expense", "10.00")

    # B cannot read A's transaction.
    assert (
        client.get(
            f"/api/v1/transactions/{tx_a['id']}", headers=_auth(token_b)
        ).status_code
        == 404
    )

    # B cannot update A's transaction.
    assert (
        client.patch(
            f"/api/v1/transactions/{tx_a['id']}",
            headers=_auth(token_b),
            json={"amount": "999.00"},
        ).status_code
        == 404
    )

    # B cannot delete A's transaction.
    assert (
        client.delete(
            f"/api/v1/transactions/{tx_a['id']}", headers=_auth(token_b)
        ).status_code
        == 404
    )

    # B's listing is empty.
    assert client.get("/api/v1/transactions", headers=_auth(token_b)).json()["total"] == 0


def test_cannot_create_transaction_on_other_users_account(client):
    token_a = _register_and_login(client, "tx_cross_a@example.com")
    token_b = _register_and_login(client, "tx_cross_b@example.com")

    account_a = _make_account(client, token_a)

    # B tries to create a transaction on A's account.
    r = client.post(
        "/api/v1/transactions",
        headers=_auth(token_b),
        json={
            "account_id": account_a["id"],
            "kind": "expense",
            "amount": "10.00",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert r.status_code == 400


# ---------- THE critical balance-integrity test (Section 1, decision #3) ----------


def test_balance_recomputed_matches_after_mixed_operations(client):
    """The stored balance must always equal the sum of all transactions.

    Per Section 1, decision #3: recompute the balance from transactions
    and compare it against the stored value.
    """
    token = _register_and_login(client, "tx_integrity@example.com")
    account = _make_account(client, token, balance="1000.00")
    aid = account["id"]

    # Mix of creates
    t1 = _make_transaction(client, token, aid, "income", "500.00")
    t2 = _make_transaction(client, token, aid, "expense", "200.00")
    t3 = _make_transaction(client, token, aid, "expense", "100.00")

    # Update one amount
    client.patch(
        f"/api/v1/transactions/{t2['id']}",
        headers=_auth(token),
        json={"amount": "250.00"},
    )

    # Flip one kind
    client.patch(
        f"/api/v1/transactions/{t3['id']}",
        headers=_auth(token),
        json={"kind": "income"},
    )

    # Delete one
    client.delete(f"/api/v1/transactions/{t1['id']}", headers=_auth(token))

    # Expected: 1000 + (-250) + (+100) = 850
    expected = "850.00"
    actual = _get_balance(client, token, aid)

    assert actual == expected, (
        f"Balance mismatch. Expected {expected}, got {actual}. "
        "Stored balance is out of sync with the sum of transactions."
    )

    # Additionally: recompute via service and compare to the API value.
    # (The service method is used to encode the same rule the API enforces.)
    from app.db.session import SessionLocal
    from app.services.transaction_service import recompute_account_balance
    from app.models import User
    from sqlalchemy import select

    db = SessionLocal()
    try:
        user = db.execute(
            select(User).where(User.email == "tx_integrity@example.com")
        ).scalar_one()
        recomputed = recompute_account_balance(db, user, aid)
        # 1000 opening not stored as a transaction, so recompute gives -150
        # Only transaction deltas: -250 + 100 = -150
        # Stored balance = opening 1000 + (-150) = 850
        assert str(recomputed) == "-150.00"
    finally:
        db.close()