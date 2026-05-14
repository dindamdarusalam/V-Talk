from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user
from app.core.responses import success_response
from app.db.session import get_db
from app.models.feedback import Feedback
from app.models.translation import TranslationLog
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackRead

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("")
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
) -> dict:
    translation = db.query(TranslationLog).filter(TranslationLog.id == payload.translation_id).first()
    if not translation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation not found")

    feedback = Feedback(
        translation_id=payload.translation_id,
        user_id=current_user.id if current_user else None,
        rating=payload.rating,
        note=payload.note,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return success_response(
        FeedbackRead.model_validate(feedback).model_dump(),
        message="Feedback submitted",
    )
