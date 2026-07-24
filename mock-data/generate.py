"""Standalone mock generator for offline use.

Primary seeding happens in backend `app.services.seed`.
This script documents how ~100k event-scale data is produced.
"""

from __future__ import annotations

import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

COUNTRIES = ["IN", "JP", "SG", "MY", "ID", "VN", "TH", "PH", "KR", "TW", "HK"]
PLATFORMS = ["Google Ads", "Meta", "TikTok", "LinkedIn", "Shopify", "HubSpot", "GA4"]


def generate(n: int = 1000) -> list[dict]:
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    events = []
    for i in range(n):
        events.append(
            {
                "event_id": str(uuid.uuid4()),
                "tenant_id": 1,
                "platform": rng.choice(PLATFORMS),
                "campaign": rng.choice(["Summer Sale", "Festive Glow", "Retarget Cart"]),
                "country": rng.choice(COUNTRIES),
                "device": rng.choice(["mobile", "desktop", "tablet"]),
                "age_group": rng.choice(["18-24", "25-34", "35-44", "45-54"]),
                "gender": rng.choice(["male", "female", "all"]),
                "impressions": rng.randint(1000, 80000),
                "clicks": rng.randint(20, 3000),
                "spend": round(rng.uniform(10, 800), 2),
                "conversions": rng.randint(0, 120),
                "revenue": round(rng.uniform(0, 5000), 2),
                "timestamp": (now - timedelta(hours=rng.randint(0, 24 * 30))).isoformat(),
            }
        )
    return events


if __name__ == "__main__":
    out = Path(__file__).with_name("sample_events.jsonl")
    with out.open("w", encoding="utf-8") as f:
        for e in generate(500):
            f.write(json.dumps(e) + "\n")
    print(f"Wrote {out}")
