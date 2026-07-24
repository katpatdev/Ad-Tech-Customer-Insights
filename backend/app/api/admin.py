from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models import AuditLog, Connector, FeatureFlag, Tenant, User
from app.schemas import AuditLogOut, ConnectorOut, FeatureFlagOut, FeatureFlagUpdate, TenantOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/tenants", response_model=list[TenantOut])
def list_tenants(
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return db.query(Tenant).order_by(Tenant.id).all()


@router.get("/feature-flags", response_model=list[FeatureFlagOut])
def list_flags(
    user: User = Depends(require_roles("admin", "agency_manager")),
    db: Session = Depends(get_db),
):
    return (
        db.query(FeatureFlag)
        .filter(FeatureFlag.tenant_id == user.tenant_id)
        .order_by(FeatureFlag.key)
        .all()
    )


@router.patch("/feature-flags/{key}", response_model=FeatureFlagOut)
def update_flag(
    key: str,
    body: FeatureFlagUpdate,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    flag = (
        db.query(FeatureFlag)
        .filter(FeatureFlag.tenant_id == user.tenant_id, FeatureFlag.key == key)
        .first()
    )
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    flag.enabled = body.enabled
    db.add(
        AuditLog(
            tenant_id=user.tenant_id,
            user_id=user.id,
            action="feature_flag_update",
            detail=f"{key}={body.enabled}",
        )
    )
    db.commit()
    db.refresh(flag)
    return flag


@router.get("/connectors", response_model=list[ConnectorOut])
def list_connectors(
    user: User = Depends(require_roles("admin", "agency_manager")),
    db: Session = Depends(get_db),
):
    return (
        db.query(Connector)
        .filter(Connector.tenant_id == user.tenant_id)
        .order_by(Connector.platform_code)
        .all()
    )


@router.get("/audit-logs", response_model=list[AuditLogOut])
def list_audit(
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
