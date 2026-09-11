/**
 * VoxGuard AI - Centralized Deepfake Probability & Threat Classification
 * 
 * SINGLE SOURCE OF TRUTH for all classification labels, badges, and threshold severities.
 * 
 * Deepfake Probability Thresholds:
 *  - probability < 0.35:
 *      label: "Authentic"
 *      severity: "safe"
 *  - probability >= 0.35 and < 0.65:
 *      label: "Suspicious"
 *      severity: "warning"
 *  - probability >= 0.65:
 *      label: "Likely Deepfake"
 *      severity: "critical"
 * 
 * Unified Risk Score Thresholds (0–100):
 *  - 0–24:   SAFE
 *  - 25–49:  CAUTION
 *  - 50–74:  HIGH RISK
 *  - 75–100: CRITICAL
 */

export const CLASSIFICATION_THRESHOLDS = Object.freeze({
  AUTHENTIC_MAX: 0.35,
  DEEPFAKE_MIN: 0.65
});

export const UNIFIED_RISK_THRESHOLDS = Object.freeze({
  SAFE_MAX: 24,
  CAUTION_MAX: 49,
  HIGH_MAX: 74,
  CRITICAL_MIN: 75
});

/**
 * Normalizes any probability representation to a standard [0.0, 1.0] float range.
 * Handles numbers (e.g. 0.498, 49.8, 100), strings (e.g. "49.8%", "0.35"), null/undefined.
 * 
 * Rules:
 *  - If value contains '%', strips '%' and divides by 100.
 *  - If numeric value > 1.0, assumes 0–100 percentage scale and divides by 100.
 *  - If numeric value <= 1.0, treats directly as 0.0–1.0 float scale (e.g. 0.00, 0.35, 1.00).
 *  - Clamps output strictly between 0.0 and 1.0.
 * 
 * @param {number|string|null|undefined} prob
 * @returns {number} Normalized float between 0.0 and 1.0
 */
export function normalizeProbability(prob) {
  if (prob === null || prob === undefined || prob === '') {
    return 0.0;
  }

  let isPercentString = false;
  let parsed = prob;

  if (typeof prob === 'string') {
    const trimmed = prob.trim();
    if (trimmed.endsWith('%')) {
      isPercentString = true;
    }
    parsed = parseFloat(trimmed.replace('%', ''));
  } else {
    parsed = Number(prob);
  }

  if (isNaN(parsed) || !isFinite(parsed)) {
    return 0.0;
  }

  // If explicit '%' or value > 1.0, scale down from 0–100 to 0–1
  if (isPercentString || parsed > 1.0) {
    parsed = parsed / 100.0;
  }

  // Strictly clamp between 0.0 and 1.0
  return Math.min(1.0, Math.max(0.0, parsed));
}

/**
 * Classifies deepfake probability into a unified classification object.
 * 
 * @param {number|string|null|undefined} rawProb - The probability in 0–1 or 0–100 format
 * @returns {Object} Unified classification result
 */
export function classifyDeepfakeProbability(rawProb, isCloudLite = false) {
  if (isCloudLite) {
    return {
      label: 'Cloud Lite DSP Analysis',
      uppercaseLabel: 'CLOUD LITE DSP ANALYSIS',
      severity: 'safe',
      level: 'safe',
      score: 0,
      percentage: '0.0',
      formattedPercent: 'N/A (Cloud Lite)',
      color: 'var(--cyan-400)',
      bgColor: 'rgba(6, 182, 212, 0.1)',
      borderColor: 'rgba(6, 182, 212, 0.4)',
      glowColor: 'rgba(6, 182, 212, 0.25)',
      badgeClass: 'risk-badge safe',
      summary: 'Cloud Lite DSP Analysis: Acoustic signal feature extraction verified. Neural models bypassed.'
    };
  }

  const norm = normalizeProbability(rawProb);
  const percentage = (norm * 100.0).toFixed(1);

  if (norm < CLASSIFICATION_THRESHOLDS.AUTHENTIC_MAX) {
    return {
      label: 'Authentic',
      uppercaseLabel: 'AUTHENTIC',
      severity: 'safe',
      level: 'safe',
      score: norm,
      percentage,
      formattedPercent: `${percentage}%`,
      color: 'var(--safe)',
      bgColor: 'var(--safe-bg)',
      borderColor: 'var(--safe-border)',
      glowColor: 'var(--safe-glow)',
      badgeClass: 'risk-badge safe',
      summary: 'Authentic acoustic markers. High confidence of genuine human speech.'
    };
  }

  if (norm < CLASSIFICATION_THRESHOLDS.DEEPFAKE_MIN) {
    return {
      label: 'Suspicious',
      uppercaseLabel: 'SUSPICIOUS',
      severity: 'warning',
      level: 'suspicious',
      score: norm,
      percentage,
      formattedPercent: `${percentage}%`,
      color: 'var(--warning)',
      bgColor: 'var(--warning-bg)',
      borderColor: 'var(--warning-border)',
      glowColor: 'var(--warning-glow)',
      badgeClass: 'risk-badge suspicious',
      summary: 'Suspicious acoustic anomalies observed. Synthetic vocoder patterns detected.'
    };
  }

  return {
    label: 'Likely Deepfake',
    uppercaseLabel: 'LIKELY DEEPFAKE',
    severity: 'critical',
    level: 'critical',
    score: norm,
    percentage,
    formattedPercent: `${percentage}%`,
    color: 'var(--threat)',
    bgColor: 'var(--threat-bg)',
    borderColor: 'var(--threat-border)',
    glowColor: 'var(--threat-glow)',
    badgeClass: 'risk-badge critical',
    summary: 'High probability synthetic speech cloning detected. Strong adversarial markers.'
  };
}

