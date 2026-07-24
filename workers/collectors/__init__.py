"""Mock platform collectors — shared interface for future real APIs."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone


class BaseCollector:
    platform: str = "base"

    def fetch_events(self, tenant_id: int, limit: int = 10) -> list[dict]:
        raise NotImplementedError


class MetaCollector(BaseCollector):
    platform = "Meta"

    def fetch_events(self, tenant_id: int, limit: int = 10) -> list[dict]:
        return [
            {
                "event_id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "platform": self.platform,
                "campaign_name": "Summer Sale",
                "country": "IN",
                "impressions": 34000,
                "clicks": 1043,
                "spend": 231.25,
                "currency": "USD",
                "conversions": 53,
                "revenue": 1890.0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            for _ in range(limit)
        ]


class GoogleAdsCollector(BaseCollector):
    platform = "Google Ads"

    def fetch_events(self, tenant_id: int, limit: int = 10) -> list[dict]:
        return MetaCollector().fetch_events(tenant_id, limit)


class TikTokCollector(BaseCollector):
    platform = "TikTok"

    def fetch_events(self, tenant_id: int, limit: int = 10) -> list[dict]:
        return MetaCollector().fetch_events(tenant_id, limit)


COLLECTORS = {
    "meta": MetaCollector,
    "google_ads": GoogleAdsCollector,
    "tiktok": TikTokCollector,
}
