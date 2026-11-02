from datetime import date, timedelta
from sqlalchemy import text, bindparam
from sqlalchemy.orm import Session
from app.db.session import source_engine
from dateutil.relativedelta import relativedelta 


def get_donor_type_breakdown(
    year: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """
    Klasifikasi donor yang berdonasi dalam periode [start_date, end_date]:

    - new        : tidak punya transaksi sebelum start_date
    - retained   : punya transaksi dalam 12 bulan sebelum start_date
    - reactivated: punya transaksi sebelum start_date, tapi tidak dalam
                   12 bulan terakhir sebelum start_date

    Jika start_date/end_date tidak diberikan, dipakai seluruh tahun `year`.
    """
    if start_date is None and end_date is None:
        target_year = year or date.today().year
        start_date = date(target_year, 1, 1)
        end_date = date(target_year, 12, 31)
    else:
        start_date = start_date or end_date
        end_date = end_date or start_date

    lookback_start = start_date - relativedelta(years=1)

    with source_engine.connect() as conn:
        params = {
            "start": start_date,
            "end_excl": end_date + timedelta(days=1),
            "lookback": lookback_start,
        }
        row = conn.execute(
            text("""
                SELECT
                    COALESCE(SUM(z.in_lookback = 1), 0)                          AS retained,
                    COALESCE(SUM(z.in_lookback = 0 AND z.before_lookback = 1), 0) AS reactivated,
                    COALESCE(SUM(z.in_lookback = 0 AND z.before_lookback = 0), 0) AS new_cnt
                FROM (
                    SELECT
                        d.id_donatur,
                        EXISTS (
                            SELECT 1 FROM corez_transaksi x
                            WHERE x.id_donatur = d.id_donatur
                            AND x.transaksi > 0
                            AND x.approved_transaksi = 'y'
                            AND x.tgl_transaksi >= :lookback
                            AND x.tgl_transaksi <  :start
                        ) AS in_lookback,
                        EXISTS (
                            SELECT 1 FROM corez_transaksi x
                            WHERE x.id_donatur = d.id_donatur
                            AND x.transaksi > 0
                            AND x.approved_transaksi = 'y'
                            AND x.tgl_transaksi < :lookback
                        ) AS before_lookback
                    FROM (
                        SELECT DISTINCT id_donatur
                        FROM corez_transaksi
                        WHERE transaksi > 0
                        AND approved_transaksi = 'y'
                        AND tgl_transaksi >= :start
                        AND tgl_transaksi <  :end_excl
                    ) d
                ) z
            """),
            params,
        ).mappings().one()

    # new_count = retained_count = reactivated_count = 0
    # for row in rows:
    #     if row["in_lookback"]:
    #         retained_count += 1
    #     elif row["before_lookback"]:
    #         reactivated_count += 1
    #     else:
    #         new_count += 1
    
    new_count = int(row["new_cnt"])
    retained_count = int(row["retained"])
    reactivated_count = int(row["reactivated"])

    total = new_count + retained_count + reactivated_count

    def pct(n: int) -> float:
        return round((n / total) * 100, 2) if total else 0.0

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_donors": total,
        "breakdown": [
            {"type": "new", "label": "New", "count": new_count, "percentage": pct(new_count)},
            {"type": "retained", "label": "Existing", "count": retained_count, "percentage": pct(retained_count)},
            {"type": "reactivated", "label": "Reactivating", "count": reactivated_count, "percentage": pct(reactivated_count)},
        ],
    }


def get_dashboard_summary(db: Session, start_date: date | None = None, end_date: date | None = None):
    start_date = start_date or date.today()
    end_date = end_date or date.today()
    end_excl = end_date + timedelta(days=1)
    
    total_valid = db.execute(text("SELECT COUNT(*) FROM donor_summary WHERE is_valid = 1")).scalar() or 0
    segments = db.execute(text("""
        SELECT rfm_segment AS name, COUNT(*) AS value FROM donor_summary
        WHERE is_valid = 1
        GROUP BY rfm_segment ORDER BY value DESC
    """)).mappings().all()
    programs = db.execute(text("""
        SELECT program_favorit AS name, COUNT(*) AS value FROM donor_summary
        WHERE program_favorit IS NOT NULL GROUP BY program_favorit ORDER BY value DESC LIMIT 8
    """)).mappings().all()
    with source_engine.connect() as conn:
        # total_donors = conn.execute(text("SELECT COUNT(DISTINCT id_donatur) FROM corez_donatur")).scalar() or 0
        date_params = {"start": start_date, "end": end_excl}
        active_donors = conn.execute(
            text("""
                SELECT COUNT(DISTINCT id_donatur)
                FROM corez_transaksi
                WHERE transaksi > 0
                AND tgl_transaksi >= :start AND tgl_transaksi < :end
                AND approved_transaksi = 'y'
            """),
            date_params,
        ).scalar() or 0
        new_donors = conn.execute(
            text("""
                SELECT COUNT(DISTINCT t.id_donatur)
                FROM corez_transaksi t
                WHERE t.transaksi > 0
                AND t.approved_transaksi = 'y'
                AND t.tgl_transaksi >= :start
                AND t.tgl_transaksi <  :end
                AND NOT EXISTS (
                    SELECT 1
                    FROM corez_transaksi p
                    WHERE p.id_donatur = t.id_donatur
                        AND p.transaksi > 0
                        AND p.approved_transaksi = 'y'
                        AND p.tgl_transaksi < :start
                )
            """),
            date_params,
        ).scalar() or 0
        total_transactions = conn.execute(
            text("""
                SELECT COALESCE(SUM(transaksi), 0)
                FROM corez_transaksi
                WHERE DATE(tgl_transaksi) BETWEEN :start AND :end
                AND transaksi > 0
                AND approved_transaksi = 'y'
            """),
            date_params,
        ).scalar() or 0
        
        top_donors = conn.execute(
            text("""
                SELECT
                    t.id_donatur,
                    d.donatur AS name,
                    SUM(t.transaksi) AS value
                FROM corez_transaksi t
                JOIN corez_donatur d ON d.id_donatur = t.id_donatur
                WHERE t.transaksi > 0
                AND DATE(t.tgl_transaksi) BETWEEN :start AND :end
                AND t.id_donatur NOT IN (
                        '17033000100355',
                        '21100500102313',
                        '9999999999999',
                        '25010700100006',
                        '25090300100170',
                        '25120100100085'
                )
                AND approved_transaksi = 'y'
                GROUP BY name, t.id_donatur
                ORDER BY value DESC
                LIMIT 8
            """),
            date_params,
        ).mappings().all()
    return {
        # "total_donors": total_donors,
        "active_donors": active_donors,
        "new_donors": new_donors,
        "valid_donors": total_valid,
        "total_transactions": float(total_transactions),
        # "platinum": platinum,
        # "favorite_program": favorite_program[0] if favorite_program else None,
        "segment_distribution": [dict(x) for x in segments],
        "top_programs": [dict(x) for x in programs],
        "top_donors": [dict(x) for x in top_donors],
        "date_range": {"start": start_date.isoformat(), "end": end_date.isoformat()},
    }
    
# def get_all_transaction():
#     with source_engine.conn() as conn:
        
        