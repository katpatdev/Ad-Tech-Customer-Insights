import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import admin, analytics, auth, intelligence
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.services.seed import bootstrap

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("aimp")

settings = get_settings()

app = FastAPI(
    title="AIMP — AI Marketing Intelligence Platform",
    description="Multi-tenant marketing intelligence MVP with rule-based AI (no API keys).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(intelligence.router)
app.include_router(admin.router)


@app.on_event("startup")
def on_startup() -> None:
    for attempt in range(30):
        try:
            Base.metadata.create_all(bind=engine)
            db = SessionLocal()
            try:
                bootstrap(db, event_count=min(settings.seed_event_count, 100000))
            finally:
                db.close()
            logger.info("Database ready and seeded")
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning("Startup wait %s: %s", attempt, exc)
            time.sleep(2)
    logger.error("Failed to initialize database")


@app.get("/health")
def health():
    return {"status": "ok", "service": "aimp-backend", "environment": settings.environment}


@app.get("/health/ready")
def ready():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "not_ready", "error": str(exc)}
