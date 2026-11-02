import gc
import logging

import pandas as pd
from sqlalchemy import bindparam, text

from app.db.session import source_engine, dashboard_engine, DashboardSessionLocal
# from app.models.donor_segment_history import DonorSegmentHistory
from app.services.rfm import format_phone, is_valid_phone, standardize_name
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

TARGET_TABLE = "donor_non"
STAGING_TABLE = "donor_non_staging"

QUERY_DONOR = text(
    """
    SELECT
        d.id_donatur AS id_donor, d.donatur AS nama_donor, d.hp AS hp_donor,
        d.email AS email_donor, d.tgl_reg
    FROM corez_donatur d
    WHERE d.id_donatur NOT IN :excluded_ids
      AND d.donatur NOT IN :excluded_names
    """
).bindparams(
    bindparam("excluded_ids", value=list(EXCLUDED_DONOR_IDS), expanding=True),
    bindparam("excluded_names", value=list(EXCLUDED_DONOR_NAMES), expanding=True),
)

QUERY_TRANSAKSI = text(
    """
    SELECT t.id_transaksi, t.id_donatur AS id_donor, t.transaksi AS nominal,
           t.tgl_transaksi AS tanggal_donasi
    FROM corez_transaksi t
    WHERE t.id_donatur NOT IN :excluded_ids
      AND t.approved_transaksi = 'y'
    """
).bindparams(
    bindparam("excluded_ids", value=list(EXCLUDED_DONOR_IDS), expanding=True),
)

@with_sync_lock("donor_non")
def run_donor_non_sync() -> dict:
    db = DashboardSessionLocal()
    run = start_run(db, "donor_non")
    try : 
        donors = read_sql_full(QUERY_DONOR, source_engine)
        trx = read_sql_full(QUERY_TRANSAKSI, source_engine) 
        df_final = donors[~donors["id_donor"].isin(trx["id_donor"])].copy()
        
        df_final['hp'] = df_final['hp_donor'].apply(format_phone).astype("string")
        df_final["hp"] = df_final["hp"].where(df_final["hp"].str.len() <= 15)
        dup = df_final["hp"].notna() & df_final.duplicated("hp", keep="first")
        df_final.loc[dup, "hp"] = pd.NA
        df_final["is_valid"] = df_final["hp"].apply(is_valid_phone)
        df_final['is_active'] = df_final['is_valid'].astype(int)
        
        df_final['tgl_reg'] = pd.to_datetime(df_final["tgl_reg"].replace(
        ["0000-00-00", "0000-00-00 00:00:00", ""], pd.NA ), errors="coerce")
        df_final["tgl_reg"] = df_final["tgl_reg"].astype(object)
        df_final.loc[df_final["tgl_reg"].isna(), "tgl_reg"] = None
        
        df_final['nama_donor'] = df_final['nama_donor'].apply(standardize_name)
        
        df_final = df_final[['id_donor', 'nama_donor', 'email_donor', 'hp', 'is_valid', 'tgl_reg']]
        df_final = df_final[df_final['nama_donor'].fillna("").str.strip() != ""]
        df_final = df_final.rename(columns={'nama_donor':'nama', 'email_donor':'email'})
        del donors, trx
        gc.collect()
        stage_dataframe(df_final, STAGING_TABLE)
        db.commit()
        sql = build_upsert_sql(
            TARGET_TABLE, STAGING_TABLE, list(df_final.columns)
        )
        db.execute(text(sql))
        mark_success(
            run,
            donor_count=len(df_final),
            message=(
                f"Synced {len(df_final)} valid donors, "
            ),
        )
        db.commit()
        return {
            "status": "success",
            "donor_count": len(df_final),
        }
    except Exception as exc:
        mark_failed(db, run, exc)
        raise
    finally:
        db.close()
        drop_staging(STAGING_TABLE)
    
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(run_donor_non_sync())