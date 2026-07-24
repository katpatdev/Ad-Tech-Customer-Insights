# API Summary

Base URL: `http://localhost:8000`  
Interactive docs: `/docs` (OpenAPI)

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | JWT login |
| GET | `/api/auth/me` | Current user |

## Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/kpis/executive` | Executive KPIs + AI summary |
| GET | `/api/campaigns` | Campaign list |
| GET | `/api/campaigns/{id}` | Campaign detail + series |
| GET | `/api/countries` | Country rollups |
| GET | `/api/countries/{code}` | Country detail |
| GET | `/api/platforms` | Platform rollups |
| POST | `/api/ingest/csv` | CSV upload |

## Intelligence

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/insights` | Insights list |
| GET | `/api/anomalies` | Anomalies |
| GET | `/api/forecasts` | Forecasts |
| GET | `/api/recommendations` | Recommendations |
| POST | `/api/ai/chat` | Rule-based chat |
| POST | `/api/ai/regenerate` | Regenerate intelligence |

## Admin

| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/admin/tenants` | Admin |
| GET | `/api/admin/feature-flags` | Admin, Manager |
| PATCH | `/api/admin/feature-flags/{key}` | Admin |
| GET | `/api/admin/connectors` | Admin, Manager |
| GET | `/api/admin/audit-logs` | Admin |

## Health

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/health/ready` |
