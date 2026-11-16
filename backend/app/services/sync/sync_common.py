"""
Helper bersama untuk semua job sinkronisasi (rfm, donor_summary, blast).

Isi:
- daftar blacklist donor (satu sumber kebenaran)
- baca data besar dari source DB dengan streaming (hemat RAM)
- upsert lewat staging table (nama staging unik per target)
- pencatatan SyncRun (start / success / failed) + pembersihan run yang tersangkut
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.timeutil import now_wib

import pandas as pd
from sqlalchemy import text

from app.db.session import dashboard_engine
from app.models.donor import SyncRun

import functools
from contextlib import contextmanager

log = logging.getLogger(__name__)

WIB = ZoneInfo("Asia/Jakarta")


# --------------------------------------------------------------------------- #
# Blacklist donor dummy / internal (dipakai oleh sync RFM)
# --------------------------------------------------------------------------- #
EXCLUDED_DONOR_IDS = (
    "17033000100355", "21100500102313", "26050600100070", "26050600100067",
    "9999999999999", "25010700100006", "26050600100072", "26050600100071",
    "25090300100170", "25120100100085", "26050600100068", "26050600100069",
    "162304190004818", "21103000100235", "21122900107982", "22010300119534",
    "22010500102874", "25051700100149", "162204250009605", "18121100100005",
    "26090300100142", "17041800100001", "26090300100144", "17033000100383",
    "18020100100003", "22040600100085", "18051500100878", "23090400100004",
    "17033000100322", "26090300100145", "21103000100039", "18060500100022",
    "17081800100006", "20923000100325",
)
EXCLUDED_DONOR_NAMES = (
    "wendi noorcahyana",
    "rumah zakat",
    "yayasan rumah zakat",
)

GLOBAL_LOCK_NAME = "sync:global"

SYNC_RFM = "donor_rfm"
SYNC_DONOR_SUMMARY = "donor_mn"
SYNC_BLAST = "blast_conversion"

class SyncAlreadyRunning(RuntimeError):
    """Dilempar ketika ada sync lain yang masih berjalan."""

    def __init__(self, requested: str, running: str | None = None):
        self.requested = requested
        self.running = running
        who = f"Sync '{running}'" if running else "Sync lain"
        super().__init__(
            f"{who} sedang berjalan, sync '{requested}' ditolak. Coba lagi setelah selesai."
        )

def _find_running_sync() -> str | None:
    """Best-effort: cari sync_type dari SyncRun yang masih 'running' (hanya untuk pesan error)."""
    try:
        from app.db.session import DashboardSessionLocal

        db = DashboardSessionLocal()
        try:
            row = (
                db.query(SyncRun)
                .filter(SyncRun.status == "running")
                .order_by(SyncRun.id.desc())
                .first()
            )
            return getattr(row, "sync_type", None) if row else None
        finally:
            db.close()
    except Exception:
        return None

@contextmanager
def sync_lock(name: str):
    # GET_LOCK terikat ke koneksi, jadi koneksi ditahan selama sync berjalan.
    # Satu kunci GLOBAL untuk semua jenis sync -> hanya satu sync boleh jalan.
    # Kalau proses mati, koneksi putus dan MySQL melepas kunci otomatis.
    conn = dashboard_engine.connect()
    try:
        got = conn.execute(text("SELECT GET_LOCK(:n, 0)"), {"n": GLOBAL_LOCK_NAME}).scalar()
        if got != 1:
            raise SyncAlreadyRunning(name, _find_running_sync())
        try:
            yield
        finally:
            conn.execute(text("SELECT RELEASE_LOCK(:n)"), {"n": GLOBAL_LOCK_NAME})
    finally:
        conn.close()

import time  # tambahkan di bagian import

@contextmanager
def timed(label: str):
    t = time.perf_counter()
    try:
        yield
    finally:
        log.info("rfm: %s selesai %.1fs", label, time.perf_counter() - t)


def with_sync_lock(name: str):
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            with sync_lock(name):
                return fn(*args, **kwargs)
        return wrapper
    return deco


def is_sync_running() -> bool:
    """Cek cepat tanpa menjalankan sync (berguna untuk endpoint)."""
    with dashboard_engine.connect() as conn:
        got = conn.execute(text("SELECT GET_LOCK(:n, 0)"), {"n": GLOBAL_LOCK_NAME}).scalar()
        if got == 1:
            conn.execute(text("SELECT RELEASE_LOCK(:n)"), {"n": GLOBAL_LOCK_NAME})
            return False
        return True

# --------------------------------------------------------------------------- #
# Baca data dari source DB
# --------------------------------------------------------------------------- #

def read_sql_full(query, engine, chunksize: int = 50_000) -> pd.DataFrame:
    """
    Baca hasil query besar dengan server-side cursor (stream_results) supaya
    driver tidak menampung seluruh hasil sebagai tuple Python sebelum dijadikan
    DataFrame. Memori puncak jauh lebih kecil dibanding read_sql biasa.
    """
    with engine.connect() as conn:
        conn = conn.execution_options(stream_results=True)
        frames = list(pd.read_sql(query, conn, chunksize=chunksize))
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


# --------------------------------------------------------------------------- #
# Upsert via staging table
# --------------------------------------------------------------------------- #
def stage_dataframe(df: pd.DataFrame, staging: str, like: str | None = None) -> None:
    # Tanpa `like`: perilaku lama (dipakai job sync lain yang belum diubah).
    if like is None:
        df.to_sql(staging, dashboard_engine, if_exists="replace", index=False, chunksize=1000)
        return

    # 1) Buat staging sama seperti target, lalu buang SEMUA index selain PRIMARY.
    with timed("  staging: DDL"):
        with dashboard_engine.begin() as conn:
            conn.execute(text(f"DROP TABLE IF EXISTS `{staging}`"))
            conn.execute(text(f"CREATE TABLE `{staging}` LIKE `{like}`"))
            idx = conn.execute(
                text("""
                    SELECT DISTINCT index_name
                    FROM information_schema.statistics
                    WHERE table_schema = DATABASE()
                      AND table_name = :t
                      AND index_name <> 'PRIMARY'
                """),
                {"t": staging},
            ).scalars().all()
            if idx:
                drops = ", ".join(f"DROP INDEX `{n}`" for n in idx)
                conn.execute(text(f"ALTER TABLE `{staging}` {drops}"))

    # 2) Ubah DataFrame jadi list tuple Python (NaN/NaT/NA -> None).
    with timed("  staging: siapkan baris"):
        clean = df.astype(object).where(df.notna(), None)
        rows = list(clean.itertuples(index=False, name=None))
        col_sql = ", ".join(f"`{c}`" for c in df.columns)
        ph = ", ".join(["%s"] * len(df.columns))
        insert_sql = f"INSERT INTO `{staging}` ({col_sql}) VALUES ({ph})"

    # 3) Insert per batch lewat cursor PyMySQL.
    with timed("  staging: insert"):
        raw = dashboard_engine.raw_connection()
        try:
            cur = raw.cursor()
            for i in range(0, len(rows), 10_000):
                cur.executemany(insert_sql, rows[i:i + 10_000])
            raw.commit()
        finally:
            raw.close()


def build_upsert_sql(target: str, staging: str, cols: list[str], no_update=()) -> str:
    """
    INSERT ... SELECT dari staging ke target, ON DUPLICATE KEY UPDATE.
    Kolom di `no_update` (kunci unik, atau kolom yang tidak boleh tertimpa)
    tidak ikut di-UPDATE.
    """
    update_cols = [c for c in cols if c not in no_update]
    insert_cols = ", ".join(f"`{c}`" for c in cols)
    select_cols = ", ".join(f"s.`{c}`" for c in cols)
    update_clause = ", ".join(f"`{c}` = VALUES(`{c}`)" for c in update_cols)
    return f"""
    INSERT INTO `{target}` ({insert_cols})
    SELECT {select_cols} FROM `{staging}` s
    ON DUPLICATE KEY UPDATE {update_clause}
    """

def drop_staging(staging: str) -> None:
    with dashboard_engine.begin() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS `{staging}`"))


def upsert_via_staging(df: pd.DataFrame, target: str, staging: str, no_update=()) -> None:
    stage_dataframe(df, staging, like=target)
    try:
        sql = build_upsert_sql(target, staging, list(df.columns), no_update)
        with dashboard_engine.begin() as conn:
            conn.execute(text(sql))
    finally:
        drop_staging(staging)


# --------------------------------------------------------------------------- #
# Pencatatan SyncRun
# --------------------------------------------------------------------------- #

def start_run(db, sync_type: str) -> SyncRun:
    run = SyncRun(status="running", sync_type=sync_type)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def mark_success(run: SyncRun, donor_count: int, message: str) -> None:
    """Set field saja; pemanggil yang commit (supaya bisa atomik dengan data)."""
    run.status = "success"
    run.finished_at = now_wib()
    run.donor_count = donor_count
    run.message = message[:500]


def mark_failed(db, run: SyncRun, exc: Exception) -> None:
    db.rollback()
    run.status = "failed"
    run.finished_at = now_wib()
    run.message = f"{type(exc).__name__}: {exc}"[:500]
    db.commit()


def close_stale_runs(db, hours: int = 6) -> int:
    """
    Tandai SyncRun yang masih 'running' lebih dari `hours` jam sebagai failed
    (misal proses di-kill OOM sehingga blok except/finally tidak sempat jalan).
    NOTE: asumsi kolom waktu mulai bernama `started_at`; sesuaikan kalau beda.
    """
    started = getattr(SyncRun, "started_at", None)
    if started is None:
        log.warning("SyncRun.started_at tidak ditemukan, pembersihan run tersangkut dilewati")
        return 0
    cutoff = now_wib() - timedelta(hours=hours)
    n = (
        db.query(SyncRun)
        .filter(SyncRun.status == "running", started < cutoff)
        .update(
            {
                "status": "failed",
                "finished_at": now_wib(),
                "message": "Proses terhenti sebelum selesai (kemungkinan OOM/restart server)",
            },
            synchronize_session=False,
        )
    )
    db.commit()
    return n