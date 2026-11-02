import { Info } from "@/components/donorRfm/DonorInfo";
import { rupiah } from "@/lib/api";
import { TablePagination } from "@/components/ui/TablePagination";
import { usePagination } from "@/hooks/usePagination";

type DonorSummaryDetailProps = {
  data: any;
  donorId: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function DonorSummaryDetail({
  data,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: DonorSummaryDetailProps) {
  const profile = data.profile || {};
  const transactions = data.recent_donations || [];

  const { goToPage, changePageSize } = usePagination({
    totalPages,
    mode: "state",
    onPageChange,
    onPageSizeChange,
  });

  return (
    <div className="modal-body">
      <div className="donor-profile-grid">
        <Info label="Nama" value={profile.nama} />
        <Info label="No. HP" value={profile.no_telp} />
        <Info label="Jumlah Donasi" value={profile.jumlah_donasi} />
        <Info label="Total Donasi" value={rupiah(profile.total_donasi)} />
        <Info label="Donasi Terakhir" value={formatDate(profile.tgl_terakhir)} />
        <Info label="Campaign Terakhir" value={profile.campaign_terakhir} />
      </div>

      <div className="modal-section">
        <div className="modal-section-header">
          <h3>Histori Donasi</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="muted">Belum ada histori transaksi.</div>
        ) : (
          <div className="modal-table-wrapper">
            <table className="modal-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nominal</th>
                  <th>Program</th>
                  <th>Payment</th>
                  <th>Campaign</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((tx: any, index: number) => (
                  <tr key={tx.id_transaksi || index}>
                    <td>{tx.tanggal_donasi || "-"}</td>
                    <td>{rupiah(tx.nominal)}</td>
                    <td>{tx.program || "-"}</td>
                    <td>{tx.payment_method || "-"}</td>
                    <td>{tx.campaign || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-footer">
              <div className="table-footer-info">
                <div className="muted">
                  Menampilkan{" "}
                  {total === 0 ? 0 : ((page - 1) * pageSize + 1).toLocaleString("id-ID")}
                  {"\u2013"}
                  {Math.min(page * pageSize, total).toLocaleString("id-ID")} dari{" "}
                  {total.toLocaleString("id-ID")} transaksi
                </div>

                <div className="page-size-selector">
                  <span className="muted">Tampilkan</span>

                  <select value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                  </select>

                  <span className="muted">per halaman</span>
                </div>
              </div>

              <TablePagination page={page} totalPages={totalPages} onPageChange={goToPage} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}