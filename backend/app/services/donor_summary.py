from __future__ import annotations

import pandas as pd
from sqlalchemy.orm import Session
from app.db.session import source_engine
from datetime import date, timedelta
from fastapi import Query
from sqlalchemy import text, bindparam

# Reuse fungsi cleaning yang sudah ada di rfm.py — jangan duplikat logic
# format nomor telp / nama / penggabungan id_donor duplikat, supaya identitas
# donor di tabel ringkasan ini konsisten dengan donor_summary (RFM).
from app.services.rfm import (
    format_phone,
    is_valid_phone,
    standardize_name,
    build_canonical_map,
    pick_representative_name,
    get_campaign 
)
 
def jenis_donor_label(id_jenis, nominal, id_crm, id_donor):
    if id_crm in ("1012022001041", "1012024001088", "1082018001020", "10320170010016"): 
        return "CorCom"
    if id_crm == "1022021001036" and nominal >= 10000000:
        return "Platinum"
    if id_donor in ("26090300100142", "17041800100001", "26090300100144", "17033000100383"
                    "18020100100003", "22040600100085", "18051500100878", "23090400100004"
                    "17033000100322", "26090300100145", "21103000100039", "18060500100022"
                    "17081800100006", "20923000100325", "18121100100005"):
        return "Corcom"
    # if id_crm == "1022021001036" and nominal < 10000000:
    #     return "Retail (Pak Danar)"
    if nominal >= 10000000 and id_jenis == 1:
        return "Platinum"
    if id_jenis == 1:
        return "Personal"
    if id_jenis in (2,3):
        return "CorCom"
    if id_jenis == 5:
        return "Crowdfunding"
    # if id_jenis == 3:
    #     return "Corporate"
    return "Personal"


def build_donor_summary(df_donor: pd.DataFrame, df_transaksi: pd.DataFrame) -> pd.DataFrame:
    """
    Bangun ringkasan donatur (bukan RFM): nama, no telp, jumlah donasi,
    total donasi, tanggal donasi terakhir, dan campaign terakhir.

    df_donor  : kolom minimal -> id_donor, nama_donor, hp_donor
    df_transaksi : kolom minimal -> id_donor, nominal, tanggal_donasi, keterangan
    """
    donor = df_donor.copy()
    trx = df_transaksi.copy()

    donor["phone_clean"] = donor["hp_donor"].apply(format_phone).astype("string")
    donor["phone_valid"] = donor["phone_clean"].apply(is_valid_phone)
    donor["nama_clean"] = donor["nama_donor"].apply(standardize_name)

    # Gabungkan id_donor duplikat berdasarkan no HP yang valid — sama seperti
    # yang dipakai untuk donor_summary, supaya 1 orang tidak terhitung sebagai
    # 2 donatur berbeda hanya karena id_donatur-nya beda.
    canonical = build_canonical_map(donor, trx)
    donor["id_donor_final"] = donor["id_donor"].map(lambda x: canonical.get(x, x))
    trx["id_donor_final"] = trx["id_donor"].map(lambda x: canonical.get(x, x))
    trx["campaign"] = trx["keterangan"].apply(get_campaign)

    names = (
        donor.groupby("id_donor_final")["nama_clean"]
        .apply(pick_representative_name)
        .rename("nama_final")
    )
    donor = donor.merge(names, on="id_donor_final", how="left")

    donor_master = (
        donor.groupby("id_donor_final")
        .agg(
            nama=("nama_final", "first"), 
            no_telp=("phone_clean", "first"),
            id_jenis=("id_jenis", "first"),
            id_crm=("id_crm", "first"),
        )
        .reset_index()
        .rename(columns={"id_donor_final": "id_donor"})
    )

    trx = trx[trx["id_donor_final"].isin(donor_master["id_donor"])]
    trx["tanggal_donasi"] = pd.to_datetime(trx["tanggal_donasi"])

    # Campaign terakhir diambil dari baris transaksi paling baru per donor,
    # bukan campaign paling sering muncul (beda tujuan dari campaign_favorit di RFM)
    idx_last = trx.groupby("id_donor_final")["tanggal_donasi"].idxmax()
    last_campaign = trx.loc[idx_last, ["id_donor_final", "campaign", "nominal"]].rename(
        columns={
            "campaign": "campaign_terakhir",
            "nominal": "last_donation"
        }
    )
     
    agg = trx.groupby("id_donor_final").agg(
        jumlah_donasi=("nominal", "count"),
        total_donasi=("nominal", "sum"),
        max_donation=("nominal", max),
        tgl_terakhir=("tanggal_donasi", "max"),
    ).reset_index()

    out = donor_master.merge(agg, left_on="id_donor", right_on="id_donor_final", how="inner")
    out = out.merge(
        last_campaign,
        left_on="id_donor",
        right_on="id_donor_final",
        how="left",
        suffixes=("", "_drop"),
    )
    out["jenis_donor"] = out.apply(
                lambda row: jenis_donor_label(row["id_jenis"], row["max_donation"], 
                                              row["id_crm"], row['id_donor']),  axis=1
            )
    out = out.drop(columns=[c for c in out.columns if c.endswith("_drop") or c == "id_donor_final"])
 
    out["tgl_terakhir"] = pd.to_datetime(out["tgl_terakhir"], errors="coerce").dt.date
    out["total_donasi"] = out["total_donasi"].round(2)

    return out[
        [
            "id_donor", "nama", "no_telp", "jenis_donor", "jumlah_donasi", 
            "total_donasi", "last_donation", "max_donation", "tgl_terakhir", "campaign_terakhir"
        ]
    ]
    

