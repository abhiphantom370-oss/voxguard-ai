import io
import time
import numpy as np
import scipy.io.wavfile as wavfile
from fastapi.testclient import TestClient

import sys
sys.path.insert(0, "app")
from app.main import app
from app.services.scam_detector import scam_detector

client = TestClient(app)

def create_synthetic_wav(freq=440.0, duration=2.0, sr=16000):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    sig = 0.6 * np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * 2 * freq * t)
    sig = sig / np.max(np.abs(sig))
    sig_int16 = (sig * 32767).astype(np.int16)
    buf = io.BytesIO()
    wavfile.write(buf, sr, sig_int16)
    buf.seek(0)
    return buf.getvalue()

def test_scam_sentences():
    test_cases = [
        ("SAFE", "Hello, how are you doing today?", 0.0, "LOW"),
        ("SAFE", "Never share your OTP with anyone.", 0.0, "LOW"),
        ("SUSPICIOUS", "Please tell me the OTP you received.", 40.0, "CAUTION"),
        ("HIGH RISK", "I am calling from your bank. Your account will be blocked. Tell me your OTP immediately.", 100.0, "CRITICAL"),
        ("HIGH RISK", "Install AnyDesk and share your screen so I can process your refund.", 75.0, "CRITICAL")
    ]

    print("\n--- 1. SCAM DETECTOR RULE SUITE ---")
    for expected_tier, text, expected_min_score, expected_cat in test_cases:
        res = scam_detector.analyze(text)
        print(f"[{expected_tier}] \"{text}\"")
        print(f"  Score: {res['scamIntentScore']}/100 | Category: {res['scamCategory']}")
        print(f"  Intents: {res['detectedIntents']}")
        print(f"  Phrases: {[p['phrase'] for p in res['suspiciousPhrases']]}")
        print(f"  Reasons: {res['explanation']}")
        print(f"  Critical: {res['isCriticalWarning']}")

        if expected_tier == "SAFE":
            assert res["scamIntentScore"] < 25.0, f"Expected safe score < 25 for: {text}"
            assert res["scamCategory"] == "LOW", f"Expected LOW category for: {text}"
            assert len(res["detectedIntents"]) == 0, f"Expected 0 intents for: {text}"
        elif expected_tier == "SUSPICIOUS":
            assert 25.0 <= res["scamIntentScore"] < 75.0, f"Expected score 25-75 for: {text}"
            assert res["scamCategory"] in ["CAUTION", "HIGH"], f"Expected CAUTION/HIGH for: {text}"
            assert len(res["detectedIntents"]) > 0
        elif expected_tier == "HIGH RISK":
            assert res["scamIntentScore"] >= 50.0, f"Expected score >= 50 for: {text}"
            assert res["scamCategory"] in ["HIGH", "CRITICAL"], f"Expected HIGH/CRITICAL for: {text}"
            assert len(res["detectedIntents"]) >= 2
    print("✓ All test sentences classified with exact score thresholds & explainability.")

def test_api_analyze_contract():
    print("\n--- 2. API /api/analyze UNIFIED CONTRACT TEST ---")
    wav_bytes = create_synthetic_wav(freq=350.0, duration=2.5)
    res = client.post(
        "/api/analyze",
        files={"file": ("scam_test.wav", wav_bytes, "audio/wav")},
        data={"speaker_id": "none", "sensitivity": "balanced"}
    )
    assert res.status_code == 200, f"/api/analyze returned {res.status_code}: {res.text}"
    data = res.json()

    # Check that new and structured fields are present
    required_fields = [
        "scamIntentScore",
        "scamCategory",
        "detectedIntents",
        "suspiciousPhrases",
        "scamReasons",
        "deepfake_probability",
        "speaker_match_score",
        "scam_intent_score",
        "scam_reasons",
        "transcript",
        "reasons",
        "classification",
        "finalRiskScore",
        "contextualRisk"
    ]
    for field in required_fields:
        assert field in data, f"Missing field '{field}' in AnalysisResponse"

    print(f"✓ /api/analyze successfully returned all structured fields:")
    print(f"  deepfake_probability: {data['deepfake_probability']}")
    print(f"  scam_intent_score: {data['scam_intent_score']}")
    print(f"  scamCategory: {data['scamCategory']}")
    print(f"  scamReasons: {data['scamReasons']}")

def test_api_live_chunk_contract():
    print("\n--- 3. API /api/live/chunk SCAM INTENT & WARNING TEST ---")
    chunk_bytes = create_synthetic_wav(freq=300.0, duration=2.5)
    res = client.post(
        "/api/live/chunk",
        files={"file": ("chunk_test.wav", chunk_bytes, "audio/wav")},
        data={"session_id": "test-scam-session", "chunk_index": "1"}
    )
    assert res.status_code == 200, f"/api/live/chunk returned {res.status_code}: {res.text}"
    data = res.json()

    required_live_fields = [
        "scamIntentScore",
        "scamCategory",
        "suspiciousPhrases",
        "scamReasons",
        "isCriticalWarning",
        "criticalWarningMessage",
        "deepfake_probability",
        "scam_intent_score",
        "transcript",
        "rollingThreatScore",
        "reasons"
    ]
    for field in required_live_fields:
        assert field in data, f"Missing field '{field}' in LiveChunkResponse"

    print(f"✓ /api/live/chunk successfully returned live scam metrics:")
    print(f"  scamIntentScore: {data['scamIntentScore']}")
    print(f"  scamCategory: {data['scamCategory']}")
    print(f"  isCriticalWarning: {data['isCriticalWarning']}")
    print(f"  rollingThreatScore: {data['rollingThreatScore']}")

if __name__ == "__main__":
    test_scam_sentences()
    test_api_analyze_contract()
    test_api_live_chunk_contract()
    print("\n==========================================================")
    print("ALL SCAM-INTENT PIPELINE TESTS PASSED WITH ZERO FAILURES!")
    print("==========================================================")
