/**
 * VoxGuard AI - Demo & Sample Data Store
 * IMPORTANT: All statistics and log entries below are static demo/sample records
 * intended for Phase 1 frontend interface demonstration and SIH presentation.
 * No real backend or AI inference model is active in this phase.
 */

export const DEMO_NOTICE = {
  isDemo: true,
  badgeText: "SAMPLE DEMO DATA",
  bannerText: "Phase 1 UI Mode: Displaying simulated cybersecurity metrics. Real AI engine inference will be connected in Phase 2."
};

export const DASHBOARD_STATS = {
  totalAnalyses: {
    label: "Total Analyses",
    value: "1,248",
    trend: "+14.2% this week",
    trendType: "positive"
  },
  safeDetections: {
    label: "Safe Detections",
    value: "982",
    trend: "78.7% baseline",
    trendType: "positive"
  },
  suspiciousDetections: {
    label: "Suspicious Detections",
    value: "184",
    trend: "14.7% flagged",
    trendType: "warning"
  },
  criticalThreats: {
    label: "Critical Threats",
    value: "82",
    trend: "6.6% deepfakes",
    trendType: "danger"
  }
};

export const RECENT_ANALYSES = [
  {
    id: "ANL-9042",
    fileName: "ceo_wire_transfer_auth.wav",
    timestamp: "2026-09-10 11:24:18",
    duration: "00:42",
    riskLevel: "critical",
    riskScore: 94,
    speaker: "CEO Voice Clone (Spoofed)",
    authenticity: "Synthetic Clone",
    status: "Flagged & Blocked"
  },
  {
    id: "ANL-9041",
    fileName: "cfo_emergency_call.mp3",
    timestamp: "2026-09-10 10:52:05",
    duration: "01:15",
    riskLevel: "suspicious",
    riskScore: 68,
    speaker: "Unknown Caller",
    authenticity: "Potential Vocoder Artifacts",
    status: "Manual Review Required"
  },
  {
    id: "ANL-9040",
    fileName: "customer_support_auth_01.wav",
    timestamp: "2026-09-10 10:15:30",
    duration: "02:04",
    riskLevel: "safe",
    riskScore: 4,
    speaker: "Dr. Sarah Chen (Enrolled)",
    authenticity: "Natural Human Voice",
    status: "Verified Safe"
  },
  {
    id: "ANL-9039",
    fileName: "banking_ivr_verification.m4a",
    timestamp: "2026-09-10 09:40:12",
    duration: "00:33",
    riskLevel: "safe",
    riskScore: 6,
    speaker: "Marcus Vance (Enrolled)",
    authenticity: "Natural Human Voice",
    status: "Verified Safe"
  },
  {
    id: "ANL-9038",
    fileName: "exec_board_briefing.flac",
    timestamp: "2026-09-10 08:30:45",
    duration: "04:12",
    riskLevel: "critical",
    riskScore: 89,
    speaker: "Deepfake Impersonator",
    authenticity: "ElevenLabs / XTTS Pattern",
    status: "Threat Isolated"
  }
];

export const RISK_DISTRIBUTION = [
  { label: "Natural Human Voices", percentage: 78.7, count: 982, color: "var(--safe)" },
  { label: "Anomalous / Suspicious Audio", percentage: 14.7, count: 184, color: "var(--suspicious)" },
  { label: "Confirmed Cloned Deepfakes", percentage: 6.6, count: 82, color: "var(--threat)" }
];

export const TRUSTED_SPEAKERS = [
  {
    id: "SPK-001",
    name: "Dr. Sarah Chen",
    role: "Chief Technology Officer",
    department: "Executive Board",
    voiceHash: "SHA256:8f4b...39d1",
    enrolledDate: "2026-08-14",
    sampleDuration: "45s reference audio",
    status: "Active Biometric"
  },
  {
    id: "SPK-002",
    name: "Marcus Vance",
    role: "Head of Treasury Operations",
    department: "Finance & Accounts",
    voiceHash: "SHA256:1a7c...88e4",
    enrolledDate: "2026-08-20",
    sampleDuration: "60s reference audio",
    status: "Active Biometric"
  },
  {
    id: "SPK-003",
    name: "Elena Rostova",
    role: "VP Information Security",
    department: "SecOps & CISO",
    voiceHash: "SHA256:d93e...05f2",
    enrolledDate: "2026-09-01",
    sampleDuration: "50s reference audio",
    status: "Active Biometric"
  },
  {
    id: "SPK-004",
    name: "David Kim",
    role: "Chief Operating Officer",
    department: "Executive Board",
    voiceHash: "SHA256:4c12...b97a",
    enrolledDate: "2026-09-04",
    sampleDuration: "35s reference audio",
    status: "Active Biometric"
  }
];

export const HISTORY_RECORDS = [
  ...RECENT_ANALYSES,
  {
    id: "ANL-9037",
    fileName: "telecom_verification_sample.wav",
    timestamp: "2026-09-09 18:22:10",
    duration: "01:05",
    riskLevel: "safe",
    riskScore: 2,
    speaker: "Elena Rostova (Enrolled)",
    authenticity: "Natural Human Voice",
    status: "Verified Safe"
  },
  {
    id: "ANL-9036",
    fileName: "wire_transfer_verification_voice.ogg",
    timestamp: "2026-09-09 16:45:00",
    duration: "00:58",
    riskLevel: "critical",
    riskScore: 92,
    speaker: "Synthetic Voice Impersonation",
    authenticity: "Diffusion Vocoder Artifacts",
    status: "Access Revoked"
  },
  {
    id: "ANL-9035",
    fileName: "vendor_invoice_confirmation.wav",
    timestamp: "2026-09-09 14:10:32",
    duration: "02:18",
    riskLevel: "suspicious",
    riskScore: 61,
    speaker: "Unregistered Caller",
    authenticity: "Spectrogram Discontinuity",
    status: "Flagged for Inspection"
  },
  {
    id: "ANL-9034",
    fileName: "password_reset_call_audio.mp3",
    timestamp: "2026-09-09 11:05:40",
    duration: "00:49",
    riskLevel: "safe",
    riskScore: 5,
    speaker: "David Kim (Enrolled)",
    authenticity: "Natural Human Voice",
    status: "Verified Safe"
  }
];

export const REPORT_SUMMARY = {
  reportingPeriod: "Last 30 Days (Demo Period)",
  overallSecurityScore: 94,
  attackVectors: [
    { name: "Zero-Shot TTS Cloning (XTTS / Tortoise)", share: "45%", count: 37 },
    { name: "Real-time Voice Conversion (RVC)", share: "32%", count: 26 },
    { name: "Replay & Splicing Attacks", share: "15%", count: 12 },
    { name: "Social Engineering AI Dialog", share: "8%", count: 7 }
  ],
  securityPosture: "High Resilience - Defense in Depth Active"
};
