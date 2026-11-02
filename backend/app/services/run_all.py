"""
Entry point cron: menjalankan semua sync secara berurutan.

Pemakaian (dari folder backend, dengan venv aktif):
    python -m app.jobs.run_all                 # semua job
    python -m app.jobs.run_all rfm blast       # sebagian saja

Urutan default: rfm -> donor_summary -> blast.
Exit code 1 kalau ada job yang gagal. Alert Telegram dikirim jika
TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID diset di .env / environment.
"""
import logging
import os
import socket
import sys
import time
import urllib.parse
import urllib.request

try:  # cron tidak memuat .env otomatis
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from app.db.session import DashboardSessionLocal
from app.services.sync.blast_sync import run_blast_conversion_sync
from app.services.sync.donor_sync import run_donor_summary_sync
from app.services.sync.retention_sync import run_retention_sync
from app.services.sync.rfm_sync import run_rfm_sync
from app.services.sync.sync_common import close_stale_runs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("run_all")

JOBS = {
    "rfm": run_rfm_sync,
    "donor_summary": run_donor_summary_sync,
    "blast": run_blast_conversion_sync,
    "retention": run_retention_sync,
}

def send_telegram(message: str) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        log.warning("Telegram tidak dikonfigurasi, alert dilewati")
        return
    try:
        data = urllib.parse.urlencode({"chat_id": chat_id, "text": message[:3500]}).encode()
        req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=data)
        urllib.request.urlopen(req, timeout=10).read()
    except Exception:
        log.exception("Gagal mengirim alert Telegram")


def main() -> int:
    names = sys.argv[1:] or list(JOBS)
    unknown = [n for n in names if n not in JOBS]
    if unknown:
        log.error("Job tidak dikenal: %s (pilihan: %s)", unknown, list(JOBS))
        return 2

    # Bersihkan SyncRun yang tersangkut 'running' dari eksekusi sebelumnya.
    db = DashboardSessionLocal()
    try:
        stale = close_stale_runs(db, hours=6)
        if stale:
            log.warning("%d SyncRun tersangkut ditandai failed", stale)
    finally:
        db.close()

    failures = []
    for name in names:
        started = time.monotonic()
        log.info("MULAI %s", name)
        try:
            result = JOBS[name]()
            log.info("SELESAI %s dalam %.1fs: %s", name, time.monotonic() - started, result)
        except Exception as exc:
            log.exception("GAGAL %s setelah %.1fs", name, time.monotonic() - started)
            failures.append(f"{name}: {type(exc).__name__}: {str(exc)[:200]}")

    if failures:
        send_telegram(
            f"[SYNC GAGAL] {socket.gethostname()}\n" + "\n".join(failures)
            + "\nCek /var/log/dashboard/sync.log"
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())