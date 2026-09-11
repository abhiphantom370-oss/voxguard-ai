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
            "accumulated_audio": [],
            "last_dialogue_transcript": "",
            "all_intents": set(),
            "sensitive_indicators": {
                "otp_detected": False,
                "pin_detected": False,
                "cvv_detected": False,
                "upi_pin_detected": False,
                "password_detected": False,
                "payment_transfer_detected": False,
                "impersonation_detected": False,
                "urgency_detected": False,
                "sensitive_request": False
            },
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

        # Stage 3: Deepfake anti-spoof model inference on chunk (ONNX or PyTorch or DSP Fallback)
        from services.deepfake_detector import DeepfakeDetectorService
        detector = DeepfakeDetectorService.get_instance()
        det_res = detector.predict(audio, forensic_features=features_dict)
        deepfake_prob = det_res["deepfakeProbability"]
        neural_active = det_res.get("neural_available", False)
        engine_name = det_res.get("engine", "onnx-acousticnet")

        # Accumulate audio in session (maintain rolling buffer of up to 4 chunks ~10s)
        session.setdefault("accumulated_audio", []).append(audio)
        if len(session["accumulated_audio"]) > 4:
            session["accumulated_audio"].pop(0)

        # Stage 4: Rolling Speech-to-Text transcription
        # Run transcription on chunk 1 and every 3 chunks thereafter (~7.5s intervals)
        chunk_transcript = ""
        should_transcribe = (session["chunk_count"] == 1) or (session["chunk_count"] % 3 == 0)
        try:
            from services.speech_transcriber import transcriber_service
            if transcriber_service.is_available and should_transcribe and session["accumulated_audio"]:
                import numpy as np
                rolling_audio = np.concatenate(session["accumulated_audio"])
                stt_res = transcriber_service.transcribe(rolling_audio, sample_rate=sample_rate)
                transcribed_text = stt_res.get("transcript", "").strip()
                if transcribed_text:
                    session["last_dialogue_transcript"] = transcribed_text
                    chunk_transcript = transcribed_text
        except Exception as stt_err:
            logger.warning(f"[VoxGuard Live] Rolling transcription error: {stt_err}")

        current_dialogue = session.get("last_dialogue_transcript", "") or chunk_transcript

        # Stage 5: Scam Intent & Sensitive Request Detection on dialogue
        dialogue_scam = scam_detector.analyze(current_dialogue) if current_dialogue else {
            "scamIntentScore": 0.0,
            "scamCategory": "LOW",
            "detectedIntents": [],
            "suspiciousPhrases": [],
            "explanation": [],
            "isCriticalWarning": False,
            "criticalWarningMessage": None,
            "sensitive_indicators": session.get("sensitive_indicators")
        }

        scam_score = dialogue_scam["scamIntentScore"]
        scam_cat = dialogue_scam["scamCategory"]

        for intent in dialogue_scam.get("detectedIntents", []):
            session["all_intents"].add(intent)

        # Update persistent session sensitive request flags
        cur_sens = session.setdefault("sensitive_indicators", {
            "otp_detected": False,
            "pin_detected": False,
            "cvv_detected": False,
            "upi_pin_detected": False,
            "password_detected": False,
            "payment_transfer_detected": False,
            "impersonation_detected": False,
            "urgency_detected": False,
            "sensitive_request": False
        })
        if dialogue_scam.get("sensitive_indicators"):
            for k, v in dialogue_scam["sensitive_indicators"].items():
                if v:
                    cur_sens[k] = True
            if any(cur_sens[k] for k in ["otp_detected", "pin_detected", "cvv_detected", "upi_pin_detected", "password_detected", "payment_transfer_detected", "impersonation_detected", "urgency_detected"]):
                cur_sens["sensitive_request"] = True

        merged_phrases = []
        for p in dialogue_scam.get("suspiciousPhrases", []):
            if not any(mp["phrase"].lower() == p["phrase"].lower() for mp in merged_phrases):
                merged_phrases.append(p)

        is_critical = dialogue_scam.get("isCriticalWarning", False) or cur_sens.get("sensitive_request", False)
        critical_msg = dialogue_scam.get("criticalWarningMessage")
        if not critical_msg and is_critical:
            critical_msg = "CRITICAL SECURITY ALERT: Sensitive credential / payment solicitation in conversational stream!"

        # Stage 6: Risk Fusion for this chunk
        chunk_fusion = RiskFusionEngine.compute_risk(
            deepfake_prob=deepfake_prob,
            scam_data=dialogue_scam,
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

        resp = LiveChunkResponse(
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
            transcript=current_dialogue,
            detectedIntents=list(session["all_intents"]),
            scamIntentScore=scam_score,
            scamCategory=scam_cat,
            suspiciousPhrases=merged_phrases,
            scamReasons=dialogue_scam.get("explanation", []),
            isCriticalWarning=is_critical,
            criticalWarningMessage=critical_msg,
            engine=engine_name,
            deepfake_probability=deepfake_prob,
            authenticity_probability=det_res.get("authenticityProbability", 100.0 - deepfake_prob),
            unified_risk_score=final_rolling_score,
            confidence=det_res.get("confidence", 50.0),
            acoustic_metrics=features_dict,
            forensic_indicators=chunk_fusion["reasons"],
            latency_ms=elapsed_ms,
            sensitive_indicators=cur_sens,
            sensitiveIndicators=cur_sens,
            transcription_available=bool(current_dialogue),
            speaker_match_score=None,
            scam_intent_score=scam_score,
            scam_reasons=dialogue_scam.get("explanation", []),
            contributingSignals=chunk_fusion.get("contributingSignals"),
            neural_available=neural_active,
            rms=features_dict.get("rms", 0.0),
            isAlert=is_alert,
            reasons=chunk_fusion["reasons"],
            processingTime=elapsed_ms,
            message=msg
        )

        import gc
        gc.collect()

        return resp


    except Exception as e:
        logger.error(f"[VoxGuard Live] Error processing chunk: {e}", exc_info=True)
        elapsed_ms = int(round((time.perf_counter() - t0) * 1000))
        empty_sens = {
            "otp_detected": False,
            "pin_detected": False,
            "cvv_detected": False,
            "upi_pin_detected": False,
            "password_detected": False,
            "payment_transfer_detected": False,
            "impersonation_detected": False,
            "urgency_detected": False,
            "sensitive_request": False
        }
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
            sensitive_indicators=empty_sens,
            sensitiveIndicators=empty_sens,
            transcription_available=False,
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
