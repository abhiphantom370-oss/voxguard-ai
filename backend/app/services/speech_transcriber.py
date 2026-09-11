import time
import os
import gc
import logging
import numpy as np
from typing import Dict, Any, Optional

logger = logging.getLogger("voxguard.transcriber")

try:
    import pywhispercpp
    from pywhispercpp.model import Model as PyWhisperModel
    PYWHISPER_AVAILABLE = True
except ImportError:
    PyWhisperModel = None
    PYWHISPER_AVAILABLE = False


class SpeechTranscriberService:
    """
    Production-grade, low-memory Speech-to-Text service supporting:
      1. pywhispercpp (whisper.cpp quantized tiny.en-q5_1, ~31 MB model, <100 MB RAM)
      2. faster-whisper (optional fallback in full local mode)
    Designed strictly for Render Free (512 MB RAM / 0.1 vCPU).
    """
    _instance: Optional["SpeechTranscriberService"] = None

    def __init__(self):
        self.model = None
        self.engine_type = "none"
        self.model_name = "none"
        self.device = "cpu"
        self.models_dir = None

        # Attempt 1: Load lightweight whisper.cpp with quantized tiny.en-q5_1 model
        if PYWHISPER_AVAILABLE:
            try:
                cur_dir = os.path.dirname(os.path.abspath(__file__))
                candidates = [
                    os.path.join(os.path.dirname(cur_dir), "models"),
                    os.path.abspath("backend/app/models"),
                    os.path.abspath("app/models")
                ]
                for c in candidates:
                    if os.path.isfile(os.path.join(c, "ggml-tiny.en-q5_1.bin")):
                        self.models_dir = c
                        break
                    elif os.path.isfile(os.path.join(c, "ggml-tiny.en.bin")):
                        self.models_dir = c
                        break

                model_target = "tiny.en-q5_1" if self.models_dir and os.path.isfile(os.path.join(self.models_dir, "ggml-tiny.en-q5_1.bin")) else "tiny.en"
                logger.info(f"[VoxGuard STT] Initializing whisper.cpp engine (model='{model_target}', dir='{self.models_dir}', n_threads=1)...")
                t0 = time.perf_counter()
                self.model = PyWhisperModel(model_target, models_dir=self.models_dir, n_threads=1)
                self.engine_type = "whisper.cpp"
                self.model_name = f"whisper.cpp-{model_target}"
                self.device = "cpu"
                logger.info(f"[VoxGuard STT] {self.model_name} loaded in {time.perf_counter() - t0:.2f}s (Low-memory production profile).")
                return
            except Exception as w_err:
                logger.warning(f"[VoxGuard STT] whisper.cpp initialization failed: {w_err}. Attempting fallback...")

        # Attempt 2: Load faster-whisper only if explicitly enabled and not in cloud-lite mode
        from utils.config import is_cloud_lite
        if not is_cloud_lite():
            try:
                from faster_whisper import WhisperModel
                selected_model = os.environ.get("WHISPER_MODEL", "tiny")
                self.model_name = f"faster-whisper-{selected_model}-int8"
                cache_dir = os.environ.get("WHISPER_CACHE_DIR")
                self.model = WhisperModel(selected_model, device="cpu", compute_type="int8", download_root=cache_dir)
                self.engine_type = "faster-whisper"
                logger.info(f"[VoxGuard STT] {self.model_name} loaded successfully.")
                return
            except Exception as fw_err:
                logger.warning(f"[VoxGuard STT] faster-whisper unavailable: {fw_err}")

        self.engine_type = "none"
        self.model_name = "transcription-unavailable"
        logger.warning("[VoxGuard STT] No transcription engine could be loaded.")

    @classmethod
    def get_instance(cls) -> "SpeechTranscriberService":
        if cls._instance is None:
            cls._instance = SpeechTranscriberService()
        return cls._instance

    @property
    def is_available(self) -> bool:
        return self.model is not None and self.engine_type != "none"

    def transcribe(self, audio: np.ndarray, sample_rate: int = 16000) -> Dict[str, Any]:
        """
        Transcribes 16 kHz mono float32 audio array.
        Returns:
          transcript: str
          detectedLanguage: str (e.g. 'en')
          transcriptionConfidence: float (0.0 to 1.0)
          processingTime: int (milliseconds)
          engine: str
        """
        t0 = time.perf_counter()

        if not self.is_available:
            return {
                "transcript": "",
                "detectedLanguage": "unknown",
                "transcriptionConfidence": 0.0,
                "processingTime": int(round((time.perf_counter() - t0) * 1000)),
                "engine": self.model_name,
                "error": "Transcription engine not available"
            }

        # Check minimum length (at least 0.15s)
        if len(audio) < 2400:
            return {
                "transcript": "",
                "detectedLanguage": "none",
                "transcriptionConfidence": 0.0,
                "processingTime": int(round((time.perf_counter() - t0) * 1000)),
                "engine": self.model_name
            }

        # Virtual silence check
        rms = float(np.sqrt(np.mean(audio ** 2)))
        if rms < 0.0025:
            return {
                "transcript": "",
                "detectedLanguage": "silence",
                "transcriptionConfidence": 0.0,
                "processingTime": int(round((time.perf_counter() - t0) * 1000)),
                "engine": self.model_name
            }

        try:
            # Ensure float32 normalized [-1.0, 1.0]
            audio_data = audio.astype(np.float32)
            max_amp = np.max(np.abs(audio_data))
            if max_amp > 1.0:
                audio_data = audio_data / max_amp

            if self.engine_type == "whisper.cpp":
                segments = self.model.transcribe(audio_data)
                text_parts = [s.text.strip() for s in segments if s.text and s.text.strip()]
                full_transcript = " ".join(text_parts).strip()
                if full_transcript in ("(music)", "[BLANK_AUDIO]", "(gentle music)", "(upbeat music)", "(applause)"):
                    full_transcript = ""

                elapsed_ms = int(round((time.perf_counter() - t0) * 1000))
                gc.collect()

                return {
                    "transcript": full_transcript,
                    "detectedLanguage": "en",
                    "transcriptionConfidence": 0.88 if full_transcript else 0.0,
                    "processingTime": max(1, elapsed_ms),
                    "engine": self.model_name
                }

            elif self.engine_type == "faster-whisper":
                segments, info = self.model.transcribe(
                    audio_data,
                    beam_size=1,
                    temperature=0.0,
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=500)
                )
                text_parts = [seg.text.strip() for seg in segments if seg.text.strip()]
                full_transcript = " ".join(text_parts).strip()
                elapsed_ms = int(round((time.perf_counter() - t0) * 1000))
                gc.collect()

                return {
                    "transcript": full_transcript,
                    "detectedLanguage": info.language if info else "en",
                    "transcriptionConfidence": 0.90 if full_transcript else 0.0,
                    "processingTime": max(1, elapsed_ms),
                    "engine": self.model_name
                }

        except Exception as e:
            logger.error(f"[VoxGuard STT] Transcription error: {e}", exc_info=True)
            elapsed_ms = int(round((time.perf_counter() - t0) * 1000))
            return {
                "transcript": "",
                "detectedLanguage": "unknown",
                "transcriptionConfidence": 0.0,
                "processingTime": elapsed_ms,
                "engine": self.model_name,
                "error": str(e)
            }

transcriber_service = SpeechTranscriberService.get_instance()

