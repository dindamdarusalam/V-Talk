from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    translation_id: int
    rating: Literal["correct", "incorrect", "uncertain"]
    note: str = Field(default="", max_length=1000)


class FeedbackRead(BaseModel):
    id: int
    translation_id: int
    rating: str
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}
