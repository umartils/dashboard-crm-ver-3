from __future__ import annotations

from fastapi import APIRouter, Depends, Query, HTTPException, Header, Response, UploadFile, File
from app.core.security import require_internal_key, require_admin
import logging
from datetime import date, datetime
from app.db.session import get_dashboard_db, source_engine
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.services.filters import build_segment_history_filters, build_donor_filters, build_blast_result_filters
from app.services.export import export_rfm_xlsx, export_donor_history_xlsx
import math
from app.services.rfm import get_campaign
from pydantic import BaseModel


router = APIRouter(prefix="/api", dependencies=[Depends(require_internal_key)])
logger = logging.getLogger(__name__)

SORTABLE_DONOR_COLUMNS = {
    "nama": "nama",
    "recency_days": "recency_days",
    "frequency": "frequency",
    "monetary": "monetary",
    "last_donation_date": "last_donation_date",
    "tgl_prospek": "tgl_prospek",
    "changed_at": "h.changed_at"
}

DEFAULT_ORDER_BY = """
    FIELD(
        rfm_segment,
        'Champion', 'Active', 'New Donor', 'Loyal',
        'Potential', 'Platinum', 'Passive', 'Other'
    ),
    monetary DESC
"""

SEGMENT_RANK = {
    "Champion": 5,
    "Loyal": 4,
    "Active": 3,
    "Potential": 2,
    "Passive": 1,
}

class DonorUpdate(BaseModel):
    hp: str | None
    is_valid: bool

