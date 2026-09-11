import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyDeepfakeProbability,
  normalizeProbability,
  calculateUnifiedRisk,
  createCanonicalLiveResult,
  UNIFIED_RISK_THRESHOLDS
} from '../classification.js';

describe('Unified Classification & Trust Engine Tests', () => {
  test('Requirement 10: Deepfake Boundary Value Tests', () => {
    const boundaryCases = [
      { input: 0.00, expectedLabel: 'Authentic', expectedSeverity: 'safe' },
      { input: 0.349, expectedLabel: 'Authentic', expectedSeverity: 'safe' },
      { input: 0.35, expectedLabel: 'Suspicious', expectedSeverity: 'warning' },
      { input: 0.50, expectedLabel: 'Suspicious', expectedSeverity: 'warning' },
      { input: 0.649, expectedLabel: 'Suspicious', expectedSeverity: 'warning' },
      { input: 0.65, expectedLabel: 'Likely Deepfake', expectedSeverity: 'critical' },
      { input: 1.00, expectedLabel: 'Likely Deepfake', expectedSeverity: 'critical' }
    ];

    for (const { input, expectedLabel, expectedSeverity } of boundaryCases) {
      const result = classifyDeepfakeProbability(input);
      assert.equal(
        result.label,
        expectedLabel,
        `Expected input ${input} to have label "${expectedLabel}", got "${result.label}"`
      );
      assert.equal(
        result.severity,
        expectedSeverity,
        `Expected input ${input} to have severity "${expectedSeverity}", got "${result.severity}"`
      );
    }
  });

  test('normalizeProbability Normalization Rules', () => {
    assert.equal(normalizeProbability(0.0), 0.0);
    assert.equal(normalizeProbability(0.349), 0.349);
    assert.equal(normalizeProbability(0.35), 0.35);
    assert.equal(normalizeProbability(0.65), 0.65);
    assert.equal(normalizeProbability(1.0), 1.0);
    assert.equal(normalizeProbability(35.0), 0.35);
    assert.equal(normalizeProbability(49.8), 0.498);
    assert.equal(normalizeProbability('49.8%'), 0.498);
    assert.equal(normalizeProbability(null), 0.0);
    assert.equal(normalizeProbability(undefined), 0.0);
  });

  test('calculateUnifiedRisk: Scenarios A through F Verification', () => {
    // Scenario A: Low deepfake + no scam intent -> SAFE
    const resA = calculateUnifiedRisk({
      deepfakeProbability: 10.0,
      scamIntentScore: 0.0
    });
    assert.ok(resA.score < 25, `Scenario A score ${resA.score} must be < 25 (SAFE)`);
    assert.equal(resA.level, 'safe');
    assert.equal(resA.label, 'SAFE');
    assert.equal(resA.color, 'var(--safe)');

    // Scenario B: Moderate deepfake + low scam intent -> CAUTION
    const resB = calculateUnifiedRisk({
      deepfakeProbability: 45.0,
      scamIntentScore: 15.0
    });
    assert.ok(resB.score >= 25 && resB.score <= 49, `Scenario B score ${resB.score} must be between 25 and 49 (CAUTION)`);
    assert.equal(resB.level, 'caution');
    assert.equal(resB.label, 'CAUTION');
    assert.equal(resB.color, 'var(--warning)');

    // Scenario C: High deepfake + high scam intent -> CRITICAL
    const resC = calculateUnifiedRisk({
      deepfakeProbability: 85.0,
      scamIntentScore: 80.0
    });
    assert.ok(resC.score >= 75, `Scenario C score ${resC.score} must be >= 75 (CRITICAL)`);
    assert.equal(resC.level, 'critical');
    assert.equal(resC.label, 'CRITICAL');
    assert.equal(resC.color, 'var(--threat)');

    // Scenario D: Low deepfake + strong OTP/payment scam intent -> Elevated Risk (CRITICAL)
    const resD = calculateUnifiedRisk({
      deepfakeProbability: 10.0,
      scamIntentScore: 85.0,
      detectedIntents: ['OTP_REQUEST'],
      isCriticalWarning: true
    });
    assert.ok(resD.score >= 75, `Scenario D score ${resD.score} must be >= 75 (CRITICAL)`);
    assert.equal(resD.level, 'critical');
    assert.equal(resD.label, 'CRITICAL');

    // Scenario E: Trusted speaker mismatch + suspicious scam intent -> Strong Escalation
    const resE = calculateUnifiedRisk({
      deepfakeProbability: 20.0,
      scamIntentScore: 40.0,
      enrolled: true,
      speakerMatch: 'MISMATCH'
    });
    assert.ok(resE.score >= 70, `Scenario E score ${resE.score} must be >= 70`);
    assert.ok(['high', 'critical'].includes(resE.level));

    // Scenario F: No trusted speaker selected -> No speaker mismatch penalty
    const resF = calculateUnifiedRisk({
      deepfakeProbability: 20.0,
      scamIntentScore: 40.0,
      enrolled: false,
      speakerMatch: 'NOT EVALUATED'
    });
    assert.equal(resF.score, 28, `Scenario F score must be 28 without penalty, got ${resF.score}`);
    assert.ok(resF.score < resE.score, `Scenario F score (${resF.score}) must be lower than Scenario E (${resE.score})`);
    assert.equal(resF.level, 'caution');
    assert.equal(resF.label, 'CAUTION');
  });

  test('createCanonicalLiveResult: Harmonizes live chunk results with Unified Trust Engine', () => {
    // Safe chunk: 12% deepfake, rolling threat 10
    const resSafe = createCanonicalLiveResult({
      chunkIndex: 1,
      deepfakeProbability: 12.0,
      riskScore: 10,
      rollingThreatScore: 10,
      authenticityScore: 'Authentic'
    });
    assert.equal(resSafe.level, 'safe');
    assert.equal(resSafe.label, 'SAFE');
    assert.equal(resSafe.threatRatingText, 'SAFE (10/100)');
    assert.equal(resSafe.color, 'var(--safe)');

    // Caution chunk: 40% deepfake, rolling threat 35
    const resCaution = createCanonicalLiveResult({
      chunkIndex: 2,
      deepfakeProbability: 40.0,
      riskScore: 35,
      rollingThreatScore: 35,
      authenticityScore: 'Suspicious'
    });
    assert.equal(resCaution.level, 'caution');
    assert.equal(resCaution.label, 'CAUTION');
    assert.equal(resCaution.threatRatingText, 'CAUTION (35/100)');
    assert.equal(resCaution.color, 'var(--warning)');

    // High Risk chunk: rolling threat 65
    const resHigh = createCanonicalLiveResult({
      chunkIndex: 3,
      deepfakeProbability: 60.0,
      riskScore: 65,
      rollingThreatScore: 65
    });
    assert.equal(resHigh.level, 'high');
    assert.equal(resHigh.label, 'HIGH RISK');
    assert.equal(resHigh.threatRatingText, 'HIGH RISK (65/100)');
    assert.equal(resHigh.color, '#f97316');

    // Critical chunk: rolling threat 85
    const resCrit = createCanonicalLiveResult({
      chunkIndex: 4,
      deepfakeProbability: 80.0,
      riskScore: 85,
      rollingThreatScore: 85
    });
    assert.equal(resCrit.level, 'critical');
    assert.equal(resCrit.label, 'CRITICAL');
    assert.equal(resCrit.threatRatingText, 'CRITICAL (85/100)');
    assert.equal(resCrit.color, 'var(--threat)');

    // Null and edge cases
    assert.equal(createCanonicalLiveResult(null), null);
    assert.equal(createCanonicalLiveResult(undefined), null);
  });

  test('Audio Capability & MIME Extension Negotiation', async () => {
    const { checkAudioCapabilities } = await import('../audioCapability.js');
    const { getExtensionFromMime, getBestSupportedRecordingMimeType } = await import('../audioUtils.js');

    // Safe execution in Node/SSR environment without window
    const caps = checkAudioCapabilities();
    assert.equal(typeof caps.isSecureContext, 'boolean');
    assert.equal(typeof caps.canRecord, 'boolean');

    // MIME extension mappings
    assert.equal(getExtensionFromMime('audio/mp4'), 'm4a');
    assert.equal(getExtensionFromMime('audio/mp4;codecs=mp4a.40.2'), 'm4a');
    assert.equal(getExtensionFromMime('audio/x-m4a'), 'm4a');
    assert.equal(getExtensionFromMime('audio/aac'), 'm4a');
    assert.equal(getExtensionFromMime('audio/webm;codecs=opus'), 'webm');
    assert.equal(getExtensionFromMime('audio/webm'), 'webm');
    assert.equal(getExtensionFromMime('audio/ogg;codecs=opus'), 'ogg');
    assert.equal(getExtensionFromMime('audio/wav'), 'wav');

    // Safe MIME type negotiation when MediaRecorder is undefined (e.g. Node)
    assert.equal(getBestSupportedRecordingMimeType(), '');
  });
});
