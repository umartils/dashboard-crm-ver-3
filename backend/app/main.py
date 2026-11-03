import fcntl
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import dashboard_engine, DashboardSessionLocal
from app.api.routes import router
from app.services.sync.rfm_sync import run_rfm_sync
from app.services.sync.sync_common import SyncAlreadyRunning
from app.models.user import CrmUser
import app.models.donor  # noqa
from app.routers import wa_blast, users, rfm, donors, retention

settings = get_settings()
scheduler = BackgroundScheduler(timezone="Asia/Jakarta")
log = logging.getLogger(__name__)
_leader_lock_file = None


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


def _acquire_leadership() -> bool:
    """True hanya untuk satu worker per container."""
    global _leader_lock_file
    f = open("/tmp/rfm_leader.lock", "w")
    try:
        fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        f.close()
        return False
    _leader_lock_file = f  # simpan referensi agar lock tidak terlepas
    return True


def _scheduled_rfm_sync():
    try:
        run_rfm_sync()
    except SyncAlreadyRunning as exc:
        log.warning("Jadwal RFM dilewati: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    is_leader = _acquire_leadership()
    if is_leader:
        Base.metadata.create_all(bind=dashboard_engine)
        _seed_bootstrap_admin()
        scheduler.add_job(
            _scheduled_rfm_sync,
            "cron",
            hour=settings.rfm_cron_hour,
            minute=settings.rfm_cron_minute,
            id="rfm_sync",
            replace_existing=True,
        )
        scheduler.start()
    yield
    if is_leader:
        scheduler.shutdown(wait=False)


app = FastAPI(title="RFM CRM API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


app.include_router(router)
app.include_router(wa_blast.router)
app.include_router(users.router)
app.include_router(rfm.router)
app.include_router(donors.router)
app.include_router(retention.router)


@app.get("/health")
def health():
    return {"status": "ok"}