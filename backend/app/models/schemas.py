from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ForensicFeatures(BaseModel):
    rms: float = Field(..., description="Root-Mean-Square signal amplitude")
    zcr: float = Field(..., description="Zero-Crossing Rate")
    spectralCentroidHz: float = Field(..., description="Spectral Centroid in Hz")
    spectralFlatness: float = Field(..., description="Spectral Flatness measure [0-1]")
    estimatedF0Hz: Optional[float] = Field(None, description="Estimated fundamental frequency (pitch) in Hz")
    pitchVariabilityHz: Optional[float] = Field(None, description="Standard deviation of pitch across voiced segments")
    silenceRatio: float = Field(..., description="Fraction of frames detected as silence")

class AnalysisResponse(BaseModel):
    analysisId: str = Field(..., description="Unique forensic session ID")
    fileName: str = Field(..., description="Name of the evaluated audio file")
    fileSize: int = Field(..., description="Audio file size in bytes")
    durationSec: Optional[float] = Field(None, description="Actual decoded audio duration in seconds")
    sampleRate: int = Field(16000, description="Normalized audio sample rate")
    channels: int = Field(1, description="Number of channels after mono conversion")
    status: str = Field("completed", description="Inference pipeline status")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    deepfakeProbability: float = Field(..., description="Calculated probability of synthetic audio [0-100]%")
    authenticityProbability: float = Field(..., description="Probability of authentic human voice [0-100]%")
    authenticityScore: str = Field(..., description="Classification: Authentic Human Speech vs Synthetic Voice")
    classification: str = Field(..., description="Label: AUTHENTIC, SUSPICIOUS, LIKELY_SYNTHETIC")
    transcript: Optional[str] = Field(None, description="Transcribed conversational text")
    detectedLanguage: Optional[str] = Field("en", description="Detected language code")
    transcriptionConfidence: Optional[float] = Field(None, description="Confidence of speech transcription [0.0 - 1.0]")
    scamIntentScore: float = Field(0.0, description="Conversational deception / social engineering risk score [0-100]")
    scamCategory: str = Field("LOW", description="Scam intent risk category: LOW, CAUTION, HIGH, CRITICAL")
    detectedIntents: List[str] = Field(default_factory=list, description="List of detected scam categories")
    suspiciousPhrases: List[Dict[str, str]] = Field(default_factory=list, description="Extracted suspicious dialogue phrases")
    scamReasons: List[str] = Field(default_factory=list, description="Detailed scam explainability reasons")
    speakerMatch: str = Field(..., description="Speaker verification result: MATCH, UNCERTAIN, MISMATCH, or NOT EVALUATED")
    speakerSimilarity: Optional[float] = Field(None, description="Cosine similarity [0.0 - 1.0] if evaluated")
    speakerName: Optional[str] = Field(None, description="Enrolled speaker name if evaluated")
    contextualRisk: str = Field(..., description="Risk tier: Safe, Caution, Suspicious, High, Critical")
    finalRiskScore: int = Field(..., description="Deterministic aggregated cybersecurity risk score [0-100]")
    riskLevel: str = Field(..., description="Risk level key: safe, caution, suspicious, high, critical")
    reasons: List[str] = Field(default_factory=list, description="Forensic inspection acoustic indicators")
    # Structured fields for unified risk engine and production contract
    engine: Optional[str] = Field("onnx-acousticnet", description="Inference engine identifier")
    deepfake_probability: Optional[float] = None
    authenticity_probability: Optional[float] = None
    unified_risk_score: Optional[int] = None
    confidence: Optional[float] = None
    acoustic_metrics: Optional[Dict[str, Any]] = None
    forensic_indicators: Optional[List[str]] = None
    latency_ms: Optional[int] = None
    scam_intent: Optional[Dict[str, Any]] = None
    sensitive_indicators: Optional[Dict[str, Any]] = None
    sensitiveIndicators: Optional[Dict[str, Any]] = None
    transcription_available: Optional[bool] = Field(False, description="Whether speech-to-text is available")
    speaker_match_score: Optional[float] = None
    scam_intent_score: Optional[float] = None
    scam_reasons: Optional[List[str]] = None
    contributingSignals: Optional[Dict[str, Any]] = None
    features: Optional[ForensicFeatures] = Field(None, description="Real extracted acoustic signal measurements")
    modelName: str = Field("VoxGuard-AcousticNet-v3.0", description="Inference model name")
    modelVersion: str = Field("3.0.0", description="Inference model identifier")
    neural_available: Optional[bool] = Field(True, description="Indicates if heavy neural inference was executed")
    processingTime: int = Field(..., description="Execution latency in milliseconds")
    timing: Optional[Dict[str, int]] = Field(default_factory=dict, description="Detailed stage latency breakdown")
    message: str = Field(..., description="Human-readable summary explanation")

