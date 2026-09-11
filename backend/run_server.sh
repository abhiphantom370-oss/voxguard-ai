#!/usr/bin/env bash
# Start VoxGuard AI FastAPI Backend Inference Server (Phase 3)
set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "[VoxGuard] Creating Python virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

export PYTHONPATH="app:$PYTHONPATH"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
echo "[VoxGuard] Starting FastAPI backend on http://${HOST}:${PORT}..."
exec ./venv/bin/uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
