#!/usr/bin/env bash
set -e

# Activate venv if exists
if [ -d "/home/user/venv" ]; then
    source /home/user/venv/bin/activate
fi

export PYTHONPATH=.
echo "Starting Futures AI Application on port 8000..."
exec python3 -m uvicorn server.app:app --host 0.0.0.0 --port 8000
