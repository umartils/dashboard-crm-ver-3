import gc
import logging

import pandas as pd
from sqlalchemy import bindparam, text

from app.db.session import source_engine, dashboard_engine, DashboardSessionLocal
from app.models.donor_segment_history import DonorSegmentHistory
from app.services.rfm import build_rfm_donor
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

TARGET_TABLE = "donor_summary"
STAGING_TABLE = "donor_summary_staging"

QUERY_DONOR = text(
    """
    SELECT
        d.id_donatur AS id_donor, d.donatur AS nama_donor, d.hp AS hp_donor,
        d.email AS email_donor, d.id_jenis, d.id_crm
    FROM corez_donatur d
    WHERE d.id_donatur NOT IN :excluded_ids
      AND d.donatur NOT IN :excluded_names
      AND d.id_jenis NOT IN (2, 3)
    """
).bindparams(
    bindparam("excluded_ids", value=list(EXCLUDED_DONOR_IDS), expanding=True),
    bindparam("excluded_names", value=list(EXCLUDED_DONOR_NAMES), expanding=True),
)

QUERY_TRANSAKSI = text(
    """
    SELECT t.id_transaksi, t.id_donatur AS id_donor, t.transaksi AS nominal,
           t.tgl_transaksi AS tanggal_donasi, t.coa_debet AS id_payment,
           t.id_program, t.keterangan AS keterangan
    FROM corez_transaksi t
    WHERE t.transaksi IS NOT NULL AND t.transaksi > 0
      AND t.id_donatur NOT IN :excluded_ids
      AND t.approved_transaksi = 'y'
    """
).bindparams(
    bindparam("excluded_ids", value=list(EXCLUDED_DONOR_IDS), expanding=True),
)

QUERY_PROGRAM = "SELECT id_program, program AS nama_program FROM setting_program"
QUERY_PAYMENT = "SELECT coa AS id_payment, nama_coa AS jenis_payment FROM fins_coa"

# is_valid TIDAK di-UPDATE: nilainya hanya boleh diubah lewat hasil import
# WhatsApp blast, bukan tertimpa ulang oleh format-check tiap sync. Saat donor
# baru pertama kali di-INSERT, is_valid tetap terisi dari format-check awal.
NO_UPDATE_COLS = ("id_donor", "is_valid", "hp")


def _detect_segment_changes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Bandingkan rfm_segment hasil hitung baru dengan yang tersimpan di
    donor_summary SAAT INI (sebelum di-overwrite upsert). Donor baru tidak
    dianggap "perubahan".
    """
    empty = pd.DataFrame(columns=["id_donor", "old_segment", "new_segment"])
    prev = pd.read_sql(text(f"SELECT id_donor, rfm_segment FROM {TARGET_TABLE}"), dashboard_engine)
    if prev.empty:
        return empty

    new = df[["id_donor", "rfm_segment"]].copy()
    new["id_donor"] = new["id_donor"].astype(str)
    prev["id_donor"] = prev["id_donor"].astype(str)

    merged = new.merge(prev, on="id_donor", how="inner", suffixes=("_new", "_old"))
    changed = merged[merged["rfm_segment_old"] != merged["rfm_segment_new"]]
    return changed.rename(
        columns={"rfm_segment_old": "old_segment", "rfm_segment_new": "new_segment"}
    )[["id_donor", "old_segment", "new_segment"]]

@with_sync_lock("rfm")
def run_rfm_sync() -> dict:
    db = DashboardSessionLocal()
    run = start_run(db, "rfm")
    try:
        donors = read_sql_full(QUERY_DONOR, source_engine)
        trx = read_sql_full(QUERY_TRANSAKSI, source_engine)
        programs = pd.read_sql(text(QUERY_PROGRAM), source_engine)
        payments = pd.read_sql(text(QUERY_PAYMENT), source_engine)
        log.info("rfm: source dibaca (donor=%d, transaksi=%d)", len(donors), len(trx))

        summary = build_rfm_donor(donors, trx, programs, payments)
        del donors, trx
        gc.collect()

        segment_changes = _detect_segment_changes(summary)

        # Tulis staging (DDL) dulu, lalu akhiri transaksi lama sebelum upsert.
        stage_dataframe(summary, STAGING_TABLE)
        db.commit()
        sql = build_upsert_sql(
            TARGET_TABLE, STAGING_TABLE, list(summary.columns), no_update=NO_UPDATE_COLS
        )
        db.execute(text(sql))

        if not segment_changes.empty:
            changed_at = now_wib()
            db.bulk_save_objects(
                [
                    DonorSegmentHistory(
                        id_donor=row.id_donor,
                        old_segment=row.old_segment,
                        new_segment=row.new_segment,
                        sync_run_id=run.id,
                        changed_at=changed_at,
                    )
                    for row in segment_changes.itertuples(index=False)
                ]
            )

        mark_success(
            run,
            donor_count=len(summary),
            message=(
                f"Synced {len(summary)} valid donors, "
                f"{len(segment_changes)} segment changes detected"
            ),
        )
        db.commit()
        return {
            "status": "success",
            "donor_count": len(summary),
            "segment_changes": len(segment_changes),
        }
    except Exception as exc:
        mark_failed(db, run, exc)
        raise
    finally:
        db.close()
        drop_staging(STAGING_TABLE)