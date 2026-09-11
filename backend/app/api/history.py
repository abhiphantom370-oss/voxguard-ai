import logging
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict, Any
from db.database import get_analyses, delete_analysis

logger = logging.getLogger("voxguard.api.history")

router = APIRouter(prefix="/api/history", tags=["History"])

@router.get("", response_model=List[Dict[str, Any]])
def fetch_history(
    search: Optional[str] = Query("", description="Search term for filename, transcript, or speaker"),
    risk_filter: Optional[str] = Query("all", description="Risk level filter: all, safe, caution, suspicious, high, critical"),
    limit: Optional[int] = Query(100, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0)
):
    try:
        records = get_analyses(search=search, risk_filter=risk_filter, limit=limit, offset=offset)
        return records
    except Exception as e:
        logger.error(f"[VoxGuard API] Failed to fetch history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database retrieval error: {str(e)}")

@router.delete("/{analysis_id}")
def remove_history_item(analysis_id: str):
    success = delete_analysis(analysis_id)
    if not success:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    return {"status": "deleted", "id": analysis_id}
