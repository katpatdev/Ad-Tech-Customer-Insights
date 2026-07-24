# Data Flow

## Ingestion

1. Seeded generator (or scheduled collector) produces realistic Asia-agency events.
2. Events are published to Kafka topics (see `kafka/TOPICS.md`).
3. CSV upload hits FastAPI → validated → published to Kafka.

## Processing

1. Consumer reads batches from Kafka.
2. Normalize: currency → USD, timestamps → UTC, stable `event_id` dedupe.
3. Aggregate daily facts: impressions, clicks, spend, conversions, revenue.
4. Derive CTR, CPC, CPA, ROAS, CAC, CVR, rolling averages.
5. Upsert into `campaign_daily_metrics`; refresh Redis KPI keys.

## Intelligence

1. Rule jobs scan recent metrics for anomalies and trends.
2. Forecasts use moving average / linear trend.
3. Budget heuristics emit recommendations.
4. Executive summary templates rank best/worst campaigns and top risks.
5. Artifacts persist to `insights`, `anomalies`, `forecasts`, `recommendations`.

## Serving

1. FastAPI reads warehouse (+ Redis for hot KPIs).
2. Tenant middleware scopes every query.
3. Frontend polls/loads dashboards; chat queries precomputed insights + metrics.
