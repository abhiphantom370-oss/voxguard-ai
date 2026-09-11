import io
import csv
import logging
from fastapi import APIRouter, Response, HTTPException
from db.database import get_reports_metrics, get_analyses

logger = logging.getLogger("voxguard.api.reports")

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/metrics")
def fetch_report_metrics():
    """Returns dynamic aggregated threat intelligence metrics derived from SQLite audit database."""
    try:
        metrics = get_reports_metrics()
        return metrics
    except Exception as e:
        logger.error(f"[VoxGuard API] Error generating report metrics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
def export_report_csv():
    """Exports complete audit log records as a downloadable CSV file."""
    try:
        records = get_analyses(limit=1000)
        output = io.StringIO()
        writer = csv.writer(output)

        # Header row
        writer.writerow([
            "Analysis ID",
            "Timestamp",
            "File Name",
            "Duration",
            "Risk Score (0-100)",
            "Risk Level",
            "Classification",
            "Deepfake Probability (%)",
            "Authenticity Probability (%)",
            "Scam Intent Score (0-100)",
            "Detected Scam Categories",
            "Speaker Identity",
            "Speaker Match",
            "Speaker Similarity",
            "Transcript"
        ])

        for r in records:
            intents_str = "; ".join(r.get("detectedIntents", []))
            writer.writerow([
                r.get("id"),
                r.get("timestamp"),
                r.get("fileName"),
                r.get("duration"),
                r.get("riskScore"),
                r.get("riskLevel"),
                r.get("authenticity"),
                r.get("deepfakeProbability"),
                r.get("authenticityProbability"),
                r.get("scamScore"),
                intents_str,
                r.get("speaker"),
                r.get("speakerMatch"),
                r.get("speakerSimilarity"),
                r.get("transcript", "").replace("\n", " ")
            ])

        csv_content = output.getvalue()
        output.close()

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=voxguard_threat_report.csv"}
        )
    except Exception as e:
        logger.error(f"[VoxGuard API] CSV export failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
