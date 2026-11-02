import { Info } from "@/components/donorRfm/DonorInfo";
import { rupiah } from "@/lib/api";
import { ListClock, FileSpreadsheet } from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { usePagination } from "@/hooks/usePagination";

type DonorDetailProps = {
  data: any;
  donorId: number;
  total: number;
  page: number;              // BARU: diterima dari parent, bukan state lokal
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void; // BARU
};

export function DonorDetail({
  data,
  donorId,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: DonorDetailProps) {
  const profile = data.profile || {};
  const transactions = data.recent_donations || [];

  // HAPUS: useState(1) lokal — sumber bug-nya di sini
  const { goToPage, changePageSize } = usePagination({
    totalPages,
    mode: "state",
    onPageChange,       // langsung teruskan ke parent (DonorModal)
    onPageSizeChange,   // BARU — trigger refetch di parent
  });

  return (
    <div className="modal-body">
      <div className="donor-profile-grid">
        <Info label="Nama" value={profile.nama} />
        <Info label="Email" value={profile.email} />
        <Info label="No. HP" value={profile.hp} />
        <Info label="Segmen" value={profile.rfm_segment} />
        <Info
          label="Recency"
          value={
            profile.recency_days !== undefined
              ? `${profile.recency_days} hari`
              : "-"
          }
        />
        <Info label="Frequency" value={profile.frequency} />
        <Info label="Monetary" value={rupiah(profile.monetary)} />
        <Info label="Min Donasi" value={rupiah(profile.min_donation)} />
        <Info label="Median Donasi" value={rupiah(profile.median_donation)} />
        <Info label="Max Donasi" value={rupiah(profile.max_donation)} />
        <Info label="Program Favorit" value={profile.program_favorit} />
        <Info label="Payment Favorit" value={profile.payment_favorit} />
        <Info label="Jenis Donor" value={profile.jenis_donor} />
        <Info label="Donasi Pertama" value={profile.first_donation_date} />
        <Info label="Donasi Terakhir" value={profile.last_donation_date} />
        <Info label="Rumpun Program" value={profile.program_category} />
      </div>

      <div className="modal-section">
        <div className="modal-section-header">
          <div className="modal-section-header-title">
            <ListClock size={18} />
            <h3>Histori Donasi Terakhir</h3>
          </div>
          
            <a className="btn-download-small"
            href={`/api/backend/donors/${donorId}/export`}
            >
            <FileSpreadsheet size={13} />
            <span>Download Excel</span>
          </a>
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
                  {total.toLocaleString("id-ID")} donor
                </div>

                <div className="page-size-selector">
                  <span className="muted">Tampilkan</span>

                  <select
                    value={pageSize}
                    onChange={(e) => changePageSize(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                  </select>

                  <span className="muted">per halaman</span>
                </div>
              </div>

              <TablePagination
                page={page}          // BARU: page asli dari modal
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}