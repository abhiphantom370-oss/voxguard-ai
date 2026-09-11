import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analyze import router as analyze_router

# Configure logging with clear prefix and timestamps
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("voxguard.main")

app = FastAPI(
    title="VoxGuard AI - Voice Deepfake Inspection Engine",
    description="Real-time forensic AI audio analysis engine for detecting voice cloning, synthetic vocoders, and conversational spoofing attacks.",
    version="2.1.0"
)

# Enable CORS for local Vite development environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(analyze_router)

@app.get("/api/health")
async def health_check():
    logger.info("[VoxGuard Backend] Health check probed")
    return {
        "status": "healthy",
        "service": "VoxGuard AI Inference Engine",
        "version": "2.1.0",
        "models_loaded": ["VoxGuard-AcousticNet-v2.1", "MultiBand-Vocoder-Discriminator"]
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("[VoxGuard Backend] Starting server directly on 0.0.0.0:8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
