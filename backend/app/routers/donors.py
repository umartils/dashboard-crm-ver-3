from __future__ import annotations
 
import math 
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import require_internal_key
from app.db.session import get_dashboard_db, source_engine
from app.services.filters import build_donor_summary_filters, filterSearch
from app.services.rfm import get_campaign
from app.services.sync.donor_sync import run_donor_summary_sync
from app.services.sync.non_sync import run_donor_non_sync
from app.services.export import export_donors_xlsx, export_donor_non_xlsx

from app.services.donor_summary import get_donor_summary_card

router = APIRouter(prefix="/api", dependencies=[Depends(require_internal_key)])

# Whitelist kolom yang boleh di-sort - JANGAN pernah masukkan sort_by mentah
# dari frontend langsung ke ORDER BY (celah SQL injection).
SORTABLE_COLUMNS = {
    "nama": "nama",
    "jumlah_donasi": "jumlah_donasi",
    "total_donasi": "total_donasi",
    "tgl_terakhir": "tgl_terakhir",
    "max_donation": "max_donation",
    "tgl_reg" : "tgl_reg",
    "last_donation" : "last_donation"
}


@router.get("/donor-summary")
def donor_summary_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1), 
    search: str | None = None,
    jenis_donor: list[str] = Query(default=[]),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    sort_by: str = "tgl_terakhir",
    sort_order: str = "desc",
    db: Session = Depends(get_dashboard_db),
):
    allowed_page_sizes = {5, 10, 20, 30}
    if page_size not in allowed_page_sizes:
        page_size = 5

    sort_by = sort_by if sort_by in SORTABLE_COLUMNS else "tgl_terakhir"
    sort_order = "asc" if sort_order.lower() == "asc" else "desc"
    column = SORTABLE_COLUMNS[sort_by]

    clause, params = build_donor_summary_filters(
        search=search,
        jenis_donor=jenis_donor,
        start_date=start_date,
        end_date=end_date,
    )

    total = db.execute(
        text(f"SELECT COUNT(*) FROM mn_donor_summary WHERE {clause}"),
        params,
    ).scalar() or 0

    offset = (page - 1) * page_size
    query_params = {**params, "limit": page_size, "offset": offset}
 
    rows = db.execute(
        text(
            f"""
            SELECT id_donor, nama, no_telp, jumlah_donasi, total_donasi, last_donation, tgl_terakhir, 
                campaign_terakhir, max_donation, jenis_donor
            FROM mn_donor_summary
            WHERE {clause}
            ORDER BY {column} {sort_order}, id_donor {sort_order}
            LIMIT :limit
            OFFSET :offset
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
    
@router.get("/donor-summary/card")
def donor_summary_card(
    jenis_donor: list[str] = Query(default=[]),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date tidak boleh lebih besar dari end_date")
    return get_donor_summary_card(jenis_donor, start_date=start_date, end_date=end_date)
    
    
@router.get("/donor-summary/export")
def donor_summary_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1), 
    search: str | None = None,
    jenis_donor: list[str] = Query(default=[]),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    sort_by: str = "tgl_terakhir",
    sort_order: str = "desc",
    db: Session = Depends(get_dashboard_db),
):
    allowed_page_sizes = {5, 10, 20, 30}
    if page_size not in allowed_page_sizes:
        page_size = 5

    sort_by = sort_by if sort_by in SORTABLE_COLUMNS else "tgl_terakhir"
    sort_order = "asc" if sort_order.lower() == "asc" else "desc"
    column = SORTABLE_COLUMNS[sort_by]

    clause, params = build_donor_summary_filters(
        search=search,
        jenis_donor=jenis_donor,
        start_date=start_date,
        end_date=end_date,
    )

    xlsx_data = export_donors_xlsx(db, clause, params)
    filename = f"data-donor-{date.today().isoformat()}.xlsx"
    return Response(
        content=xlsx_data,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )   
    
@router.get("/donor-non")
def donor_non_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1), 
    search: str | None = None,
    is_valid: list[str] = Query(default=[]),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    sort_by: str = "nama",
    sort_order: str = "asc",
    db: Session = Depends(get_dashboard_db)
):
    allowed_page_sizes = {5, 10, 20, 30}
    if page_size not in allowed_page_sizes:
        page_size = 5
    
    clause, params = filterSearch(search=search, start_date=start_date, end_date=end_date, is_valid=is_valid)
    
    offset = (page - 1) * page_size
    query_params = {**params, "limit": page_size, "offset": offset}
    
    sort_by = sort_by if sort_by in SORTABLE_COLUMNS else "nama"
    sort_order = "asc" if sort_order.lower() == "asc" else "desc"
    column = SORTABLE_COLUMNS[sort_by]
    
    total = db.execute(
        text(f"SELECT COUNT(*) FROM donor_non WHERE {clause}"),
        params,
    ).scalar() or 0
    
    rows = db.execute(
        text(
            f""" 
            SELECT id_donor, nama, hp, email, is_valid, tgl_reg
            FROM donor_non
            WHERE {clause}
            ORDER BY {column} {sort_order} 
            LIMIT :limit
            OFFSET :offset
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

@router.get("/donor-non/export")
def donor_summary_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1), 
    search: str | None = None,
    is_valid: list[str] = Query(default=[]),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_dashboard_db),
):
    allowed_page_sizes = {5, 10, 20, 30}
    if page_size not in allowed_page_sizes:
        page_size = 5

    clause, params = filterSearch(
        search=search,
        is_valid=is_valid,
        start_date=start_date,
        end_date=end_date
    ) 

    xlsx_data = export_donor_non_xlsx(db, clause, params)
    filename = f"data-donor-{date.today().isoformat()}.xlsx"
    return Response(
        content=xlsx_data,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )    
    
    
