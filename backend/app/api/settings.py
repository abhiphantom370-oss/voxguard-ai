import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_setting, set_setting

logger = logging.getLogger("voxguard.api.settings")

router = APIRouter(prefix="/api/settings", tags=["Settings"])

class SettingsPayload(BaseModel):
    sensitivityPreset: Optional[str] = "balanced"  # balanced, high_sensitivity, high_precision
    sensitivityValue: Optional[int] = 75
    browserAlerts: Optional[bool] = True
    emailAlerts: Optional[bool] = False
    webhookAlerts: Optional[bool] = False
    anonymizeTranscripts: Optional[bool] = True
    audioRetention: Optional[str] = "24_hours"

@router.get("")
def fetch_settings():
    """Fetches system settings from SQLite."""
    try:
        return {
            "sensitivityPreset": get_setting("sensitivityPreset", "balanced"),
            "sensitivityValue": int(get_setting("sensitivityValue", "75")),
            "browserAlerts": get_setting("browserAlerts", "true") == "true",
            "emailAlerts": get_setting("emailAlerts", "false") == "true",
            "webhookAlerts": get_setting("webhookAlerts", "false") == "true",
            "anonymizeTranscripts": get_setting("anonymizeTranscripts", "true") == "true",
            "audioRetention": get_setting("audioRetention", "24_hours")
        }
    except Exception as e:
        logger.error(f"[VoxGuard API] Error fetching settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
def update_settings(payload: SettingsPayload):
    """Saves system settings to SQLite."""
    try:
        if payload.sensitivityPreset:
            set_setting("sensitivityPreset", payload.sensitivityPreset)
        if payload.sensitivityValue is not None:
            set_setting("sensitivityValue", str(payload.sensitivityValue))
        if payload.browserAlerts is not None:
            set_setting("browserAlerts", "true" if payload.browserAlerts else "false")
        if payload.emailAlerts is not None:
            set_setting("emailAlerts", "true" if payload.emailAlerts else "false")
        if payload.webhookAlerts is not None:
            set_setting("webhookAlerts", "true" if payload.webhookAlerts else "false")
        if payload.anonymizeTranscripts is not None:
            set_setting("anonymizeTranscripts", "true" if payload.anonymizeTranscripts else "false")
        if payload.audioRetention:
            set_setting("audioRetention", payload.audioRetention)

        return {"status": "saved", "settings": payload.model_dump()}
    except Exception as e:
        logger.error(f"[VoxGuard API] Error updating settings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
