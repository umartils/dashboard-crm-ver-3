from __future__ import annotations

import re
import pandas as pd
import numpy as np

SUSPICIOUS_PHONE_PATTERNS = {
    "sequential_ascending": re.compile(r"0123456789|1234567890|123456789"),
    "sequential_descending": re.compile(r"9876543210|987654321"),
    "all_same_digit": re.compile(r"^628(\d)\1{6,}$"),
    "repeating_pair": re.compile(r"^628(\d{2})\1{3,}$"),
    "zero_dummy": re.compile(r"^6281{1,3}0{5,}$"),
    "repeating_108": re.compile(r"^628108108108\d*$"),
    "repeating_80": re.compile(r"^6280808080\d*$"),
    "repeating_80": re.compile(r"^62880808080\d*$"),
    "repeating_8_suffix": re.compile(r"^628\d*8{3,}$"),
    "long_repeated_digit": re.compile(r"(\d)\1{3,}"),
}

ANONYMOUS_PATTERNS = {
    "hamba allah", "hamba alloh", "anonim", "anonymous", "tanpa nama",
    "ny", "ny.", "bpk", "bpk.", "ibu", "bapak", "-", "a", "b", "x", "xx",
    "donatur", "donatur baik", "baik hati",  "saya", "aku", "fulan", "zz", "zzz"
}

# JENIS_DONOR = {
#     1: "Retail",
#     2: "Komunitas",
#     3: "Corporate",
#     4: "Kotak",
#     5: "Crowdfunding",
# }

PROGRAM_CATEGORIES = {
    "Infak": [
        'Bantuan Kesejahteraan', 'Infaq Umum', 'Kado Santri Dhuafa', 'Sedekah Shubuh', 'Paket Alquran', 'Fidyah', 'Kifarat',
        'Bingkisan Sembako Ramadhan', 'Berbagi Paket Berbuka dan Sahur', 'Ramadhan On The Road', 'Program Ramadhan', 'fidyah'
        'Sholat Subuh Berjamaah'
    ],
    "Infrastruktur Masjid": [
        'Masjid Bencana', 'Pembangunan Masjid', 'Renovasi Masjid', 'Sumur Masjid', 'Bahan Baku Masjid',
        'Rumah Marbot dan Dai', 'Toilet Masjid', 'Pembangunan Masjid Korporat', 'Masjidku Kokoh', 'Pembangunan Mesjid',
        'Pembangunan Masjidd'
    ],
    "Kurban": [
        'Kambing Hebat', 'Kambing Hemat', 'Kambing Hikmat', 'Sapi 1/7', 'Sapi Dahsyat', 'Sapi Hebat', 'Sedekah Daging 3In1',
        'Sedekah Daging 4In1', 'Sedekah Daging Kurban', 'Sedekah Daging Palestina', 'Sapi Hikmat', 'Sapi Hemat'
        'Kambing Dahsyat', 'Kurban Masjid Pelosok', 'Program Qurban'
    ],
    "Palestina": [
        'Bankes Palestina', 'Fidyah Palestina', 'Kapal Kemanusiaan Palestina', 'Palestina Masjid', 
        'Berbagi Paket Berbuka Palestina', 'Sedekah Air Palestina', 'Palestina', ' Berbagi Paket Berbuka Palestina'
    ],
    "Sarana Operasional Masjid": [
        'Marbot dan Imam Masjid', 'Operasional Mobile Masjid', 'Sarana Masjid', 'Sedekah 3 In 1', 'Tebar Karpet masjid',
        'Tebar Mukena', 'THR Marbot & Guru Ngaji', 'Sedekah Masjid 3 In 1', 'Sarana dan Prasarana',
        'Speaker Masjid', 'Toilet Sehat'
    ],
    "Sudan": 'Bankes Sudan',
    "Wakaf": ['Wakaf Air', 'Wakaf Al Quran', 'Wakaf Masjid'],
    "Zakat": ['Zakat Maal Palestina', 'Zakat Mal', 'Zakat Fitrah', 'Zakat Fitrah Palestina', 'Zakat'],
    "Operasional": 'Operasional',
    "Kemanusiaan": 'Kemanusiaan'
}

def format_phone(hp):
    if pd.isna(hp):
        return None
    raw = str(hp).strip()
    if not raw:
        return None
    cleaned = re.sub(r"[^\d+]", "", raw)
    if cleaned.startswith("+62"):
        return "62" + cleaned[3:]
    if cleaned.startswith("62"):
        return cleaned
    if cleaned.startswith("08"):
        return "62" + cleaned[1:]
    if cleaned.startswith("8"):
        return "62" + cleaned
    if cleaned.startswith("0"):
        return "62" + cleaned[1:]
    return None


def is_valid_phone(phone: str | None) -> bool:
    if not isinstance(phone, str) or not re.match(r"^628\d{7,11}$", phone):
        return False
    return not any(pattern.search(phone) for pattern in SUSPICIOUS_PHONE_PATTERNS.values())


