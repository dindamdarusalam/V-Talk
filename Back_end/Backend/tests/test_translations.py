import base64


def _frame_payload() -> str:
    return base64.b64encode(b"sample-frame").decode("utf-8")


def _auth_headers(client) -> dict[str, str]:
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "tester@vtalk.example.com", "password": "testpass123"},
    )
    token = login_response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_predict_translation(client):
    response = client.post(
        "/api/v1/translations/predict",
        json={"frame_data": _frame_payload(), "source_type": "video_frame"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["predicted_text"]
    assert 0.0 < body["data"]["confidence"] <= 1.0


def test_translation_history_requires_auth(client):
    client.post(
        "/api/v1/translations/predict",
        json={"frame_data": _frame_payload(), "source_type": "video_frame"},
    )

    response = client.get("/api/v1/translations/history")
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["message"] == "Authentication required"


def test_translation_history_returns_current_user_rows(client):
    headers = _auth_headers(client)
    client.post(
        "/api/v1/translations/predict",
        json={"frame_data": _frame_payload(), "source_type": "video_frame"},
        headers=headers,
    )

    client.post(
        "/api/v1/translations/predict",
        json={"frame_data": _frame_payload(), "source_type": "video_frame"},
    )

    response = client.get("/api/v1/translations/history", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) == 1
    assert body["data"][0]["frame_size"] == len(base64.b64decode(_frame_payload()))


def test_translation_websocket(client):
    with client.websocket_connect("/ws/translations") as websocket:
        first_message = websocket.receive_json()
        assert first_message["success"] is True
        websocket.send_json({"frame_data": _frame_payload(), "source_type": "video_frame"})
        result = websocket.receive_json()
        assert result["success"] is True
        assert result["data"]["predicted_text"]
