"""
Logika pembersihan data donor dan perhitungan RFM.

Konvensi:
- fungsi `*_series` menerima/mengembalikan pd.Series (untuk kolom DataFrame)
- fungsi tanpa `_series` menerima satu nilai (untuk endpoint detail, dll.)
"""
from __future__ import annotations

import re
import warnings

import numpy as np
import pandas as pd

from app.core.timeutil import now_wib

# --------------------------------------------------------------------------- #
# Konstanta
# --------------------------------------------------------------------------- #
DUMMY_ID = "9999999999999"
MAX_CAMPAIGN_LENGTH = 255
CORCOM_CRM_IDS = ("1012022001041", "1012024001088", "1082018001020", "10320170010016")

SUSPICIOUS_PHONE_PATTERNS = {
    "sequential_ascending": re.compile(r"0123456789|1234567890|123456789"),
    "sequential_descending": re.compile(r"9876543210|987654321"),
    "all_same_digit": re.compile(r"^628(\d)\1{6,}$"),
    "repeating_pair": re.compile(r"^628(\d{2})\1{3,}$"),
    "zero_dummy": re.compile(r"^6281{1,3}0{5,}$"),
    "repeating_108": re.compile(r"^628108108108\d*$"),
    # Di kode asal ada dua key "repeating_80"; yang kedua menimpa yang pertama,
    # jadi pola ^6280808080\d*$ tidak pernah aktif. Perilaku dipertahankan.
    "repeating_80": re.compile(r"^62880808080\d*$"),
    "repeating_8_suffix": re.compile(r"^628\d*8{3,}$"),
    "long_repeated_digit": re.compile(r"(\d)\1{3,}"),
}

ANONYMOUS_PATTERNS = {
    "hamba allah", "hamba alloh", "anonim", "anonymous", "tanpa nama",
    "ny", "ny.", "bpk", "bpk.", "ibu", "bapak", "-", "a", "b", "x", "xx",
    "donatur", "donatur baik", "baik hati", "saya", "aku", "fulan", "zz", "zzz",
}

# FIXME: beberapa entri kehilangan koma sehingga tergabung jadi satu string
# ('fidyah' + 'Sholat Subuh Berjamaah', 'Sapi Hemat' + 'Kambing Dahsyat') dan
# tidak pernah cocok. Dibiarkan agar hasil sama dengan versi sebelumnya.
PROGRAM_CATEGORIES = {
    "Infak": [
        'Bantuan Kesejahteraan', 'Infaq Umum', 'Kado Santri Dhuafa', 'Sedekah Shubuh',
        'Paket Alquran', 'Fidyah', 'Kifarat', 'Bingkisan Sembako Ramadhan',
        'Berbagi Paket Berbuka dan Sahur', 'Ramadhan On The Road', 'Program Ramadhan',
        'fidyah'
        'Sholat Subuh Berjamaah',
    ],
    "Infrastruktur Masjid": [
        'Masjid Bencana', 'Pembangunan Masjid', 'Renovasi Masjid', 'Sumur Masjid',
        'Bahan Baku Masjid', 'Rumah Marbot dan Dai', 'Toilet Masjid',
        'Pembangunan Masjid Korporat', 'Masjidku Kokoh', 'Pembangunan Mesjid',
        'Pembangunan Masjidd',
    ],
    "Kurban": [
        'Kambing Hebat', 'Kambing Hemat', 'Kambing Hikmat', 'Sapi 1/7', 'Sapi Dahsyat',
        'Sapi Hebat', 'Sedekah Daging 3In1', 'Sedekah Daging 4In1',
        'Sedekah Daging Kurban', 'Sedekah Daging Palestina', 'Sapi Hikmat',
        'Sapi Hemat'
        'Kambing Dahsyat',
        'Kurban Masjid Pelosok', 'Program Qurban',
    ],
    "Palestina": [
        'Bankes Palestina', 'Fidyah Palestina', 'Kapal Kemanusiaan Palestina',
        'Palestina Masjid', 'Berbagi Paket Berbuka Palestina', 'Sedekah Air Palestina',
        'Palestina',
        ' Berbagi Paket Berbuka Palestina',  # FIXME: spasi di depan
    ],
    "Sarana Operasional Masjid": [
        'Marbot dan Imam Masjid', 'Operasional Mobile Masjid', 'Sarana Masjid',
        'Sedekah 3 In 1', 'Tebar Karpet masjid', 'Tebar Mukena',
        'THR Marbot & Guru Ngaji', 'Sedekah Masjid 3 In 1', 'Sarana dan Prasarana',
        'Speaker Masjid', 'Toilet Sehat',
    ],
    "Sudan": 'Bankes Sudan',
    "Wakaf": ['Wakaf Air', 'Wakaf Al Quran', 'Wakaf Masjid'],
    "Zakat": ['Zakat Maal Palestina', 'Zakat Mal', 'Zakat Fitrah',
              'Zakat Fitrah Palestina', 'Zakat'],
    "Operasional": 'Operasional',
    "Kemanusiaan": 'Kemanusiaan',
}

