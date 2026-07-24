# Deployment Guide

## Prerequisites

- Docker + Docker Compose
- ~4 GB RAM recommended for Kafka + Postgres + services

## Local without Docker

```bash
./scripts/dev_backend.sh
cd frontend && npm install && npm run dev
```

Uses SQLite for a zero-infra API demo. Redis/Kafka are optional for this path.

## Docker Compose (full stack)

```bash
cp .env.example .env
./docker/up.sh
```

First boot will:

1. Wait for Postgres/Kafka/Redis
2. Run schema create + seed
3. Generate mock events and aggregates
4. Run rule intelligence once
5. Start API and frontend

## Environment

See `.env.example`. Defaults require **no secrets**. JWT secret is a fixed demo value.

## CI Outline (future)

- Lint: `ruff` / `eslint`
- Test: `pytest` + frontend unit smoke
- Build: Docker images
- Optional: compose smoke (`/health`)

## Production Notes (out of scope for MVP)

- Managed Postgres/Kafka/Redis
- Real secrets via vault
- Horizontal workers
- TLS + SSO