/**
 * Returns default empty risk result when no data is provided.
 */
function getEmptyRiskResult() {
  return {
    score: 0,
    level: 'safe',
    label: 'SAFE',
    contextualRisk: 'Safe',
    color: 'var(--safe)',
    bgColor: 'var(--safe-bg)',
    borderColor: 'var(--safe-border)',
    glowColor: 'var(--safe-glow)',
    badgeClass: 'risk-badge safe',
    reasons: ['No anomalies or threats detected.'],
    contributingSignals: {
      deepfakeProbability: 0,
      scamIntentScore: 0,
      speakerStatus: 'NOT EVALUATED',
      speakerMismatchScore: 0,
      speakerEvaluated: false,
      anomalyScore: 0
    }
  };
}

/**
 * Calculates deterministic Explainable Unified Fraud Risk Score (0–100)
 * fusing Deepfake Probability, Lexical Scam Intent, and Biometric Speaker Verification.
 * 
 * Strict 4-tier risk bands:
 *   0–24:   SAFE
 *   25–49:  CAUTION
 *   50–74:  HIGH RISK
 *   75–100: CRITICAL
 * 
 * @param {Object} signals
 * @returns {Object} Unified risk evaluation result
 */
export function calculateUnifiedRisk(signals = {}) {
  if (!signals || typeof signals !== 'object') {
    return getEmptyRiskResult();
  }

  const dfNorm = normalizeProbability(signals.deepfakeProbability ?? signals.deepfake_probability ?? 0);
  const dfProb = dfNorm * 100.0;
  const scamScore = Math.min(100, Math.max(0, Number(signals.scamIntentScore ?? signals.scam_intent_score ?? 0) || 0));

  // Speaker verification evaluation
  const speakerEvaluated = Boolean(
    (signals.speakerId && signals.speakerId !== 'none') ||
    signals.enrolled ||
    (signals.speakerMatch && signals.speakerMatch !== 'NOT EVALUATED')
  );
  const speakerMatch = signals.speakerMatch || (speakerEvaluated ? 'UNCERTAIN' : 'NOT EVALUATED');
  let speakerMismatchScore = 0.0;
  if (speakerEvaluated) {
    if (speakerMatch === 'MISMATCH') {
      speakerMismatchScore = 90.0;
    } else if (speakerMatch === 'UNCERTAIN') {
      speakerMismatchScore = 45.0;
    } else if (speakerMatch === 'MATCH') {
      speakerMismatchScore = 0.0;
    }
  }

  const anomalyScore = Math.min(100, Math.max(0, Number(signals.anomalyScore ?? 0)));
  const isCriticalFlag = Boolean(signals.isCriticalWarning);
  const intents = Array.isArray(signals.detectedIntents) ? signals.detectedIntents : [];

  let finalScore;
  if (typeof signals.finalRiskScore === 'number' && !isNaN(signals.finalRiskScore)) {
    finalScore = Math.min(100, Math.max(0, Math.round(signals.finalRiskScore)));
  } else {
    // Deterministic fusion formula
    let rawFusion;
    if (speakerEvaluated) {
      rawFusion = (0.45 * dfProb) + (0.35 * scamScore) + (0.15 * speakerMismatchScore) + (0.05 * anomalyScore);
    } else {
      // Zero penalty when speaker is not evaluated
      rawFusion = (0.50 * dfProb) + (0.45 * scamScore) + (0.05 * anomalyScore);
    }

    // Security overrides & escalations
    // 1. Compound threat (Synthetic Voice + Scam Intent)
    if (dfProb >= 65.0 && scamScore >= 60.0) {
      rawFusion = Math.max(rawFusion, 88.0);
    }

    // 2. Direct credential extraction
    const hasCriticalIntent = intents.some((k) =>
      ['OTP_REQUEST', 'FINANCIAL_CREDENTIAL', 'PAYMENT_DEMAND', 'REMOTE_ACCESS'].includes(k)
    );
    if (scamScore >= 75.0 || isCriticalFlag || hasCriticalIntent) {
      rawFusion = Math.max(rawFusion, 76.0);
    }

    // 3. High deepfake alone
    if (dfProb >= 75.0) {
      rawFusion = Math.max(rawFusion, 75.0);
    }

    // 4. Trusted speaker mismatch escalation
    if (speakerEvaluated && speakerMatch === 'MISMATCH') {
      if (scamScore >= 50.0) {
        rawFusion = Math.max(rawFusion, 78.0);
      } else if (scamScore >= 25.0) {
        rawFusion = Math.max(rawFusion, 72.0);
      } else {
        rawFusion = Math.max(rawFusion, 35.0);
      }
    }

    finalScore = Math.round(Math.min(100, Math.max(0, rawFusion)));
  }

  // Map to strict 4 tiers
  let level, label, contextualRisk, color, bgColor, borderColor, glowColor, badgeClass;
  if (finalScore >= UNIFIED_RISK_THRESHOLDS.CRITICAL_MIN) {
    level = 'critical';
    label = 'CRITICAL';
    contextualRisk = 'Critical';
    color = 'var(--threat)';
    bgColor = 'var(--threat-bg)';
    borderColor = 'var(--threat-border)';
    glowColor = 'var(--threat-glow)';
    badgeClass = 'risk-badge critical';
  } else if (finalScore > UNIFIED_RISK_THRESHOLDS.CAUTION_MAX) {
    level = 'high';
    label = 'HIGH RISK';
    contextualRisk = 'High Risk';
    color = '#f97316';
    bgColor = 'rgba(249, 115, 22, 0.1)';
    borderColor = 'rgba(249, 115, 22, 0.45)';
    glowColor = 'rgba(249, 115, 22, 0.25)';
    badgeClass = 'risk-badge high';
  } else if (finalScore > UNIFIED_RISK_THRESHOLDS.SAFE_MAX) {
    level = 'caution';
    label = 'CAUTION';
    contextualRisk = 'Caution';
    color = 'var(--warning)';
    bgColor = 'var(--warning-bg)';
    borderColor = 'var(--warning-border)';
    glowColor = 'var(--warning-glow)';
    badgeClass = 'risk-badge caution';
  } else {
    level = 'safe';
    label = 'SAFE';
    contextualRisk = 'Safe';
    color = 'var(--safe)';
    bgColor = 'var(--safe-bg)';
    borderColor = 'var(--safe-border)';
    glowColor = 'var(--safe-glow)';
    badgeClass = 'risk-badge safe';
  }

  // Explanations (preserve passed reasons or generate human-readable ones)
  const reasons = Array.isArray(signals.reasons) && signals.reasons.length > 0
    ? [...signals.reasons]
    : [];

  if (reasons.length === 0) {
    if (dfProb >= 65.0 && scamScore >= 60.0) {
      reasons.push('CRITICAL COMPOUND THREAT: Synthetic voice clone combined with active social engineering fraud.');
    }
    if (isCriticalFlag || intents.includes('OTP_REQUEST')) {
      reasons.push('OTP request detected: dialogue solicits one-time verification credential.');
    } else if (intents.includes('FINANCIAL_CREDENTIAL')) {
      reasons.push('Financial credential request detected: sensitive payment or account details solicited.');
    } else if (intents.includes('PAYMENT_DEMAND')) {
      reasons.push('Payment demand detected: coercive money transfer or payment requested.');
    } else if (intents.includes('REMOTE_ACCESS')) {
      reasons.push('Remote access request: solicitation to install remote screen-control software.');
    }

    if (speakerEvaluated && speakerMatch === 'MISMATCH') {
      reasons.push('Trusted speaker mismatch: voiceprint failed biometric comparison with enrolled profile.');
    } else if (speakerEvaluated && speakerMatch === 'MATCH') {
      reasons.push('Trusted speaker verified: voiceprint matches enrolled identity.');
    }

    if (dfProb >= 35.0) {
      reasons.push(`Neural voice spoof probability elevated: ${dfProb.toFixed(1)}% synthetic acoustic trace.`);
    } else {
      reasons.push('Acoustic markers indicate natural human speech patterns.');
    }
  }

  return {
    score: finalScore,
    level,
    label,
    contextualRisk,
    color,
    bgColor,
    borderColor,
    glowColor,
    badgeClass,
    reasons,
    contributingSignals: signals.contributingSignals || {
      deepfakeProbability: Number(dfProb.toFixed(1)),
      scamIntentScore: Number(scamScore.toFixed(1)),
      speakerStatus: speakerEvaluated ? speakerMatch : 'NOT EVALUATED',
      speakerMismatchScore,
      speakerEvaluated,
      anomalyScore
    }
  };
}

