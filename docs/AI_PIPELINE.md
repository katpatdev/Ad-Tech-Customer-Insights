# AI Pipeline (Rule-Based MVP)

No API keys. All intelligence is deterministic and explainable.

## Interface

`IntelligenceEngine` defines:

- `detect_anomalies(metrics)`
- `detect_trends(metrics)`
- `forecast(metrics, horizons)`
- `recommend_budget(metrics)`
- `score_health(metrics)`
- `executive_summary(context)`
- `chat(question, context)`

Future: `LLMIntelligenceEngine` implementing the same interface.

## Rules (MVP)

| Module | Approach |
|--------|----------|
| Anomaly | % change vs prior window; severity low/medium/high |
| Trend | Consecutive-day direction on CTR, spend, ROAS |
| Forecast | SMA / linear trend for 1d, 7d, 30d |
| Budget | ROAS/CPA thresholds → increase / decrease / pause |
| Health | Weighted ROAS + CTR + CPA − anomaly penalty |
| Executive | Templates over ranked campaigns + top anomalies |
| Chat | Keyword intents → insights + metric lookups |

## Feature Flags

`ai.anomaly`, `ai.forecast`, `ai.recommendations`, `ai.executive_summary`, `ai.chat`
