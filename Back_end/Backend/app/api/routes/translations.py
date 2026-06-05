from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_current_user
from app.core.responses import success_response
from app.db.session import get_db
from app.models.translation import TranslationLog
from app.models.user import User
from app.schemas.translation import TranslationHistoryItem, TranslationRequest, TranslationResult
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


@router.get("/history")
def list_translation_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    query = db.query(TranslationLog).filter(TranslationLog.user_id == current_user.id)
    rows = query.order_by(TranslationLog.created_at.desc()).limit(limit).all()
    items = [
        TranslationHistoryItem(
            translation_id=row.id,
            request_id=row.request_id,
            predicted_text=row.predicted_text,
            confidence=row.confidence,
            inference_provider=row.inference_provider,
            source_type=row.source_type,
            created_at=row.created_at,
            user_id=row.user_id,
            frame_size=row.frame_size,
        ).model_dump()
        for row in rows
    ]
    return success_response(items, message="Translation history loaded", meta={"limit": limit})
