from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list["User"]] = relationship(back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False)  # admin|agency_manager|analyst|guest
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped["Tenant"] = relationship(back_populates="users")


class Platform(Base):
    __tablename__ = "platforms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)


class Audience(Base):
    __tablename__ = "audiences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    platform_id: Mapped[int] = mapped_column(ForeignKey("platforms.id"))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="active")
    budget_usd: Mapped[float] = mapped_column(Float, default=0.0)
    objective: Mapped[str] = mapped_column(String(80), default="conversions")


class Creative(Base):
    __tablename__ = "creatives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), index=True)
    headline: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class MarketingEvent(Base):
    __tablename__ = "marketing_events"
    __table_args__ = (UniqueConstraint("event_id", name="uq_marketing_event_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    platform_id: Mapped[Optional[int]] = mapped_column(ForeignKey("platforms.id"), nullable=True)
    campaign_id: Mapped[Optional[int]] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    country_code: Mapped[str] = mapped_column(String(8), index=True)
    device: Mapped[str] = mapped_column(String(40), default="mobile")
    age_group: Mapped[str] = mapped_column(String(40), default="25-34")
    gender: Mapped[str] = mapped_column(String(20), default="all")
    audience: Mapped[str] = mapped_column(String(80), default="general")
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    spend_usd: Mapped[float] = mapped_column(Float, default=0.0)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
    revenue_usd: Mapped[float] = mapped_column(Float, default=0.0)
    sessions: Mapped[int] = mapped_column(Integer, default=0)
    bounce_rate: Mapped[float] = mapped_column(Float, default=0.0)
    new_users: Mapped[int] = mapped_column(Integer, default=0)
    returning_users: Mapped[int] = mapped_column(Integer, default=0)
    orders: Mapped[int] = mapped_column(Integer, default=0)
    event_date: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CampaignDailyMetric(Base):
    __tablename__ = "campaign_daily_metrics"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "campaign_id",
            "country_code",
            "metric_date",
            name="uq_daily_metric",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), index=True)
    platform_id: Mapped[int] = mapped_column(ForeignKey("platforms.id"), index=True)
    country_code: Mapped[str] = mapped_column(String(8), index=True)
    metric_date: Mapped[date] = mapped_column(Date, index=True)
    impressions: Mapped[int] = mapped_column(Integer, default=0)
    clicks: Mapped[int] = mapped_column(Integer, default=0)
    spend_usd: Mapped[float] = mapped_column(Float, default=0.0)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
    revenue_usd: Mapped[float] = mapped_column(Float, default=0.0)
    sessions: Mapped[int] = mapped_column(Integer, default=0)
    bounce_rate: Mapped[float] = mapped_column(Float, default=0.0)
    new_users: Mapped[int] = mapped_column(Integer, default=0)
    returning_users: Mapped[int] = mapped_column(Integer, default=0)
    orders: Mapped[int] = mapped_column(Integer, default=0)
    ctr: Mapped[float] = mapped_column(Float, default=0.0)
    cpc: Mapped[float] = mapped_column(Float, default=0.0)
    cpa: Mapped[float] = mapped_column(Float, default=0.0)
    roas: Mapped[float] = mapped_column(Float, default=0.0)
    cvr: Mapped[float] = mapped_column(Float, default=0.0)
    cac: Mapped[float] = mapped_column(Float, default=0.0)
    health_score: Mapped[float] = mapped_column(Float, default=50.0)


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    category: Mapped[str] = mapped_column(String(60), default="general")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="info")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Anomaly(Base):
    __tablename__ = "anomalies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_key: Mapped[str] = mapped_column(String(120), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(60), nullable=False)
    change_pct: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Forecast(Base):
    __tablename__ = "forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_key: Mapped[str] = mapped_column(String(120), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(60), nullable=False)
    horizon: Mapped[str] = mapped_column(String(20), nullable=False)
    predicted_value: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    target: Mapped[str] = mapped_column(String(160), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FeatureFlag(Base):
    __tablename__ = "feature_flags"
    __table_args__ = (UniqueConstraint("tenant_id", "key", name="uq_flag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    key: Mapped[str] = mapped_column(String(80), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tenants.id"), nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    platform_code: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="connected")
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
