# Workers

Python workers for:

1. DB bootstrap / seed (shared with backend)
2. Kafka produce of mock marketing events
3. Kafka consume + metric derivation (`processors/metrics.py`)

```bash
# via Docker (preferred)
docker compose -f docker/docker-compose.yml up worker

# local (requires Kafka + Postgres)
PYTHONPATH=backend:. python -m workers.main
```