JENIS_MAPPING = {
    "personal": 1,
    "corporate": 2,
    "community": 3,
}


def _same_period_last_year(d: date) -> date:
    try:
        return d.replace(year=d.year - 1)
    except ValueError:  # 29 Feb -> 28 Feb
        return d.replace(year=d.year - 1, day=28)


def _aggregate(conn, start: date, end: date, jenis_ids: list[int]) -> dict:
    jenis_clause = "AND d.id_jenis IN :jenis_ids" if jenis_ids else ""

    stmt = text(f"""
        SELECT
            COALESCE(SUM(t.transaksi), 0)      AS total_donasi,
            COUNT(DISTINCT t.id_donatur)     AS jumlah_donatur,
            COUNT(t.id_transaksi)            AS jumlah_donasi
        FROM corez_transaksi t
        JOIN corez_donatur d ON d.id_donatur = t.id_donatur
        WHERE approved_transaksi = 'y' AND t.tgl_transaksi >= :start
          AND t.tgl_transaksi <  :end_exclusive
        {jenis_clause}
    """)

    params = {"start": start, "end_exclusive": end + timedelta(days=1)}
    if jenis_ids:
        stmt = stmt.bindparams(bindparam("jenis_ids", expanding=True))
        params["jenis_ids"] = jenis_ids

    row = conn.execute(stmt, params).mappings().one()
    return {
        "total_donasi": float(row["total_donasi"] or 0),
        "jumlah_donatur": int(row["jumlah_donatur"] or 0),
        "jumlah_donasi": int(row["jumlah_donasi"] or 0),
    }


def get_donor_summary_card(
    jenis_donor: list[str] = Query(default=[]),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    today = date.today()
    start_date = start_date or today.replace(day=1)
    end_date = end_date or today

    jenis_ids = [
        JENIS_MAPPING[j.strip().lower()]
        for j in jenis_donor
        if j.strip().lower() in JENIS_MAPPING
    ]

    prev_start = _same_period_last_year(start_date)
    prev_end = _same_period_last_year(end_date)

    with source_engine.connect() as conn:
        current = _aggregate(conn, start_date, end_date, jenis_ids)
        previous = _aggregate(conn, prev_start, prev_end, jenis_ids)

    prev_total = previous["total_donasi"]
    growth_pct = (
        round((current["total_donasi"] - prev_total) / prev_total * 100, 2)
        if prev_total > 0
        else None  # tidak ada pembanding tahun lalu
    )

    return {
        **current,
        "growth_pct": growth_pct,
        "previous_total_donasi": prev_total,
        "period": {"start": start_date, "end": end_date},
        "previous_period": {"start": prev_start, "end": prev_end},
    }