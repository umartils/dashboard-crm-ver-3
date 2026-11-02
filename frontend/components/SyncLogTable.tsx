import type { SyncLog } from "@/app/(protected)/sync-log/page";

type SyncLogTableProps = {
  logs: SyncLog[];
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID").format(value);
}

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
              <th>Jumlah Donor</th>
              {/* <th>Pesan</th> */}
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
                <tr 
                  key={log.id}
                  className="sync-log-row">

                  <td>{formatDate(log.started_at)}</td>

                  <td>{formatDate(log.finished_at)}</td>

                  <td>
                    <span
                      className={getStatusClass(
                        log.status
                      )}
                    >
                      {log.status}
                    </span>
                  </td>

                  <td>
                    {formatNumber(log.donor_count)}
                  </td>

                  {/* <td className="sync-log-message">
                    {log.message || "-"}
                  </td> */}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}