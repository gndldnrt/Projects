#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  kill "$FRONTEND_PID" "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(
  cd "$ROOT_DIR/frontend"
  npm run dev -- --host 127.0.0.1
) &
FRONTEND_PID=$!

(
  cd "$ROOT_DIR"
  exec .venv/bin/uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!

echo "RECIPROC8 frontend: http://localhost:5173"
echo "RECIPROC8 backend:  http://localhost:8000/docs"
wait
