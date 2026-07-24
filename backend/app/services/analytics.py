from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.cache import cache_get, cache_set
from app.models import Campaign, CampaignDailyMetric, Country, Insight, Platform


def _safe_div(n: float, d: float) -> float:
    return float(n) / float(d) if d else 0.0


def tenant_totals(db: Session, tenant_id: int) -> dict:
    cache_key = f"kpi:executive:{tenant_id}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    row = (
        db.query(
            func.coalesce(func.sum(CampaignDailyMetric.spend_usd), 0),
            func.coalesce(func.sum(CampaignDailyMetric.revenue_usd), 0),
            func.coalesce(func.sum(CampaignDailyMetric.conversions), 0),
            func.coalesce(func.sum(CampaignDailyMetric.clicks), 0),
            func.coalesce(func.sum(CampaignDailyMetric.impressions), 0),
        )
        .filter(CampaignDailyMetric.tenant_id == tenant_id)
        .one()
    )
    spend, revenue, conversions, clicks, impressions = [float(x) for x in row]
    result = {
        "revenue": round(revenue, 2),
        "spend": round(spend, 2),
        "ctr": round(_safe_div(clicks, impressions), 5),
        "conversions": int(conversions),
        "roas": round(_safe_div(revenue, spend), 4),
        "clicks": int(clicks),
        "impressions": int(impressions),
        "cpa": round(_safe_div(spend, conversions), 4),
    }
    cache_set(cache_key, result, ttl=90)
    return result


def executive_summary_text(db: Session, tenant_id: int) -> str | None:
    insight = (
        db.query(Insight)
        .filter(Insight.tenant_id == tenant_id, Insight.category == "executive")
        .order_by(Insight.created_at.desc())
        .first()
    )
    return insight.body if insight else None


def campaign_rollups(db: Session, tenant_id: int) -> list[dict]:
    platforms = {p.id: p for p in db.query(Platform).all()}
    campaigns = db.query(Campaign).filter(Campaign.tenant_id == tenant_id).all()
    out = []
    for c in campaigns:
        row = (
            db.query(
                func.coalesce(func.sum(CampaignDailyMetric.spend_usd), 0),
                func.coalesce(func.sum(CampaignDailyMetric.revenue_usd), 0),
                func.coalesce(func.sum(CampaignDailyMetric.conversions), 0),
                func.coalesce(func.sum(CampaignDailyMetric.clicks), 0),
                func.coalesce(func.sum(CampaignDailyMetric.impressions), 0),
                func.coalesce(func.avg(CampaignDailyMetric.health_score), 50),
            )
            .filter(
                CampaignDailyMetric.tenant_id == tenant_id,
                CampaignDailyMetric.campaign_id == c.id,
            )
            .one()
        )
        spend, revenue, conversions, clicks, impressions, health = [float(x) for x in row]
        plat = platforms.get(c.platform_id)
        out.append(
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "budget_usd": c.budget_usd,
                "platform": plat.name if plat else "Unknown",
                "spend": round(spend, 2),
                "revenue": round(revenue, 2),
                "conversions": int(conversions),
                "ctr": round(_safe_div(clicks, impressions), 5),
                "roas": round(_safe_div(revenue, spend), 4),
                "health_score": round(health, 1),
            }
        )
    return sorted(out, key=lambda x: x["spend"], reverse=True)


def country_rollups(db: Session, tenant_id: int) -> list[dict]:
    countries = {c.code: c for c in db.query(Country).all()}
    rows = (
        db.query(
            CampaignDailyMetric.country_code,
            func.sum(CampaignDailyMetric.spend_usd),
            func.sum(CampaignDailyMetric.revenue_usd),
            func.sum(CampaignDailyMetric.conversions),
            func.sum(CampaignDailyMetric.clicks),
            func.sum(CampaignDailyMetric.impressions),
        )
        .filter(CampaignDailyMetric.tenant_id == tenant_id)
        .group_by(CampaignDailyMetric.country_code)
        .all()
    )
    out = []
    for code, spend, revenue, conversions, clicks, impressions in rows:
        c = countries.get(code)
        if not c:
            continue
        spend_f, revenue_f = float(spend or 0), float(revenue or 0)
        clicks_f, impressions_f = float(clicks or 0), float(impressions or 0)
        out.append(
            {
                "code": code,
                "name": c.name,
                "lat": c.lat,
                "lng": c.lng,
                "spend": round(spend_f, 2),
                "revenue": round(revenue_f, 2),
                "conversions": int(conversions or 0),
                "roas": round(_safe_div(revenue_f, spend_f), 4),
                "ctr": round(_safe_div(clicks_f, impressions_f), 5),
            }
        )
    return sorted(out, key=lambda x: x["spend"], reverse=True)


def platform_rollups(db: Session, tenant_id: int) -> list[dict]:
    rows = (
        db.query(
            Platform.code,
            Platform.name,
            func.sum(CampaignDailyMetric.spend_usd),
            func.sum(CampaignDailyMetric.revenue_usd),
            func.sum(CampaignDailyMetric.conversions),
            func.sum(CampaignDailyMetric.clicks),
            func.sum(CampaignDailyMetric.impressions),
        )
        .join(CampaignDailyMetric, CampaignDailyMetric.platform_id == Platform.id)
        .filter(CampaignDailyMetric.tenant_id == tenant_id)
        .group_by(Platform.id)
        .all()
    )
    out = []
    for code, name, spend, revenue, conversions, clicks, impressions in rows:
        spend_f, revenue_f = float(spend or 0), float(revenue or 0)
        clicks_f, impressions_f = float(clicks or 0), float(impressions or 0)
        out.append(
            {
                "code": code,
                "name": name,
                "spend": round(spend_f, 2),
                "revenue": round(revenue_f, 2),
                "conversions": int(conversions or 0),
                "roas": round(_safe_div(revenue_f, spend_f), 4),
                "ctr": round(_safe_div(clicks_f, impressions_f), 5),
            }
        )
    return sorted(out, key=lambda x: x["spend"], reverse=True)


def campaign_series(db: Session, tenant_id: int, campaign_id: int) -> list[dict]:
    rows = (
        db.query(
            CampaignDailyMetric.metric_date,
            func.sum(CampaignDailyMetric.spend_usd),
            func.sum(CampaignDailyMetric.revenue_usd),
            func.sum(CampaignDailyMetric.conversions),
            func.sum(CampaignDailyMetric.clicks),
            func.sum(CampaignDailyMetric.impressions),
        )
        .filter(
            CampaignDailyMetric.tenant_id == tenant_id,
            CampaignDailyMetric.campaign_id == campaign_id,
        )
        .group_by(CampaignDailyMetric.metric_date)
        .order_by(CampaignDailyMetric.metric_date)
        .all()
    )
    series = []
    for d, spend, revenue, conversions, clicks, impressions in rows:
        spend_f, revenue_f = float(spend or 0), float(revenue or 0)
        clicks_f, impressions_f = float(clicks or 0), float(impressions or 0)
        series.append(
            {
                "date": d.isoformat(),
                "spend": round(spend_f, 2),
                "revenue": round(revenue_f, 2),
                "conversions": int(conversions or 0),
                "ctr": round(_safe_div(clicks_f, impressions_f), 5),
                "roas": round(_safe_div(revenue_f, spend_f), 4),
            }
        )
    return series
