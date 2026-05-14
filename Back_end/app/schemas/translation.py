from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TranslationRequest(BaseModel):
    frame_data: str = Field(min_length=16, description="Base64 image or data URL from webcam frame")
    source_type: Literal["image", "video_frame"] = "video_frame"


class TranslationResult(BaseModel):
    translation_id: int
    request_id: str
    predicted_text: str
    confidence: float
    inference_provider: str
    source_type: str
    created_at: datetime


class WebSocketFrameRequest(BaseModel):
    frame_data: str = Field(min_length=16)
    source_type: Literal["video_frame"] = "video_frame"
