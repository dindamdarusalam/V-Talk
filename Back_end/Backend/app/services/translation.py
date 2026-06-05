from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.translation import TranslationLog
from app.models.user import User
from app.schemas.translation import TranslationRequest
from app.services.inference import InferenceService, InferenceOutput, inference_service


def create_translation_log(
    db: Session,
    payload: TranslationRequest,
    result: InferenceOutput,
    user: User | None = None,
    service: InferenceService = inference_service,
) -> TranslationLog:
    log = TranslationLog(
        user_id=user.id if user else None,
        source_type=payload.source_type,
        predicted_text=result.label,
        confidence=result.confidence,
        inference_provider=result.provider,
        request_id=f"tr_{uuid4().hex}",
        frame_size=result.frame_size,
        raw_payload_preview=result.payload_preview,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
