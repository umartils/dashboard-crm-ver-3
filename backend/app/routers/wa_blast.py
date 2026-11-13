from __future__ import annotations
from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.export import export_conversion_xlsx
from fastapi import APIRouter, Depends, Query, HTTPException, Response, UploadFile, File
from datetime import date, datetime
 
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.services.filters import build_conversion_filters, build_blast_result_filters
from app.services.sync.blast_sync import run_blast_conversion_sync
from app.core.security import require_internal_key

from app.db.session import get_dashboard_db

from app.models.import_logs import ImportLog
from app.services.blast import classify_status, normalize_phone, read_upload_dataframe
from app.models.whatsapp_blast_result import WhatsappBlastResult

import io
import pandas as pd
import logging

PHONE_COLUMN_CANDIDATES = ["recipient", "nomor", "phone", "no_telp", "hp", "nomor_hp"]
STATUS_COLUMN_CANDIDATES = ["status", "status_blast", "delivery_status", "status_pengiriman"]
DATE_COLUMN_CANDIDATES = ["sent at", "sent_at"]

SORTABLE_DONOR_COLUMNS = {
    "nama_donor": "nama_donor",
    "first_blast_date": "first_blast_date",
    "donation_amount": "donation_amount",
}

DEFAULT_ORDER_BY = """
    blast_month DESC, donated DESC, donation_amount DESC
"""

router = APIRouter(prefix="/api", dependencies=[Depends(require_internal_key)])
logger = logging.getLogger(__name__)

class BlastSettingPayload(BaseModel):
    rate_per_message: float = Field(..., ge=0)
 

@router.get("/blast-settings")
def get_blast_setting(db: Session = Depends(get_dashboard_db)):
    row = db.execute(
        text(
            "SELECT id, rate_per_message, updated_at FROM blast_settings "
            "ORDER BY id DESC LIMIT 1"
        )
    ).mappings().first()

    if not row:
        return {"rate_per_message": 0, "updated_at": None}

    return dict(row)


@router.put("/blast-settings")
def update_blast_setting(
    payload: BlastSettingPayload,
    db: Session = Depends(get_dashboard_db),
):
    now = datetime.now(ZoneInfo("Asia/Jakarta"))

    existing = db.execute(
        text("SELECT id FROM blast_settings ORDER BY id DESC LIMIT 1")
    ).mappings().first()

    if existing:
        db.execute(
            text(
                "UPDATE blast_settings SET rate_per_message = :rate, updated_at = :now "
                "WHERE id = :id"
            ),
            {"rate": payload.rate_per_message, "now": now, "id": existing["id"]},
        )
    else:
        db.execute(
            text(
                "INSERT INTO blast_settings (rate_per_message, updated_at) "
                "VALUES (:rate, :now)"
            ),
            {"rate": payload.rate_per_message, "now": now},
        )

    db.commit()

    return {"rate_per_message": payload.rate_per_message, "updated_at": now}

@router.post("/blast-conversions/sync")
def sync_blast_conversions():
    return run_blast_conversion_sync()
  
 
@router.get("/blast-conversions/summary")
def blast_conversion_summary(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_dashboard_db),
):
    clause, params = build_conversion_filters(donated=None, search=None, start_date=start_date, end_date=end_date)
 
    row = db.execute(
        text(
            f"""
            SELECT
                COUNT(*) AS total_prospek,
                COALESCE(SUM(donated), 0) AS total_konversi,
                COALESCE(SUM(donation_amount), 0) AS total_donasi
            FROM blast_conversions
            WHERE {clause}
            """
        ),
        params,
    ).mappings().first()
 
    rate_row = db.execute(
        text("SELECT rate_per_message FROM blast_settings ORDER BY id DESC LIMIT 1")
    ).mappings().first()
    rate = float(rate_row["rate_per_message"]) if rate_row else 0
 
    total_prospek = row["total_prospek"] or 0
    total_konversi = int(row["total_konversi"] or 0)
    total_donasi = float(row["total_donasi"] or 0)
    total_biaya = total_prospek * rate
 
    conversion_rate = round((total_konversi / total_prospek) * 100, 2) if total_prospek else 0
    roas = round(total_donasi / total_biaya, 2) if total_biaya else 0
    rasio_biaya = round((total_biaya / total_donasi) * 100, 2) if total_donasi else 0
 
    return {
        "total_prospek": total_prospek,
        "total_konversi": total_konversi,
        "conversion_rate": conversion_rate,
        "total_donasi": total_donasi,
        "rate_per_message": rate,
        "total_biaya": total_biaya,
        "roas": roas,
        "rasio_biaya": rasio_biaya,
    }
 
 
