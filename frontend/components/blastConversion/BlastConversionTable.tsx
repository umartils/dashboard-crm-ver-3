"use client";

import { TablePagination } from "@/components/ui/TablePagination";
import { usePagination } from "../../hooks/usePagination";
import { useTableSort } from "@/hooks/useTableSort";

type ConversionRow = {
  id: number;
  id_donor?: string;
  nama_donor?: string;
  phone_clean?: string;
  blast_month?: string;
  first_blast_date?: string;
  blast_count?: number;
  donated?: boolean;
  donation_count?: number;
  donation_amount?: number;
};

type SortableKey = "nama_donor" | "first_blast_date" | "donation_amount";
 
const COLUMNS: { 
  key: SortableKey 
  | "phone_clean" 
  | "blast_month" 
  | "jenis_donor"
  | "blast_count"
  | "donated"
  | "donation_count"
  ; label: string; sortable: boolean }[] = [

  { key: "nama_donor", label: "Nama", sortable: true },
  { key: "phone_clean", label: "No. Telp", sortable: false },
  { key: "blast_month", label: "Bulan Blast", sortable: false },
  { key: "first_blast_date", label: "Blast Pertama", sortable: true },
  { key: "blast_count", label: "Jumlah Blast", sortable: false },
  { key: "donated", label: "Status", sortable: false },
  { key: "donation_count", label: "Jumlah Donasi", sortable: false },
  { key: "donation_amount", label: "Jumlah Donasi", sortable: true },
];

export default function BlastConversionTable({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: ConversionRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { goToPage, changePageSize } = usePagination({
    totalPages,
    mode: "url",
  });
  const { sortBy, sortOrder, toggleSort } = useTableSort<SortableKey>();

  return (
    <>
      <div className="table-scroll">
        <table className="donor-table">
          <thead> 
            <tr>
              {COLUMNS.map((col) => 
                  col.sortable ? (
                    <th
                      key={col.key}
                      className={`sortable-header${sortBy === col.key ? " sortable-header--active" : ""}`}
                      onClick={() => toggleSort(col.key as SortableKey)}
                    >
                      {col.label}
                      <span className="sort-icon">
                        {sortBy === col.key ? (sortOrder === "desc" ? " \u25BC" : " \u25B2") : " \u21C5"}
                      </span>
                    </th>
                  ) : (
                    <th key={col.key}>{col.label}</th>
                  )
                )}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-table">
                    Belum ada data konversi blast.
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.nama_donor || "-"}</td>
                  <td>{row.phone_clean || "-"}</td>
                  <td>
                    {row.blast_month
                      ? new Date(row.blast_month).toLocaleDateString(
                          "id-ID",
                          { month: "long", year: "numeric" }
                        )
                      : "-"}
                  </td>
                  <td>
                    {row.first_blast_date
                      ? new Date(
                          row.first_blast_date
                        ).toLocaleDateString("id-ID")
                      : "-"}
                  </td>
                  <td>{row.blast_count ?? 0}</td>
                  <td>
                    {row.donated ? (
                      <span className="status-valid">Konversi</span>
                    ) : (
                      <span className="status-invalid">Belum</span>
                    )}
                  </td>
                  <td>{row.donation_count ?? 0}</td>
                  <td>
                    Rp
                    {Number(
                      row.donation_amount || 0
                    ).toLocaleString("id-ID")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="table-footer-info">
          <div className="muted table-footer-info-text">
            Menampilkan {rows.length.toLocaleString("id-ID")} dari{" "}
            {total.toLocaleString("id-ID")} data
          </div>

          <div className="page-size-selector">
            <span className="muted">Tampilkan</span>

            <select
              value={pageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span className="muted">per halaman</span>
          </div>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div>
    </>
  );
}