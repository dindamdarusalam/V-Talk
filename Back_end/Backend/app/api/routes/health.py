from fastapi import APIRouter

from app.core.config import get_settings
from app.core.responses import success_response
from app.services.inference import inference_service

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def health_check() -> dict:
    settings = get_settings()
    inference_status = inference_service.status()
    return success_response(
        {
            "service": settings.app_name,
            "environment": settings.app_env,
            "inference_provider": inference_status["active_provider"],
            "configured_inference_provider": settings.inference_provider,
            "inference": inference_status,
            "status": "healthy",
        },
        message="Service is healthy",
    )
