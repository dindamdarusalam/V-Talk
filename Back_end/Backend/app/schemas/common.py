from typing import Any

from pydantic import BaseModel, Field


class ErrorPayload(BaseModel):
    code: str
    details: Any | None = None


class Envelope(BaseModel):
    success: bool = True
    message: str = "OK"
    data: Any | None = None
    error: ErrorPayload | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
