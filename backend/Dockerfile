# Production Dockerfile for VoxGuard AI Backend Inference Engine
# Optimized for CPU inference with PyTorch and Faster-Whisper
FROM python:3.12-slim

# Set environment variables for Python runtime and defaults
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    MODEL_DEVICE=cpu \
    WHISPER_MODEL=tiny \
    PYTHONPATH="/app/app:$PYTHONPATH"

WORKDIR /app

# Install runtime system packages required by PyAV and sound processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Expose default HTTP port
EXPOSE 8000

# Public healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start production uvicorn process
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2"]
