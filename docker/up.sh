#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
docker compose -f docker/docker-compose.yml up --build "$@"
