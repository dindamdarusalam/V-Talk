from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.routes import auth, feedback, health, translations
from app.core.config import get_settings
from app.core.responses import error_response, success_response
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.schemas.translation import TranslationRequest, WebSocketFrameRequest
from app.services.inference import inference_service
from app.services.translation import create_translation_log


@asynccontextmanager
async def lifespan(_: FastAPI):
    db: Session = SessionLocal()
    try:
        init_db(db)
        yield
    finally:
        db.close()


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Backend service for V-Talk real-time sign language transliteration.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(translations.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=error_response(str(exc), code="bad_request"),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response("Request validation failed", code="validation_error", details=exc.errors()),
    )


@app.get("/")
def root() -> dict:
    return success_response(
        {
            "name": settings.app_name,
            "docs": "/docs",
            "health": "/api/v1/health",
            "websocket": "/ws/translations",
        },
        message="V-Talk backend is ready",
    )


@app.websocket("/ws/translations")
async def translation_socket(websocket: WebSocket):
    await websocket.accept()
    db = SessionLocal()
    try:
        await websocket.send_json(
            success_response(
                {"channel": "translations", "status": "connected"},
                message="WebSocket connected",
            )
        )
        while True:
            raw_payload = await websocket.receive_json()
            payload = WebSocketFrameRequest.model_validate(raw_payload)
            translation_payload = TranslationRequest(
                frame_data=payload.frame_data,
                source_type=payload.source_type,
            )
            inference = inference_service.predict_from_frame(payload.frame_data)
            log = create_translation_log(db=db, payload=translation_payload, result=inference)
            await websocket.send_json(
                success_response(
                    {
                        "translation_id": log.id,
                        "request_id": log.request_id,
                        "predicted_text": log.predicted_text,
                        "confidence": log.confidence,
                        "source_type": log.source_type,
                        "inference_provider": log.inference_provider,
                        "created_at": log.created_at.isoformat(),
                    },
                    message="Prediction completed",
                )
            )
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # pragma: no cover - websocket error path
        await websocket.send_json(error_response(str(exc), code="websocket_error"))
        await websocket.close(code=1003)
    finally:
        db.close()
