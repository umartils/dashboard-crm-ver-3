import re
import io
import pandas as pd

FAILED_KEYWORDS = ("failed", "gagal", "undelivered", "invalid", "error", "bounced")
DELIVERED_KEYWORDS = ("delivered", "terkirim", "sent")
READ_KEYWORDS = ("read", "dibaca")
 
PHONE_COLUMN_CANDIDATES = ["Recipient", "nomor", "phone", "no_telp", "hp", "nomor_hp"]
STATUS_COLUMN_CANDIDATES = ["Status", "status_blast", "delivery_status", "status_pengiriman"]

CSV_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")


def read_upload_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    name = filename.lower()

    if name.endswith(".csv"):
        last_exc: Exception | None = None
        for enc in CSV_ENCODINGS:
            try:
                return pd.read_csv(
                    io.BytesIO(content),
                    sep=";",
                    dtype=str,
                    encoding=enc,
                    skipinitialspace=True,
                )
            except UnicodeDecodeError as exc:
                last_exc = exc
                continue
        raise ValueError(f"Encoding CSV tidak dikenali: {last_exc}")

    engine = "openpyxl" if name.endswith(".xlsx") else "xlrd"
    return pd.read_excel(io.BytesIO(content), engine=engine, dtype=str)
 
 
def normalize_phone(raw) -> str | None:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    cleaned = re.sub(r"[^\d+]", "", str(raw))
    if not cleaned:
        return None
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
 
 
def classify_status(raw_status) -> str:
    """Normalisasi status mentah dari provider WA blast jadi salah satu dari:
    'delivered', 'read', 'failed'. Status lain di luar itu dikembalikan apa
    adanya (lowercase) supaya tetap tercatat, tapi tidak mengubah is_valid."""
    text_value = str(raw_status).strip().lower()
 
    if any(keyword in text_value for keyword in FAILED_KEYWORDS):
        return "failed"
    if any(keyword in text_value for keyword in READ_KEYWORDS):
        return "read"
    if any(keyword in text_value for keyword in DELIVERED_KEYWORDS):
        return "delivered"
    return text_value