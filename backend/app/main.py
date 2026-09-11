import sys
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure backend/app directory is in sys.path for internal module imports
app_dir = os.path.dirname(os.path.abspath(__file__))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from utils.logging import setup_logging
from utils.config import is_cloud_lite
from db.database import init_db
from services.speaker_verifier import speaker_service
from api.analyze import router as analyze_router
from api.live import router as live_router
from api.history import router as history_router
from api.reports import router as reports_router
from api.speakers import router as speakers_router
from api.settings import router as settings_router

# Initialize structured logging
logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite schema
    logger.info("[VoxGuard] Starting up VoxGuard AI Backend...")
    try:
        init_db()
        logger.info("[VoxGuard] SQLite database initialized successfully.")
    except Exception as db_err:
        logger.error(f"[VoxGuard] Database initialization error: {db_err}", exc_info=True)

    if is_cloud_lite():
        logger.info("[VoxGuard] VOXGUARD_CLOUD_LITE=true active (Render 512MB RAM constraint). Loading lightweight ONNX AcousticNet...")
        try:
            from services.deepfake_detector import DeepfakeDetectorService
            detector = DeepfakeDetectorService.get_instance()
            logger.info(f"[VoxGuard] Verified: {detector.model_version} initialized (Engine: {detector.engine}, Neural Active: {detector.neural_available}).")
        except Exception as m_err:
            logger.error(f"[VoxGuard] ONNX model initialization error: {m_err}", exc_info=True)

        try:
            from services.speech_transcriber import transcriber_service
            if transcriber_service.is_available:
                logger.info(f"[VoxGuard] Verified: Low-memory transcription ({transcriber_service.model_name}) active.")
        except Exception as s_err:
            logger.warning(f"[VoxGuard] Transcription initialization warning: {s_err}")
    else:
        # Full mode: Warm up ML models once into memory
        try:
            from services.deepfake_detector import DeepfakeDetectorService
            detector = DeepfakeDetectorService.get_instance()
            logger.info(f"[VoxGuard] Verified: AcousticNet {detector.model_version} on {detector.device} warmed up.")
        except Exception as m_err:
            logger.error(f"[VoxGuard Startup Error] Deepfake detector model initialization failed: {m_err}", exc_info=True)

        try:
            from services.speech_transcriber import transcriber_service
            if transcriber_service.model is not None:
                logger.info(f"[VoxGuard] Verified: Faster-Whisper ({transcriber_service.model_name}) cached in memory.")
            else:
                logger.warning("[VoxGuard] Faster-Whisper model could not be loaded into memory.")
        except Exception as s_err:
            logger.error(f"[VoxGuard] STT service load error: {s_err}", exc_info=True)

    yield
    logger.info("[VoxGuard] Shutting down VoxGuard AI Backend...")

app = FastAPI(
    title="VoxGuard AI - Forensic Voice Deepfake Inspection Engine",
    description="Real-time multi-band neural vocoder artifact detection, acoustic forensics, and live streaming spoofing mitigation.",
    version="3.0.0",
    lifespan=lifespan
)

# CORS Configuration
default_origins = [
    "https://voxguard-ai.pages.dev",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "https://localhost:5175",
    "https://127.0.0.1:5175"
]

import os
env_origins = os.environ.get("ALLOWED_ORIGINS", "")
if env_origins.strip():
    configured_origins = [orig.strip() for orig in env_origins.split(",") if orig.strip()]
    for dev_orig in default_origins:
        if dev_orig not in configured_origins:
            configured_origins.append(dev_orig)
else:
    configured_origins = default_origins

has_wildcard = "*" in configured_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_origins,
    allow_origin_regex=r"https://.*(\.vercel\.app|\.pages\.dev)",
    allow_credentials=not has_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global structured exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"[VoxGuard Global Error] {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal inference service error: {str(exc)}"}
    )

# Mount Routers
app.include_router(analyze_router)
app.include_router(live_router)
app.include_router(history_router)
app.include_router(reports_router)
app.include_router(speakers_router)
app.include_router(settings_router)

# Health Check Endpoints - lightweight and public
@app.get("/health")
@app.get("/api/health")
async def health_check():
    from services.deepfake_detector import DeepfakeDetectorService
    detector = DeepfakeDetectorService.get_instance()

    stt_available = False
    stt_engine = "none"
    try:
        from services.speech_transcriber import transcriber_service
        stt_available = transcriber_service.is_available
        stt_engine = transcriber_service.model_name
    except Exception:
        stt_available = False

    return {
        "status": "healthy",
        "service": "VoxGuard AI Forensic Inference Engine",
        "version": "3.0.0",
        "engine": detector.engine,
        "neural_available": detector.neural_available,
        "model_loaded": detector.neural_available,
        "transcription_available": stt_available,
        "transcription_engine": stt_engine,
        "speaker_verification_available": True,
        "cloud_mode": True,
        "cloud_lite": is_cloud_lite(),
        "memory_safe": True,
        "mode": "cloud-lite" if is_cloud_lite() else "full",
        "modelVersion": detector.model_version,
        "device": str(detector.device)
    }


if __name__ == "__main__":
    import uvicorn
    bind_host = os.environ.get("HOST", "0.0.0.0")
    bind_port = int(os.environ.get("PORT", "8000"))
    is_debug = os.environ.get("DEBUG", "False").lower() in ("true", "1")
    logger.info(f"[VoxGuard] Launching uvicorn on http://{bind_host}:{bind_port} (debug={is_debug})...")
    uvicorn.run("app.main:app", host=bind_host, port=bind_port, reload=is_debug)
