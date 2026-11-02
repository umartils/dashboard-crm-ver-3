"""
Router halaman Donatur Retention (letakkan di folder routes yang sama dengan router RFM).
Membaca tabel hasil sync: retention_monthly dan retention_cohort.
"""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.donor import SyncRun

from app.db.session import get_dashboard_db  # sesuaikan jika path import berbeda
from app.services.sync.retention_sync import run_retention_sync

from datetime import date

router = APIRouter(prefix="/api/retention", tags=["retention"])


def _first_of_month(d: date | None) -> date | None:
    
    return d.replace(day=1) if d else None

def _default_month_start() -> date:
    """Default: 1 Januari tahun berjalan."""
    today = date.today()
    return date(today.year, 1, 1)


def _summarize(rows: list[dict]) -> dict | None:
    """KPI hanya dari bulan final (is_final = True); bulan berjalan tidak dihitung."""
    final = [r for r in rows if r["is_final"] and r["retensi_pct"] is not None]
    if not final:
        return None

    latest = final[-1]
    prev = final[-2] if len(final) > 1 else None
    pcts = [r["retensi_pct"] for r in final]
    highest = max(final, key=lambda r: r["retensi_pct"])
    lowest = min(final, key=lambda r: r["retensi_pct"])

    return {
        "latest_month": latest["bulan_retensi"],
        "latest_pct": latest["retensi_pct"],
        "delta_vs_prev": round(latest["retensi_pct"] - prev["retensi_pct"], 2) if prev else None,
        "average_pct": round(sum(pcts) / len(pcts), 2),
        "highest": {"month": highest["bulan_retensi"], "pct": highest["retensi_pct"]},
        "lowest": {"month": lowest["bulan_retensi"], "pct": lowest["retensi_pct"]},
        "latest_prev_donors": latest["donatur_bulan_sebelumnya"],
        "latest_churn": latest["churn"],
    }
 

@router.get("/monthly")
def retention_monthly(
    month_start: date = Query(default=_default_month_start()),
    month_end: date | None = Query(default=None),
    db: Session = Depends(get_dashboard_db),
):
    """Retensi per bulan + KPI ringkasan. Tanggal apa pun dinormalkan ke awal bulan."""
    conditions, params = ["1=1"], {}
    if month_start:
        conditions.append("bulan_retensi >= :month_start")
        params["month_start"] = _first_of_month(month_start)
    if month_end:
        conditions.append("bulan_retensi <= :month_end")
        params["month_end"] = _first_of_month(month_end)

    rows = db.execute(
        text(
            f"""
            SELECT bulan_retensi, donatur_bulan_sebelumnya, kembali, churn,
                   retensi_pct, is_final
            FROM retention_monthly
            WHERE {' AND '.join(conditions)}
            ORDER BY bulan_retensi ASC
            """
        ),
        params,
    ).mappings().all()

    data = []
    for r in rows:
        d = dict(r)
        d["retensi_pct"] = float(d["retensi_pct"]) if d["retensi_pct"] is not None else None
        d["is_final"] = bool(d["is_final"])
        data.append(d)

    last_updated = db.execute(text("SELECT MAX(updated_at) FROM retention_monthly")).scalar()

    return {
        "data": data,
        "summary": _summarize(data),
        "last_updated": last_updated,
    }

@router.get("/cohort")
def retention_cohort(
    cohort_start: date = Query(default=_default_month_start()),
    cohort_end: date | None = Query(default=None),
    max_offset: int = Query(6, ge=1, le=36),
    db: Session = Depends(get_dashboard_db),
):
    """
    Cohort heatmap, sudah di-pivot: satu item per kohort, `cells` berisi
    bulan ke-0 sampai max_offset yang datanya ada.
    """
    conditions, params = ["month_offset <= :max_offset"], {"max_offset": max_offset}
    if cohort_start:
        conditions.append("cohort_month >= :cohort_start")
        params["cohort_start"] = _first_of_month(cohort_start)
    if cohort_end:
        conditions.append("cohort_month <= :cohort_end")
        params["cohort_end"] = _first_of_month(cohort_end)

    rows = db.execute(
        text(
            f"""
            SELECT cohort_month, month_offset, cohort_size, active_donors,
                   retention_pct, is_final
            FROM retention_cohort
            WHERE {' AND '.join(conditions)}
            ORDER BY cohort_month ASC, month_offset ASC
            """
        ),
        params,
    ).mappings().all()

    cohorts: dict = {}
    for r in rows:
        item = cohorts.setdefault(
            r["cohort_month"],
            {"cohort_month": r["cohort_month"], "cohort_size": r["cohort_size"], "cells": []},
        )
        item["cells"].append(
            {
                "offset": r["month_offset"],
                "active_donors": r["active_donors"],
                "pct": float(r["retention_pct"]) if r["retention_pct"] is not None else None,
                "is_final": bool(r["is_final"]),
            }
        )

    last_updated = db.execute(text("SELECT MAX(updated_at) FROM retention_cohort")).scalar()

    return {
        "data": list(cohorts.values()),
        "max_offset": max_offset,
        "last_updated": last_updated,
    }

@router.post("/admin/retention-sync")
def manual_retention_sync(full: bool = False):
    # full=true: tarik ulang seluruh riwayat (backfill penuh).
    return run_retention_sync(full=full)


@router.get("/admin/sync/retention/status")
def retention_sync_status(db: Session = Depends(get_dashboard_db)):
    q = db.query(SyncRun)
    if hasattr(SyncRun, "sync_type"):
        q = q.filter(SyncRun.sync_type == "retention")
    run = q.order_by(SyncRun.id.desc()).first()
    if not run:
        return {"status": "never"}
    return {
        "status": run.status,  # running | success | failed
        "started_at": getattr(run, "started_at", None),
        "finished_at": run.finished_at,
        "message": run.message,
    }