# Lookup nama program -> kategori, dibangun sekali (first match menang).
_CATEGORY_LOOKUP: dict[str, str] = {}
for _cat, _names in PROGRAM_CATEGORIES.items():
    for _n in ([_names] if isinstance(_names, str) else _names):
        _CATEGORY_LOOKUP.setdefault(_n, _cat)


# --------------------------------------------------------------------------- #
# Fungsi satu nilai (dipakai endpoint detail dan modul lain)
# --------------------------------------------------------------------------- #
def get_campaign(keterangan):
    """Ambil bagian ke-3 dari 'a | b | campaign | ...'. None kalau tidak ada/terlalu panjang."""
    if not isinstance(keterangan, str):
        return None
    parts = keterangan.split(" | ")
    if len(parts) >= 3:
        campaign = parts[2].strip()
        if 0 < len(campaign) <= MAX_CAMPAIGN_LENGTH:
            return campaign
    return None


def segment_label(row):
    """Versi per-baris dari segment_series (legacy)."""
    r, f = row["recency_days"], row["frequency"]
    f_s, m_s = row["frequency_score"], row["monetary_score"]
    if f <= 2:
        return "New Donor"
    if m_s == 5 and r <= 90:
        return "Champion"
    if f_s == 4 and m_s == 4 and r <= 120:
        return "Loyal"
    if r <= 180:
        return "Active"
    if r >= 360:
        return "Passive"
    return "Potential"


def jenis_donor_label(id_jenis, nominal, id_crm):
    """Versi per-baris dari jenis_donor_series (legacy)."""
    if id_crm in CORCOM_CRM_IDS:
        return "CorCom"
    if id_crm == "1022021001036" and nominal >= 10_000_000:
        return "Retail - Platinum"
    if nominal >= 10_000_000 and id_jenis == 1:
        return "Retail - Platinum"
    if id_jenis == 1:
        return "Retail"
    if id_jenis in (2, 3):
        return "CorCom"
    if id_jenis == 5:
        return "Crowdfunding"
    return "Retail"


# --------------------------------------------------------------------------- #
# Fungsi vektor (untuk kolom DataFrame)
# --------------------------------------------------------------------------- #
def _startswith(s: pd.Series, prefix: str) -> pd.Series:
    return s.str.startswith(prefix).fillna(False).astype(bool)


def format_phone_series(s: pd.Series) -> pd.Series:
    """Normalisasi nomor HP ke format 62xxxxxxxx; NA kalau tidak dikenali."""
    c = s.astype("string").str.strip().str.replace(r"[^\d+]", "", regex=True)
    out = pd.Series(pd.NA, index=c.index, dtype="string")

    m1 = _startswith(c, "+62")
    m2 = ~m1 & _startswith(c, "62")
    m3 = ~m1 & ~m2 & _startswith(c, "0")          # "08..." dan "0..." sama: "62" + c[1:]
    m4 = ~m1 & ~m2 & ~m3 & _startswith(c, "8")

    out[m1] = "62" + c[m1].str[3:]
    out[m2] = c[m2]
    out[m3] = "62" + c[m3].str[1:]
    out[m4] = "62" + c[m4]
    return out


def is_valid_phone_series(p: pd.Series) -> pd.Series:
    """Format 628 + 7-11 digit dan tidak cocok pola nomor mencurigakan."""
    ok = p.str.match(r"^628\d{7,11}$").fillna(False).astype(bool)
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message="This pattern is interpreted as a regular expression")
        for pat in SUSPICIOUS_PHONE_PATTERNS.values():
            ok &= ~p.str.contains(pat.pattern, regex=True).fillna(False).astype(bool)
    return ok


def standardize_name_series(s: pd.Series) -> pd.Series:
    v = s.astype("string").str.strip()
    low = v.str.lower()
    bad = (v.isna() | (v == "") | low.isin(ANONYMOUS_PATTERNS) | (low.str.len() <= 2)).fillna(True)
    return v.str.title().mask(bad.astype(bool), "Sobat Masjid")


def get_campaign_series(ket: pd.Series) -> pd.Series:
    third = ket.astype("string").str.split(" | ", n=3, regex=False).str[2].str.strip()
    return third.where(third.str.len().between(1, MAX_CAMPAIGN_LENGTH))


