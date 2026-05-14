import base64


def _frame_payload() -> str:
    return base64.b64encode(b"frame-feedback").decode("utf-8")


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
