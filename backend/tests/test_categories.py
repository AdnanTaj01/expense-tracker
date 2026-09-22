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


def test_new_user_gets_default_categories(client):
    token = _register_and_login(client, "cat_seed@example.com")
    response = client.get("/api/v1/categories", headers=_auth(token))
    assert response.status_code == 200
    cats = response.json()
    assert len(cats) == 12

    names = {c["name"] for c in cats}
    assert "Salary" in names
    assert "Food" in names
    assert "Rent" in names

    # All seeded categories marked as default.
    assert all(c["is_default"] is True for c in cats)


def test_create_custom_category(client):
    token = _register_and_login(client, "cat_create@example.com")
    response = client.post(
        "/api/v1/categories",
        headers=_auth(token),
        json={"name": "Coffee", "kind": "expense"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Coffee"
    assert data["kind"] == "expense"
    assert data["is_default"] is False


def test_duplicate_category_conflict(client):
    token = _register_and_login(client, "cat_dup@example.com")
    payload = {"name": "Coffee", "kind": "expense"}
    first = client.post("/api/v1/categories", headers=_auth(token), json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/categories", headers=_auth(token), json=payload)
    assert second.status_code == 409


def test_same_name_different_kind_allowed(client):
    """Coffee as expense and Coffee as income are two different categories."""
    token = _register_and_login(client, "cat_kind@example.com")
    exp = client.post(
        "/api/v1/categories",
        headers=_auth(token),
        json={"name": "Coffee", "kind": "expense"},
    )
    inc = client.post(
        "/api/v1/categories",
        headers=_auth(token),
        json={"name": "Coffee", "kind": "income"},
    )
    assert exp.status_code == 201
    assert inc.status_code == 201


def test_list_categories_filter_by_kind(client):
    token = _register_and_login(client, "cat_filter@example.com")
    income = client.get(
        "/api/v1/categories?kind=income", headers=_auth(token)
    ).json()
    expense = client.get(
        "/api/v1/categories?kind=expense", headers=_auth(token)
    ).json()

    assert len(income) == 3   # Salary, Freelance, Investment
    assert len(expense) == 9  # Food, Transport, Rent, ...
    assert all(c["kind"] == "income" for c in income)
    assert all(c["kind"] == "expense" for c in expense)


def test_update_category(client):
    token = _register_and_login(client, "cat_update@example.com")
    created = client.post(
        "/api/v1/categories",
        headers=_auth(token),
        json={"name": "Old", "kind": "expense"},
    ).json()

    response = client.patch(
        f"/api/v1/categories/{created['id']}",
        headers=_auth(token),
        json={"name": "New"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_delete_category(client):
    token = _register_and_login(client, "cat_del@example.com")
    created = client.post(
        "/api/v1/categories",
        headers=_auth(token),
        json={"name": "Temp", "kind": "expense"},
    ).json()

    response = client.delete(
        f"/api/v1/categories/{created['id']}",
        headers=_auth(token),
    )
    assert response.status_code == 204

    get = client.get(
        f"/api/v1/categories/{created['id']}",
        headers=_auth(token),
    )
    assert get.status_code == 404


def test_categories_require_auth(client):
    assert client.get("/api/v1/categories").status_code == 401


def test_user_cannot_see_other_users_category(client):
    token_a = _register_and_login(client, "cat_owner_a@example.com")
    token_b = _register_and_login(client, "cat_owner_b@example.com")

    category_a = client.post(
        "/api/v1/categories",
        headers=_auth(token_a),
        json={"name": "Private A", "kind": "expense"},
    ).json()

    # B cannot read it.
    get_b = client.get(
        f"/api/v1/categories/{category_a['id']}",
        headers=_auth(token_b),
    )
    assert get_b.status_code == 404

    # B cannot update it.
    patch_b = client.patch(
        f"/api/v1/categories/{category_a['id']}",
        headers=_auth(token_b),
        json={"name": "Hacked"},
    )
    assert patch_b.status_code == 404

    # B cannot delete it.
    del_b = client.delete(
        f"/api/v1/categories/{category_a['id']}",
        headers=_auth(token_b),
    )
    assert del_b.status_code == 404

    # B's listing has only their own defaults (no "Private A").
    list_b = client.get("/api/v1/categories", headers=_auth(token_b))
    names_b = {c["name"] for c in list_b.json()}
    assert "Private A" not in names_b