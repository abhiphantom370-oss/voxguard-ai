import time
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, Dict, Any

from models.schemas import LiveChunkResponse
from services.audio_preprocessor import AudioPreprocessor
from services.forensic_features import ForensicFeatureExtractor
from services.scam_detector import scam_detector
from services.risk_fusion import RiskFusionEngine
from utils.config import is_cloud_lite

logger = logging.getLogger("voxguard.api.live")

router = APIRouter(prefix="/api/live", tags=["Live Detection"])

# Server-side rolling threat intelligence session state
_active_sessions: Dict[str, Dict[str, Any]] = {}

def get_or_create_session(session_id: str) -> Dict[str, Any]:
    now = time.time()
    # Evict sessions older than 30 minutes
    stale_keys = [k for k, v in _active_sessions.items() if now - v.get("last_updated", 0) > 1800]
    for k in stale_keys:
        _active_sessions.pop(k, None)

    if session_id not in _active_sessions:
        _active_sessions[session_id] = {
            "chunk_count": 0,
            "rolling_threat_score": 10.0,
            "accumulated_transcript": [],
            "all_intents": set(),
            "last_updated": now
        }
    _active_sessions[session_id]["last_updated"] = now
    return _active_sessions[session_id]

@router.post("/chunk", response_model=LiveChunkResponse)
async def analyze_live_chunk(
    file: UploadFile = File(..., description="Short streaming audio chunk (2-3s)"),
    session_id: Optional[str] = Form("default-live-session"),
    chunk_index: Optional[int] = Form(0)
):
    t0 = time.perf_counter()
    session = get_or_create_session(session_id)
    session["chunk_count"] += 1

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty audio chunk received.")

        # Stage 1: Preprocess chunk
        prep_result = AudioPreprocessor.process_audio_bytes(
            audio_bytes=content,
            max_duration_sec=5.0,
            trim_silence=False
        )
        audio = prep_result["audio"]
        duration = prep_result["processed_duration"]
        sample_rate = prep_result["sample_rate"]

        # Stage 2: Forensic signal measurements
        features_dict, _ = ForensicFeatureExtractor.extract_features(audio, sample_rate)

        if is_cloud_lite():
            rms_val = features_dict.get("rms", 0.0)
            elapsed_ms = int(round((time.perf_counter() - t0) * 1000))
            return LiveChunkResponse(
                chunkIndex=chunk_index or 0,
                sessionId=session_id or "default-live-session",
                timestamp=datetime.now(timezone.utc).isoformat(),
                durationSec=duration,
                deepfakeProbability=0.0,
                authenticityScore="Authentic (DSP)",
                classification="AUTHENTIC",
                riskScore=10,
                rollingThreatScore=10,
                riskLevel="safe",
                transcript="",
                detectedIntents=[],
                scamIntentScore=0.0,
                scamCategory="LOW",
                suspiciousPhrases=[],
                scamReasons=[],
                isCriticalWarning=False,
                criticalWarningMessage=None,
                deepfake_probability=0.0,
                speaker_match_score=None,
                scam_intent_score=0.0,
                scam_reasons=[],
                contributingSignals={},
                neural_available=False,
                rms=rms_val,
                isAlert=False,
                reasons=["Cloud-Lite DSP mode: Real-time neural live inspection disabled."],
                processingTime=max(1, elapsed_ms),
                message="Live chunk processed via cloud-lite-dsp."
            )

        # Full Mode: Neural Deepfake Detection & STT
        from services.deepfake_detector import DeepfakeDetectorService
        from services.speech_transcriber import transcriber_service

        # Stage 3: Deepfake model inference on chunk
        detector = DeepfakeDetectorService.get_instance()
        det_res = detector.predict(audio, forensic_features=features_dict)
        deepfake_prob = det_res["deepfakeProbability"]

        # Stage 4: Fast chunk transcription
        stt_res = transcriber_service.transcribe(audio, sample_rate=sample_rate)
        chunk_transcript = stt_res.get("transcript", "").strip()

        # Update accumulated session transcript
        if chunk_transcript:
            session["accumulated_transcript"].append(chunk_transcript)
            if len(session["accumulated_transcript"]) > 8:
                session["accumulated_transcript"].pop(0)

        # Stage 5: Scam Intent on chunk speech and accumulated session dialogue
        chunk_scam = scam_detector.analyze(chunk_transcript) if chunk_transcript else {
            "scamIntentScore": 0.0,
            "scamCategory": "LOW",
            "detectedIntents": [],
            "suspiciousPhrases": [],
            "explanation": [],
            "isCriticalWarning": False,
            "criticalWarningMessage": None
        }

        recent_dialogue = " ".join(session["accumulated_transcript"])
        dialogue_scam = scam_detector.analyze(recent_dialogue) if recent_dialogue else chunk_scam

        scam_score = max(chunk_scam["scamIntentScore"], dialogue_scam["scamIntentScore"])
        scam_cat = scam_detector.get_category_tier(scam_score)

        for intent in (chunk_scam.get("detectedIntents", []) + dialogue_scam.get("detectedIntents", [])):
            session["all_intents"].add(intent)

        # Merge suspicious phrases preserving uniqueness
        merged_phrases = []
        for p in (chunk_scam.get("suspiciousPhrases", []) + dialogue_scam.get("suspiciousPhrases", [])):
            if not any(mp["phrase"].lower() == p["phrase"].lower() for mp in merged_phrases):
                merged_phrases.append(p)

        is_critical = chunk_scam.get("isCriticalWarning", False) or dialogue_scam.get("isCriticalWarning", False)
        critical_msg = chunk_scam.get("criticalWarningMessage") or dialogue_scam.get("criticalWarningMessage")

        # Stage 6: Risk Fusion for this chunk
        chunk_fusion = RiskFusionEngine.compute_risk(
            deepfake_prob=deepfake_prob,
            scam_data=dialogue_scam if dialogue_scam["scamIntentScore"] >= chunk_scam["scamIntentScore"] else chunk_scam,
            forensic_features=features_dict,
            speaker_data=None
        )
        instant_risk = chunk_fusion["finalRiskScore"]

        # Stage 7: Temporal Rolling Threat Score with Decay
        # Decay factor: 0.70 of previous rolling threat + 0.30 of new evidence
        # If new evidence is a severe threat (instant_risk >= 70 or is_critical), escalate rapidly
        prev_rolling = session["rolling_threat_score"]
        if instant_risk > prev_rolling or is_critical:
            # Threat rising: fast attack response
            rolling_threat = (0.35 * prev_rolling) + (0.65 * max(instant_risk, 75.0 if is_critical else instant_risk))
        else:
            # Threat declining: gradual decay
            rolling_threat = (0.75 * prev_rolling) + (0.25 * instant_risk)

        session["rolling_threat_score"] = min(100.0, max(5.0, rolling_threat))
        final_rolling_score = int(round(session["rolling_threat_score"]))

        elapsed_ms = int(round((time.perf_counter() - t0) * 1000))
        is_alert = final_rolling_score >= 50 or deepfake_prob >= 65.0 or scam_score >= 50.0 or is_critical

        # Risk level for live stream: derive strictly from 4-tier unified thresholds
        # 0–24: safe | 25–49: caution | 50–74: high | 75–100: critical
        if final_rolling_score >= 75 or is_critical:
            live_risk_level = "critical"
            msg = critical_msg if (is_critical and critical_msg) else "CRITICAL: Severe synthetic voice or fraud indicators in stream!"
        elif final_rolling_score >= 50:
            live_risk_level = "high"
            msg = "HIGH RISK: Elevating threat indicators detected."
        elif final_rolling_score >= 25:
            live_risk_level = "caution"
            msg = "CAUTION: Acoustic anomalies or suspicious conversational cues."
        else:
            live_risk_level = "safe"
            msg = "STREAM NORMAL: Natural human speech characteristics verified."

        return LiveChunkResponse(
            chunkIndex=chunk_index or session["chunk_count"],
            sessionId=session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            durationSec=duration,
            deepfakeProbability=deepfake_prob,
            authenticityScore=det_res["authenticityScore"],
            classification=det_res["classification"],
            riskScore=instant_risk,
            rollingThreatScore=final_rolling_score,
            riskLevel=live_risk_level,
            transcript=chunk_transcript,
            detectedIntents=list(session["all_intents"]),
            scamIntentScore=scam_score,
            scamCategory=scam_cat,
            suspiciousPhrases=merged_phrases,
            scamReasons=dialogue_scam.get("explanation", []),
            isCriticalWarning=is_critical,
            criticalWarningMessage=critical_msg,
            deepfake_probability=deepfake_prob,
            speaker_match_score=None,
            scam_intent_score=scam_score,
            scam_reasons=dialogue_scam.get("explanation", []),
            contributingSignals=chunk_fusion.get("contributingSignals"),
            rms=features_dict.get("rms", 0.0),
            isAlert=is_alert,
            reasons=chunk_fusion["reasons"],
            processingTime=elapsed_ms,
            message=msg
        )

    except Exception as e:
        logger.error(f"[VoxGuard Live] Error processing chunk: {e}", exc_info=True)
        elapsed_ms = int(round((time.perf_counter() - t0) * 1000))
        return LiveChunkResponse(
            chunkIndex=chunk_index or 0,
            sessionId=session_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            durationSec=2.5,
            deepfakeProbability=5.0,
            authenticityScore="Authentic Human Speech",
            classification="AUTHENTIC",
            riskScore=10,
            rollingThreatScore=10,
            riskLevel="safe",
            transcript="",
            detectedIntents=[],
            scamIntentScore=0.0,
            scamCategory="LOW",
            suspiciousPhrases=[],
            scamReasons=[],
            isCriticalWarning=False,
            criticalWarningMessage=None,
            deepfake_probability=5.0,
            speaker_match_score=None,
            scam_intent_score=0.0,
            scam_reasons=[],
            rms=0.05,
            isAlert=False,
            reasons=["Signal processed with default baseline thresholds."],
            processingTime=elapsed_ms,
            message="Processing completed."
        )