def standardize_name(name):
    if pd.isna(name) or not str(name).strip():
        return "Sobat Masjid"
    value = str(name).strip()
    lowered = value.lower()
    if lowered in ANONYMOUS_PATTERNS or len(lowered) <= 2:
        return "Sobat Masjid"
    return value.title()


def program_category(program_name):
    for category, names in PROGRAM_CATEGORIES.items():
        if isinstance(names, list):
            if program_name in names:
                return category
        elif isinstance(names, str):
            if program_name == names:
                return category
    return "Lainnya"

def pick_representative_name(names):
    valid = [n for n in names if n != "Sobat Masjid"]
    if not valid:
        return "Sobat Masjid"
    return pd.Series(valid).value_counts().idxmax()

MAX_CAMPAIGN_LENGTH = 255

def get_campaign(keterangan):
    if not isinstance(keterangan, str):
        return None

    parts = keterangan.split(" | ")

    if len(parts) >= 3:
        campaign = parts[2].strip()

        if 0 < len(campaign) <= MAX_CAMPAIGN_LENGTH:
            return campaign

    return None


def build_canonical_map(df_donor: pd.DataFrame, df_transactions: pd.DataFrame) -> dict:
    # Dedup/penggabungan id_donor duplikat HANYA dilakukan untuk nomor yang valid.
    # Nomor invalid tidak digabung karena tidak bisa dipercaya sebagai kunci pencocokan.
    valid = df_donor[df_donor["phone_valid"]].copy()
    trx_count = df_transactions.groupby("id_donor").size().rename("trx_count")
    valid = valid.merge(trx_count, on="id_donor", how="left")
    valid["trx_count"] = valid["trx_count"].fillna(0)
    result = {}
    for _, group in valid.groupby("phone_clean"):
        if group["id_donor"].nunique() <= 1:
            continue
        group = group.sort_values(["trx_count", "id_donor"], ascending=[False, True])
        canonical = group.iloc[0]["id_donor"]
        for donor_id in group["id_donor"]:
            result[donor_id] = canonical
    return result


def get_favorite(df, group_col, target_col, output_col):
    clean = df.dropna(subset=[target_col])
    if clean.empty:
        return pd.DataFrame(columns=[group_col, output_col, f"{output_col}_count"])
    counted = (
        clean.groupby([group_col, target_col]).size().reset_index(name="cnt")
        .sort_values([group_col, "cnt", target_col], ascending=[True, False, True])
        .drop_duplicates(group_col)
    )
    return counted.rename(columns={target_col: output_col, "cnt": f"{output_col}_count"})[
        [group_col, output_col, f"{output_col}_count"]
    ]


def calc_rfm_score(df, bins=5):
    df = df.copy()
    df["recency_days"] = df["recency_days"].clip(lower=0)

    r = pd.qcut(df["recency_days"], bins, labels=False, duplicates="drop")
    max_score = int(r.max()) if not r.isna().all() else 0
    df["recency_score"] = (max_score - r + 1).fillna(1).astype(int)

    freq_edges = [0, 1, 2, 4, 9, float("inf")]
    df["frequency_score"] = pd.cut(
        df["frequency"], bins=freq_edges, labels=[1, 2, 3, 4, 5], include_lowest=True
    ).astype(int)

    # m = pd.qcut(df["monetary"], bins, labels=False, duplicates="drop")
    # df["monetary_score"] = (m + 1).fillna(1).astype(int)
    monetary_edges = [
        0,
        100_000,
        250_000,
        500_000,
        2_500_000,
        float("inf")
    ]

    df["monetary_score"] = pd.cut(
        df["monetary"],
        bins=monetary_edges,
        labels=[1, 2, 3, 4, 5],
        right=False,
        include_lowest=True
    ).astype(int)
    
    return df
 

def segment_label(row):
    r, f, m = row["recency_days"], row["frequency"], row["monetary"]
    r_s, f_s, m_s = row["recency_score"], row["frequency_score"], row["monetary_score"]

    # if row['jenis_donor'] == 'Retail - Platinum':
    #     return "Platinum"
    # if row['jenis_donor'] not in ('Retail', 'Retail (Pak Danar)'):
    #     return "Other"
    if r <= 60 and f == 1 and m_s <= 2:
        return "New Donor"
    if m_s == 5 and r <= 90:
        return "Champion"
    if f_s == 4 and m_s == 4 and r <= 90:
        return "Loyal"
    if r <= 180:
        return "Active"
    if r >= 360:
        return "Passive"
    return "Potential"

def jenis_donor_label(id_jenis, nominal, id_crm):
    if id_crm in ("1012022001041", "1012024001088", "1082018001020", "10320170010016"): 
        return "CorCom"
    if id_crm == "1022021001036" and nominal >= 10000000:
        return "Retail - Platinum"
    # if id_crm == "1022021001036" and nominal < 10000000:
    #     return "Retail (Pak Danar)"
    if nominal >= 10000000 and id_jenis == 1:
        return "Retail - Platinum"
    if id_jenis == 1:
        return "Retail"
    if id_jenis in (2,3):
        return "CorCom"
    if id_jenis == 5:
        return "Crowdfunding"
    # if id_jenis == 3:
    #     return "Corporate"
    return "Retail"


