"""
Sync retensi donatur (letakkan di app/services/retention_sync.py).

Alur:
  1. Source DB (corez_transaksi) -> agregasi per (donatur, bulan) -> donor_monthly.
     Hanya jendela terakhir yang ditarik ulang (bulan berjalan + bulan sebelumnya).
     Pertama kali jalan (tabel kosong) atau RETENTION_FULL=1 -> seluruh riwayat.
  2. donor_monthly -> retention_monthly (self-join, hanya bulan yang terdampak).
  3. donor_monthly -> retention_cohort (dihitung ulang penuh, tabelnya kecil).

Seluruh perhitungan tahap 2-3 berjalan di dashboard DB, tidak membebani source DB.
Dicatat di SyncRun dengan sync_type="retention".
"""
from __future__ import annotations

import gc
import logging
import os
from datetime import date

import pandas as pd
from sqlalchemy import bindparam, text

from app.db.session import DashboardSessionLocal, dashboard_engine, source_engine
from app.services.sync.sync_common import (
    EXCLUDED_DONOR_IDS,
    EXCLUDED_DONOR_NAMES,
    build_upsert_sql,
    drop_staging,
    mark_failed,
    mark_success,
    now_wib,
    read_sql_full,
    stage_dataframe,
    start_run,
    with_sync_lock,
)

log = logging.getLogger(__name__)

TARGET_TABLE = "donor_monthly"
# Nama staging unik per target supaya tidak bentrok dengan sync lain.
STAGING_TABLE = "donor_monthly_staging"

REFRESH_MONTHS = 2          # bulan berjalan + 1 bulan sebelumnya
FULL_START = date(2000, 1, 1)

COLS = ["id_donor", "bulan", "jumlah_transaksi", "total_nominal", "updated_at"]

# Populasi donatur disamakan dengan sync RFM (blacklist + id_jenis bukan 2,3)
# supaya angka konsisten antar halaman dashboard.
_QUERY_DONOR_MONTHLY = text(
    """
    SELECT
        t.id_donatur AS id_donor,
        DATE_FORMAT(t.tgl_transaksi, '%Y-%m-01') AS bulan,
        COUNT(*) AS jumlah_transaksi,
        SUM(t.transaksi) AS total_nominal
    FROM corez_transaksi t
    JOIN corez_donatur d ON d.id_donatur = t.id_donatur
    WHERE t.transaksi IS NOT NULL AND t.transaksi > 0
      AND t.approved_transaksi = 'y'
      AND t.tgl_transaksi >= :start_date
      AND t.id_donatur NOT IN :excluded_ids
      AND d.donatur NOT IN :excluded_names
      AND d.id_jenis NOT IN (2, 3)
    GROUP BY t.id_donatur, DATE_FORMAT(t.tgl_transaksi, '%Y-%m-01')
    """
)

SQL_DELETE_MONTHLY = "DELETE FROM retention_monthly WHERE bulan_retensi >= :s"

# p = donatur aktif di bulan M-1, c = donatur yang sama aktif lagi di bulan M.
# p.bulan < :cur mencegah baris "bulan depan" (retensi 0% palsu) dari bulan berjalan.
SQL_INSERT_MONTHLY = """
INSERT INTO retention_monthly
    (bulan_retensi, donatur_bulan_sebelumnya, kembali, churn, retensi_pct, is_final, updated_at)
SELECT
    DATE_ADD(p.bulan, INTERVAL 1 MONTH),
    COUNT(*),
    COUNT(c.id_donor),
    COUNT(*) - COUNT(c.id_donor),
    ROUND(COUNT(c.id_donor) / COUNT(*) * 100, 2),
    CASE WHEN DATE_ADD(p.bulan, INTERVAL 1 MONTH) < :cur THEN 1 ELSE 0 END,
    :ts
FROM donor_monthly p
LEFT JOIN donor_monthly c
       ON c.id_donor = p.id_donor
      AND c.bulan = DATE_ADD(p.bulan, INTERVAL 1 MONTH)
WHERE p.bulan >= DATE_SUB(:s, INTERVAL 1 MONTH)
  AND p.bulan < :cur
GROUP BY p.bulan
"""

SQL_DELETE_COHORT = "DELETE FROM retention_cohort"

