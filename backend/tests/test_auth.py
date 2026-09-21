def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "user1@example.com",
            "password": "StrongPass123!",
            "full_name": "User One",
            "currency": "PKR",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "user1@example.com"
    assert data["full_name"] == "User One"
    assert data["currency"] == "PKR"
    assert data["is_active"] is True
    assert "id" in data
    # Password must never leak.
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client):
    payload = {
        "email": "dup@example.com",
        "password": "StrongPass123!",
        "full_name": "Dup",
        "currency": "PKR",
    }
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    assert "already registered" in second.json()["detail"].lower()


def test_login_success(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "StrongPass123!",
            "full_name": "Login",
            "currency": "PKR",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "login@example.com", "password": "StrongPass123!"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrong@example.com",
            "password": "StrongPass123!",
            "full_name": "Wrong",
            "currency": "PKR",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "wrong@example.com", "password": "Nope!"},
    )
    assert response.status_code == 401


def test_me_requires_token(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_valid_token(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "me@example.com",
            "password": "StrongPass123!",
            "full_name": "Me",
            "currency": "PKR",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        data={"username": "me@example.com", "password": "StrongPass123!"},
    )
    token = login.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_change_password(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "change@example.com",
            "password": "OldPass123!",
            "full_name": "Change",
            "currency": "PKR",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        data={"username": "change@example.com", "password": "OldPass123!"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
    )
    assert response.status_code == 204

    # Old password must now fail.
    old = client.post(
        "/api/v1/auth/login",
        data={"username": "change@example.com", "password": "OldPass123!"},
    )
    assert old.status_code == 401

    # New password must work.
    new = client.post(
        "/api/v1/auth/login",
        data={"username": "change@example.com", "password": "NewPass456!"},
    )
    assert new.status_code == 200