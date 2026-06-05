import base64


def _frame_payload() -> str:
    return base64.b64encode(b"frame-feedback").decode("utf-8")


def _register_and_login(client, email: str) -> dict[str, str]:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Feedback User",
            "password": "password123",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_feedback_submission(client):
    prediction = client.post(
        "/api/v1/translations/predict",
        json={"frame_data": _frame_payload(), "source_type": "image"},
    ).json()

    response = client.post(
        "/api/v1/feedback",
        json={
            "translation_id": prediction["data"]["translation_id"],
            "rating": "correct",
            "note": "Looks good",
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["rating"] == "correct"


def test_guest_cannot_feedback_user_owned_translation(client):
    headers = _register_and_login(client, "owner@example.com")
    prediction = client.post(
        "/api/v1/translations/predict",
        json={"frame_data": _frame_payload(), "source_type": "image"},
        headers=headers,
    ).json()

    response = client.post(
        "/api/v1/feedback",
        json={
            "translation_id": prediction["data"]["translation_id"],
            "rating": "correct",
            "note": "Should be rejected",
        },
    )
    assert response.status_code == 403
    assert response.json()["message"] == "Cannot submit feedback for another user's translation"


def test_user_cannot_feedback_another_users_translation(client):
    owner_headers = _register_and_login(client, "owner@example.com")
    other_headers = _register_and_login(client, "other@example.com")
    prediction = client.post(
        "/api/v1/translations/predict",
        json={"frame_data": _frame_payload(), "source_type": "image"},
        headers=owner_headers,
    ).json()

    response = client.post(
        "/api/v1/feedback",
        json={
            "translation_id": prediction["data"]["translation_id"],
            "rating": "incorrect",
            "note": "Should be rejected",
        },
        headers=other_headers,
    )
    assert response.status_code == 403
    assert response.json()["message"] == "Cannot submit feedback for another user's translation"
