import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.ai.engine import IntelligenceEngine
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models import (
    Anomaly,
    AuditLog,
    FeatureFlag,
    Forecast,
    Insight,
    Recommendation,
    User,
)
from app.schemas import (
    AnomalyOut,
    ChatRequest,
    ChatResponse,
    ClashRequest,
    ClashResponse,
    ForecastOut,
    InsightOut,
    RecommendationOut,
    SimulationRequest,
    SimulationResponse,
)
from app.services import analytics
from app.services.seed import run_intelligence

router = APIRouter(prefix="/api", tags=["intelligence"])


def _flag_enabled(db: Session, tenant_id: int, key: str) -> bool:
    flag = (
        db.query(FeatureFlag)
        .filter(FeatureFlag.tenant_id == tenant_id, FeatureFlag.key == key)
        .first()
    )
    return flag.enabled if flag else True


@router.get("/insights", response_model=list[InsightOut])
def list_insights(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Insight)
        .filter(Insight.tenant_id == user.tenant_id)
        .order_by(Insight.created_at.desc())
        .limit(100)
        .all()
    )
    return rows


@router.get("/anomalies", response_model=list[AnomalyOut])
def list_anomalies(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not _flag_enabled(db, user.tenant_id, "ai.anomaly"):
        return []
    return (
        db.query(Anomaly)
        .filter(Anomaly.tenant_id == user.tenant_id)
        .order_by(Anomaly.created_at.desc())
        .limit(100)
        .all()
    )


@router.get("/forecasts", response_model=list[ForecastOut])
def list_forecasts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not _flag_enabled(db, user.tenant_id, "ai.forecast"):
        return []
    return (
        db.query(Forecast)
        .filter(Forecast.tenant_id == user.tenant_id)
        .order_by(Forecast.created_at.desc())
        .limit(100)
        .all()
    )


@router.get("/recommendations", response_model=list[RecommendationOut])
def list_recommendations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not _flag_enabled(db, user.tenant_id, "ai.recommendations"):
        return []
    return (
        db.query(Recommendation)
        .filter(Recommendation.tenant_id == user.tenant_id)
        .order_by(Recommendation.created_at.desc())
        .limit(100)
        .all()
    )


@router.post("/ai/chat", response_model=ChatResponse)
def ai_chat(
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "guest":
        raise HTTPException(status_code=403, detail="Guests cannot use chat")
    if not _flag_enabled(db, user.tenant_id, "ai.chat"):
        raise HTTPException(status_code=403, detail="Chat disabled by feature flag")

    anomalies = [
        {"entity_key": a.entity_key, "message": a.message, "severity": a.severity}
        for a in db.query(Anomaly).filter(Anomaly.tenant_id == user.tenant_id).limit(50)
    ]
    recommendations = [
        {"action": r.action, "target": r.target, "rationale": r.rationale}
        for r in db.query(Recommendation)
        .filter(Recommendation.tenant_id == user.tenant_id)
        .limit(50)
    ]
    context = {
        "anomalies": anomalies,
        "recommendations": recommendations,
        "countries": analytics.country_rollups(db, user.tenant_id),
        "platforms": analytics.platform_rollups(db, user.tenant_id),
        "campaigns": analytics.campaign_rollups(db, user.tenant_id),
        "kpis": analytics.tenant_totals(db, user.tenant_id),
    }
    answer, sources = IntelligenceEngine().chat(body.question, context)
    return ChatResponse(answer=answer, sources=sources)


@router.post("/ai/simulate", response_model=SimulationResponse)
def simulate_budget(
    body: SimulationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "guest":
        raise HTTPException(status_code=403, detail="Guests cannot run simulations")
    baseline = analytics.campaign_rollups(db, user.tenant_id)
    result = IntelligenceEngine().simulate_budget(baseline, body.multipliers)
    return SimulationResponse(**result)


@router.post("/ai/clash", response_model=ClashResponse)
def clash_campaigns(
    body: ClashRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.left_id == body.right_id:
        raise HTTPException(status_code=400, detail="Pick two different campaigns")
    rollups = {c["id"]: c for c in analytics.campaign_rollups(db, user.tenant_id)}
    left = rollups.get(body.left_id)
    right = rollups.get(body.right_id)
    if not left or not right:
        raise HTTPException(status_code=404, detail="Campaign not found")
    result = IntelligenceEngine().clash_campaigns(left, right)
    return ClashResponse(**result)


@router.post("/ai/regenerate")
def regenerate(
    user: User = Depends(require_roles("agency_manager", "admin", "analyst")),
    db: Session = Depends(get_db),
):
    run_intelligence(db, user.tenant_id)
    db.add(
        AuditLog(
            tenant_id=user.tenant_id,
            user_id=user.id,
            action="ai_regenerate",
            detail="Rule intelligence regenerated",
        )
    )
    db.commit()
    return {"status": "ok"}


@router.post("/ingest/csv")
async def ingest_csv(
    file: UploadFile = File(...),
    user: User = Depends(require_roles("agency_manager", "admin", "analyst")),
    db: Session = Depends(get_db),
):
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    db.add(
        AuditLog(
            tenant_id=user.tenant_id,
            user_id=user.id,
            action="csv_ingest",
            detail=f"Uploaded {file.filename} with {len(rows)} rows",
        )
    )
    db.commit()
    # MVP: acknowledge parse; worker/kafka path can extend full upsert
    return {
        "status": "accepted",
        "rows": len(rows),
        "columns": reader.fieldnames,
        "note": "CSV accepted for demo ingest pipeline",
    }
