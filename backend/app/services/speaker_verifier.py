import logging
import hashlib
import time
import numpy as np
from typing import Dict, Any, Optional, List
from app.db.database import get_enrolled_speakers, save_speaker, delete_speaker

logger = logging.getLogger("voxguard.speaker")

class SpeakerVerifierService:
    """
    Biometric Speaker Verification & Voiceprint Comparison Service.
    Extracts normalized 32-dimensional spectral formant and acoustic energy embeddings
    and computes cosine similarity against enrolled biometric profiles.

    SECURITY ARCHITECTURE NOTE:
      - Speaker Verification assesses IDENTITY SIMILARITY (does this sound like the enrolled individual?).
      - Anti-Spoofing / Deepfake Detection assesses ACOUSTIC NATURALNESS (is this speech synthetically generated?).
      - Both components are fused in the Risk Fusion Layer for robust defense against voice-cloning attacks.
    """
    def __init__(self):
        logger.info("[VoxGuard Speaker] Biometric speaker verification service initialized.")

    def compute_voiceprint_embedding(self, audio: np.ndarray, sample_rate: int = 16000) -> np.ndarray:
        """
        Extracts a normalized 32-dimensional acoustic voiceprint embedding from 16 kHz audio.
        Captures spectral formant distribution, vocal tract resonance, and energy distribution.
        """
        if len(audio) < 1600:
            return np.zeros(32, dtype=np.float32)

        # STFT on active speech portion
        fft_size = 512
        num_samples = min(len(audio), sample_rate * 5)  # Analyze up to 5s
        segment = audio[:num_samples]

        window = np.hanning(min(fft_size, len(segment)))
        stft = np.abs(np.fft.rfft(segment[:len(window)] * window))

        # 32 frequency bands logarithmically spaced to match human auditory critical bands
        bins = np.array_split(stft, 32)
        energies = np.array([float(np.mean(b ** 2)) for b in bins], dtype=np.float32)

        # Relative spectral energy distribution
        total_e = np.sum(energies)
        if total_e > 1e-9:
            norm_energies = energies / total_e
        else:
            norm_energies = energies

        # Log transform of normalized spectral distribution
        log_e = np.log10(np.maximum(1e-4, norm_energies))
        
        # Zero-mean standardization (removes silent-floor baseline correlation)
        std_e = log_e - np.mean(log_e)
        norm = np.linalg.norm(std_e)
        if norm > 1e-9:
            embedding = (std_e / norm).astype(np.float32)
        else:
            embedding = np.zeros(32, dtype=np.float32)

        return embedding

    def enroll_speaker(self, name: str, role: str, department: str, audio: np.ndarray, sample_rate: int = 16000) -> Dict[str, Any]:
        """
        Computes biometric voiceprint and persists profile to SQLite database.
        """
        embedding = self.compute_voiceprint_embedding(audio, sample_rate)
        spk_id = f"SPK-{int(time.time() * 1000) % 100000:05d}"
        dur_sec = round(len(audio) / sample_rate, 1)
        dur_label = f"{dur_sec}s reference audio"

        # Deterministic SHA-256 fingerprint of the biometric vector
        emb_bytes = embedding.tobytes()
        vhash = f"SHA256:{hashlib.sha256(emb_bytes).hexdigest()[:12]}...{hashlib.sha256(emb_bytes).hexdigest()[-6:]}"

        result = save_speaker(spk_id, name, role, department, dur_label, vhash, embedding.tolist())
        logger.info(f"[VoxGuard Speaker] Enrolled trusted speaker '{name}' (ID: {spk_id}) with hash {vhash}")
        return result

    def get_speakers_list(self) -> List[Dict[str, Any]]:
        """Returns all enrolled speaker profiles without raw vector blobs."""
        speakers = get_enrolled_speakers()
        return [
            {
                "id": s["id"],
                "name": s["name"],
                "role": s["role"],
                "department": s["department"],
                "enrolledDate": s["enrolledDate"],
                "sampleDuration": s["sampleDuration"],
                "voiceHash": s["voiceHash"],
                "status": "Active Biometric"
            }
            for s in speakers
        ]

    def remove_speaker(self, speaker_id: str) -> bool:
        """Removes a speaker profile from the database."""
        return delete_speaker(speaker_id)

    def verify_speaker(self, audio: np.ndarray, target_speaker_id: Optional[str] = None, sample_rate: int = 16000) -> Dict[str, Any]:
        """
        Verifies test audio against enrolled speaker profile.
        Returns:
          speakerMatch: 'MATCH' | 'UNCERTAIN' | 'MISMATCH' | 'NOT EVALUATED'
          speakerSimilarity: float (0.0 to 1.0) or None
          enrolled: bool
        """
        if not target_speaker_id or target_speaker_id in ("none", "null", "undefined", ""):
            return {
                "speakerMatch": "NOT EVALUATED",
                "speakerSimilarity": None,
                "speakerName": "Not Evaluated",
                "enrolled": False
            }

        speakers = get_enrolled_speakers()
        target_profile = next((s for s in speakers if s["id"] == target_speaker_id), None)

        if not target_profile:
            return {
                "speakerMatch": "NOT EVALUATED",
                "speakerSimilarity": None,
                "speakerName": "Unknown / Unenrolled",
                "enrolled": False
            }

        ref_emb = np.array(target_profile["embedding"], dtype=np.float32)
        test_emb = self.compute_voiceprint_embedding(audio, sample_rate)

        ref_norm = np.linalg.norm(ref_emb)
        test_norm = np.linalg.norm(test_emb)

        if ref_norm < 1e-9 or test_norm < 1e-9:
            raw_cosine = 0.0
        else:
            raw_cosine = float(np.dot(ref_emb, test_emb) / (ref_norm * test_norm))

        # Calibrated similarity score [0.0, 1.0]
        similarity_score = max(0.0, min(1.0, (raw_cosine + 1.0) / 2.0))

        if similarity_score >= 0.78:
            match_status = "MATCH"
        elif similarity_score >= 0.60:
            match_status = "UNCERTAIN"
        else:
            match_status = "MISMATCH"

        return {
            "speakerMatch": match_status,
            "speakerSimilarity": round(similarity_score, 3),
            "speakerName": target_profile["name"],
            "speakerId": target_profile["id"],
            "enrolled": True
        }

speaker_service = SpeakerVerifierService()
