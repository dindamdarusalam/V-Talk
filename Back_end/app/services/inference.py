import base64
import hashlib
from dataclasses import dataclass

from app.core.config import get_settings


@dataclass
class InferenceOutput:
    label: str
    confidence: float
    provider: str
    frame_size: int
    payload_preview: str


def _strip_data_url(frame_data: str) -> str:
    return frame_data.split(",", 1)[1] if frame_data.startswith("data:") and "," in frame_data else frame_data


def decode_frame(frame_data: str) -> bytes:
    try:
        return base64.b64decode(_strip_data_url(frame_data), validate=True)
    except Exception as exc:
        raise ValueError("Frame data is not valid base64") from exc


class MockInferenceProvider:
    def __init__(self) -> None:
        self.settings = get_settings()

    def predict(self, frame_bytes: bytes) -> InferenceOutput:
        digest = hashlib.sha256(frame_bytes).hexdigest()
        labels = self.settings.model_labels
        index = int(digest[:8], 16) % len(labels)
        confidence = 0.7 + ((int(digest[8:12], 16) % 3000) / 10000)
        return InferenceOutput(
            label=labels[index],
            confidence=round(min(confidence, 0.99), 4),
            provider="mock",
            frame_size=len(frame_bytes),
            payload_preview=digest[:24],
        )


class InferenceService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.provider = MockInferenceProvider()

    def predict_from_frame(self, frame_data: str) -> InferenceOutput:
        frame_bytes = decode_frame(frame_data)
        if not frame_bytes:
            raise ValueError("Frame data is empty")
        return self.provider.predict(frame_bytes)


inference_service = InferenceService()
