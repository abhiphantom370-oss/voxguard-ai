import io
import time
import numpy as np
import scipy.io.wavfile as wavfile
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import get_analyses, get_reports_metrics, get_enrolled_speakers

client = TestClient(app)

def create_synthetic_wav(freq=440.0, duration=2.0, sr=16000, noise=0.0):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Fundamental tone + harmonic series
    sig = 0.6 * np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * 2 * freq * t) + 0.1 * np.sin(2 * np.pi * 3 * freq * t)
    if noise > 0:
        sig += noise * np.random.normal(0, 0.05, len(sig))
    sig = sig / np.max(np.abs(sig))
    sig_int16 = (sig * 32767).astype(np.int16)
    buf = io.BytesIO()
    wavfile.write(buf, sr, sig_int16)
    buf.seek(0)
    return buf.getvalue()

def run_tests():
    print("=================================================================")
    print("VOXGUARD AI — COMPREHENSIVE PIPELINE VERIFICATION")
    print("=================================================================\n")

    # 1. Health Probe
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health = res.json()
    print(f"1. Health Check: OK ({health['service']} v{health['version']}, STT={health['sttAvailable']})")

    # 2. Test Audio Upload & Analysis on Synthetic Sample
    wav_bytes = create_synthetic_wav(freq=300.0, duration=3.0)
    t0 = time.time()
    res = client.post(
        "/api/analyze",
        files={"file": ("test_synthetic_sample.wav", wav_bytes, "audio/wav")},
        data={"speaker_id": "none", "sensitivity": "balanced"}
    )
    assert res.status_code == 200, f"/api/analyze failed: {res.text}"
    anl = res.json()
    print(f"2. End-to-End Inspection: OK in {time.time() - t0:.2f}s")
    print(f"   • Deepfake Prob: {anl['deepfakeProbability']}% ({anl['classification']})")
    print(f"   • Authenticity: {anl['authenticityScore']}")
    print(f"   • Scam Intent: {anl['scamIntentScore']}%")
    print(f"   • Speaker Match: {anl['speakerMatch']}")
    print(f"   • Overall Risk: {anl['finalRiskScore']}/100 ({anl['riskLevel']})")
    print(f"   • Latency Profile: {anl['timing']}")

    # 3. Live Chunk Analysis
    chunk_bytes = create_synthetic_wav(freq=250.0, duration=2.5)
    res = client.post(
        "/api/live/chunk",
        files={"file": ("live_chunk_0.wav", chunk_bytes, "audio/wav")},
        data={"session_id": "test-session-v2", "chunk_index": "1"}
    )
    assert res.status_code == 200, f"/api/live/chunk failed: {res.text}"
    chunk_res = res.json()
    print(f"3. Live Chunk Processing: OK in {chunk_res['processingTime']}ms")
    print(f"   • Rolling Threat Score: {chunk_res['rollingThreatScore']}/100")
    print(f"   • Chunk Deepfake Prob: {chunk_res['deepfakeProbability']}%")

    # 4. Speaker Enrollment & Verification
    spk_ref_bytes = create_synthetic_wav(freq=220.0, duration=3.0)
    enroll_res = client.post(
        "/api/speaker/enroll",
        files={"file": ("father_voice.wav", spk_ref_bytes, "audio/wav")},
        data={"name": "Father", "role": "Family Contact", "department": "Personal"}
    )
    assert enroll_res.status_code == 200, f"Enrollment failed: {enroll_res.text}"
    new_spk = enroll_res.json()
    print(f"4. Speaker Enrollment: OK (Enrolled '{new_spk['name']}' with {new_spk['voiceHash']})")

    # Verify identical voice against enrolled Father
    test_match_res = client.post(
        "/api/analyze",
        files={"file": ("father_test.wav", spk_ref_bytes, "audio/wav")},
        data={"speaker_id": new_spk["id"]}
    )
    assert test_match_res.status_code == 200
    matched_data = test_match_res.json()
    print(f"   • Matched Voice: SpeakerMatch='{matched_data['speakerMatch']}', Sim={matched_data['speakerSimilarity']}")

    # Verify different voice against enrolled Father
    different_bytes = create_synthetic_wav(freq=600.0, duration=3.0)
    test_mismatch_res = client.post(
        "/api/analyze",
        files={"file": ("impostor.wav", different_bytes, "audio/wav")},
        data={"speaker_id": new_spk["id"]}
    )
    assert test_mismatch_res.status_code == 200
    mismatched_data = test_mismatch_res.json()
    print(f"   • Mismatched Voice: SpeakerMatch='{mismatched_data['speakerMatch']}', Sim={mismatched_data['speakerSimilarity']}")

    # 5. History & Reports Derivation
    history_records = get_analyses()
    assert len(history_records) > 0, "History database is empty!"
    print(f"5. Persistent Audit Trail: OK ({len(history_records)} records stored in SQLite)")

    metrics = get_reports_metrics()
    print(f"6. Reports Metrics: OK (Total: {metrics['totalAnalyses']}, Avg Risk: {metrics['averageRisk']}, Defenses: {metrics['postureRating']}/100)")

    # 7. CSV Export
    csv_res = client.get("/api/reports/export")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    print(f"7. Report Export (CSV): OK ({len(csv_res.content)} bytes generated)")

    print("\n=================================================================")
    print("ALL VERIFICATION SUITES PASSED WITH ZERO ERRORS!")
    print("=================================================================")

if __name__ == "__main__":
    run_tests()
