from __future__ import annotations

import gc
import logging

from sqlalchemy import text

from app.db.session import source_engine, DashboardSessionLocal
from app.services.donor_summary import build_donor_summary
from app.services.sync.sync_common import (
    mark_failed,
    mark_success,
    read_sql_full,
    start_run,
    upsert_via_staging,
    with_sync_lock
)

log = logging.getLogger(__name__)

TARGET_TABLE = "mn_donor_summary"
# Nama staging BEDA dari sync RFM (donor_summary_staging) supaya tidak saling timpa.
STAGING_TABLE = "mn_donor_summary_staging"

# Sengaja TIDAK memfilter id_jenis dan nama donor: halaman ini untuk "semua
# donatur". Hanya donor dummy 9999999999999 yang dibuang.
QUERY_DONOR_SUMMARY = text(
    """
    SELECT d.id_donatur AS id_donor, d.donatur AS nama_donor, d.hp AS hp_donor,
           d.id_jenis, d.id_crm
    FROM corez_donatur d
    WHERE d.id_donatur != '9999999999999'
    """
)

QUERY_TRANSAKSI = text(
    """
    SELECT t.id_transaksi, t.id_donatur AS id_donor, t.transaksi AS nominal,
           t.tgl_transaksi AS tanggal_donasi, t.coa_debet AS id_payment,
           t.id_program, t.keterangan AS keterangan
    FROM corez_transaksi t
    WHERE t.transaksi IS NOT NULL AND t.transaksi > 0
      AND t.id_donatur != '9999999999999'
      AND t.approved_transaksi = 'y'
    """
)


@with_sync_lock("donor_summary")
def run_donor_summary_sync() -> dict:
    """
    Sync terpisah dari run_rfm_sync(): tabel ini tidak menyimpan komponen RFM.
    Riwayat dicatat di SyncRun dengan sync_type="donor_summary".
    """
    db = DashboardSessionLocal()
    run = start_run(db, "donor_summary")
    try:
        donors = read_sql_full(QUERY_DONOR_SUMMARY, source_engine)
        trx = read_sql_full(QUERY_TRANSAKSI, source_engine)
        log.info("donor_summary: source dibaca (donor=%d, transaksi=%d)", len(donors), len(trx))

        ringkasan = build_donor_summary(donors, trx)
        del donors, trx
        gc.collect()

        upsert_via_staging(ringkasan, TARGET_TABLE, STAGING_TABLE, no_update=("id_donor",))

        mark_success(run, len(ringkasan), f"Synced {len(ringkasan)} donor ringkasan rows")
        db.commit()
        return {"status": "success", "donor_count": len(ringkasan)}
    except Exception as exc:
        mark_failed(db, run, exc)
        raise
    finally:
        db.close()