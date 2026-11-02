from fastapi import APIRouter, Depends, Query, HTTPException, Header, Response, UploadFile, File
from sqlalchemy import text
from sqlalchemy.orm import Session
import logging
from datetime import date, datetime
from zoneinfo import ZoneInfo
from app.services.rfm import get_campaign
from app.core.security import require_internal_key, require_admin
from app.db.session import get_dashboard_db, source_engine
from app.services.analytics import get_dashboard_summary, get_donor_type_breakdown
from app.services.sync.rfm_sync import run_rfm_sync

router = APIRouter(prefix="/api", dependencies=[Depends(require_internal_key)])
logger = logging.getLogger(__name__)

@router.get("/dashboard/summary")
def dashboard_summary(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_dashboard_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date tidak boleh lebih besar dari end_date")
    return get_dashboard_summary(db, start_date=start_date, end_date=end_date)


@router.get("/transaksi")
# def get_transaksi():
#     with source_engine.connect() as conn:
#         transaksi = conn.execute(
#             text(
#                 f""""
#                     SELECT 
#                         t.id_transaksi, t.id_donor, t.transaksi AS nominal, 
#                 """"
#             )
#         )
    

@router.get("/analytics/donor-type")
def donor_type_breakdown(
    year: int | None = Query(default=None, ge=2000, le=2100),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date tidak boleh lebih besar dari end_date")
    return get_donor_type_breakdown(year, start_date=start_date, end_date=end_date)

@router.post("/admin/sync")
def manual_sync():
    return run_rfm_sync()


@router.get("/admin/sync-log")
def sync_log(db: Session = Depends(get_dashboard_db)):
    log = db.execute(
        text("""
            SELECT
                id,
                started_at,
                finished_at,
                status,
                donor_count,
                message
            FROM sync_run
            ORDER BY started_at DESC
            """)
        ).mappings().all()
    
    return {
        "logs": [dict(row) for row in log]
    }


@router.get("/auth/authorize")
def authorize_user(
    email: str,
    db: Session = Depends(get_dashboard_db),
):
    email = email.strip().lower()

    user = db.execute(
        text("""
            SELECT
                id,
                email,
                role,
                is_active
            FROM crm_users
            WHERE LOWER(email) = :email
            LIMIT 1
        """),
        {
            "email": email
        },
    ).mappings().first()

    if not user:
        return {
            "allowed": False,
            "role": None,
        }

    if not user["is_active"]:
        return {
            "allowed": False,
            "role": None,
        }

    return {
        "allowed": True,
        "role": user["role"],
        "email": user["email"],
    }

    