/**
 * Creates a unified, canonical Live Detection result object for a chunk response.
 * Synchronizes classification, risk scoring, threat rating text, badge levels,
 * and UI tokens across all Live Detection components using the centralized Unified Trust Engine.
 * 
 * @param {Object} data - Raw chunk inference response from backend
 * @returns {Object|null} Canonical live result object or null if data is invalid
 */
export function createCanonicalLiveResult(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const isCloudLite = Boolean(
    data.neural_available === false ||
    data.modelName === 'cloud-lite-dsp' ||
    data.engine === 'cloud-lite-dsp'
  );

  // 1. Unified classification from deepfake probability
  const rawProb = data.deepfakeProbability !== undefined ? data.deepfakeProbability : 0;
  const classification = classifyDeepfakeProbability(rawProb, isCloudLite);

  // 2. Derive unified risk using the centralized trust engine
  const targetScore = typeof data.rollingThreatScore === 'number'
    ? data.rollingThreatScore
    : (typeof data.riskScore === 'number' ? data.riskScore : undefined);

  const unified = calculateUnifiedRisk({
    deepfakeProbability: rawProb,
    scamIntentScore: data.scamIntentScore,
    detectedIntents: data.detectedIntents,
    suspiciousPhrases: data.suspiciousPhrases,
    isCriticalWarning: data.isCriticalWarning,
    finalRiskScore: targetScore,
    reasons: data.reasons,
    contributingSignals: data.contributingSignals
  });

  const riskScore = unified.score;
  const level = unified.level;
  const label = unified.label;
  const threatRatingText = `${label} (${riskScore}/100)`;

  return {
    chunkIndex: data.chunkIndex ?? 0,
    durationSec: typeof data.durationSec === 'number' ? data.durationSec : 2.5,
    deepfakeProbability: Number(classification.percentage),
    formattedDeepfakeProbability: classification.formattedPercent,
    authenticityScore: classification.label,
    classification: classification.uppercaseLabel,
    riskScore,
    rollingThreatScore: typeof data.rollingThreatScore === 'number' ? data.rollingThreatScore : riskScore,
    level,
    label,
    threatRatingText,
    color: unified.color,
    bgColor: unified.bgColor,
    borderColor: unified.borderColor,
    glowColor: unified.glowColor,
    badgeClass: unified.badgeClass,
    transcript: typeof data.transcript === 'string' ? data.transcript : '',
    detectedIntents: Array.isArray(data.detectedIntents) ? data.detectedIntents : [],
    scamIntentScore: typeof data.scamIntentScore === 'number' ? data.scamIntentScore : 0,
    scamCategory: typeof data.scamCategory === 'string' ? data.scamCategory : 'LOW',
    suspiciousPhrases: Array.isArray(data.suspiciousPhrases) ? data.suspiciousPhrases : [],
    scamReasons: Array.isArray(data.scamReasons) ? data.scamReasons : [],
    isCriticalWarning: Boolean(data.isCriticalWarning),
    criticalWarningMessage: data.criticalWarningMessage || null,
    reasons: unified.reasons,
    contributingSignals: unified.contributingSignals,
    processingTime: typeof data.processingTime === 'number' ? data.processingTime : 0,
    timestamp: data.timestamp || new Date().toISOString(),
    raw: data
  };
}