def pick_names(donor: pd.DataFrame) -> pd.Series:
    """Nama paling sering muncul per id_donor_final (abaikan 'Sobat Masjid')."""
    d = donor.loc[donor["nama_clean"] != "Sobat Masjid", ["id_donor_final", "nama_clean"]]
    cnt = d.groupby(["id_donor_final", "nama_clean"], sort=False).size().reset_index(name="cnt")
    best = cnt.sort_values("cnt", ascending=False, kind="stable").drop_duplicates("id_donor_final")
    return best.set_index("id_donor_final")["nama_clean"]


def build_canonical_map(df_donor: pd.DataFrame, df_transactions: pd.DataFrame) -> dict:
    """
    Petakan id_donor duplikat ke id kanonik (yang paling banyak transaksi).
    Hanya untuk nomor VALID; nomor invalid tidak bisa dipercaya sebagai kunci.
    """
    valid = df_donor.loc[df_donor["phone_valid"], ["id_donor", "phone_clean"]]
    trx_count = df_transactions.groupby("id_donor").size().rename("trx_count")
    valid = valid.merge(trx_count, on="id_donor", how="left")
    valid["trx_count"] = valid["trx_count"].fillna(0)

    multi = valid.groupby("phone_clean")["id_donor"].transform("nunique") > 1
    valid = valid[multi].sort_values(
        ["phone_clean", "trx_count", "id_donor"], ascending=[True, False, True]
    )
    valid["canonical"] = valid.groupby("phone_clean")["id_donor"].transform("first")
    return dict(zip(valid["id_donor"], valid["canonical"]))


def get_favorite(df, group_col, target_col, output_col):
    """Nilai target_col paling sering per group_col (seri: urut abjad)."""
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


def calc_rfm_score(df: pd.DataFrame, bins: int = 5) -> pd.DataFrame:
    df = df.copy()
    df["recency_days"] = df["recency_days"].clip(lower=0)

    # Recency: kuantil, makin baru makin tinggi
    r = pd.qcut(df["recency_days"], bins, labels=False, duplicates="drop")
    max_score = int(r.max()) if not r.isna().all() else 0
    df["recency_score"] = (max_score - r + 1).fillna(1).astype(int)

    # Frequency: batas tetap
    df["frequency_score"] = pd.cut(
        df["frequency"],
        bins=[0, 1, 2, 4, 9, float("inf")],
        labels=[1, 2, 3, 4, 5],
        include_lowest=True,
    ).astype(int)

    # Monetary: batas tetap (rupiah)
    df["monetary_score"] = pd.cut(
        df["monetary"],
        bins=[0, 100_000, 250_000, 500_000, 2_500_000, float("inf")],
        labels=[1, 2, 3, 4, 5],
        right=False,
        include_lowest=True,
    ).astype(int)
    return df


def jenis_donor_series(out: pd.DataFrame) -> pd.Series:
    """Urutan kondisi sama dengan jenis_donor_label (kondisi pertama yang cocok menang)."""
    nominal, jenis, crm = out["max_donation"], out["id_jenis"], out["id_crm"]
    conds = [
        crm.isin(CORCOM_CRM_IDS),
        (crm == "1022021001036") & (nominal >= 10_000_000),
        (nominal >= 10_000_000) & (jenis == 1),
        jenis == 1,
        jenis.isin([2, 3]),
        jenis == 5,
    ]
    choices = ["CorCom", "Retail - Platinum", "Retail - Platinum", "Retail", "CorCom", "Crowdfunding"]
    return pd.Series(np.select(conds, choices, default="Retail"), index=out.index)


def segment_series(out: pd.DataFrame) -> pd.Series:
    """Urutan kondisi sama dengan segment_label."""
    r, f = out["recency_days"], out["frequency"]
    f_s, m_s = out["frequency_score"], out["monetary_score"]
    conds = [
        f <= 2,
        (m_s == 5) & (r <= 90),
        (f_s == 4) & (m_s == 4) & (r <= 120),
        r <= 180,
        r >= 360,
    ]
    choices = ["New Donor", "Champion", "Loyal", "Active", "Passive"]
    return pd.Series(np.select(conds, choices, default="Potential"), index=out.index)


