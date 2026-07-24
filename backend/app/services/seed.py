"""Seed reference data, demo users, campaigns, metrics, and run rule AI."""

from __future__ import annotations

import random
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.ai.engine import IntelligenceEngine, MetricRow, group_rows
from app.core.security import hash_password
from app.models import (
    Anomaly,
    Audience,
    Campaign,
    CampaignDailyMetric,
    Connector,
    Country,
    Creative,
    FeatureFlag,
    Forecast,
    Insight,
    Platform,
    Recommendation,
    Tenant,
    User,
)

ASIA_COUNTRIES = [
    ("IN", "India", 20.59, 78.96),
    ("JP", "Japan", 36.20, 138.25),
    ("SG", "Singapore", 1.35, 103.82),
    ("MY", "Malaysia", 4.21, 101.98),
    ("ID", "Indonesia", -0.79, 113.92),
    ("VN", "Vietnam", 14.06, 108.28),
    ("TH", "Thailand", 15.87, 100.99),
    ("PH", "Philippines", 12.88, 121.77),
    ("KR", "South Korea", 35.91, 127.77),
    ("TW", "Taiwan", 23.70, 120.96),
    ("HK", "Hong Kong", 22.32, 114.17),
]

PLATFORMS = [
    ("Google Ads", "google_ads"),
    ("Meta", "meta"),
    ("TikTok", "tiktok"),
    ("LinkedIn", "linkedin"),
    ("Shopify", "shopify"),
    ("HubSpot", "hubspot"),
    ("GA4", "ga4"),
]

CAMPAIGN_NAMES = [
    "Summer Sale",
    "Festive Glow",
    "Mobile First Asia",
    "Retarget Cart",
    "Brand Lift Q3",
    "Lookalike Buyers",
    "App Install Push",
    "Video Awareness",
    "Lead Gen B2B",
    "Flash Weekend",
]

FLAG_KEYS = [
    "ai.anomaly",
    "ai.forecast",
    "ai.recommendations",
    "ai.executive_summary",
    "ai.chat",
]


def _safe_div(n: float, d: float) -> float:
    return float(n) / float(d) if d else 0.0


def seed_reference(db: Session) -> None:
    if db.query(Platform).count() == 0:
        for name, code in PLATFORMS:
            db.add(Platform(name=name, code=code))
    if db.query(Country).count() == 0:
        for code, name, lat, lng in ASIA_COUNTRIES:
            db.add(Country(code=code, name=name, lat=lat, lng=lng))
    db.commit()


def seed_tenants_and_users(db: Session) -> list[Tenant]:
    tenants = db.query(Tenant).all()
    if tenants:
        return tenants

    apex = Tenant(name="Apex Agency", slug="apex")
    nova = Tenant(name="Nova Digital", slug="nova")
    db.add_all([apex, nova])
    db.flush()

    users = [
        ("admin@aimp.demo", "AIMP Admin", "admin", apex.id),
        ("manager@aimp.demo", "Apex Manager", "agency_manager", apex.id),
        ("analyst@aimp.demo", "Apex Analyst", "analyst", apex.id),
        ("guest@aimp.demo", "Apex Guest", "guest", apex.id),
        ("manager@nova.demo", "Nova Manager", "agency_manager", nova.id),
        ("analyst@nova.demo", "Nova Analyst", "analyst", nova.id),
    ]
    pwd = hash_password("demo1234")
    for email, name, role, tid in users:
        db.add(
            User(
                email=email,
                full_name=name,
                hashed_password=pwd,
                role=role,
                tenant_id=tid,
            )
        )

    for tenant in (apex, nova):
        for key in FLAG_KEYS:
            db.add(FeatureFlag(tenant_id=tenant.id, key=key, enabled=True))
        for _, code in PLATFORMS:
            db.add(
                Connector(
                    tenant_id=tenant.id,
                    platform_code=code,
                    status="connected",
                    last_sync_at=datetime.now(timezone.utc),
                )
            )
        for aud in ("lookalike_purchase", "interest_beauty", "retargeting", "broad"):
            db.add(Audience(tenant_id=tenant.id, name=aud))

    db.commit()
    return [apex, nova]


def seed_campaigns(db: Session, tenants: list[Tenant]) -> None:
    if db.query(Campaign).count() > 0:
        return
    platforms = {p.code: p for p in db.query(Platform).all()}
    for tenant in tenants:
        rng = random.Random(tenant.id * 97)
        for i, name in enumerate(CAMPAIGN_NAMES):
            platform = list(platforms.values())[i % len(platforms)]
            camp = Campaign(
                tenant_id=tenant.id,
                platform_id=platform.id,
                name=f"{name}" if tenant.slug == "apex" else f"Nova {name}",
                status="active",
                budget_usd=rng.uniform(2000, 25000),
                objective="conversions",
            )
            db.add(camp)
            db.flush()
            db.add(
                Creative(
                    tenant_id=tenant.id,
                    campaign_id=camp.id,
                    headline=f"{camp.name} — Limited Offer",
                    description="Shop trending products across Asia with free shipping.",
                )
            )
    db.commit()


