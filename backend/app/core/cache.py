from __future__ import annotations

import json
import logging
from typing import Any

import redis

from app.core.config import get_settings

logger = logging.getLogger("aimp.cache")
settings = get_settings()

_client: redis.Redis | None = None


def get_redis() -> redis.Redis | None:
    global _client
    if _client is not None:
        return _client
    try:
        client = redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=1)
        client.ping()
        _client = client
        return _client
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis unavailable: %s", exc)
        return None


def cache_get(key: str) -> Any | None:
    client = get_redis()
    if not client:
        return None
    try:
        raw = client.get(key)
        return json.loads(raw) if raw else None
    except Exception:  # noqa: BLE001
        return None


def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    client = get_redis()
    if not client:
        return
    try:
        client.setex(key, ttl, json.dumps(value))
    except Exception:  # noqa: BLE001
        return
