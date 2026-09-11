import uuid
import time
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from models.schemas import AnalysisResponse, ForensicFeatures
from services.audio_preprocessor import AudioPreprocessor
from services.forensic_features import ForensicFeatureExtractor
from services.scam_detector import scam_detector
from services.speaker_verifier import speaker_service
from services.risk_fusion import RiskFusionEngine
from utils.config import is_cloud_lite
from db.database import save_analysis

logger = logging.getLogger("voxguard.api.analyze")

router = APIRouter(prefix="/api", tags=["Analysis"])

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio_endpoint(
    file: UploadFile = File(..., description="Audio file or recording stream to inspect"),
    duration: Optional[float] = Form(None, description="Client detected duration in seconds"),
    speaker_id: Optional[str] = Form(None, description="Optional enrolled speaker profile to verify against"),
    sensitivity: Optional[str] = Form("balanced", description="Detection sensitivity preset: balanced, high_sensitivity, high_precision")
):
    t_start = time.perf_counter()
    logger.info(f"[VoxGuard API] Ingesting /api/analyze: filename='{file.filename}', speaker_id='{speaker_id}', sensitivity='{sensitivity}', cloud_lite={is_cloud_lite()}")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file or filename provided.")

    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="The uploaded audio stream is empty (0 bytes).")

        # Stage 1: Audio Preprocessing & Normalization (Lightweight PyAV + NumPy)
        t_prep_0 = time.perf_counter()
        prep_result = AudioPreprocessor.process_audio_bytes(
            audio_bytes=content,
            max_duration_sec=30.0,
            trim_silence=True
        )
        audio_tensor = prep_result["audio"]
        actual_duration = prep_result["processed_duration"]
        sample_rate = prep_result["sample_rate"]
        preprocessing_ms = int(round((time.perf_counter() - t_prep_0) * 1000))

        # Stage 2: Forensic Signal Feature Extraction (Pure DSP: NumPy + SciPy)
        features_dict, forensic_observations = ForensicFeatureExtractor.extract_features(
            audio=audio_tensor,
            sample_rate=sample_rate
        )

        # Handle Cloud-Lite Mode: zero neural network imports or execution
        if is_cloud_lite():
            # Stage 3: Biometric Speaker Verification (Pure NumPy FFT)
            t_spk_0 = time.perf_counter()
            speaker_res = speaker_service.verify_speaker(
                audio=audio_tensor,
                target_speaker_id=speaker_id,
                sample_rate=sample_rate
            )
            speaker_ms = int(round((time.perf_counter() - t_spk_0) * 1000))

            # Stage 4: Risk Fusion based purely on DSP features and speaker identity
            t_fus_0 = time.perf_counter()
            scam_result = {
                "scamIntentScore": 0.0,
                "scamCategory": "LOW",
                "detectedIntents": [],
                "suspiciousPhrases": [],
                "explanation": ["Lexical intent analysis unavailable in Cloud-Lite mode (Whisper bypassed)."]
            }
            stt_result = {
                "transcript": "",
                "detectedLanguage": "en",
                "transcriptionConfidence": 0.0
            }
            fusion_result = RiskFusionEngine.compute_risk(
                deepfake_prob=0.0,
                scam_data=scam_result,
                forensic_features=features_dict,
                speaker_data=speaker_res
            )
            fusion_ms = int(round((time.perf_counter() - t_fus_0) * 1000))

            total_ms = int(round((time.perf_counter() - t_start) * 1000))
            timing_breakdown = {
                "preprocessing_ms": preprocessing_ms,
                "deepfake_ms": 0,
                "stt_ms": 0,
                "scam_ms": 0,
                "speaker_ms": speaker_ms,
                "fusion_ms": fusion_ms,
                "total_ms": total_ms
            }

            combined_reasons = [
                "Cloud-Lite DSP Engine: Neural inference (AASIST/Whisper) disabled (neural_available=false).",
                *forensic_observations
            ]
            if speaker_res.get("enrolled"):
                if speaker_res.get("speakerMatch") == "MATCH":
                    combined_reasons.append(f"Trusted speaker verified: matches '{speaker_res.get('speakerName')}'.")
                elif speaker_res.get("speakerMatch") == "MISMATCH":
                    combined_reasons.append(f"Trusted speaker mismatch with '{speaker_res.get('speakerName')}'.")

            session_id = f"LITE-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
            iso_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

            try:
                save_analysis({
                    "id": session_id,
                    "timestamp": iso_timestamp,
                    "filename": file.filename,
                    "duration": actual_duration,
                    "sample_rate": sample_rate,
                    "transcript": "",
                    "detected_language": "en",
                    "deepfake_prob": 0.0,
                    "authenticity_prob": 100.0,
                    "scam_score": 0.0,
                    "detected_intents": [],
                    "speaker_id": speaker_id if speaker_res.get("enrolled") else None,
                    "speaker_name": speaker_res.get("speakerName"),
                    "speaker_match": speaker_res["speakerMatch"],
                    "speaker_similarity": speaker_res["speakerSimilarity"],
                    "risk_score": fusion_result["finalRiskScore"],
                    "risk_level": fusion_result["riskLevel"],
                    "classification": "AUTHENTIC",
                    "reasons": combined_reasons,
                    "timing": timing_breakdown
                })
            except Exception as db_err:
                logger.error(f"[VoxGuard API] Failed to persist cloud-lite analysis: {db_err}")

            response_payload = AnalysisResponse(
                analysisId=session_id,
                fileName=file.filename,
                fileSize=len(content),
                durationSec=actual_duration,
                sampleRate=sample_rate,
                channels=1,
                status="completed",
                timestamp=datetime.now(timezone.utc).isoformat(),
                deepfakeProbability=0.0,
                authenticityProbability=100.0,
                authenticityScore="Acoustic Signal Evaluated (DSP)",
                classification="AUTHENTIC",
                transcript="",
                detectedLanguage="en",
                transcriptionConfidence=0.0,
                scamIntentScore=0.0,
                scamCategory="LOW",
                detectedIntents=[],
                suspiciousPhrases=[],
                scamReasons=["Neural transcription bypassed in cloud-lite mode."],
                speakerMatch=speaker_res["speakerMatch"],
                speakerSimilarity=speaker_res["speakerSimilarity"],
                speakerName=speaker_res.get("speakerName"),
                contextualRisk=fusion_result["contextualRisk"],
                finalRiskScore=fusion_result["finalRiskScore"],
                riskLevel=fusion_result["riskLevel"],
                reasons=combined_reasons,
                deepfake_probability=0.0,
                speaker_match_score=speaker_res["speakerSimilarity"],
                scam_intent_score=0.0,
                scam_reasons=[],
                contributingSignals=fusion_result.get("contributingSignals"),
                features=ForensicFeatures(**features_dict),
                modelName="cloud-lite-dsp",
                modelVersion="1.0.0-dsp",
                neural_available=False,
                processingTime=total_ms,
                timing=timing_breakdown,
                message="DSP acoustic analysis completed. Neural model unavailable in Cloud-Lite mode."
            )
            return response_payload

        # Full Mode: Execute PyTorch CNN and Faster-Whisper pipeline
        from services.deepfake_detector import DeepfakeDetectorService
        from services.speech_transcriber import transcriber_service

        # Stage 3: Deepfake Neural Inference (AcousticNet CNN)
        t_df_0 = time.perf_counter()
        detector = DeepfakeDetectorService.get_instance()
        detection_result = detector.predict(
            audio=audio_tensor,
            forensic_features=features_dict,
            sensitivity_mode=sensitivity or "balanced"
        )
        deepfake_ms = int(round((time.perf_counter() - t_df_0) * 1000))

        # Stage 4: Speech-to-Text Transcription (faster-whisper)
        t_stt_0 = time.perf_counter()
        stt_result = transcriber_service.transcribe(audio_tensor, sample_rate=sample_rate)
        stt_ms = int(round((time.perf_counter() - t_stt_0) * 1000))

        # Stage 5: Scam Intent Detection (12 categories)
        t_scam_0 = time.perf_counter()
        scam_result = scam_detector.analyze(stt_result["transcript"])
        scam_ms = int(round((time.perf_counter() - t_scam_0) * 1000))

        # Stage 6: Biometric Speaker Verification
        t_spk_0 = time.perf_counter()
        speaker_res = speaker_service.verify_speaker(
            audio=audio_tensor,
            target_speaker_id=speaker_id,
            sample_rate=sample_rate
        )
        speaker_ms = int(round((time.perf_counter() - t_spk_0) * 1000))

        # Stage 7: Deterministic Risk Fusion
        t_fus_0 = time.perf_counter()
        fusion_result = RiskFusionEngine.compute_risk(
            deepfake_prob=detection_result["deepfakeProbability"],
            scam_data=scam_result,
            forensic_features=features_dict,
            speaker_data=speaker_res
        )
        fusion_ms = int(round((time.perf_counter() - t_fus_0) * 1000))

        total_ms = int(round((time.perf_counter() - t_start) * 1000))

        timing_breakdown = {
            "preprocessing_ms": preprocessing_ms,
            "deepfake_ms": deepfake_ms,
            "stt_ms": stt_ms,
            "scam_ms": scam_ms,
            "speaker_ms": speaker_ms,
            "fusion_ms": fusion_ms,
            "total_ms": total_ms
        }

        # Combine explainable reasons
        combined_reasons = []
        for r in fusion_result["reasons"]:
            if r not in combined_reasons:
                combined_reasons.append(r)
        for r in scam_result["explanation"]:
            if r not in combined_reasons and "No audible speech" not in r:
                combined_reasons.append(r)

        session_id = f"ANL-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        iso_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        # Persist analysis to SQLite
        try:
            save_analysis({
                "id": session_id,
                "timestamp": iso_timestamp,
                "filename": file.filename,
                "duration": actual_duration,
                "sample_rate": sample_rate,
                "transcript": stt_result["transcript"],
                "detected_language": stt_result["detectedLanguage"],
                "deepfake_prob": detection_result["deepfakeProbability"],
                "authenticity_prob": detection_result["authenticityProbability"],
                "scam_score": scam_result["scamIntentScore"],
                "detected_intents": scam_result["detectedIntents"],
                "speaker_id": speaker_id if speaker_res.get("enrolled") else None,
                "speaker_name": speaker_res.get("speakerName"),
                "speaker_match": speaker_res["speakerMatch"],
                "speaker_similarity": speaker_res["speakerSimilarity"],
                "risk_score": fusion_result["finalRiskScore"],
                "risk_level": fusion_result["riskLevel"],
                "classification": detection_result["classification"],
                "reasons": combined_reasons,
                "timing": timing_breakdown
            })
        except Exception as db_err:
            logger.error(f"[VoxGuard API] Failed to persist analysis to SQLite: {db_err}", exc_info=True)

        response_payload = AnalysisResponse(
            analysisId=session_id,
            fileName=file.filename,
            fileSize=len(content),
            durationSec=actual_duration,
            sampleRate=sample_rate,
            channels=1,
            status="completed",
            timestamp=datetime.now(timezone.utc).isoformat(),
            deepfakeProbability=detection_result["deepfakeProbability"],
            authenticityProbability=detection_result["authenticityProbability"],
            authenticityScore=detection_result["authenticityScore"],
            classification=detection_result["classification"],
            transcript=stt_result["transcript"],
            detectedLanguage=stt_result["detectedLanguage"],
            transcriptionConfidence=stt_result["transcriptionConfidence"],
            scamIntentScore=scam_result["scamIntentScore"],
            scamCategory=scam_result.get("scamCategory", "LOW"),
            detectedIntents=scam_result["detectedIntents"],
            suspiciousPhrases=scam_result["suspiciousPhrases"],
            scamReasons=scam_result["explanation"],
            speakerMatch=speaker_res["speakerMatch"],
            speakerSimilarity=speaker_res["speakerSimilarity"],
            speakerName=speaker_res.get("speakerName"),
            contextualRisk=fusion_result["contextualRisk"],
            finalRiskScore=fusion_result["finalRiskScore"],
            riskLevel=fusion_result["riskLevel"],
            reasons=combined_reasons,
            deepfake_probability=detection_result["deepfakeProbability"],
            speaker_match_score=speaker_res["speakerSimilarity"],
            scam_intent_score=scam_result["scamIntentScore"],
            scam_reasons=scam_result["explanation"],
            contributingSignals=fusion_result.get("contributingSignals"),
            features=ForensicFeatures(**features_dict),
            modelName=detection_result["modelName"],
            modelVersion=detection_result["modelVersion"],
            processingTime=total_ms,
            timing=timing_breakdown,
            message=combined_reasons[0] if combined_reasons else "Analysis complete."
        )

        logger.info(
            f"[VoxGuard API] Successfully analyzed '{file.filename}': "
            f"Risk={response_payload.finalRiskScore}/100, Deepfake={response_payload.deepfakeProbability}%, "
            f"Scam={response_payload.scamIntentScore}%, Latency={total_ms}ms"
        )
        return response_payload

    except HTTPException:
        raise
    except ValueError as val_err:
        logger.warning(f"[VoxGuard API] Validation error in /api/analyze: {val_err}")
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.error(f"[VoxGuard API] Internal failure during /api/analyze: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference pipeline execution failure: {str(e)}")