class LiveChunkResponse(BaseModel):
    chunkIndex: int = Field(..., description="Sequential chunk index")
    sessionId: str = Field(..., description="Live detection session ID")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    durationSec: float = Field(..., description="Chunk audio duration in seconds")
    deepfakeProbability: float = Field(..., description="Chunk deepfake probability [0-100]%")
    authenticityScore: str = Field(..., description="Classification for this chunk")
    classification: str = Field(..., description="Label: AUTHENTIC, SUSPICIOUS, LIKELY_SYNTHETIC")
    riskScore: int = Field(..., description="0-100 risk score for this chunk")
    rollingThreatScore: int = Field(..., description="Decayed rolling threat score across recent chunks")
    riskLevel: str = Field(..., description="Risk level: safe, caution, suspicious, high, critical")
    transcript: str = Field("", description="Transcribed chunk speech")
    detectedIntents: List[str] = Field(default_factory=list, description="Detected scam categories in chunk")
    scamIntentScore: float = Field(0.0, description="Chunk scam score")
    scamCategory: str = Field("LOW", description="Scam category: LOW, CAUTION, HIGH, CRITICAL")
    suspiciousPhrases: List[Dict[str, str]] = Field(default_factory=list, description="Extracted suspicious dialogue phrases")
    scamReasons: List[str] = Field(default_factory=list, description="Detailed scam explainability reasons")
    isCriticalWarning: bool = Field(False, description="True if critical scam phrase detected (OTP/PIN/password/payment/remote access)")
    criticalWarningMessage: Optional[str] = Field(None, description="Critical warning message for prompt action")
    # Structured fields for unified risk engine and production contract
    engine: Optional[str] = Field("onnx-acousticnet", description="Inference engine identifier")
    deepfake_probability: Optional[float] = None
    authenticity_probability: Optional[float] = None
    unified_risk_score: Optional[int] = None
    confidence: Optional[float] = None
    acoustic_metrics: Optional[Dict[str, Any]] = None
    forensic_indicators: Optional[List[str]] = None
    latency_ms: Optional[int] = None
    sensitive_indicators: Optional[Dict[str, Any]] = None
    sensitiveIndicators: Optional[Dict[str, Any]] = None
    transcription_available: Optional[bool] = Field(False, description="Whether speech-to-text is available")

    speaker_match_score: Optional[float] = None
    scam_intent_score: Optional[float] = None
    scam_reasons: Optional[List[str]] = None
    contributingSignals: Optional[Dict[str, Any]] = None
    neural_available: Optional[bool] = Field(True, description="Indicates if heavy neural inference was executed")
    rms: float = Field(..., description="Chunk RMS audio level")
    isAlert: bool = Field(..., description="True if anomaly exceeds alert threshold")
    reasons: List[str] = Field(default_factory=list, description="Key acoustic indicators detected in chunk")
    processingTime: int = Field(..., description="Inference latency in milliseconds")
    message: str = Field(..., description="Chunk status description")

