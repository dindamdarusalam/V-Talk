from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user
from app.core.responses import success_response
from app.db.session import get_db
from app.models.user import User
from app.schemas.translation import TranslationRequest, TranslationResult
from app.services.inference import inference_service
from app.services.translation import create_translation_log

router = APIRouter(prefix="/translations", tags=["Translations"])


@router.post("/predict")
def predict_translation(
    payload: TranslationRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> dict:
    inference = inference_service.predict_from_frame(payload.frame_data)
    log = create_translation_log(db=db, payload=payload, result=inference, user=current_user)
    response = TranslationResult(
        translation_id=log.id,
        request_id=log.request_id,
        predicted_text=log.predicted_text,
        confidence=log.confidence,
        inference_provider=log.inference_provider,
        source_type=log.source_type,
        created_at=log.created_at,
    )
    return success_response(response.model_dump(), message="Prediction completed")
