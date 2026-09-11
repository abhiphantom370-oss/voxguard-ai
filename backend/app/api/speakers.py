import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, List, Dict, Any

from services.speaker_verifier import speaker_service
from services.audio_preprocessor import AudioPreprocessor

logger = logging.getLogger("voxguard.api.speakers")

router = APIRouter(prefix="/api/speaker", tags=["Speakers"])

@router.get("/list", response_model=List[Dict[str, Any]])
def list_enrolled_speakers():
    """Returns the list of enrolled trusted speaker biometric profiles."""
    try:
        return speaker_service.get_speakers_list()
    except Exception as e:
        logger.error(f"[VoxGuard API] Error listing speakers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/enroll")
async def enroll_speaker_biometric(
    name: str = Form(..., description="Full Name of trusted speaker, e.g. Father, CEO"),
    role: Optional[str] = Form("Authorized Contact", description="Role or relationship"),
    department: Optional[str] = Form("Executive / Personal", description="Department or category"),
    file: UploadFile = File(..., description="Reference audio sample (3-15 seconds)")
):
    """Enrolls a trusted biometric speaker profile from reference audio."""
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Speaker name is required.")

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Audio file cannot be empty.")

        prep = AudioPreprocessor.process_audio_bytes(
            audio_bytes=content,
            max_duration_sec=30.0,
            trim_silence=True
        )

        audio = prep["audio"]
        sr = prep["sample_rate"]

        result = speaker_service.enroll_speaker(
            name=name.strip(),
            role=role.strip() if role else "Authorized Contact",
            department=department.strip() if department else "Executive",
            audio=audio,
            sample_rate=sr
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VoxGuard API] Speaker enrollment failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")

@router.delete("/{speaker_id}")
def delete_enrolled_speaker(speaker_id: str):
    """Removes a trusted speaker profile from the database."""
    success = speaker_service.remove_speaker(speaker_id)
    if not success:
        raise HTTPException(status_code=404, detail="Speaker profile not found.")
    return {"status": "deleted", "id": speaker_id}

@router.post("/verify")
async def verify_speaker_biometric(
    speaker_id: str = Form(..., description="Target enrolled speaker ID"),
    file: UploadFile = File(..., description="Audio sample to verify against enrolled speaker")
):
    """Verifies a test audio sample against an enrolled speaker profile using real acoustic voiceprint cosine similarity."""
    if not speaker_id or speaker_id.strip() in ("none", "null", "undefined", ""):
        raise HTTPException(status_code=400, detail="Target enrolled speaker ID is required.")

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Audio file cannot be empty.")

        prep = AudioPreprocessor.process_audio_bytes(
            audio_bytes=content,
            max_duration_sec=30.0,
            trim_silence=True
        )

        audio = prep["audio"]
        sr = prep["sample_rate"]

        result = speaker_service.verify_speaker(
            audio=audio,
            target_speaker_id=speaker_id.strip(),
            sample_rate=sr
        )

        if not result.get("enrolled"):
            raise HTTPException(status_code=404, detail="Target speaker profile not found in biometric database.")

        similarity = result.get("speakerSimilarity", 0.0) or 0.0
        similarity_percent = round(similarity * 100, 1)

        is_verified = result["speakerMatch"] == "MATCH"
        display_status = (
            "VERIFIED / MATCH"
            if is_verified
            else ("UNCERTAIN MATCH" if result["speakerMatch"] == "UNCERTAIN" else "NOT VERIFIED / MISMATCH")
        )

        return {
            "speakerId": result["speakerId"],
            "speakerName": result["speakerName"],
            "speakerMatch": result["speakerMatch"],
            "isVerified": is_verified,
            "displayStatus": display_status,
            "similarityScore": similarity_percent,
            "cosineSimilarity": result["speakerSimilarity"],
            "durationSec": prep.get("processed_duration", prep.get("original_duration", 0.0)),
            "sampleRate": sr
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VoxGuard API] Speaker verification failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