@router.get("/blast-conversions")
def blast_conversions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1),
    donated: list[str] = Query(default=[]),
    search: str | None = None,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    sort_by: str | None = None,
    sort_order: str = "desc",
    db: Session = Depends(get_dashboard_db),
):
    allowed_page_sizes = {10, 20, 50, 100}
    if page_size not in allowed_page_sizes:
        page_size = 10
 
    clause, params = build_conversion_filters(donated=donated, search=search, start_date=start_date, end_date=end_date)
    if sort_by in SORTABLE_DONOR_COLUMNS:
        order = "asc" if sort_order.lower() == "asc" else "desc"
        order_by_sql = f"{SORTABLE_DONOR_COLUMNS[sort_by]} {order}, id_donor {order}"
    else:
        order_by_sql = DEFAULT_ORDER_BY
 
    total = db.execute(
        text(f"SELECT COUNT(*) FROM blast_conversions WHERE {clause}"),
        params,
    ).scalar() or 0
 
    offset = (page - 1) * page_size
    query_params = {**params, "limit": page_size, "offset": offset}
 
    rows = db.execute( 
        text(
            f"""
            SELECT id, id_donor, nama_donor, phone_clean, DATE_FORMAT(blast_month, '%Y-%m') AS blast_month,
                   first_blast_date, blast_count, donated, donation_count,
                   donation_amount, updated_at
            FROM blast_conversions
            WHERE {clause}
            ORDER BY {order_by_sql}
            LIMIT :limit OFFSET :offset
            """
        ), 
        query_params,
    ).mappings().all()
 
    total_pages = max(1, (total + page_size - 1) // page_size)
 
    return {
        "data": [dict(x) for x in rows],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    } 

@router.get("/blast-conversions/export")
def blast_conversions_export(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    donated: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_dashboard_db),
):
    clause, params = build_conversion_filters(
        start_date=start_date,
        end_date=end_date,
        donated=donated,
        search=search,
    )

    xlsx_data = export_conversion_xlsx(db, clause, params)
    # xlsx_data = export_donors_xlsx(db, clause, params)
    filename = f"data-blast-conversions-{date.today().isoformat()}.xlsx"
    return Response(
        content=xlsx_data,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )   
    
