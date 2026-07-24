#!/usr/bin/env bash
# Local demo without Docker (SQLite, no Kafka). For full stack use docker/up.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r backend/requirements.txt

export DATABASE_URL="sqlite:///./aimp_demo.db"
export REDIS_URL="redis://localhost:6379/0"
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
export JWT_SECRET="aimp-demo-secret-change-in-prod"
export PYTHONPATH="$ROOT/backend:$ROOT"
export CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"

rm -f aimp_demo.db
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
