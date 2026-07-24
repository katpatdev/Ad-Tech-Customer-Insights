# Database Schema

## Core Tables

| Table | Purpose |
|-------|---------|
| `tenants` | Agency clients |
| `users` | Login identities (email, hashed password, role, tenant_id) |
| `platforms` | Google Ads, Meta, TikTok, etc. |
| `countries` | Asia markets (IN, JP, SG, …) |
| `campaigns` | Campaign master data |
| `creatives` | Ad creatives |
| `audiences` | Audience segments |
| `marketing_events` | Normalized event store |
| `campaign_daily_metrics` | Daily aggregates + derived KPIs |
| `insights` | Narrative / structured insights |
| `anomalies` | Detected anomalies |
| `forecasts` | Forecast rows |
| `recommendations` | Budget / content actions |
| `feature_flags` | Per-tenant AI module toggles |
| `audit_logs` | Auth and sensitive actions |
| `connectors` | Mock connector status |

All business tables include `tenant_id` (except global reference data where noted).

## Key Metrics Columns (`campaign_daily_metrics`)

`impressions`, `clicks`, `spend_usd`, `conversions`, `revenue_usd`, `sessions`, `bounce_rate`, `new_users`, `returning_users`, `orders`, `ctr`, `cpc`, `cpa`, `roas`, `cvr`, `cac`, `health_score`
