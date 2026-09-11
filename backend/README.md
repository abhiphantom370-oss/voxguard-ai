# VoxGuard AI - Backend Inference Engine

FastAPI-powered forensic audio inspection backend for detecting synthetic speech, neural vocoder artifacts, and conversational impersonation.

## Architecture

- **`main.py`**: FastAPI application entrypoint with CORS middleware and logging.
- **`routes/analyze.py`**: `/api/analyze` multipart endpoint accepting audio streams and returning forensic scoring.
- **`services/detector.py`**: `DeepfakeDetectorService` performing:
  - Acoustic signal energy & zero-crossing rate (ZCR) profiling
  - Spectral entropy & harmonic consistency analysis
  - Neural vocoder discriminator heuristics (HiFi-GAN, ElevenLabs)
  - Biometric speaker verification catalog comparison
  - Conversational social engineering & scam intent rating
- **`models/inference.py`**: Pydantic schemas defining the forensic output contract.

## API Endpoints

### 1. Health Probe
- **Method**: `GET`
- **Path**: `/api/health`
- **Response**: `{"status": "healthy", "service": "VoxGuard AI Inference Engine", ...}`

### 2. Audio Inspection
- **Method**: `POST`
- **Path**: `/api/analyze`
- **Body**: `multipart/form-data` with:
  - `file`: Audio file or recording Blob (WAV, WebM, MP3, M4A, FLAC, OGG)
  - `duration` (optional): Audio duration in seconds
- **Response**:
  ```json
  {
    "analysisId": "ANL-260910-C7FAF7",
    "fileName": "recorded_voice_1757500000.webm",
    "fileSize": 32044,
    "durationSec": 2.5,
    "status": "completed",
    "deepfakeProbability": 77.5,
    "authenticityScore": "Synthetic Voice (Cloned)",
    "speakerMatch": "No Match (Enrolled Catalog Mismatch)",
    "scamIntentScore": 74.8,
    "contextualRisk": "Critical",
    "finalRiskScore": 78,
    "riskLevel": "critical",
    "reasons": [
      "Acoustic phase jitter inconsistency strongly matches neural vocoder profile (HiFi-GAN / ElevenLabs).",
      "Moderate harmonic consistency detected across mid-band formants (1kHz - 4kHz).",
      "High zero-crossing frequency spikes detected in unvoiced fricatives, typical of HiFi-GAN synthesis.",
      "Speaker biometric catalog check: Voiceprint deviates significantly from enrolled trusted profiles."
    ],
    "modelVersion": "VoxGuard-AcousticNet-v2.1",
    "processingTime": 8,
    "message": "CRITICAL ALERT: High probability of synthetic voice cloning detected. Audio exhibited severe vocoder artifacts."
  }
  ```

## Running the Server

```bash
cd backend
./run_server.sh
```
Or directly with uvicorn:
```bash
./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
