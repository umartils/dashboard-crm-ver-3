import type { SyncLog } from "@/app/(protected)/sync-log/page";
import { formatDateTime, formatNumber } from "@/lib/format";

type SyncLogTableProps = {
  logs: SyncLog[];
};


function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "success":
    case "completed":
      return "sync-status sync-status-success";

    case "failed":
    case "error":
      return "sync-status sync-status-failed";

    case "running":
    case "processing":
      return "sync-status sync-status-running";

    default:
      return "sync-status";
  }
} 

export default function SyncLogTable({logs, }: SyncLogTableProps) {
    return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="donor-table">
          <thead>
            <tr>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Status</th>
              <th>Tipe Sinkron</th>
              <th>Jumlah Data</th>
            </tr>
          </thead>
 
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="sync-log-empty"
                >
                  Belum ada riwayat sinkronisasi.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="sync-log-row">

                  <td>{formatDateTime(log.started_at)}</td>
                  <td>{formatDateTime(log.finished_at)}</td>
                  <td>
                    <span className={getStatusClass( log.status )} >
                      {log.status}
                    </span>
                  </td>
                  <td>{log.type || "-"}</td>
                  <td>{formatNumber(log.donor_count)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}