import base64


def _frame_payload() -> str:
    return base64.b64encode(b"sample-frame").decode("utf-8")


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


def test_translation_websocket(client):
    with client.websocket_connect("/ws/translations") as websocket:
        first_message = websocket.receive_json()
        assert first_message["success"] is True
        websocket.send_json({"frame_data": _frame_payload(), "source_type": "video_frame"})
        result = websocket.receive_json()
        assert result["success"] is True
        assert result["data"]["predicted_text"]
