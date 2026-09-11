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
echo "[VoxGuard] Starting FastAPI backend on http://127.0.0.1:8000..."
exec ./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
