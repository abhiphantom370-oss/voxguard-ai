import time
import logging
import numpy as np
from typing import Dict, Any, Optional

logger = logging.getLogger("voxguard.transcriber")

class SpeechTranscriberService:
    """
    Singleton service that wraps faster-whisper for ultra-fast local offline speech transcription.
    Loaded once at startup using int8 CPU inference on Apple Silicon / macOS.
    Supports English, Hindi, and Hinglish speech.
    """
    _instance: Optional["SpeechTranscriberService"] = None

    def __init__(self):
        self.model_name = "faster-whisper-tiny-int8"
        self.device = "cpu"
        self.compute_type = "int8"
        self.model = None

        logger.info(f"[VoxGuard STT] Initializing {self.model_name} on {self.device}...")
        t0 = time.time()
        try:
            from faster_whisper import WhisperModel
            self.model = WhisperModel("tiny", device=self.device, compute_type=self.compute_type)
            logger.info(f"[VoxGuard STT] {self.model_name} loaded successfully in {time.time() - t0:.2f}s.")
        except Exception as e:
            logger.error(f"[VoxGuard STT] Failed to initialize Whisper model: {e}", exc_info=True)
            self.model = None

    @classmethod
    def get_instance(cls) -> "SpeechTranscriberService":
        if cls._instance is None:
            cls._instance = SpeechTranscriberService()
        return cls._instance

    def transcribe(self, audio: np.ndarray, sample_rate: int = 16000) -> Dict[str, Any]:
        """
        Transcribes 16 kHz mono float32 audio array.
        Returns:
          transcript: str
          detectedLanguage: str (e.g. 'en', 'hi')
          transcriptionConfidence: float (0.0 to 1.0)
          processingTime: int (milliseconds)
        """
        t0 = time.perf_counter()

        if self.model is None:
            return {
                "transcript": "",
                "detectedLanguage": "unknown",
                "transcriptionConfidence": 0.0,
                "processingTime": int(round((time.perf_counter() - t0) * 1000)),
                "error": "Transcription model unavailable"
            }

        # Validate input length and energy
        if len(audio) < 1600:  # < 0.1s
            return {
                "transcript": "",
                "detectedLanguage": "none",
                "transcriptionConfidence": 0.0,
                "processingTime": int(round((time.perf_counter() - t0) * 1000))
            }

        rms = float(np.sqrt(np.mean(audio ** 2)))
        if rms < 0.003:  # Virtual silence
            return {
                "transcript": "",
                "detectedLanguage": "silence",
                "transcriptionConfidence": 0.0,
                "processingTime": int(round((time.perf_counter() - t0) * 1000))
            }

        try:
            # Ensure float32 normalized
            audio_data = audio.astype(np.float32)
            if np.max(np.abs(audio_data)) > 1.0:
                audio_data = audio_data / np.max(np.abs(audio_data))

            # Transcribe with beam_size=1 for max speed
            segments, info = self.model.transcribe(
                audio_data,
                beam_size=1,
                temperature=0.0,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            text_parts = []
            confidence_sum = 0.0
            segment_count = 0

            for segment in segments:
                text_parts.append(segment.text.strip())
                # avg_logprob -> approximate probability: e^(avg_logprob)
                prob = float(np.exp(segment.avg_logprob)) if segment.avg_logprob is not None else 0.85
                confidence_sum += min(1.0, max(0.1, prob))
                segment_count += 1

            full_transcript = " ".join(text_parts).strip()
            avg_conf = round(confidence_sum / max(1, segment_count), 2) if segment_count > 0 else 0.0

            elapsed_ms = int(round((time.perf_counter() - t0) * 1000))

            return {
                "transcript": full_transcript,
                "detectedLanguage": info.language if info else "en",
                "transcriptionConfidence": avg_conf,
                "processingTime": elapsed_ms
            }

        except Exception as e:
            logger.error(f"[VoxGuard STT] Transcription error: {e}", exc_info=True)
            elapsed_ms = int(round((time.perf_counter() - t0) * 1000))
            return {
                "transcript": "",
                "detectedLanguage": "unknown",
                "transcriptionConfidence": 0.0,
                "processingTime": elapsed_ms,
                "error": str(e)
            }

transcriber_service = SpeechTranscriberService.get_instance()