@router.get("/donor-summary/filters")
def donor_summary_filters(db: Session = Depends(get_dashboard_db)):
    def values(col):
        rows = db.execute(text(f"SELECT DISTINCT {col} v FROM mn_donor_summary WHERE {col} IS NOT NULL ORDER BY v")).all()
        return [r[0] for r in rows]
    return {
        # "segments": values("rfm_segment"), 
        # "programs": values("program_favorit"), 
        # "payments": values("payment_favorit"), 
        "jenis_donor": values("jenis_donor"), 
        # "program_categories": values("program_category"),
        # "is_valid": [str(r[0]) for r in db.execute(
        #     text("SELECT DISTINCT is_valid v FROM donor_summary WHERE is_valid IS NOT NULL ORDER BY v")
        # ).all()],
    }    


@router.get("/donor-summary/{donor_id}")
def donor_summary_detail(
    donor_id: str,
    db: Session = Depends(get_dashboard_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1),
):
    profile = db.execute(
        text(
            """
            SELECT id_donor, nama, no_telp, jumlah_donasi, total_donasi, tgl_terakhir, 
                campaign_terakhir, max_donation, jenis_donor
            FROM mn_donor_summary
            WHERE id_donor = :id
            """
        ),
        {"id": donor_id}, 
    ).mappings().first()

    if not profile:
        raise HTTPException(404, "Donor not found")

    offset = (page - 1) * page_size
    query_params = {"id": donor_id, "limit": page_size, "offset": offset}

    # Histori transaksi tetap diambil dari DB sumber (corez_transaksi), sama
    # seperti donor_detail() di router RFM - tabel donor_ringkasan cuma nyimpan
    # ringkasan, bukan histori per transaksi.
    with source_engine.connect() as conn:
        total = conn.execute(
            text(
                """
                SELECT COUNT(id_transaksi)
                FROM corez_transaksi
                WHERE id_donatur = :id AND transaksi > 0
                """
            ),
            {"id": donor_id},
        ).scalar_one()

        history = conn.execute(
            text(
                """
                SELECT t.id_transaksi, DATE(t.tgl_transaksi) AS tanggal_donasi, t.keterangan,
                       t.transaksi AS nominal, p.program AS program, c.nama_coa AS payment_method
                FROM corez_transaksi t
                LEFT JOIN setting_program p ON p.id_program = t.id_program
                LEFT JOIN fins_coa c ON c.coa = t.coa_debet
                WHERE t.id_donatur = :id AND t.transaksi > 0
                ORDER BY t.tgl_transaksi DESC
                LIMIT :limit
                OFFSET :offset
                """
            ),
            query_params,
        ).mappings().all()

    total_pages = math.ceil(total / page_size) if total else 1

    recent_donations = []
    for row in history:
        item = dict(row)
        item["campaign"] = get_campaign(item.get("keterangan"))
        item.pop("keterangan", None)
        recent_donations.append(item)

    return {
        "profile": dict(profile),
        "recent_donations": recent_donations,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }

@router.post("/admin/summary-sync")
def donor_summary_sync():
    return run_donor_summary_sync()

@router.post("/admin/non-sync")
def donor_non_sync():
    return run_donor_non_sync()