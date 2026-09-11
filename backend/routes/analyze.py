from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import logging

from models.inference import AnalysisResponse
from services.detector import detector_service

logger = logging.getLogger("voxguard.routes.analyze")

router = APIRouter(prefix="/api", tags=["Analysis"])

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio_endpoint(
    file: UploadFile = File(..., description="Audio stream or file to inspect"),
    duration: Optional[float] = Form(None, description="Client detected duration in seconds")
):
    logger.info(f"[VoxGuard Backend] Received /api/analyze request: filename={file.filename}, content_type={file.content_type}")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided for audio file.")
        
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded audio stream is empty (0 bytes).")

        result = detector_service.analyze_audio(
            audio_bytes=content,
            file_name=file.filename,
            content_type=file.content_type or "audio/unknown",
            client_duration=duration
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[VoxGuard Backend] Error during inference analysis: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference pipeline execution error: {str(exc)}")
