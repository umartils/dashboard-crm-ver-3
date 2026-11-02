"use client";

import { TablePagination } from "@/components/ui/TablePagination";
import { usePagination } from "../../hooks/usePagination";
import { BlastResultRow } from "@/lib/types";
import DataTable from "../ui/DataTable";
import { BlastResultColumns } from "@/components/blastResult/BlastResultColumns";

export default function BlastResultTable({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: BlastResultRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { goToPage, changePageSize } = usePagination({
    totalPages,
    mode: "url",
  });

  return (
    <>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={BlastResultColumns}
        total={total}
        page={page}
        pageSize={pageSize}
        emptyMessage="Belum ada data hasil blast."
      />
      {/* <div className="table-scroll">
        <table className="donor-table">
          <thead>
            <tr>
              <th>Nama Donor</th>
              <th>No. HP</th>
              <th>Status Blast</th>
              <th>Status Donor</th>
              <th>Match</th>
              <th>Tanggal Import</th>
              <th>Tanggal Prospek</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-table">
                    Belum ada data hasil blast.
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.nama || "-"}</td>
                  <td>{row.hp || "-"}</td>
                  <td> 
                    <span
                      className="segment-badge"
                      data-blast={row.status_blast || ""}
                    >
                      {row.status_blast || "-"}
                    </span>
                  </td>
                  <td>
                    {row.is_matched ? (
                      row.status_blast === "failed" ? (
                        <span className="status-invalid">
                          Tidak Valid
                        </span>
                      ) : (
                        <span className="status-valid">
                          Valid
                        </span>
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{row.is_matched ? "Ya" : "Tidak"}</td>
                  <td>
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString("id-ID")
                      : "-"}
                  </td>
                  <td>{row.tgl_prospek || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="table-footer-info">
          <div className="muted table-footer-info-text">
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
          page={page}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div> */}
    </>
  );
}