def generate_daily_metrics(db: Session, event_target: int = 100000) -> None:
    """Generate synthetic daily metrics (~event_target event-equivalent volume) with story anomalies."""
    if db.query(CampaignDailyMetric).count() > 0:
        return

    tenants = db.query(Tenant).all()
    countries = [c.code for c in db.query(Country).all()]
    today = date.today()
    days = 30
    engine = IntelligenceEngine()
    rows_written = 0
    batch: list[CampaignDailyMetric] = []

    for tenant in tenants:
        campaigns = db.query(Campaign).filter(Campaign.tenant_id == tenant.id).all()
        rng = random.Random(tenant.id * 1009)
        for camp in campaigns:
            for day_offset in range(days):
                metric_date = today - timedelta(days=days - day_offset)
                for country in countries:
                    if rng.random() < 0.3:
                        continue

                    base_impr = rng.randint(5000, 80000)
                    base_ctr = rng.uniform(0.008, 0.045)
                    base_cpc = rng.uniform(0.15, 2.5)
                    base_cvr = rng.uniform(0.01, 0.08)
                    aov = rng.uniform(25, 120)

                    if day_offset >= days - 5:
                        if country == "SG":
                            base_cpc *= 1.35
                            base_cvr *= 0.72
                            base_impr = int(base_impr * 1.25)
                        if country == "JP":
                            base_cpc *= 2.0
                            base_cvr *= 0.85
                        if country == "IN":
                            base_ctr *= 1.08 * (1.0 + 0.03 * (day_offset - (days - 5)))

                    impressions = base_impr
                    clicks = max(1, int(impressions * base_ctr))
                    spend = clicks * base_cpc
                    conversions = max(0, int(clicks * base_cvr))
                    revenue = conversions * aov
                    sessions = int(clicks * rng.uniform(0.9, 1.3))
                    bounce = rng.uniform(0.3, 0.65)
                    new_users = int(sessions * rng.uniform(0.5, 0.8))
                    returning = max(0, sessions - new_users)
                    orders = max(0, conversions - rng.randint(0, 3))

                    ctr = _safe_div(clicks, impressions)
                    cpc = _safe_div(spend, clicks)
                    cpa = _safe_div(spend, conversions)
                    roas = _safe_div(revenue, spend)
                    cvr = _safe_div(conversions, clicks)

                    batch.append(
                        CampaignDailyMetric(
                            tenant_id=tenant.id,
                            campaign_id=camp.id,
                            platform_id=camp.platform_id,
                            country_code=country,
                            metric_date=metric_date,
                            impressions=impressions,
                            clicks=clicks,
                            spend_usd=round(spend, 2),
                            conversions=conversions,
                            revenue_usd=round(revenue, 2),
                            sessions=sessions,
                            bounce_rate=round(bounce, 3),
                            new_users=new_users,
                            returning_users=returning,
                            orders=orders,
                            ctr=round(ctr, 5),
                            cpc=round(cpc, 4),
                            cpa=round(cpa, 4),
                            roas=round(roas, 4),
                            cvr=round(cvr, 5),
                            cac=round(cpa, 4),
                            health_score=engine.score_health(roas, ctr, cpa, 0),
                        )
                    )
                    rows_written += 1
                    if len(batch) >= 500:
                        db.bulk_save_objects(batch)
                        db.commit()
                        batch = []

    if batch:
        db.bulk_save_objects(batch)
        db.commit()

    # Guaranteed story coverage for Apex SG/JP/IN
    apex = db.query(Tenant).filter(Tenant.slug == "apex").first()
    if apex:
        camps = db.query(Campaign).filter(Campaign.tenant_id == apex.id).limit(3).all()
        story_batch: list[CampaignDailyMetric] = []
        for camp in camps:
            for day_offset in range(days):
                metric_date = today - timedelta(days=days - day_offset)
                for country, mult in (("SG", 1.4), ("JP", 2.1), ("IN", 1.0)):
                    exists = (
                        db.query(CampaignDailyMetric)
                        .filter_by(
                            tenant_id=apex.id,
                            campaign_id=camp.id,
                            country_code=country,
                            metric_date=metric_date,
                        )
                        .first()
                    )
                    if exists:
                        continue
                    impr = 20000 + day_offset * 500
                    ctr = 0.02 + (0.002 * max(0, day_offset - 25) if country == "IN" else 0)
                    cpc = 0.8 * mult
                    if day_offset >= 25 and country == "SG":
                        cpc *= 1.3
                        ctr *= 0.9
                    clicks = max(1, int(impr * ctr))
                    spend = clicks * cpc
                    cvr = 0.04 / (1.2 if country != "IN" else 1.0)
                    if day_offset >= 25 and country == "SG":
                        cvr *= 0.7
                    conv = max(0, int(clicks * cvr))
                    rev = conv * 55
                    story_batch.append(
                        CampaignDailyMetric(
                            tenant_id=apex.id,
                            campaign_id=camp.id,
                            platform_id=camp.platform_id,
                            country_code=country,
                            metric_date=metric_date,
                            impressions=impr,
                            clicks=clicks,
                            spend_usd=round(spend, 2),
                            conversions=conv,
                            revenue_usd=round(rev, 2),
                            sessions=clicks,
                            bounce_rate=0.45,
                            new_users=int(clicks * 0.6),
                            returning_users=int(clicks * 0.4),
                            orders=conv,
                            ctr=round(_safe_div(clicks, impr), 5),
                            cpc=round(_safe_div(spend, clicks), 4),
                            cpa=round(_safe_div(spend, conv), 4),
                            roas=round(_safe_div(rev, spend), 4),
                            cvr=round(_safe_div(conv, clicks), 5),
                            cac=round(_safe_div(spend, conv), 4),
                            health_score=50,
                        )
                    )
        if story_batch:
            db.bulk_save_objects(story_batch)
            db.commit()

    # event_target is narrative scale: each daily row ≈ many raw events
    _ = event_target
    _ = rows_written


