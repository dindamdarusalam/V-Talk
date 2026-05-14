from fastapi import APIRouter

from app.core.config import get_settings
from app.core.responses import success_response

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def health_check() -> dict:
    settings = get_settings()
    return success_response(
        {
            "service": settings.app_name,
            "environment": settings.app_env,
            "inference_provider": settings.inference_provider,
            "status": "healthy",
        },
        message="Service is healthy",
    )
