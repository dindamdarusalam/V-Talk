from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.responses import success_response
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.auth import TokenPayload, UserCreate, UserLogin, UserRead
from app.services.auth import authenticate_user, create_user, get_user_by_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
def register(payload: UserCreate, db: Session = Depends(get_db)) -> dict:
    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = create_user(db, payload)
    return success_response(UserRead.model_validate(user).model_dump(), message="User registered")


@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)) -> dict:
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    settings = get_settings()
    token = create_access_token(subject=user.email)
    token_payload = TokenPayload(
        access_token=token,
        expires_in_minutes=settings.access_token_expire_minutes,
        user=UserRead.model_validate(user),
    )
    return success_response(token_payload.model_dump(), message="Login successful")
