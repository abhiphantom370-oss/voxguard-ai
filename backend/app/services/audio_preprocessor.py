import io
import logging
import numpy as np
from scipy import signal

logger = logging.getLogger("voxguard.preprocessor")

class AudioPreprocessor:
    """
    Standardized, high-performance audio preprocessing pipeline for VoxGuard AI.
    Handles decoding for WebM, WAV, MP3, M4A, OGG, AAC, FLAC via PyAV / FFmpeg.
    Converts to mono 16 kHz, normalizes amplitude, trims silence, and validates integrity.
    """
    TARGET_SAMPLE_RATE = 16000
    MAX_STATIC_DURATION_SEC = 15.0  # Limits static file inference window for sub-second CPU response
    MIN_ALLOWED_DURATION_SEC = 0.25 # Minimum duration required for meaningful acoustic analysis
    SILENCE_THRESHOLD_DB = -45.0    # dBFS threshold for silence trimming

    @classmethod
    def process_audio_bytes(
        cls,
        audio_bytes: bytes,
        max_duration_sec: float = MAX_STATIC_DURATION_SEC,
        trim_silence: bool = True
    ) -> dict:
        """
        Ingests raw audio bytes from any supported container/codec and produces
        a normalized mono 16 kHz float32 numpy array ready for inference.

        Returns:
            dict containing:
                - audio_tensor: np.ndarray (float32, 1D, shape: [samples])
                - original_duration: float (seconds)
                - processed_duration: float (seconds)
                - sample_rate: int (always 16000)
                - rms_energy: float
        """
        if not audio_bytes or len(audio_bytes) == 0:
            raise ValueError("Audio stream is empty (0 bytes).")

        # Step 1: Decode via PyAV
        try:
            import av
            container = av.open(io.BytesIO(audio_bytes))
            audio_stream = next((s for s in container.streams if s.type == 'audio'), None)
            if not audio_stream:
                raise ValueError("No audio track found in the provided media container.")

            in_sample_rate = audio_stream.rate or 44100
            in_channels = audio_stream.channels or 1

            # Resample directly to 16 kHz mono using PyAV resampler for maximum performance
            resampler = av.AudioResampler(
                format='flt',
                layout='mono',
                rate=cls.TARGET_SAMPLE_RATE
            )

            frames = []
            for frame in container.decode(audio_stream):
                resampled_frames = resampler.resample(frame)
                for rf in resampled_frames:
                    frames.append(rf.to_ndarray())

            if not frames:
                raise ValueError("Audio stream decoded to 0 frames; file may be corrupt or unplayable.")

            audio_data = np.concatenate(frames, axis=1).squeeze()
        except Exception as pyav_err:
            logger.warning(f"[VoxGuard Preprocessor] PyAV decode failed ({pyav_err}), attempting scipy fallback...")
            try:
                from scipy.io import wavfile
                in_sr, raw_data = wavfile.read(io.BytesIO(audio_bytes))
                if raw_data.dtype == np.int16:
                    audio_data = raw_data.astype(np.float32) / 32768.0
                elif raw_data.dtype == np.int32:
                    audio_data = raw_data.astype(np.float32) / 2147483648.0
                elif raw_data.dtype == np.uint8:
                    audio_data = (raw_data.astype(np.float32) - 128.0) / 128.0
                else:
                    audio_data = raw_data.astype(np.float32)

                # Convert to mono if multi-channel
                if audio_data.ndim > 1:
                    audio_data = np.mean(audio_data, axis=1)

                # Resample to 16 kHz if necessary
                if in_sr != cls.TARGET_SAMPLE_RATE:
                    num_samples = int(len(audio_data) * cls.TARGET_SAMPLE_RATE / in_sr)
                    audio_data = signal.resample(audio_data, num_samples)
            except Exception as fallback_err:
                logger.error(f"[VoxGuard Preprocessor] All decoding attempts failed: {fallback_err}")
                raise ValueError(f"Unable to decode audio stream. The format or codec is unsupported or corrupt. Error: {pyav_err}")

        # Ensure 1D float32 array
        audio_data = audio_data.astype(np.float32)
        if audio_data.ndim > 1:
            audio_data = np.mean(audio_data, axis=tuple(range(1, audio_data.ndim)))

        original_duration = len(audio_data) / float(cls.TARGET_SAMPLE_RATE)

        if original_duration < cls.MIN_ALLOWED_DURATION_SEC:
            raise ValueError(
                f"Audio sample duration ({original_duration:.2f}s) is too short for acoustic inspection. "
                f"Minimum required is {cls.MIN_ALLOWED_DURATION_SEC}s."
            )

        # Step 2: Peak normalize if non-silent
        peak = np.max(np.abs(audio_data))
        if peak > 1e-5:
            audio_data = audio_data / peak
        else:
            raise ValueError("Audio sample contains complete silence (near 0.0 amplitude across all frames).")

        # Step 3: Trim silence if requested
        if trim_silence and len(audio_data) > int(0.5 * cls.TARGET_SAMPLE_RATE):
            audio_data = cls._trim_silence(audio_data, threshold_db=cls.SILENCE_THRESHOLD_DB)

        # Step 4: Cap maximum duration for low-latency inference
        max_samples = int(max_duration_sec * cls.TARGET_SAMPLE_RATE)
        if len(audio_data) > max_samples:
            logger.info(f"[VoxGuard Preprocessor] Truncating audio from {len(audio_data)/cls.TARGET_SAMPLE_RATE:.1f}s to {max_duration_sec:.1f}s for optimal CPU latency.")
            audio_data = audio_data[:max_samples]

        processed_duration = len(audio_data) / float(cls.TARGET_SAMPLE_RATE)
        rms = float(np.sqrt(np.mean(audio_data ** 2)))

        return {
            "audio": audio_data,
            "original_duration": round(original_duration, 2),
            "processed_duration": round(processed_duration, 2),
            "sample_rate": cls.TARGET_SAMPLE_RATE,
            "rms": round(rms, 4)
        }

    @classmethod
    def _trim_silence(cls, audio: np.ndarray, frame_length: int = 512, threshold_db: float = -45.0) -> np.ndarray:
        """Trims leading and trailing silence based on frame RMS energy threshold."""
        num_frames = len(audio) // frame_length
        if num_frames < 4:
            return audio

        frames = audio[:num_frames * frame_length].reshape((num_frames, frame_length))
        frame_rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
        frame_db = 20 * np.log10(frame_rms / (np.max(frame_rms) + 1e-12))

        active_indices = np.where(frame_db > threshold_db)[0]
        if len(active_indices) == 0:
            return audio

        start_sample = max(0, (active_indices[0] - 1) * frame_length)
        end_sample = min(len(audio), (active_indices[-1] + 2) * frame_length)

        return audio[start_sample:end_sample]
