from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import Base, engine
from app.schemas.auth import UserCreate
from app.services.auth import create_user, get_user_by_email


def init_db(db: Session) -> None:
    Base.metadata.create_all(bind=engine)
    settings = get_settings()
    if not get_user_by_email(db, settings.default_user_email):
        create_user(
            db,
            UserCreate(
                email=settings.default_user_email,
                full_name="Demo User",
                password=settings.default_user_password,
            ),
        )
