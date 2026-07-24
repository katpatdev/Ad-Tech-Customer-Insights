# Architecture

## Overview

AIMP is a multi-tenant AI Marketing Intelligence Platform. The MVP demonstrates staff-level separation of concerns: connectors, streaming ingest, processing contracts, warehouse, rule intelligence, and role-scoped presentation.

## High-Level Diagram

```
External Marketing Sources (Mock)
  Google Ads | Meta | TikTok | LinkedIn | Shopify | HubSpot | GA4 | CSV
                              │
                    Data Collection Layer
                    Python collectors / CSV parser
                              │
                         Kafka Topics
              marketing-events | campaign-events | conversion-events
                              │
                    Stream / Batch Processing
              Normalize · Deduplicate · Currency · Metrics
                              │
                    Storage: PostgreSQL + Redis
                              │
                    Rule Intelligence Layer
         Anomaly · Forecast · Recommend · Executive · Chat
                              │
                      React Dashboard
```

## Design Principles

1. **Tenant isolation** — every business row carries `tenant_id`; APIs enforce scope.
2. **Connector interface** — mock sources implement a common collector contract for future real APIs.
3. **Event-driven core** — Kafka decouples producers from processors.
4. **Spark-compatible transforms** — workers implement the same metrics Spark jobs would; `spark/` documents the mapping.
5. **Pluggable intelligence** — `IntelligenceEngine` is rule-based today; LLM-backed tomorrow.
6. **Feature flags** — AI modules can be toggled per tenant.
7. **Observability hooks** — `/health`, structured logs, audit log table; Grafana-ready later.

## Service Boundaries

| Service | Responsibility |
|---------|----------------|
| `backend` | Auth, RBAC, REST APIs, on-demand AI regeneration |
| `worker` | Collect, consume Kafka, aggregate, run rule jobs |
| `frontend` | Dashboards and chat UI |
| `postgres` | System of record |
| `redis` | Hot KPI cache |
| `kafka` | Event bus |

## Extensibility

- Add a platform: implement collector → publish schema-valid events.
- Add a metric: extend processor + `campaign_daily_metrics` + API serializer.
- Add AI module: implement engine method + feature flag + UI card.
