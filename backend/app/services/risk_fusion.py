import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("voxguard.fusion")

class RiskFusionEngine:
    """
    Transparent Deterministic Risk Fusion Layer for VoxGuard AI.
    Integrates Deepfake AI Detection, Lexical Scam Intent, Biometric Speaker Verification,
    and Acoustic Signal Anomalies into a calibrated 0-100 Cybersecurity Threat Score.

    =============================================================================
    FINAL RISK LEVELS:
      0–24:   SAFE
      25–49:  CAUTION
      50–74:  HIGH RISK
      75–100: CRITICAL
    =============================================================================
    FUSION FORMULA:
      When Speaker is Evaluated:
        Base Score = (0.45 * Deepfake_Prob) + (0.35 * Scam_Score) + (0.15 * Speaker_Mismatch) + (0.05 * Anomaly_Score)

      When Speaker is NOT Evaluated (No trusted speaker selected):
        Base Score = (0.50 * Deepfake_Prob) + (0.45 * Scam_Score) + (0.05 * Anomaly_Score)
        (Zero speaker mismatch penalty is applied)

    CRITICAL NON-LINEAR SECURITY OVERRIDES & ESCALATIONS:
      1. Compound Threat (Synthetic Voice + Scam Intent):
         If Deepfake_Prob >= 65.0 and Scam_Score >= 60.0 -> Score = max(Score, 88.0) [CRITICAL]
      2. Direct Credential Extraction / Social Engineering Attack:
         If Scam_Score >= 75.0 or critical flag (OTP, PIN, payment demand, remote access) -> Score = max(Score, 76.0) [CRITICAL]
      3. High Deepfake Voice Alone:
         If Deepfake_Prob >= 75.0 -> Score = max(Score, 75.0) [CRITICAL]
      4. Trusted Speaker Mismatch Escalation:
         If speaker is evaluated AND Speaker_Match == "MISMATCH":
           If Scam_Score >= 50.0 -> Score = max(Score, 78.0) [CRITICAL]
           If Scam_Score >= 25.0 -> Score = max(Score, 72.0) [HIGH RISK]
           Else -> Score = max(Score, 35.0) [CAUTION minimum]
      5. Trusted Speaker Match:
         Speaker mismatch score = 0, no penalty.
    =============================================================================
    """

    @classmethod
    def compute_risk(
        cls,
        deepfake_prob: float,
        scam_data: Dict[str, Any],
        forensic_features: Optional[Dict[str, Any]] = None,
        speaker_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Fuses all diagnostic inputs into a final 0-100 risk score and explainable reasons.
        """
        reasons: List[str] = []

        df_prob = float(deepfake_prob)
        scam_score = float(scam_data.get("scamIntentScore", 0.0))
        intents = list(scam_data.get("detectedIntents", []))
        is_critical_flag = bool(scam_data.get("isCriticalWarning", False))

        # 1. Forensic Acoustic Anomaly Score (0 - 100)
        anomaly_score = 0.0
        if forensic_features:
            flatness = forensic_features.get("spectralFlatness", 0.0)
            zcr = forensic_features.get("zcr", 0.0)
            pitch_std = forensic_features.get("pitchVariabilityHz")

            if flatness > 0.35:
                anomaly_score += 45.0
                reasons.append("Elevated spectral flatness detected, indicating synthetic vocoder excitation.")
            if zcr > 0.40:
                anomaly_score += 25.0
                reasons.append("High zero-crossing density elevated beyond natural conversational speech.")
            if pitch_std is not None and pitch_std < 8.0:
                anomaly_score += 30.0
                reasons.append("Unusual fundamental pitch rigidity: absence of organic biological micro-tremors.")
        anomaly_score = min(100.0, anomaly_score)

        # 2. Speaker Biometric Mismatch Score (0 - 100)
        speaker_evaluated = False
        speaker_mismatch_score = 0.0
        match_status = "NOT EVALUATED"

        if speaker_data and speaker_data.get("enrolled"):
            speaker_evaluated = True
            match_status = speaker_data.get("speakerMatch", "NOT EVALUATED")
            spk_name = speaker_data.get("speakerName", "Enrolled Reference")
            sim = speaker_data.get("speakerSimilarity", 0.5)

            if match_status == "MISMATCH":
                speaker_mismatch_score = 90.0
                reasons.append(f"Trusted speaker mismatch: voiceprint failed biometric comparison with enrolled speaker '{spk_name}'.")
            elif match_status == "UNCERTAIN":
                speaker_mismatch_score = 45.0
                reasons.append(f"Trusted speaker inconclusive: voiceprint similarity with '{spk_name}' is marginal (similarity: {sim}).")
            elif match_status == "MATCH":
                speaker_mismatch_score = 0.0
                reasons.append(f"Trusted speaker verified: voiceprint matches enrolled identity '{spk_name}' (similarity: {sim}).")

        # 3. Apply Unified Fusion Formula
        if speaker_evaluated:
            raw_fusion = (0.45 * df_prob) + (0.35 * scam_score) + (0.15 * speaker_mismatch_score) + (0.05 * anomaly_score)
        else:
            raw_fusion = (0.50 * df_prob) + (0.45 * scam_score) + (0.05 * anomaly_score)

        # 4. Critical Security Overrides & Escalations
        # Override 1: Compound Threat (Synthetic Voice + Scam Intent)
        if df_prob >= 65.0 and scam_score >= 60.0:
            raw_fusion = max(raw_fusion, 88.0)
            reasons.insert(0, "CRITICAL COMPOUND THREAT: Synthetic voice clone combined with active social engineering fraud.")

        # Override 2: Direct Credential Extraction / Social Engineering Attack
        credential_intents = {"OTP_REQUEST", "CREDENTIAL_REQUEST", "CARD_DETAILS_REQUEST", "UPI_REQUEST", "FINANCIAL_REQUEST", "REMOTE_ACCESS_REQUEST"}
        if scam_score >= 75.0 or is_critical_flag or any(k in intents for k in credential_intents):
            raw_fusion = max(raw_fusion, 76.0)
            if "OTP_REQUEST" in intents:
                reasons.append("OTP request detected: dialogue solicits one-time verification credential.")
            if "UPI_REQUEST" in intents:
                reasons.append("UPI PIN / banking PIN request detected.")
            if "CARD_DETAILS_REQUEST" in intents:
                reasons.append("Card details / CVV request detected: sensitive security details solicited.")
            if "CREDENTIAL_REQUEST" in intents:
                reasons.append("Financial credential request detected: sensitive security credentials solicited.")
            if "FINANCIAL_REQUEST" in intents:
                reasons.append("Payment demand detected: coercive money transfer or payment requested.")
            if "REMOTE_ACCESS_REQUEST" in intents:
                reasons.append("Remote access request: solicitation to install remote screen-sharing tools.")

        # Override 3: High Deepfake Voice Alone
        if df_prob >= 75.0:
            raw_fusion = max(raw_fusion, 75.0)
            reasons.append(f"Neural voice spoof probability elevated: {df_prob:.1f}% synthetic likelihood.")

        # Override 4: Trusted Speaker Mismatch Escalation
        if speaker_evaluated and match_status == "MISMATCH":
            if scam_score >= 50.0:
                raw_fusion = max(raw_fusion, 78.0)
                reasons.insert(0, "CRITICAL: Enrolled trusted identity impersonation detected alongside high scam intent.")
            elif scam_score >= 25.0:
                raw_fusion = max(raw_fusion, 72.0)
                reasons.insert(0, "HIGH RISK: Biometric voiceprint failed comparison with enrolled profile alongside suspicious intent.")
            else:
                raw_fusion = max(raw_fusion, 35.0)

        # Add conversational context reasons if detected
        if "URGENCY_PRESSURE" in intents:
            reasons.append("Urgency language detected: coercive deadline framing observed.")
        if "BANK_IMPERSONATION" in intents:
            reasons.append("Bank impersonation pattern: institutional authority claimed in dialogue.")
        if "POLICE_GOVERNMENT_IMPERSONATION" in intents:
            reasons.append("Law enforcement / authority impersonation pattern detected.")

        if df_prob >= 35.0 and df_prob < 75.0:
            reasons.append(f"Neural voice spoof probability elevated: {df_prob:.1f}% synthetic acoustic trace.")
        elif df_prob < 35.0:
            reasons.append("Acoustic markers indicate natural human speech patterns.")

        if not reasons:
            reasons.append("Acoustic features and conversational context are consistent with authentic communication.")

        final_risk = int(round(min(100.0, max(0.0, raw_fusion))))

        # 5. Categorize Threat Band (Strict 4-Tier Scheme)
        # 0–24: SAFE | 25–49: CAUTION | 50–74: HIGH RISK | 75–100: CRITICAL
        if final_risk >= 75:
            risk_level = "critical"
            contextual_risk = "Critical"
            badge = "CRITICAL"
        elif final_risk >= 50:
            risk_level = "high"
            contextual_risk = "High Risk"
            badge = "HIGH RISK"
        elif final_risk >= 25:
            risk_level = "caution"
            contextual_risk = "Caution"
            badge = "CAUTION"
        else:
            risk_level = "safe"
            contextual_risk = "Safe"
            badge = "SAFE"

        return {
            "finalRiskScore": final_risk,
            "riskLevel": risk_level,
            "contextualRisk": contextual_risk,
            "riskBadge": badge,
            "reasons": reasons,
            "contributingSignals": {
                "deepfakeProbability": round(df_prob, 1),
                "scamIntentScore": round(scam_score, 1),
                "speakerStatus": match_status,
                "speakerMismatchScore": round(speaker_mismatch_score, 1) if speaker_evaluated else 0.0,
                "speakerEvaluated": speaker_evaluated,
                "anomalyScore": round(anomaly_score, 1)
            }
        }
