"""Worker entrypoint: bootstrap DB metrics, demo Kafka produce/consume, keep alive."""

from __future__ import annotations

import json
import logging
import os
import time
import uuid
from datetime import date, datetime, timezone

from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import NoBrokersAvailable

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("aimp-worker")

# Ensure backend imports work
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.services.seed import bootstrap  # noqa: E402
from workers.processors.metrics import derive_metrics  # noqa: E402

TOPICS = ["marketing-events", "campaign-events", "conversion-events"]


def wait_and_bootstrap() -> None:
    settings = get_settings()
    for attempt in range(40):
        try:
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                bootstrap(db, event_count=settings.seed_event_count)
            finally:
                db.close()
            logger.info("Worker bootstrap complete")
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning("Bootstrap retry %s: %s", attempt, exc)
            time.sleep(3)
    raise RuntimeError("Worker bootstrap failed")


def make_producer(bootstrap: str) -> KafkaProducer | None:
    for attempt in range(30):
        try:
            producer = KafkaProducer(
                bootstrap_servers=bootstrap,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                api_version=(2, 5, 0),
            )
            logger.info("Kafka producer connected")
            return producer
        except NoBrokersAvailable:
            logger.warning("Kafka not ready (%s)", attempt)
            time.sleep(3)
    return None


def publish_demo_events(producer: KafkaProducer, count: int = 200) -> None:
    now = datetime.now(timezone.utc).isoformat()
    for i in range(count):
        event = {
            "event_id": str(uuid.uuid4()),
            "tenant_id": 1,
            "platform": ["Meta", "Google Ads", "TikTok"][i % 3],
            "campaign_id": (i % 10) + 1,
            "campaign_name": "Summer Sale",
            "country": ["IN", "JP", "SG", "MY"][i % 4],
            "device": "mobile",
            "age_group": "25-34",
            "gender": "all",
            "audience": "lookalike_purchase",
            "impressions": 1000 + i * 10,
            "clicks": 40 + i,
            "spend": round(20 + i * 0.5, 2),
            "currency": "USD",
            "conversions": 2 + (i % 5),
            "revenue": round(50 + i * 1.2, 2),
            "sessions": 50 + i,
            "bounce_rate": 0.4,
            "new_users": 30,
            "returning_users": 20,
            "orders": 2,
            "timestamp": now,
        }
        metrics = derive_metrics(event)
        event["derived"] = metrics
        topic = TOPICS[i % len(TOPICS)]
        producer.send(topic, event)
    producer.flush()
    logger.info("Published %s demo events across %s", count, TOPICS)


def consume_loop(bootstrap: str) -> None:
    consumer = KafkaConsumer(
        *TOPICS,
        bootstrap_servers=bootstrap,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        group_id="aimp-workers",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        consumer_timeout_ms=5000,
        api_version=(2, 5, 0),
    )
    processed = 0
    for msg in consumer:
        processed += 1
        if processed <= 5:
            logger.info("Consumed %s: campaign=%s country=%s", msg.topic, msg.value.get("campaign_name"), msg.value.get("country"))
    logger.info("Consume pass finished, processed=%s", processed)
    consumer.close()


def main() -> None:
    settings = get_settings()
    wait_and_bootstrap()
    producer = make_producer(settings.kafka_bootstrap_servers)
    if producer:
        publish_demo_events(producer, count=500)
        try:
            consume_loop(settings.kafka_bootstrap_servers)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Consume loop issue: %s", exc)
    else:
        logger.warning("Kafka unavailable — DB seed already provides demo metrics")

    logger.info("Worker idle (demo). Sleeping to keep container alive.")
    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()