def run_intelligence(db: Session, tenant_id: int) -> None:
    engine = IntelligenceEngine()
    # Clear previous AI artifacts for tenant
    db.query(Anomaly).filter(Anomaly.tenant_id == tenant_id).delete()
    db.query(Forecast).filter(Forecast.tenant_id == tenant_id).delete()
    db.query(Recommendation).filter(Recommendation.tenant_id == tenant_id).delete()
    db.query(Insight).filter(Insight.tenant_id == tenant_id).delete()
    db.flush()

    metrics = (
        db.query(CampaignDailyMetric)
        .filter(CampaignDailyMetric.tenant_id == tenant_id)
        .order_by(CampaignDailyMetric.metric_date)
        .all()
    )
    campaigns = {c.id: c for c in db.query(Campaign).filter(Campaign.tenant_id == tenant_id).all()}
    countries = {c.code: c.name for c in db.query(Country).all()}

    # Country series
    country_rows: list[MetricRow] = []
    by_country_date: dict[tuple[str, date], dict] = defaultdict(
        lambda: {"spend": 0, "revenue": 0, "conversions": 0, "clicks": 0, "impressions": 0}
    )
    for m in metrics:
        k = (m.country_code, m.metric_date)
        by_country_date[k]["spend"] += m.spend_usd
        by_country_date[k]["revenue"] += m.revenue_usd
        by_country_date[k]["conversions"] += m.conversions
        by_country_date[k]["clicks"] += m.clicks
        by_country_date[k]["impressions"] += m.impressions

    for (code, d), agg in by_country_date.items():
        country_rows.append(
            MetricRow(
                key=f"country:{code}",
                metric_date=d,
                spend=agg["spend"],
                revenue=agg["revenue"],
                conversions=agg["conversions"],
                clicks=agg["clicks"],
                impressions=agg["impressions"],
                ctr=_safe_div(agg["clicks"], agg["impressions"]),
                roas=_safe_div(agg["revenue"], agg["spend"]),
                cpa=_safe_div(agg["spend"], agg["conversions"]),
                label=countries.get(code, code),
            )
        )

    # Campaign series
    camp_rows: list[MetricRow] = []
    by_camp_date: dict[tuple[int, date], dict] = defaultdict(
        lambda: {"spend": 0, "revenue": 0, "conversions": 0, "clicks": 0, "impressions": 0}
    )
    for m in metrics:
        k = (m.campaign_id, m.metric_date)
        by_camp_date[k]["spend"] += m.spend_usd
        by_camp_date[k]["revenue"] += m.revenue_usd
        by_camp_date[k]["conversions"] += m.conversions
        by_camp_date[k]["clicks"] += m.clicks
        by_camp_date[k]["impressions"] += m.impressions

    for (cid, d), agg in by_camp_date.items():
        name = campaigns[cid].name if cid in campaigns else str(cid)
        camp_rows.append(
            MetricRow(
                key=f"campaign:{cid}",
                metric_date=d,
                spend=agg["spend"],
                revenue=agg["revenue"],
                conversions=agg["conversions"],
                clicks=agg["clicks"],
                impressions=agg["impressions"],
                ctr=_safe_div(agg["clicks"], agg["impressions"]),
                roas=_safe_div(agg["revenue"], agg["spend"]),
                cpa=_safe_div(agg["spend"], agg["conversions"]),
                label=name,
            )
        )

    anomalies = engine.detect_anomalies(group_rows(country_rows + camp_rows))
    for a in anomalies:
        db.add(Anomaly(tenant_id=tenant_id, **a))

    trends = engine.detect_trends(group_rows(country_rows))
    for t in trends:
        db.add(Insight(tenant_id=tenant_id, **t))

    # Forecasts per campaign
    for key, rows in group_rows(camp_rows).items():
        for f in engine.forecast(rows):
            db.add(
                Forecast(
                    tenant_id=tenant_id,
                    entity_type="campaign",
                    entity_key=key,
                    metric_name=f["metric_name"],
                    horizon=f["horizon"],
                    predicted_value=f["predicted_value"],
                )
            )

    # Campaign aggregates for recommendations + health
    camp_aggs = []
    for cid, camp in campaigns.items():
        ms = [m for m in metrics if m.campaign_id == cid]
        if not ms:
            continue
        spend = sum(m.spend_usd for m in ms)
        revenue = sum(m.revenue_usd for m in ms)
        conversions = sum(m.conversions for m in ms)
        clicks = sum(m.clicks for m in ms)
        impressions = sum(m.impressions for m in ms)
        roas = _safe_div(revenue, spend)
        ctr = _safe_div(clicks, impressions)
        cpa = _safe_div(spend, conversions)
        anom_count = sum(1 for a in anomalies if a["entity_key"] == f"campaign:{cid}")
        health = engine.score_health(roas, ctr, cpa, anom_count)
        # update latest day health
        latest = max(ms, key=lambda m: m.metric_date)
        latest.health_score = health
        camp_aggs.append(
            {
                "name": camp.name,
                "roas": roas,
                "cpa": cpa,
                "spend": spend,
                "revenue": revenue,
                "conversions": conversions,
                "ctr": ctr,
                "health_score": health,
            }
        )

    recs = engine.recommend_budget(camp_aggs)
    for r in recs:
        db.add(Recommendation(tenant_id=tenant_id, **r))

    # Also country-level TikTok-style rec from high ROAS countries
    country_aggs = []
    for code, name in countries.items():
        ms = [m for m in metrics if m.country_code == code]
        if not ms:
            continue
        spend = sum(m.spend_usd for m in ms)
        revenue = sum(m.revenue_usd for m in ms)
        country_aggs.append(
            {
                "name": f"{name} portfolio",
                "roas": _safe_div(revenue, spend),
                "cpa": _safe_div(spend, sum(m.conversions for m in ms)),
                "spend": spend,
            }
        )
    for r in engine.recommend_budget(country_aggs)[:5]:
        db.add(Recommendation(tenant_id=tenant_id, **r))

    best = max(camp_aggs, key=lambda x: x["roas"]) if camp_aggs else None
    worst = min(camp_aggs, key=lambda x: x["roas"]) if camp_aggs else None
    total_spend = sum(m.spend_usd for m in metrics)
    total_rev = sum(m.revenue_usd for m in metrics)
    total_conv = sum(m.conversions for m in metrics)
    summary = engine.executive_summary(
        {
            "spend": total_spend,
            "revenue": total_rev,
            "roas": _safe_div(total_rev, total_spend),
            "conversions": total_conv,
        },
        best,
        worst,
        anomalies,
        recs,
    )
    db.add(
        Insight(
            tenant_id=tenant_id,
            category="executive",
            title="Morning Executive Summary",
            body=summary,
            severity="info",
        )
    )

    # Seed a few explicit story insights
    db.add(
        Insight(
            tenant_id=tenant_id,
            category="risk",
            title="Singapore efficiency risk",
            body="Campaign spend increased in Singapore while conversions softened — review CPA and creative fatigue.",
            severity="warning",
        )
    )
    db.add(
        Insight(
            tenant_id=tenant_id,
            category="opportunity",
            title="India CTR momentum",
            body="CTR in India has increased steadily over recent days — consider scaling winning audiences.",
            severity="info",
        )
    )
    db.add(
        Insight(
            tenant_id=tenant_id,
            category="risk",
            title="Japan CPC pressure",
            body="Japan campaigns show elevated CPC — underperformance likely tied to auction competition.",
            severity="high",
        )
    )
    db.commit()


def bootstrap(db: Session, event_count: int = 100000) -> None:
    seed_reference(db)
    tenants = seed_tenants_and_users(db)
    seed_campaigns(db, tenants)
    generate_daily_metrics(db, event_target=event_count)
    for t in tenants:
        # only run if no executive insight yet
        exists = (
            db.query(Insight)
            .filter(Insight.tenant_id == t.id, Insight.category == "executive")
            .first()
        )
        if not exists:
            run_intelligence(db, t.id)
