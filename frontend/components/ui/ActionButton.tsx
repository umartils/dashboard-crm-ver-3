"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, FileSpreadsheet } from "lucide-react";
import { getErrorMessage } from "@/lib/api-error";

type SyncProps = {
  endpoint: string;       // POST: memicu sync (mengembalikan 202)
//   statusEndpoint: string; // GET: status sync terakhir
};

type SyncStatus = {
  running: boolean;
  last_run: { id: number; status: string; message: string | null } | null;
};

const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 30 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchStatus(url: string): Promise<SyncStatus | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SyncStatus;
  } catch {
    return null; // gangguan jaringan sesaat: abaikan, coba lagi di polling berikutnya
  }
}

type ExportProps = {
    endpoint: string;
    params?: string;
}

export function SyncButton({ endpoint }: SyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();
  const cancelled = useRef(false);
  const statusEndpoint = '/api/backend/admin/sync/status';

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Tunggu sampai ada run baru (id berbeda dari baseline) dan tidak lagi running.
  async function waitForFinish(baselineId: number | null, toastId: string | number) {
    const startedAt = Date.now();

    while (!cancelled.current && Date.now() - startedAt < MAX_WAIT_MS) {
      await sleep(POLL_INTERVAL_MS);
      const status = await fetchStatus(statusEndpoint);
      if (!status || status.running) continue;

      const last = status.last_run;
      if (!last || last.id === baselineId) continue; // run baru belum tercatat

      if (last.status === "success") {
        toast.success("Sinkronisasi data berhasil.", {
          id: toastId,
          description: last.message ?? "Data berhasil diperbarui dari sumber terbaru.",
        });
        router.refresh();
      } else {
        toast.error("Sinkronisasi gagal.", {
          id: toastId,
          description: last.message ?? "Terjadi kesalahan saat sinkronisasi data.",
        });
      }
      return;
    }

    if (!cancelled.current) {
      toast.warning("Sinkronisasi belum selesai.", {
        id: toastId,
        description: "Proses masih berjalan di server. Cek riwayat sync beberapa saat lagi.",
      });
    }
  }

  async function handleSync() {
    if (isSyncing) return;
    setIsSyncing(true);

    const toastId = toast.loading("Sinkronisasi data sedang berjalan...");

    try {
      const before = await fetchStatus(statusEndpoint);
      const baselineId = before?.last_run?.id ?? null;

      let response: Response | null = null;
      try {
        response = await fetch(endpoint, { method: "POST" });
      } catch {
        // Jaringan putus: server mungkin sudah menerima, lanjut polling
      }

      if (response && response.status === 409) {
        // Sync lain sedang berjalan: jangan dianggap gagal, cukup pantau.
        toast.loading("Sync lain sedang berjalan, menunggu selesai...", { id: toastId });
        await waitForFinish(baselineId, toastId);
        return;
      }

      // 504/502/503 dari proxy: sync kemungkinan tetap jalan, jadi pantau saja.
      const proxyTimeout = response && [502, 503, 504].includes(response.status);

      if (response && !response.ok && !proxyTimeout) {
        const message = await getErrorMessage(response);
        toast.error("Sinkronisasi gagal", { id: toastId, description: message });
        return;
      }

      await waitForFinish(baselineId, toastId);
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Sinkronisasi gagal.", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan saat sinkronisasi data.",
      });
    } finally {
      if (!cancelled.current) setIsSyncing(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-sync"
      onClick={handleSync}
      disabled={isSyncing}
      title="Sinkronisasi data"
    >
      <RefreshCw size={17} className={isSyncing ? "spin" : ""} />
      <span>{isSyncing ? "Sync..." : "Sync"}</span>
    </button>
  );
}

export function ExportButton({endpoint}: ExportProps) {

    return (
        <a className="btn-download" href={endpoint} >
        <FileSpreadsheet size={17} />
        <span>
            Export
        </span>
        </a>
    )
}