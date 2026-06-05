def test_register_and_login(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "user@example.com",
            "full_name": "Test User",
            "password": "password123",
        },
    )
    assert register_response.status_code == 200
    assert register_response.json()["data"]["email"] == "user@example.com"

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["data"]["token_type"] == "bearer"


def test_duplicate_register_uses_response_envelope(client):
    payload = {
        "email": "user@example.com",
        "full_name": "Test User",
        "password": "password123",
    }
    client.post("/api/v1/auth/register", json=payload)

    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    body = response.json()
    assert body["success"] is False
    assert body["message"] == "Email already registered"