SQL_INSERT_COHORT = """
INSERT INTO retention_cohort
    (cohort_month, month_offset, cohort_size, active_donors, retention_pct, is_final, updated_at)
SELECT
    f.cohort_month,
    TIMESTAMPDIFF(MONTH, f.cohort_month, m.bulan),
    s.cohort_size,
    COUNT(*),
    ROUND(COUNT(*) / s.cohort_size * 100, 2),
    CASE WHEN m.bulan < :cur THEN 1 ELSE 0 END,
    :ts
FROM (SELECT id_donor, MIN(bulan) AS cohort_month
      FROM donor_monthly GROUP BY id_donor) f
JOIN (SELECT cohort_month, COUNT(*) AS cohort_size
      FROM (SELECT id_donor, MIN(bulan) AS cohort_month
            FROM donor_monthly GROUP BY id_donor) x
      GROUP BY cohort_month) s
  ON s.cohort_month = f.cohort_month
JOIN donor_monthly m ON m.id_donor = f.id_donor
GROUP BY f.cohort_month, m.bulan, s.cohort_size
"""


def _window_start(full: bool) -> date:
    """Awal jendela tarik ulang. Tabel kosong / full -> seluruh riwayat."""
    if full:
        return FULL_START
    with dashboard_engine.connect() as conn:
        n = conn.execute(text(f"SELECT COUNT(*) FROM {TARGET_TABLE}")).scalar()
    if not n:
        return FULL_START
    today = now_wib().date()
    y, m = today.year, today.month - (REFRESH_MONTHS - 1)
    while m <= 0:
        m += 12
        y -= 1
    return date(y, m, 1)


def _read_monthly(start: date) -> pd.DataFrame:
    query = _QUERY_DONOR_MONTHLY.bindparams(
        bindparam("start_date", value=start),
        bindparam("excluded_ids", value=list(EXCLUDED_DONOR_IDS), expanding=True),
        bindparam("excluded_names", value=list(EXCLUDED_DONOR_NAMES), expanding=True),
    )
    df = read_sql_full(query, source_engine)
    if df.empty:
        return df
    df["id_donor"] = df["id_donor"].astype(str)
    df["bulan"] = pd.to_datetime(df["bulan"]).dt.date
    df["updated_at"] = now_wib()
    return df[COLS]


def _replace_window(df: pd.DataFrame, start: date) -> None:
    """
    Hapus baris donor_monthly di jendela lalu isi ulang dari staging dalam SATU
    transaksi, jadi transaksi yang dibatalkan/di-unapprove ikut hilang dan
    halaman tidak pernah membaca data setengah jadi.
    """
    if not df.empty:
        stage_dataframe(df, STAGING_TABLE)  # DDL, di luar transaksi utama
    try:
        with dashboard_engine.begin() as conn:
            conn.execute(text(f"DELETE FROM {TARGET_TABLE} WHERE bulan >= :s"), {"s": start})
            if not df.empty:
                sql = build_upsert_sql(
                    TARGET_TABLE, STAGING_TABLE, COLS, no_update=("id_donor", "bulan")
                )
                conn.execute(text(sql))
    finally:
        drop_staging(STAGING_TABLE)


def _rebuild_aggregates(start: date) -> None:
    now = now_wib()
    params = {"s": start, "cur": now.date().replace(day=1), "ts": now}
    with dashboard_engine.begin() as conn:
        conn.execute(text(SQL_DELETE_MONTHLY), {"s": start})
        conn.execute(text(SQL_INSERT_MONTHLY), params)
        conn.execute(text(SQL_DELETE_COHORT))
        conn.execute(text(SQL_INSERT_COHORT), {"cur": params["cur"], "ts": now})


@with_sync_lock("retention")
def run_retention_sync(full: bool = False) -> dict:
    full = full or os.getenv("RETENTION_FULL") == "1"
    db = DashboardSessionLocal()
    run = start_run(db, "retention")
    try:
        start = _window_start(full)
        df = _read_monthly(start)
        log.info("retention: source dibaca (mulai=%s, baris donor-bulan=%d)", start, len(df))

        donors = int(df["id_donor"].nunique()) if not df.empty else 0
        rows = len(df)
        _replace_window(df, start)
        del df
        gc.collect()

        _rebuild_aggregates(start)

        is_full = start == FULL_START
        mark_success(
            run,
            donor_count=donors,
            message=f"{'Full' if is_full else 'Incremental'} sync dari {start}: "
            f"{rows} baris donor-bulan, {donors} donatur",
        )
        db.commit()
        return {"status": "success", "from": str(start), "rows": rows, "donors": donors}
    except Exception as exc:
        mark_failed(db, run, exc)
        raise
    finally:
        db.close()
        drop_staging(STAGING_TABLE)