import io
from datetime import date

from fastapi import HTTPException
from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import source_engine


def _xlsx_response_bytes(
    fieldnames: list[str],
    rows: list[dict],
    sheet_name: str = "Data",
) -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = sheet_name

    # Header
    worksheet.append(fieldnames)

    for cell in worksheet[1]:
        cell.font = Font(bold=True)

    # Data
    for row in rows:
        worksheet.append([
            row.get(fieldname)
            for fieldname in fieldnames
        ])

    # Freeze header
    worksheet.freeze_panes = "A2"

    # Auto filter
    worksheet.auto_filter.ref = worksheet.dimensions

    # Auto width column
    for column_cells in worksheet.columns:
        max_length = 0
        column_letter = get_column_letter(column_cells[0].column)

        for cell in column_cells:
            value = cell.value

            if value is not None:
                max_length = max(
                    max_length,
                    len(str(value)),
                )

        worksheet.column_dimensions[column_letter].width = min(
            max_length + 2,
            50,
        )

    # Simpan workbook ke memory
    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    return buffer.getvalue()


def export_rfm_xlsx(
    db: Session,
    where_clause: str,
    params: dict,
) -> bytes:
    rows = db.execute(
        text(f"""
            SELECT
                id_donor,
                nama,
                hp,
                email,
                rfm_segment,
                recency_days,
                frequency,
                monetary,
                last_donation,
                max_donation,
                program_favorit,
                payment_favorit,
                last_donation_date,
                is_valid
            FROM donor_summary
            WHERE {where_clause}
            ORDER BY
                FIELD(
                    rfm_segment,
                    'Platinum',
                    'Champion',
                    'Loyal',
                    'Active',
                    'Potential',
                    'New Donor',
                    'Passive'
                ),
                monetary DESC
        """),
        params,
    ).mappings().all()

    fieldnames = [
        "id_donor",
        "nama",
        "hp",
        "email",
        "rfm_segment",
        "recency_days",
        "frequency",
        "monetary",
        "last_donation",
        "max_donation",
        "program_favorit",
        "payment_favorit",
        "last_donation_date",
        "is_valid"
    ]

    return _xlsx_response_bytes(
        fieldnames,
        [dict(row) for row in rows],
        sheet_name="Data Donor RFM",
    )
    
def export_donors_xlsx(
    db: Session,
    where_clause: str,
    params: dict,
) -> bytes:
    rows = db.execute(
        text(f"""
            SELECT
                id_donor,
                nama,
                no_telp,
                jumlah_donasi,
                total_donasi,
                max_donation,
                tgl_terakhir,
                campaign_terakhir,
                jenis_donor
            FROM mn_donor_summary
            WHERE {where_clause}
            ORDER BY total_donasi DESC
        """),
        params,
    ).mappings().all()

    fieldnames = [
        "id_donor",
        "nama",
        "no_telp",
        "jumlah_donasi",
        "total_donasi",
        "max_donation",
        "tgl_terakhir",
        "campaign_terakhir",
        "jenis_donor",
    ]

    return _xlsx_response_bytes(
        fieldnames,
        [dict(row) for row in rows],
        sheet_name="Data Donor MN",
    )
    
def export_donor_non_xlsx(
    db: Session,
    where_clause: str,
    params: dict,
) -> bytes:
    rows = db.execute(
        text(f"""
            SELECT id_donor, nama, hp, email, is_valid, tgl_reg
            FROM donor_non
            WHERE {where_clause}
        """),
        params,
    ).mappings().all()

    fieldnames = [
        "id_donor",
        "nama",
        "hp",
        "email",
        "is_valid",
        "tgl_reg"
    ]

    return _xlsx_response_bytes(
        fieldnames,
        [dict(row) for row in rows],
        sheet_name="Data Donor Non Donation",
    )


def export_donor_history_xlsx(
    db: Session,
    donor_id: int,
) -> tuple[bytes, str]:
    donor = db.execute(
        text("""
            SELECT nama
            FROM donor_summary
            WHERE id_donor = :id
        """),
        {
            "id": donor_id,
        },
    ).mappings().first()

    if not donor:
        raise HTTPException(
            status_code=404,
            detail="Donor not found",
        )

    with source_engine.connect() as conn:
        history = conn.execute(
            text("""
                SELECT
                    t.id_transaksi,
                    t.tgl_transaksi AS tanggal_donasi,
                    t.transaksi AS nominal,
                    p.program AS program,
                    c.nama_coa AS payment_method
                FROM corez_transaksi t
                LEFT JOIN setting_program p
                    ON p.id_program = t.id_program
                LEFT JOIN fins_coa c
                    ON c.coa = t.coa_debet
                WHERE
                    t.id_donatur = :id
                    AND t.transaksi > 0
                ORDER BY
                    t.tgl_transaksi DESC
                LIMIT 5000
            """),
            {
                "id": donor_id,
            },
        ).mappings().all()

    fieldnames = [
        "id_transaksi",
        "tanggal_donasi",
        "nominal",
        "program",
        "payment_method",
    ]

    xlsx_data = _xlsx_response_bytes(
        fieldnames,
        [dict(row) for row in history],
        sheet_name="Histori Donasi",
    )

    safe_name = "".join(
        char
        for char in (
            donor["nama"]
            or f"donor-{donor_id}"
        )
        if char.isalnum() or char in " -_"
    ).strip()

    filename = (
        f"histori-donasi-"
        f"{safe_name or donor_id}-"
        f"{date.today().isoformat()}.xlsx"
    )

    return xlsx_data, filename

def export_conversion_xlsx(
    db: Session,
    where_clause: str,
    params: dict,
) -> bytes:
    rows = db.execute(
        text(f"""
            SELECT
                id_donor,
                nama_donor,
                phone_clean,
                blast_month,
                first_blast_date,
                blast_count,
                donated,
                donation_count,
                donation_amount,
                updated_at
            FROM blast_conversions
            WHERE {where_clause}
            ORDER BY blast_month DESC, donated DESC, donation_amount DESC
        """),
        params,
    ).mappings().all()

    fieldnames = [
        "id_donor",
        "nama_donor",
        "phone_clean",
        "blast_month",
        "first_blast_date",
        "blast_count",
        "donated",
        "donation_count",
        "donation_amount",
        "updated_at",
    ]

    return _xlsx_response_bytes(
        fieldnames,
        [dict(row) for row in rows],
        sheet_name="Blast Conversion Data",
    )