@router.post("/whatsapp-blast/upload")
async def upload_whatsapp_blast(
    file: UploadFile = File(...),
    db: Session = Depends(get_dashboard_db),
):
    filename = file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="File harus berformat Excel (.xlsx/.xls) atau CSV (.csv, delimiter ';')",
        )
    
    existFile = db.execute(
        text("SELECT id FROM import_logs WHERE file_name = :filename LIMIT 1"),
        {"filename": filename},
    ).mappings().first()
    
    if existFile:
        raise HTTPException(
            status_code=409,
            detail=f"File '{filename}' sudah pernah diunggah sebelumnya.",
        )

    content = await file.read()
    try:
        df = read_upload_dataframe(filename, content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {exc}")

    if df.empty: raise HTTPException(status_code=400, detail="File tidak memiliki data")

    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
 
    phone_col = next((c for c in PHONE_COLUMN_CANDIDATES if c in df.columns), None)
    status_col = next((c for c in STATUS_COLUMN_CANDIDATES if c in df.columns), None)
    date_col = next((c for c in DATE_COLUMN_CANDIDATES if c in df.columns), None)
 
    if not phone_col or not status_col or not date_col:
        raise HTTPException(
            status_code=400,
            detail=(
                "Kolom nomor HP atau status tidak ditemukan. "
                f"Kolom yang tersedia di file: {', '.join(df.columns)}"
            ),
        )
 
    run = ImportLog(file_name=file.filename, total_rows=len(df))
    db.add(run)
    db.commit()
    db.refresh(run)
 
    now = datetime.now(ZoneInfo("Asia/Jakarta"))
    updated_count = 0
    not_found_count = 0
    skipped_count = 0
    result_rows: list[WhatsappBlastResult] = []
 
    try:
        for _, row in df.iterrows():
            raw_phone = row.get(phone_col)
            raw_status = row.get(status_col)
            tgl_raw = pd.to_datetime(
                row.get(date_col),
                errors="coerce",
                dayfirst=True
            )
            tgl_prospek = (
                pd.to_datetime(tgl_raw).date()
                if pd.notna(tgl_raw)
                else None
            )
 
            phone_clean = normalize_phone(raw_phone)
            status_norm = classify_status(raw_status)
 
            donor = None
            if phone_clean:
                donor = db.execute(
                    text(
                        "SELECT id_donor, nama, is_valid, tgl_prospek FROM donor_summary "
                        "WHERE hp = :hp LIMIT 1"
                    ),
                    {"hp": phone_clean},
                ).mappings().first()
 
            is_matched = donor is not None
 
            if is_matched and status_norm in ("failed", "delivered", "read"):
                new_is_valid = 0 if status_norm == "failed" else 1
                curr_is_valid = donor['is_valid']
                curr_tgl_prospek = donor['tgl_prospek']
                if curr_is_valid != new_is_valid or curr_tgl_prospek != tgl_prospek:
                    db.execute(
                        text(
                            """UPDATE donor_summary SET is_valid = :is_valid, tgl_prospek = :tgl_prospek
                            WHERE id_donor = :id_donor"""
                        ),
                        {"is_valid": new_is_valid, "id_donor": donor["id_donor"], "tgl_prospek": tgl_prospek},
                    )
                    updated_count += 1
                else:
                    skipped_count += 1
            elif not is_matched:
                not_found_count += 1
            else:
                skipped_count += 1
 
            result_rows.append(
                WhatsappBlastResult(
                    import_log_id=run.id,
                    phone_raw=str(raw_phone) if raw_phone is not None else "",
                    phone_clean=phone_clean,
                    status_blast=status_norm,
                    id_donor=donor["id_donor"] if donor else None,
                    tgl_prospek=tgl_prospek,
                    nama_donor=donor["nama"] if donor else None,
                    is_matched=is_matched,
                    created_at=now,
                )
            )
 
        db.bulk_save_objects(result_rows)
 
        run.updated_count = updated_count
        run.not_found_count = not_found_count
        run.skipped_count = skipped_count
        run.message = (
            f"{updated_count} donor diupdate, {skipped_count} tidak berubah, "
            f"{not_found_count} nomor tidak ditemukan"
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Gagal memproses file WhatsApp blast: %s", file.filename)
        run.message = f"Gagal memproses file: {str(exc)[:400]}"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Gagal memproses file blast: {exc}")
 
    return {
        "import_log_id": run.id,
        "total_rows": len(df),
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "not_found_count": not_found_count,
    }
    

 
@router.get("/whatsapp-blast/results")
def whatsapp_blast_results(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1),
    status: list[str] = Query(default=[]),
    search: str | None = None,
    import_start_date: date | None = Query(default=None),
    import_end_date: date | None = Query(default=None),
    blast_start_date: date | None = Query(default=None),
    blast_end_date: date | None = Query(default=None),
    import_log_id: int | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_dashboard_db),
):
    allowed_page_sizes = {5, 10, 20, 30} 
    if page_size not in allowed_page_sizes:
        page_size = 5
 
    clause, params = build_blast_result_filters(
        status=status,
        search=search,
        import_start_date=import_start_date,
        import_end_date=import_end_date,
        blast_start_date=blast_start_date,
        blast_end_date=blast_end_date,
        import_log_id=import_log_id,
    )
 
    total = db.execute(
        text(f"SELECT COUNT(*) FROM whatsapp_blast_results b WHERE {clause}"),
        params,
    ).scalar() or 0
    
    sortable_columns = {
        "tgl_prospek": "tgl_prospek",
        "created_at": "created_at",
        "nama": "nama"
    }
 
    offset = (page - 1) * page_size
    query_params = {**params, "limit": page_size, "offset": offset}
    
    sort_by = sort_by if sort_by in sortable_columns else "created_at"
    sort_order = "asc" if sort_order.lower() == "asc" else "desc"
    column = sortable_columns[sort_by]
 
    rows = db.execute(
        text(
            f"""
            SELECT id, phone_raw, phone_clean AS hp, status_blast, tgl_prospek,
                   id_donor, nama_donor AS nama, is_matched, created_at
            FROM whatsapp_blast_results
            WHERE {clause}
            ORDER BY {column} {sort_order}
            LIMIT :limit OFFSET :offset
            """
        ),
        query_params,
    ).mappings().all()
 
    total_pages = max(1, (total + page_size - 1) // page_size)
 
    return {
        "data": [dict(x) for x in rows],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }
    