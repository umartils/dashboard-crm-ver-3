import logging
from datetime import date

import pandas as pd
from sqlalchemy import bindparam, text

from app.db.session import DashboardSessionLocal, dashboard_engine, source_engine
from app.services.sync.sync_common import (
    mark_failed,
    mark_success,
    now_wib,
    start_run,
    upsert_via_staging,
    with_sync_lock
)

log = logging.getLogger(__name__)

TARGET_TABLE = "blast_conversions"
STAGING_TABLE = "blast_conversions_staging"
ID_BATCH_SIZE = 5000  # jumlah id_donor per query IN (...) ke source DB

EMPTY_TRX = pd.DataFrame(columns=["id_donor", "nominal", "tanggal_donasi"])

QUERY_TRX_BY_DONOR = text(
    """
    SELECT
        t.id_donatur AS id_donor,
        t.transaksi AS nominal,
        t.tgl_transaksi AS tanggal_donasi
    FROM corez_transaksi t
    WHERE t.transaksi IS NOT NULL AND t.transaksi > 0
      AND t.id_donatur IN :ids
    """
).bindparams(bindparam("ids", expanding=True))


def _get_blasted_donor_groups() -> pd.DataFrame:
    """
    Ambil donor yang pernah diblast dengan status delivered/read, dikelompokkan
    per (id_donor, bulan blast). Sumber tanggal blast: tgl_prospek di
    whatsapp_blast_results.
    """
    with dashboard_engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    id_donor,
                    MAX(nama_donor) AS nama_donor,
                    MAX(phone_clean) AS phone_clean,
                    DATE_FORMAT(tgl_prospek, '%Y-%m') AS blast_month,
                    MIN(DATE(tgl_prospek)) AS first_blast_date,
                    COUNT(*) AS blast_count
                FROM whatsapp_blast_results
                WHERE is_matched = 1
                  AND status_blast IN ('delivered', 'read')
                  AND id_donor IS NOT NULL
                GROUP BY id_donor, DATE_FORMAT(tgl_prospek, '%Y-%m')
                """
            )
        ).mappings().all()
    return pd.DataFrame([dict(r) for r in rows])


def _get_transactions_for_donors(donor_ids: list[str]) -> pd.DataFrame:
    """
    Ambil transaksi HANYA untuk donor yang pernah diblast, per batch supaya
    query IN (...) tidak membengkak kalau donornya belasan ribu.
    """
    if not donor_ids:
        return EMPTY_TRX.copy()
 
    frames = []
    with source_engine.connect() as conn:
        for i in range(0, len(donor_ids), ID_BATCH_SIZE):
            batch = donor_ids[i : i + ID_BATCH_SIZE]
            frames.append(pd.read_sql(QUERY_TRX_BY_DONOR, conn, params={"ids": batch}))

    return pd.concat(frames, ignore_index=True) if frames else EMPTY_TRX.copy()


@with_sync_lock("blast_conversion")
def run_blast_conversion_sync() -> dict:
    """
    Sync TERPISAH dari run_rfm_sync(): hanya menarik transaksi donor yang
    pernah diblast, jadi tetap ringan. Dicatat di SyncRun (sync_type="blast").
    """
    db = DashboardSessionLocal()
    run = start_run(db, "blast")
    try:
        blasted = _get_blasted_donor_groups()

        if blasted.empty:
            msg = "Belum ada data blast dengan status delivered/read untuk diproses."
            mark_success(run, 0, msg)
            db.commit()
            return {"status": "success", "processed": 0, "message": msg}

        blasted["id_donor"] = blasted["id_donor"].astype(str)
        blasted["blast_month"] = pd.to_datetime(blasted["blast_month"]).dt.date
        blasted["first_blast_date"] = pd.to_datetime(blasted["first_blast_date"]).dt.date

        donor_ids = blasted["id_donor"].unique().tolist()
        trx = _get_transactions_for_donors(donor_ids)

        if not trx.empty:
            trx["id_donor"] = trx["id_donor"].astype(str)
            # normalize() supaya jam diabaikan dan donasi di hari blast tetap masuk (>=)
            trx["tanggal_donasi"] = pd.to_datetime(trx["tanggal_donasi"]).dt.normalize()

            # Jendela per grup blast: dari first_blast_date sampai akhir bulan blast
            window = blasted[["id_donor", "blast_month", "first_blast_date"]].copy()
            window["window_start"] = pd.to_datetime(window["first_blast_date"])
            window["window_end"] = pd.to_datetime(window["blast_month"]) + pd.offsets.MonthEnd(0)

            joined = window.merge(trx, on="id_donor", how="inner")
            joined = joined[
                (joined["tanggal_donasi"] >= joined["window_start"])
                & (joined["tanggal_donasi"] <= joined["window_end"])
            ]

            agg = (
                joined.groupby(["id_donor", "blast_month"])
                .agg(donation_count=("nominal", "count"), donation_amount=("nominal", "sum"))
                .reset_index()
            )
        else:
            agg = pd.DataFrame(
                columns=["id_donor", "blast_month", "donation_count", "donation_amount"]
            )
 
        merged = blasted.merge(agg, on=["id_donor", "blast_month"], how="left")
        merged["donation_count"] = merged["donation_count"].fillna(0).astype(int)
        merged["donation_amount"] = merged["donation_amount"].fillna(0)
        merged["donated"] = merged["donation_count"] > 0
        merged["updated_at"] = now_wib()

        merged = merged[
            [
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
        ]

        upsert_via_staging(
            merged, TARGET_TABLE, STAGING_TABLE, no_update=("id_donor", "blast_month")
        )

        converted = int(merged["donated"].sum())
        rate = round(converted / len(merged) * 100, 2) if len(merged) else 0

        mark_success(
            run,
            len(merged),
            f"Processed {len(merged)} blast groups, {converted} converted ({rate}%)",
        )
        db.commit()
        return {
            "status": "success",
            "processed": len(merged),
            "converted": converted,
            "conversion_rate": rate,
        }
    except Exception as exc:
        mark_failed(db, run, exc)
        raise
    finally:
        db.close()