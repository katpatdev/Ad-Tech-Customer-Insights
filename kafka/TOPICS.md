# Kafka Topics

## MVP Topics

### `marketing-events`

Daily-ish performance snapshots from ad platforms.

```json
{
  "event_id": "uuid",
  "tenant_id": 1,
  "platform": "Meta",
  "campaign_id": 10,
  "campaign_name": "Summer Sale",
  "country": "IN",
  "device": "mobile",
  "age_group": "25-34",
  "gender": "female",
  "audience": "lookalike_purchase",
  "impressions": 34000,
  "clicks": 1043,
  "spend": 231.25,
  "currency": "USD",
  "conversions": 53,
  "revenue": 1890.0,
  "sessions": 1200,
  "bounce_rate": 0.42,
  "new_users": 800,
  "returning_users": 400,
  "orders": 48,
  "timestamp": "2026-07-20T08:00:00Z"
}
```

### `campaign-events`

Campaign lifecycle / budget change signals (MVP: included in stream for completeness).

### `conversion-events`

Order/conversion level events derived from marketing outcomes.

## Future Topics

`customer-events`, `sales-events` — documented for architecture completeness; not required for MVP dashboards.
