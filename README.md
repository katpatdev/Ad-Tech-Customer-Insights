# AIMP — AI Marketing Intelligence Platform

**Tagline:** An AI-powered marketing intelligence platform that ingests campaign data from multiple channels, normalizes it into a unified analytics layer, detects anomalies, forecasts performance, and provides executive-level recommendations.

Built for marketing agencies managing campaigns across Asia. This MVP uses a **rule-based intelligence engine** (no API keys required) so you can run a full demo locally.

## Business Problem

Agencies pull metrics from Google Ads, Meta, TikTok, LinkedIn, Shopify, GA4, HubSpot, and more. Every platform uses different definitions. Managers spend hours stitching spreadsheets before decisions.

AIMP creates one intelligence layer: ingest → stream → normalize → analyze → recommend.

## Solution

- Multi-tenant agency platform with RBAC (Admin, Agency Manager, Analyst, Guest)
- Mock connectors for major marketing platforms
- Kafka event streaming + Python metric processing (Spark-compatible contracts)
- PostgreSQL warehouse + Redis KPI cache
- Rule-based anomaly detection, forecasts, budget recommendations, executive summaries, and chat
- React dashboards: Executive, Campaign, Country (Asia map), Platform, AI Insights, Chat

## Quick Start (Demo)

### Option A — Docker Compose (full stack)

```bash
cp .env.example .env
./docker/up.sh
# or: docker compose -f docker/docker-compose.yml up --build
```

Requires Docker Desktop with WSL integration enabled.

### Option B — Local API (SQLite, no Docker)

```bash
./scripts/dev_backend.sh
# API: http://localhost:8000/docs
```

In another terminal, run the frontend:

```bash
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173  
- API docs: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

### Demo accounts (password: `demo1234`)

| Email | Role | Tenant |
|-------|------|--------|
| admin@aimp.demo | Admin | Apex Agency |
| manager@aimp.demo | Agency Manager | Apex Agency |
| analyst@aimp.demo | Analyst | Apex Agency |
| guest@aimp.demo | Guest | Apex Agency |
| manager@nova.demo | Agency Manager | Nova Digital |

## Folder Structure

```
├── frontend/       React + TypeScript + MUI dashboards
├── backend/        FastAPI + JWT + rule AI
├── workers/        Collectors, Kafka consumers, metric jobs
├── spark/          Job contracts + stubs (maps to Spark)
├── kafka/          Topic contracts
├── mock-data/      Generators + sample CSV
├── docker/         Compose + Dockerfiles
├── docs/           Architecture, schema, API, AI pipeline
└── README.md
```

## Technology Stack

| Layer | Tech |
|-------|------|
| Frontend | React, TypeScript, MUI, Recharts, Leaflet, TanStack Table |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy, JWT |
| Data | PostgreSQL, Redis, Kafka |
| Processing | Python workers (Spark-style transforms) |
| AI (MVP) | Rule/template engine — no LLM keys |
| Ops | Docker Compose, health endpoints, audit log |

## Data Flow

1. Mock collectors emit platform events → Kafka (`marketing-events`, `campaign-events`, `conversion-events`)
2. Workers normalize (USD, UTC, dedupe) and aggregate CTR, CPA, ROAS, CAC, CVR
3. Aggregates land in PostgreSQL; hot KPIs cached in Redis
4. Rule intelligence writes insights, anomalies, forecasts, recommendations
5. FastAPI serves tenant-scoped APIs; React renders dashboards and chat

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data Flow](docs/DATA_FLOW.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [API Summary](docs/API.md)
- [AI Pipeline](docs/AI_PIPELINE.md)
- [RBAC & Tenancy](docs/RBAC.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

## Future Improvements

- Real Meta / Google Ads / TikTok / HubSpot / Shopify / GA4 connectors
- Swap rule engine for LangChain + LLM (same `IntelligenceEngine` interface)
- Full Scala Spark cluster for large-scale feature engineering
- Grafana dashboards on `/metrics`
- SSO, billing, and production Kubernetes

## License

See [LICENSE](LICENSE).
