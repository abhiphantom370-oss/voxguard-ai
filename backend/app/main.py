import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from utils.logging import setup_logging
from db.database import init_db
from services.deepfake_detector import DeepfakeDetectorService
from services.speech_transcriber import transcriber_service
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
    # Startup: Initialize SQLite schema & warm up ML models ONCE into memory
    logger.info("[VoxGuard] Starting up VoxGuard AI Forensic Inference Engine...")
    try:
        init_db()
        logger.info("[VoxGuard] SQLite database initialized successfully.")
    except Exception as db_err:
        logger.error(f"[VoxGuard] Database initialization error: {db_err}", exc_info=True)

    try:
        detector = DeepfakeDetectorService.get_instance()
        logger.info(f"[VoxGuard] AcousticNet {detector.model_version} warmed up.")
    except Exception as m_err:
        logger.error(f"[VoxGuard] Deepfake detector load error: {m_err}", exc_info=True)

    try:
        _ = transcriber_service
        logger.info(f"[VoxGuard] Speech transcription service initialized.")
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
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
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

# Health Check Endpoints
@app.get("/health")
@app.get("/api/health")
async def health_check():
    detector = DeepfakeDetectorService.get_instance()
    return {
        "status": "healthy",
        "service": "VoxGuard AI Forensic Inference Engine",
        "version": "3.0.0",
        "modelVersion": detector.model_version,
        "device": str(detector.device),
        "sttAvailable": transcriber_service.model is not None
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("[VoxGuard] Launching uvicorn on http://127.0.0.1:8000...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
