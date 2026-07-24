# Spark Layer (Contracts)

This MVP runs equivalent transforms in Python workers (`workers/processors/`).

## Job Contracts

| Job | Input | Output |
|-----|-------|--------|
| `CleanAndNormalize` | Raw Kafka JSON | Deduped USD/UTC events |
| `DailyCampaignAggregate` | Normalized events | Daily fact rows |
| `FeatureEngineering` | Daily facts | CTR, CPC, CPA, ROAS, CAC, CVR, rolling avgs |
| `CountryAggregate` | Daily facts | Country rollups (API-side or materialized) |

## Why stubs here?

Interview narrative: the same contracts can be reimplemented as Scala Spark Structured Streaming jobs reading the same Kafka topics and writing the same Postgres tables — without changing the API or UI.

See `spark/jobs_stub.md` for pseudo-Scala outlines.
