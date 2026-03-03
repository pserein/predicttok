#!/usr/bin/env bash
# Start the FastAPI app. Keep this terminal open; press Ctrl+C to stop.
cd "$(dirname "$0")"
source .venv/bin/activate
echo "Starting server at http://127.0.0.1:8000 ..."
echo "Open in browser or run: curl http://127.0.0.1:8000/health"
exec uvicorn web.main:app --reload --host 127.0.0.1 --port 8000
