"""
VoxGuard AI - Unified Trust Engine Test Suite
Validates Scenarios A through F on RiskFusionEngine.
"""
import sys
import os

# Add backend app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from services.risk_fusion import RiskFusionEngine

def run_tests():
    print("=" * 70)
    print("VOXGUARD AI - UNIFIED TRUST ENGINE VERIFICATION (SCENARIOS A-F)")
    print("=" * 70)

    # Scenario A: Low deepfake + no scam intent
    # Expected: SAFE (0–24)
    res_a = RiskFusionEngine.compute_risk(
        deepfake_prob=10.0,
        scam_data={"scamIntentScore": 0.0, "detectedIntents": [], "isCriticalWarning": False},
        forensic_features=None,
        speaker_data=None
    )
    print(f"\n[Scenario A] Low deepfake (10%) + no scam intent (0%)")
    print(f"  Score: {res_a['finalRiskScore']} / 100")
    print(f"  Level: {res_a['riskLevel']} ({res_a['riskBadge']})")
    print(f"  Reasons: {res_a['reasons'][:2]}")
    assert res_a['finalRiskScore'] < 25, f"Scenario A expected SAFE (< 25), got {res_a['finalRiskScore']}"
    assert res_a['riskLevel'] == 'safe', f"Scenario A expected 'safe', got {res_a['riskLevel']}"
    print("  -> PASSED: Verified SAFE")

    # Scenario B: Moderate deepfake + low scam intent
    # Expected: CAUTION (25–49)
    res_b = RiskFusionEngine.compute_risk(
        deepfake_prob=45.0,
        scam_data={"scamIntentScore": 15.0, "detectedIntents": ["GENERAL_INQUIRY"], "isCriticalWarning": False},
        forensic_features=None,
        speaker_data=None
    )
    print(f"\n[Scenario B] Moderate deepfake (45%) + low scam intent (15%)")
    print(f"  Score: {res_b['finalRiskScore']} / 100")
    print(f"  Level: {res_b['riskLevel']} ({res_b['riskBadge']})")
    print(f"  Reasons: {res_b['reasons'][:2]}")
    assert 25 <= res_b['finalRiskScore'] <= 49, f"Scenario B expected CAUTION (25-49), got {res_b['finalRiskScore']}"
    assert res_b['riskLevel'] == 'caution', f"Scenario B expected 'caution', got {res_b['riskLevel']}"
    print("  -> PASSED: Verified CAUTION")

    # Scenario C: High deepfake + high scam intent
    # Expected: CRITICAL (75–100) or HIGH RISK
    res_c = RiskFusionEngine.compute_risk(
        deepfake_prob=85.0,
        scam_data={"scamIntentScore": 80.0, "detectedIntents": ["OTP_REQUEST", "FINANCIAL_CREDENTIAL"], "isCriticalWarning": True},
        forensic_features=None,
        speaker_data=None
    )
    print(f"\n[Scenario C] High deepfake (85%) + high scam intent (80%)")
    print(f"  Score: {res_c['finalRiskScore']} / 100")
    print(f"  Level: {res_c['riskLevel']} ({res_c['riskBadge']})")
    print(f"  Reasons: {res_c['reasons'][:2]}")
    assert res_c['finalRiskScore'] >= 75, f"Scenario C expected CRITICAL (>= 75), got {res_c['finalRiskScore']}"
    assert res_c['riskLevel'] == 'critical', f"Scenario C expected 'critical', got {res_c['riskLevel']}"
    print("  -> PASSED: Verified CRITICAL (Compound Threat Escalation)")

    # Scenario D: Low deepfake + strong OTP/payment scam intent
    # Expected: elevated risk (CRITICAL >= 75)
    res_d = RiskFusionEngine.compute_risk(
        deepfake_prob=10.0,
        scam_data={"scamIntentScore": 85.0, "detectedIntents": ["OTP_REQUEST"], "isCriticalWarning": True},
        forensic_features=None,
        speaker_data=None
    )
    print(f"\n[Scenario D] Low deepfake (10%) + strong OTP scam intent (85%)")
    print(f"  Score: {res_d['finalRiskScore']} / 100")
    print(f"  Level: {res_d['riskLevel']} ({res_d['riskBadge']})")
    print(f"  Reasons: {res_d['reasons'][:2]}")
    assert res_d['finalRiskScore'] >= 75, f"Scenario D expected elevated risk (>= 75), got {res_d['finalRiskScore']}"
    assert res_d['riskLevel'] == 'critical', f"Scenario D expected 'critical', got {res_d['riskLevel']}"
    print("  -> PASSED: Verified Elevated Risk for Credential Theft")

    # Scenario E: Trusted speaker mismatch + suspicious scam intent
    # Expected: strong escalation (HIGH RISK / CRITICAL, >= 70)
    res_e = RiskFusionEngine.compute_risk(
        deepfake_prob=20.0,
        scam_data={"scamIntentScore": 40.0, "detectedIntents": ["URGENCY_PRESSURE"], "isCriticalWarning": False},
        forensic_features=None,
        speaker_data={
            "enrolled": True,
            "speakerName": "Alice Johnson",
            "speakerMatch": "MISMATCH",
            "speakerSimilarity": 0.28
        }
    )
    print(f"\n[Scenario E] Trusted speaker mismatch + suspicious scam intent (40%)")
    print(f"  Score: {res_e['finalRiskScore']} / 100")
    print(f"  Level: {res_e['riskLevel']} ({res_e['riskBadge']})")
    print(f"  Reasons: {res_e['reasons'][:2]}")
    assert res_e['finalRiskScore'] >= 70, f"Scenario E expected strong escalation (>= 70), got {res_e['finalRiskScore']}"
    assert res_e['riskLevel'] in ['high', 'critical'], f"Scenario E expected 'high' or 'critical', got {res_e['riskLevel']}"
    print("  -> PASSED: Verified Strong Escalation on Speaker Mismatch")

    # Scenario F: No trusted speaker selected
    # Expected: no speaker mismatch penalty (Score should be equal to base formula without speaker, 28)
    res_f = RiskFusionEngine.compute_risk(
        deepfake_prob=20.0,
        scam_data={"scamIntentScore": 40.0, "detectedIntents": ["URGENCY_PRESSURE"], "isCriticalWarning": False},
        forensic_features=None,
        speaker_data=None  # No speaker selected
    )
    print(f"\n[Scenario F] No trusted speaker selected (deepfake 20%, scam 40%)")
    print(f"  Score: {res_f['finalRiskScore']} / 100")
    print(f"  Level: {res_f['riskLevel']} ({res_f['riskBadge']})")
    print(f"  Reasons: {res_f['reasons'][:2]}")
    assert res_f['finalRiskScore'] == 28, f"Scenario F expected 28 without penalty, got {res_f['finalRiskScore']}"
    assert res_f['finalRiskScore'] < res_e['finalRiskScore'], f"Scenario F score {res_f['finalRiskScore']} must be lower than Scenario E {res_e['finalRiskScore']}"
    assert res_f['riskLevel'] == 'caution', f"Scenario F expected 'caution', got {res_f['riskLevel']}"
    print(f"  -> PASSED: Verified No Penalty (Score: {res_f['finalRiskScore']} vs {res_e['finalRiskScore']} with mismatch)")

    print("\n" + "=" * 70)
    print("ALL SCENARIOS A THROUGH F PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