@router.get("/donors")
def donors(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1),
 
    segment: list[str] = Query(default=[]),
    program: list[str] = Query(default=[]),
    payment: list[str] = Query(default=[]),
    jenis_donor: list[str] = Query(default=[]),
    program_categories: list[str] = Query(default=[]),
    is_valid: list[str] = Query(default=[]),
    search: str | None = None,
    last_donation_start: date | None = Query(default=None),
    last_donation_end: date | None = Query(default=None),
    prospect_exclude_start: date | None = Query(default=None),
    prospect_exclude_end: date | None = Query(default=None),
    sort_by: str | None = None,
    sort_order: str = "desc",
    db: Session = Depends(get_dashboard_db),
):
    allowed_page_sizes = {5, 10, 20, 30}
 
    if page_size not in allowed_page_sizes:
        page_size = 5
 
    clause, params = build_donor_filters(
        segment=segment,
        program=program,
        payment=payment,
        search=search,
        jenis_donor=jenis_donor,
        program_categories=program_categories,
        last_donation_start=last_donation_start,
        last_donation_end=last_donation_end,
        prospect_exclude_start=prospect_exclude_start,
        prospect_exclude_end=prospect_exclude_end,
        is_valid=is_valid,
    )
 
    # Hitung jumlah data setelah filter
    total = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM donor_summary
            WHERE {clause}
            """
        ),
        params,
    ).scalar() or 0
 
    offset = (page - 1) * page_size
 
    query_params = {
        **params,
        "limit": page_size,
        "offset": offset,
    }
 
    # Kalau user pilih sort_by yang valid, override urutan default.
    # Tiebreaker id_donor supaya urutan antar halaman pagination stabil.
    if sort_by in SORTABLE_DONOR_COLUMNS:
        order = "asc" if sort_order.lower() == "asc" else "desc"
        order_by_sql = f"{SORTABLE_DONOR_COLUMNS[sort_by]} {order}, id_donor {order}"
    else:
        order_by_sql = DEFAULT_ORDER_BY
 
    rows = db.execute(
        text(
            f"""
            SELECT
                id_donor, nama, hp, email, rfm_segment, recency_days, frequency, monetary, tgl_prospek,
                program_favorit, payment_favorit, last_donation_date, jenis_donor, program_category, is_valid, last_donation
            FROM donor_summary
            WHERE {clause}
            ORDER BY {order_by_sql}
            LIMIT :limit
            OFFSET :offset
            """
        ),
        query_params,
    ).mappings().all()
 
    total_pages = max( 1, (total + page_size - 1) // page_size, )
  
    return {
        "data": [dict(x) for x in rows],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }
    

@router.get("/donors/export")
def donors_export(
    segment: list[str] = Query(default=[]),
    program: list[str] = Query(default=[]),
    payment: list[str] = Query(default=[]),
    jenis_donor: list[str] = Query(default=[]),
    program_categories: list[str] = Query(default=[]),
    is_valid: list[str] = Query(default=[]),
    search: str | None = None,
    last_donation_start: date | None = Query(default=None),
    last_donation_end: date | None = Query(default=None),
    prospect_exclude_start: date | None = Query(default=None),
    prospect_exclude_end: date | None = Query(default=None),
    db: Session = Depends(get_dashboard_db),
):
    clause, params = build_donor_filters(
        segment=segment,
        program=program,
        payment=payment,
        search=search,
        jenis_donor=jenis_donor,
        program_categories=program_categories,
        last_donation_start=last_donation_start,
        last_donation_end=last_donation_end,
        prospect_exclude_start=prospect_exclude_start,
        prospect_exclude_end=prospect_exclude_end,
        is_valid=is_valid,
    )
    xlsx_data = export_rfm_xlsx(db, clause, params)
    filename = f"data-donor-{date.today().isoformat()}.xlsx"
    return Response(
        content=xlsx_data,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )    

@router.patch("/donors/{donor_id}")
def update_donor(
    donor_id: int,
    payload: DonorUpdate,
    db: Session = Depends(get_dashboard_db),
):
    result = db.execute(
        text("""
            UPDATE donor_summary
            SET is_valid = :is_valid, hp = :hp
            WHERE id_donor = :donor_id
        """),
        {"is_valid": int(payload.is_valid), "hp": payload.hp, "donor_id": donor_id},
    )
    db.commit()

    if result.rowcount == 0:
        # MySQL mengembalikan rowcount 0 juga jika nilainya sama dengan sebelumnya.
        # Untuk membedakannya, tambahkan SELECT dulu atau aktifkan FOUND_ROWS di engine.
        raise HTTPException(status_code=404, detail="Donor tidak ditemukan")

    return {
        "message": "Donor updated successfully",
        "id_donor": donor_id,
        "is_valid": int(payload.is_valid),
        "hp": payload.hp
    }
    
@router.get("/donors/{donor_id}")
def donor_detail(
    donor_id: int, 
    db: Session = Depends(get_dashboard_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1),
):
    donor = db.execute(
        text("""
             SELECT
                id_donor, nama, hp, email, rfm_segment, recency_days, frequency, monetary, min_donation, max_donation,
                median_donation, first_donation_date, last_donation_date, program_favorit, payment_favorit, 
                last_donation_date, jenis_donor, program_category
             FROM donor_summary 
             WHERE id_donor=:id
        """), 
        {"id": donor_id}
    ).mappings().first()
    
    if not donor:
        raise HTTPException(404, "Donor not found")
    
    offset = (page - 1) * page_size
    
    query_params = {
        "id": donor_id,
        "limit": page_size,
        "offset": offset,
    }
    
    with source_engine.connect() as conn:
        total = conn.execute(
            text("""
                SELECT COUNT(id_transaksi)
                FROM corez_transaksi
                WHERE id_donatur = :id
                AND transaksi > 0
            """),
            {"id": donor_id},
        ).scalar_one()
        
        history = conn.execute(text(f"""
            SELECT t.id_transaksi, DATE(t.tgl_transaksi) AS tanggal_donasi, t.keterangan,
                   t.transaksi AS nominal, p.program AS program, c.nama_coa AS payment_method
            FROM corez_transaksi t
            LEFT JOIN setting_program p ON p.id_program=t.id_program
            LEFT JOIN fins_coa c ON c.coa=t.coa_debet
            WHERE t.id_donatur=:id AND t.transaksi > 0
            ORDER BY t.tgl_transaksi DESC 
            LIMIT :limit
            OFFSET :offset
        """), query_params ).mappings().all()
        
    total_pages = math.ceil(total / page_size) if total else 1
    
    recent_donations = []

    for row in history:
        item = dict(row)

        item["campaign"] = get_campaign(item.get("keterangan"))
        item.pop("keterangan", None)

        recent_donations.append(item)
    
    return {
        "profile": dict(donor),

        "recent_donations": recent_donations,

        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }
    
@router.get("/donors/{donor_id}/export")
def donor_history_export(donor_id: int, db: Session = Depends(get_dashboard_db)):
    csv_data, filename = export_donor_history_xlsx(db, donor_id)
    return Response(
        content=csv_data, 
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

    
@router.get("/filters")
def filters(db: Session = Depends(get_dashboard_db)):
    def values(col):
        rows = db.execute(text(f"SELECT DISTINCT {col} v FROM donor_summary WHERE {col} IS NOT NULL ORDER BY v")).all()
        return [r[0] for r in rows]
    return {
        "segments": values("rfm_segment"), 
        "programs": values("program_favorit"), 
        "payments": values("payment_favorit"), 
        "jenis_donor": values("jenis_donor"), 
        "program_categories": values("program_category"),
        "is_valid": [str(r[0]) for r in db.execute(
            text("SELECT DISTINCT is_valid v FROM donor_summary WHERE is_valid IS NOT NULL ORDER BY v")
        ).all()],
    }    


@router.get("/segment-history")
def donor_segment_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1),
 
    old_segment: list[str] = Query(default=[]),
    new_segment: list[str] = Query(default=[]),
    search: str | None = None,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    sort_by: str = "changed_at",
    sort_order: str = "desc",
    db: Session = Depends(get_dashboard_db),
):
    allowed_page_sizes = {5, 10, 20, 30}
 
    if page_size not in allowed_page_sizes:
        page_size = 5
 
    clause, params = build_segment_history_filters(
        old_segment=old_segment,
        new_segment=new_segment,
        search=search,
        start_date=start_date,
        end_date=end_date,
    )
 
    total = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM donor_segment_history h
            LEFT JOIN donor_summary d ON d.id_donor = h.id_donor
            WHERE {clause}
            """
        ),
        params,
    ).scalar() or 0
 
    offset = (page - 1) * page_size
 
    query_params = {
        **params,
        "limit": page_size,
        "offset": offset,
    }
    sortable_columns = {
        "changed_at": "h.changed_at",
        "nama": "d.nama"
    }
    sort_by = sort_by if sort_by in sortable_columns else "changed_at"
    sort_order = "asc" if sort_order.lower() == "asc" else "desc"
    column = sortable_columns[sort_by]
 
    rows = db.execute(
        text(
            f"""
            SELECT
                h.id, h.id_donor, d.nama, d.hp, d.email,
                h.old_segment, h.new_segment, h.changed_at, h.sync_run_id
            FROM donor_segment_history h
            LEFT JOIN donor_summary d ON d.id_donor = h.id_donor
            WHERE {clause}
            ORDER BY {column} {sort_order}
            LIMIT :limit
            OFFSET :offset
            """
        ),
        query_params,
    ).mappings().all()
 
    total_pages = max(
        1,
        (total + page_size - 1) // page_size,
    )
    
    matrix_rows = db.execute(
        text(
            f"""
            SELECT
                h.old_segment,
                h.new_segment,
                COUNT(*) AS total
            FROM donor_segment_history h
            LEFT JOIN donor_summary d ON d.id_donor = h.id_donor
            WHERE {clause}
            GROUP BY h.old_segment, h.new_segment
            """
        ),
        params,
    ).mappings().all()

    matrix = [dict(r) for r in matrix_rows]

    naik = turun = tetap = donor_baru_berkembang = 0
    for r in matrix:
        old, new, n = r["old_segment"], r["new_segment"], r["total"]

        if old == new:
            tetap += n
        elif old == "New Donor":
            donor_baru_berkembang += n
        elif old in SEGMENT_RANK and new in SEGMENT_RANK:
            if SEGMENT_RANK[new] > SEGMENT_RANK[old]:
                naik += n
            else:
                turun += n

    return {
        "data": [dict(x) for x in rows],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "matrix": matrix,
        "summary": {
            "naik": naik,
            "turun": turun,
            "tetap": tetap,
            "donor_baru_berkembang": donor_baru_berkembang,
        },
    }