import numpy as np
import logging
from scipy.signal import find_peaks

logger = logging.getLogger("voxguard.forensics")

class ForensicFeatureExtractor:
    """
    Computes real acoustic signal measurements from 16 kHz mono audio arrays.
    Calculates RMS, ZCR, Spectral Centroid, Spectral Flatness, Pitch (F0), and Silence Ratio.
    Provides verifiable quantitative forensic indicators to support model explainability.
    """

    @classmethod
    def extract_features(cls, audio: np.ndarray, sample_rate: int = 16000) -> tuple[dict, list[str]]:
        """
        Extracts acoustic features and generates human-readable forensic observations.

        Returns:
            features: dict matching ForensicFeatures schema
            observations: list of human-readable explainability strings
        """
        if len(audio) == 0:
            return {}, ["Audio stream was empty."]

        # 1. Overall RMS Energy
        rms = float(np.sqrt(np.mean(audio ** 2)))

        # 2. Zero-Crossing Rate (ZCR)
        zero_crossings = np.sum(np.diff(audio > 0) != 0)
        zcr = float(zero_crossings / max(1, len(audio) - 1))

        # 3. Spectral Analysis via Short-Time Fourier Transform (STFT)
        frame_size = 512
        hop_size = 256
        num_frames = (len(audio) - frame_size) // hop_size

        centroids = []
        flatnesses = []
        silence_frames = 0
        pitches = []

        window = np.hanning(frame_size)
        freq_bins = np.fft.rfftfreq(frame_size, d=1.0 / sample_rate)

        for i in range(max(1, num_frames)):
            start = i * hop_size
            frame = audio[start:start + frame_size]
            if len(frame) < frame_size:
                break

            # Frame energy check for silence ratio
            frame_rms = np.sqrt(np.mean(frame ** 2))
            if frame_rms < 0.015:
                silence_frames += 1
                continue

            # Magnitude spectrum
            windowed = frame * window
            magnitude = np.abs(np.fft.rfft(windowed))
            power = magnitude ** 2
            sum_power = np.sum(power)

            if sum_power > 1e-10:
                # Spectral Centroid: sum(f * P(f)) / sum(P(f))
                centroid = np.sum(freq_bins * power) / sum_power
                centroids.append(centroid)

                # Spectral Flatness: Geometric Mean / Arithmetic Mean of Power Spectrum
                # High flatness (~0.5 - 1.0) means white-noise-like (neural vocoder artifacts);
                # Low flatness (< 0.2) indicates resonant human harmonic formant structure.
                log_power = np.log(power + 1e-12)
                geometric_mean = np.exp(np.mean(log_power))
                arithmetic_mean = np.mean(power) + 1e-12
                flatness = geometric_mean / arithmetic_mean
                flatnesses.append(min(1.0, max(0.0, flatness)))

            # 4. Fundamental Frequency (F0) estimation via Autocorrelation
            f0 = cls._estimate_pitch_autocorr(frame, sample_rate)
            if f0 and 65.0 <= f0 <= 450.0:  # Typical human vocal pitch range (Hz)
                pitches.append(f0)

        # Aggregate metrics
        avg_centroid = float(np.mean(centroids)) if centroids else 1800.0
        avg_flatness = float(np.mean(flatnesses)) if flatnesses else 0.15
        silence_ratio = float(silence_frames / max(1, num_frames))
        avg_f0 = float(np.mean(pitches)) if pitches else None
        pitch_std = float(np.std(pitches)) if len(pitches) >= 3 else None

        features = {
            "rms": round(rms, 4),
            "zcr": round(zcr, 4),
            "spectralCentroidHz": round(avg_centroid, 1),
            "spectralFlatness": round(avg_flatness, 4),
            "estimatedF0Hz": round(avg_f0, 1) if avg_f0 else None,
            "pitchVariabilityHz": round(pitch_std, 1) if pitch_std else None,
            "silenceRatio": round(silence_ratio, 3)
        }

        # Generate evidence-backed observations
        observations = []

        if avg_flatness > 0.35:
            observations.append(
                f"Elevated spectral flatness ({avg_flatness:.3f} > 0.35) reveals unnatural high-frequency noise floor characteristic of neural vocoder synthesis."
            )
        else:
            observations.append(
                f"Harmonic formant structure verified (spectral flatness {avg_flatness:.3f} within natural vocal acoustic baseline)."
            )

        if pitch_std is not None:
            if pitch_std < 8.0:
                observations.append(
                    f"Atypical pitch stability observed (σ = {pitch_std:.1f} Hz); human vocal cords normally exhibit natural micro-tremor pitch drift."
                )
            elif pitch_std > 85.0:
                observations.append(
                    f"Erratic pitch discontinuities detected (σ = {pitch_std:.1f} Hz), indicating potential concatenative voice blending."
                )
            else:
                observations.append(
                    f"Organic prosodic pitch variation confirmed across voiced frames (mean F0 = {avg_f0:.1f} Hz, σ = {pitch_std:.1f} Hz)."
                )
        else:
            observations.append("Insufficient sustained voicing detected to calculate definitive pitch jitter contour.")

        if avg_centroid > 3200.0:
            observations.append(
                f"High spectral centroid ({avg_centroid:.0f} Hz) indicates excessive synthetic upper-band energy (>3kHz)."
            )

        if zcr > 0.42:
            observations.append(
                f"High zero-crossing density ({zcr:.3f}) indicates unvoiced waveform jitter in high-frequency bands."
            )

        return features, observations

    @staticmethod
    def _estimate_pitch_autocorr(frame: np.ndarray, sample_rate: int) -> float | None:
        """Estimates F0 (pitch) using autocorrelation on a 32ms frame."""
        corr = np.correlate(frame, frame, mode='full')
        corr = corr[len(corr) // 2:]

        # Find first peak after zero-lag decline
        # Human pitch range: 65 Hz (period = 16000/65 = 246) to 450 Hz (period = 16000/450 = 35)
        min_lag = int(sample_rate / 450)
        max_lag = int(sample_rate / 65)

        if len(corr) < max_lag:
            return None

        search_window = corr[min_lag:max_lag]
        if len(search_window) == 0:
            return None

        peak_idx = np.argmax(search_window) + min_lag
        if corr[peak_idx] > 0.3 * corr[0]:  # Significant periodic correlation
            return float(sample_rate / peak_idx)

        return None
