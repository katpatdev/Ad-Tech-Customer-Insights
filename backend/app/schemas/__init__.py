from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    tenant_id: int
    tenant_name: str

    class Config:
        from_attributes = True


class KPIResponse(BaseModel):
    revenue: float
    spend: float
    ctr: float
    conversions: int
    roas: float
    clicks: int
    impressions: int
    cpa: float
    executive_summary: Optional[str] = None


class CampaignOut(BaseModel):
    id: int
    name: str
    status: str
    budget_usd: float
    platform: str
    spend: float
    revenue: float
    conversions: int
    ctr: float
    roas: float
    health_score: float


class CampaignDetail(CampaignOut):
    series: list[dict]
    forecasts: list[dict]
    anomalies: list[dict]


class CountryOut(BaseModel):
    code: str
    name: str
    lat: float
    lng: float
    spend: float
    revenue: float
    conversions: int
    roas: float
    ctr: float


class PlatformOut(BaseModel):
    code: str
    name: str
    spend: float
    revenue: float
    conversions: int
    roas: float
    ctr: float


class InsightOut(BaseModel):
    id: int
    category: str
    title: str
    body: str
    severity: str
    created_at: datetime


class AnomalyOut(BaseModel):
    id: int
    entity_type: str
    entity_key: str
    metric_name: str
    change_pct: float
    severity: str
    message: str
    created_at: datetime


class ForecastOut(BaseModel):
    id: int
    entity_type: str
    entity_key: str
    metric_name: str
    horizon: str
    predicted_value: float
    created_at: datetime


class RecommendationOut(BaseModel):
    id: int
    action: str
    target: str
    rationale: str
    priority: str
    created_at: datetime


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=500)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []


class FeatureFlagOut(BaseModel):
    id: int
    key: str
    enabled: bool


class FeatureFlagUpdate(BaseModel):
    enabled: bool


class ConnectorOut(BaseModel):
    id: int
    platform_code: str
    status: str
    last_sync_at: Optional[datetime]


class TenantOut(BaseModel):
    id: int
    name: str
    slug: str


class AuditLogOut(BaseModel):
    id: int
    action: str
    detail: str
    tenant_id: Optional[int]
    user_id: Optional[int]
    created_at: datetime


class SeriesPoint(BaseModel):
    date: date
    spend: float
    revenue: float
    conversions: int
    ctr: float
    roas: float
