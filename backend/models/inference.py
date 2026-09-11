from pydantic import BaseModel, Field
from typing import List, Optional

class AnalysisResponse(BaseModel):
    analysisId: str = Field(..., description="Unique forensic session ID")
    fileName: str = Field(..., description="Name of the evaluated audio file")
    fileSize: int = Field(..., description="Audio file size in bytes")
    durationSec: Optional[float] = Field(None, description="Duration in seconds")
    status: str = Field("completed", description="Inference pipeline status")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    deepfakeProbability: float = Field(..., description="Calculated probability of synthetic audio [0-100]%")
    authenticityScore: str = Field(..., description="Classification: Authentic Human Speech vs Synthetic Voice")
    speakerMatch: str = Field(..., description="Speaker verification result against biometric catalog")
    scamIntentScore: float = Field(..., description="Conversational / linguistic deception risk score [0-100]")
    contextualRisk: str = Field(..., description="Risk tier: Low, Moderate, High, Critical")
    finalRiskScore: int = Field(..., description="Aggregated cybersecurity risk score [0-100]")
    riskLevel: str = Field(..., description="Risk classification: low, moderate, suspicious, critical")
    reasons: List[str] = Field(default_factory=list, description="Forensic inspection acoustic indicators")
    modelVersion: str = Field("VoxGuard-AcousticNet-v2.1", description="Inference model version")
    processingTime: int = Field(..., description="Execution time in milliseconds")
    message: str = Field(..., description="User-facing summary message")
