from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import dashboard_engine, DashboardSessionLocal
from app.api.routes import router
from app.services.sync.rfm_sync import run_rfm_sync
from app.models.user import CrmUser
import app.models.donor  # noqa
from app.routers import wa_blast, users, rfm, donors, retention

from fastapi import Request
from fastapi.responses import JSONResponse
from app.services.sync.sync_common import SyncAlreadyRunning

settings = get_settings()
scheduler = BackgroundScheduler(timezone="Asia/Jakarta")


def _seed_bootstrap_admin() -> None:
    if not settings.bootstrap_admin_email:
        return
    db = DashboardSessionLocal()
    try:
        has_any_user = db.query(CrmUser).first() is not None
        if has_any_user:
            return
        email = settings.bootstrap_admin_email.strip().lower()
        db.add(CrmUser(email=email, role="admin", is_active=True, added_by="bootstrap"))
        db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=dashboard_engine)
    _seed_bootstrap_admin()
    scheduler.add_job(run_rfm_sync, "cron", hour=settings.rfm_cron_hour, minute=settings.rfm_cron_minute, id="rfm_sync", replace_existing=True)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="RFM CRM API", version="0.1.0", lifespan=lifespan)
@app.exception_handler(SyncAlreadyRunning)
async def sync_running_handler(request: Request, exc: SyncAlreadyRunning):
    return JSONResponse(
        status_code=409,
        content={
            "status": "rejected",
            "requested": exc.requested,
            "running": exc.running,
            "message": str(exc),
        },
    )
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
app.include_router(wa_blast.router)
app.include_router(users.router)
app.include_router(rfm.router)
app.include_router(donors.router)
app.include_router(retention.router)


@app.get("/health")
def health():
    return {"status": "ok"}
