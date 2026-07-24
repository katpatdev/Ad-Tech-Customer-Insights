from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Anomaly, Campaign, Forecast, User
from app.schemas import CampaignDetail, CampaignOut, CountryOut, KPIResponse, PlatformOut
from app.services import analytics

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/kpis/executive", response_model=KPIResponse)
def executive_kpis(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    totals = analytics.tenant_totals(db, user.tenant_id)
    totals["executive_summary"] = analytics.executive_summary_text(db, user.tenant_id)
    return KPIResponse(**totals)


@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "guest":
        # guests allowed
        pass
    return [CampaignOut(**c) for c in analytics.campaign_rollups(db, user.tenant_id)]


@router.get("/campaigns/{campaign_id}", response_model=CampaignDetail)
def campaign_detail(
    campaign_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    camp = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id, Campaign.tenant_id == user.tenant_id)
        .first()
    )
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")
    rollups = {c["id"]: c for c in analytics.campaign_rollups(db, user.tenant_id)}
    base = rollups.get(campaign_id)
    if not base:
        raise HTTPException(status_code=404, detail="No metrics")
    series = analytics.campaign_series(db, user.tenant_id, campaign_id)
    forecasts = (
        db.query(Forecast)
        .filter(
            Forecast.tenant_id == user.tenant_id,
            Forecast.entity_key == f"campaign:{campaign_id}",
        )
        .all()
    )
    anomalies = (
        db.query(Anomaly)
        .filter(
            Anomaly.tenant_id == user.tenant_id,
            Anomaly.entity_key == f"campaign:{campaign_id}",
        )
        .all()
    )
    return CampaignDetail(
        **base,
        series=series,
        forecasts=[
            {
                "horizon": f.horizon,
                "metric_name": f.metric_name,
                "predicted_value": f.predicted_value,
            }
            for f in forecasts
        ],
        anomalies=[
            {"severity": a.severity, "metric_name": a.metric_name, "message": a.message}
            for a in anomalies
        ],
    )


@router.get("/countries", response_model=list[CountryOut])
def list_countries(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "guest":
        raise HTTPException(status_code=403, detail="Guests cannot access country dashboard")
    return [CountryOut(**c) for c in analytics.country_rollups(db, user.tenant_id)]


@router.get("/countries/{code}", response_model=CountryOut)
def country_detail(
    code: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if user.role == "guest":
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = analytics.country_rollups(db, user.tenant_id)
    match = next((c for c in rows if c["code"].upper() == code.upper()), None)
    if not match:
        raise HTTPException(status_code=404, detail="Country not found")
    return CountryOut(**match)


@router.get("/platforms", response_model=list[PlatformOut])
def list_platforms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "guest":
        raise HTTPException(status_code=403, detail="Forbidden")
    return [PlatformOut(**p) for p in analytics.platform_rollups(db, user.tenant_id)]