# --------------------------------------------------------------------------- #
# Pipeline utama
# --------------------------------------------------------------------------- #
def build_rfm_donor(df_donor, df_transactions, df_program, df_payment):
    # 1) Bersihkan donor & transaksi
    donor = df_donor[df_donor["id_donor"] != DUMMY_ID].copy()
    trx = df_transactions[df_transactions["id_donor"] != DUMMY_ID].copy()

    donor["phone_clean"] = format_phone_series(donor["hp_donor"])
    donor["phone_valid"] = is_valid_phone_series(donor["phone_clean"])
    donor["nama_clean"] = standardize_name_series(donor["nama_donor"])

    # 2) Gabungkan id_donor duplikat (berdasarkan nomor valid)
    canonical = build_canonical_map(donor, trx)
    donor["id_donor_final"] = donor["id_donor"].map(canonical).fillna(donor["id_donor"])
    trx["id_donor_final"] = trx["id_donor"].map(canonical).fillna(trx["id_donor"])
    trx["campaign"] = get_campaign_series(trx["keterangan"])
    trx = trx.drop(columns="keterangan")  # kolom teks terberat, tidak dipakai lagi

    donor["nama_final"] = donor["id_donor_final"].map(pick_names(donor)).fillna("Sobat Masjid")
    email = donor["email_donor"].astype("string").str.strip()
    donor["email_clean"] = donor["email_donor"].where(email.notna() & email.ne(""))

    # 3) Master donor. Nomor invalid tetap masuk; dibedakan lewat is_valid (1/0).
    donor_master = (
        donor.groupby("id_donor_final")
        .agg(
            nama=("nama_final", "first"),
            hp=("phone_clean", "first"),
            email=("email_clean", "first"),
            id_jenis=("id_jenis", "first"),
            id_crm=("id_crm", "first"),
            is_valid=("phone_valid", "max"),
        )
        .reset_index()
        .rename(columns={"id_donor_final": "id_donor"})
    )
    donor_master["is_valid"] = donor_master["is_valid"].astype(int)

    # 4) Gabungkan transaksi dengan program & payment
    df_program = df_program.copy()
    df_payment = df_payment.copy()
    df_program["id_program"] = df_program["id_program"].astype(str)
    trx["id_program"] = trx["id_program"].astype(str)

    full = trx.merge(df_program, on="id_program", how="left").merge(df_payment, on="id_payment", how="left")
    del trx
    full = full[full["id_donor_final"].isin(donor_master["id_donor"])].copy()
    full["tanggal_donasi"] = pd.to_datetime(full["tanggal_donasi"])

    # 5) Agregasi + skor RFM
    agg = full.groupby("id_donor_final").agg(
        first_donation_date=("tanggal_donasi", "min"),
        last_donation_date=("tanggal_donasi", "max"),
        frequency=("nominal", "count"),
        monetary=("nominal", "sum"),
        min_donation=("nominal", "min"),
        max_donation=("nominal", "max"),
        median_donation=("nominal", "median"),
        avg_donation=("nominal", "mean"),
    ).reset_index()
    agg["recency_days"] = (pd.Timestamp(now_wib()).normalize() - agg["last_donation_date"]).dt.days
    agg = calc_rfm_score(agg)

    # 6) Jenis donor & segmen; hanya donor Retail yang disimpan
    out = donor_master.merge(agg, left_on="id_donor", right_on="id_donor_final", how="inner")
    out["jenis_donor"] = jenis_donor_series(out)
    out = out[out["jenis_donor"] == "Retail"].copy()
    out["rfm_segment"] = segment_series(out)

    # 7) Favorit & donasi terakhir (hanya untuk donor Retail)
    full = full[full["id_donor_final"].isin(out["id_donor"])]
    fav_program = get_favorite(full, "id_donor_final", "nama_program", "program_favorit")
    fav_payment = get_favorite(full, "id_donor_final", "jenis_payment", "payment_favorit")
    fav_campaign = get_favorite(full, "id_donor_final", "campaign", "campaign_favorit")

    idx_last = full.groupby("id_donor_final")["tanggal_donasi"].idxmax()
    last = full.loc[
        idx_last,
        ["id_donor_final", "tanggal_donasi", "nominal", "nama_program", "jenis_payment", "campaign"],
    ].rename(columns={
        "tanggal_donasi": "tanggal_donasi_terakhir",
        "nominal": "last_donation",
        "nama_program": "program_terakhir",
        "jenis_payment": "payment_terakhir",
        "campaign": "campaign_terakhir",
    })

    for frame in (fav_program, fav_payment, fav_campaign, last):
        out = out.merge(frame, left_on="id_donor", right_on="id_donor_final", how="left", suffixes=("", "_drop"))
    out = out.drop(columns=[c for c in out.columns if c.startswith("id_donor_final")])

    # 8) Kolom turunan & finalisasi
    out["program_category"] = out["program_favorit"].map(_CATEGORY_LOOKUP).fillna("Lainnya")
    out = out.drop(columns=["id_jenis", "id_crm", "recency_score", "frequency_score", "monetary_score"])

    for c in ["first_donation_date", "last_donation_date", "tanggal_donasi_terakhir"]:
        out[c] = pd.to_datetime(out[c], errors="coerce").dt.date
    out[["median_donation", "avg_donation"]] = out[["median_donation", "avg_donation"]].round(2)
    return out