def build_rfm_donor(df_donor, df_transactions, df_program, df_payment):
    donor = df_donor.copy()
    trx = df_transactions.copy()

    donor["phone_clean"] = donor["hp_donor"].apply(format_phone).astype("string")
    donor["phone_valid"] = donor["phone_clean"].apply(is_valid_phone)
    
    donor["nama_clean"] = donor["nama_donor"].apply(standardize_name)

    canonical = build_canonical_map(donor, trx)
    donor["id_donor_final"] = donor["id_donor"].map(lambda x: canonical.get(x, x))
    trx["id_donor_final"] = trx["id_donor"].map(lambda x: canonical.get(x, x))
    trx['campaign'] = trx['keterangan'].apply(get_campaign)

    names = donor.groupby("id_donor_final")["nama_clean"].apply(pick_representative_name).rename("nama_final")
    donor = donor.merge(names, on="id_donor_final", how="left")
    donor = donor[donor['id_donor'] != "9999999999999"]
    trx = trx[trx['id_donor'] != "9999999999999"]

    # Donor dengan nomor invalid TETAP dimasukkan ke donor_master (tidak difilter lagi),
    # hanya dibedakan lewat kolom is_valid (1 = valid, 0 = tidak valid).
    donor_master = (
        donor
        .groupby("id_donor_final")
        .agg(
            nama=("nama_final", "first"),
            hp=("phone_clean", "first"),
            email=("email_donor", lambda x: next((e for e in x if pd.notna(e) and str(e).strip()), None)),
            id_jenis=("id_jenis", "first"),
            id_crm=("id_crm", "first"),
            is_valid=("phone_valid", "max"),
        )
        .reset_index().rename(columns={"id_donor_final": "id_donor"})
    )
    donor_master["is_valid"] = donor_master["is_valid"].astype(int)

    df_program = df_program.copy(); 
    df_payment = df_payment.copy()
    df_program["id_program"] = df_program["id_program"].astype(str)
    trx["id_program"] = trx["id_program"].astype(str)
    full = trx.merge(df_program, on="id_program", how="left").merge(df_payment, on="id_payment", how="left")
    full = full[full["id_donor_final"].isin(donor_master["id_donor"])]
    full["tanggal_donasi"] = pd.to_datetime(full["tanggal_donasi"])

     
    fav_program = get_favorite(full, "id_donor_final", "nama_program", "program_favorit")
    fav_payment = get_favorite(full, "id_donor_final", "jenis_payment", "payment_favorit")
    fav_campaign = get_favorite(full, "id_donor_final", "campaign", "campaign_favorit")

    idx_last = full.groupby("id_donor_final")["tanggal_donasi"].idxmax()
    last = full.loc[idx_last, ["id_donor_final", "tanggal_donasi", "nominal", "nama_program", "jenis_payment", "campaign"]].rename(columns={
        "tanggal_donasi": "tanggal_donasi_terakhir", 
        "nominal": "last_donation",
        "nama_program": "program_terakhir", 
        "jenis_payment": "payment_terakhir",
        "campaign": "campaign_terakhir",
    })

    agg = full.groupby("id_donor_final").agg(
        first_donation_date=("tanggal_donasi", "min"), last_donation_date=("tanggal_donasi", "max"),
        frequency=("nominal", "count"), monetary=("nominal", "sum"), min_donation=("nominal", "min"),
        max_donation=("nominal", "max"), median_donation=("nominal", "median"), avg_donation=("nominal", "mean"),
    ).reset_index()
    agg["recency_days"] = (pd.Timestamp.now().normalize() - agg["last_donation_date"]).dt.days
    agg = calc_rfm_score(agg)

    out = donor_master.merge(agg, left_on="id_donor", right_on="id_donor_final", how="inner")
    out["jenis_donor"] = out.apply(
        lambda row: jenis_donor_label(row["id_jenis"], row["max_donation"], row["id_crm"]), axis=1
    )
    out = out[out['jenis_donor'] == "Retail"]
    out["rfm_segment"] = out.apply(segment_label, axis=1)
    for frame in (fav_program, fav_payment, fav_campaign, last):
        out = out.merge(frame, left_on="id_donor", right_on="id_donor_final", how="left", suffixes=("", "_drop"))
    out = out.drop(columns=[c for c in out.columns if c.startswith("id_donor_final")])
    
    out["program_category"] = out["program_favorit"].apply(program_category)
    out = out.drop(columns=["id_jenis", "id_crm", "recency_score", "frequency_score", "monetary_score"])

    for c in ["first_donation_date", "last_donation_date", "tanggal_donasi_terakhir"]:
        out[c] = pd.to_datetime(out[c], errors="coerce").dt.date
    out[["median_donation", "avg_donation"]] = out[["median_donation", "avg_donation"]].round(2)
    return out