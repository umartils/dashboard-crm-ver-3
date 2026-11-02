// components/ui/DataTable/DataTable.tsx
"use client";

import { ReactNode } from "react";
import { TablePagination } from "@/components/ui/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { useTableSort } from "@/hooks/useTableSort";
import type { DataTableColumn } from "./types";

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];   // sudah final, semuanya dirender
  rows: T[];
  rowKey: (row: T) => string | number;
  total: number;
  page: number;
  pageSize: number;
  onRowClick?: (row: T) => void;
  header?: ReactNode;
  toolbar?: ReactNode;             // slot di atas kartu tabel (mis. ColumnSelector)
  loading?: boolean;
  loadingMessage?: string;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  itemLabel?: string;
}

export default function DataTable<T extends object>({
  columns, rows, rowKey, total, page, pageSize, onRowClick, header, toolbar,
  loading = false,
  loadingMessage = "Memuat data...",
  pageSizeOptions = [5, 10, 20, 30],
  emptyMessage = "Data tidak ditemukan.",
  itemLabel = "data",
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { goToPage, changePageSize } = usePagination({ totalPages, mode: "url" });
  const { sortBy, sortOrder, toggleSort } = useTableSort<string>();

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const alignClass = (a?: string) => (a && a !== "left" ? `cell-${a}` : undefined);

  return (
    <>
      {toolbar}

      <div className="table-card">
        {header}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) =>
                  c.sortable ? (
                    <th
                      key={c.key}
                      className={`sortable-header${sortBy === c.key ? " sortable-header--active" : ""} ${alignClass(c.align) ?? ""}`}
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.label}
                      <span className="sort-icon">
                        {sortBy === c.key ? (sortOrder === "desc" ? " \u25BC" : " \u25B2") : " \u21C5"}
                      </span>
                    </th>
                  ) : (
                    <th key={c.key} className={alignClass(c.align)}>{c.label}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="table-loading">{loadingMessage}</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="empty-table">{emptyMessage}</div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={onRowClick ? "data-row" : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={alignClass(c.align)}>
                        {c.render
                          ? c.render(row)
                          : String((row as Record<string, unknown>)[c.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <div className="table-footer-info">
            <div className="muted table-footer-info-text">
              Menampilkan {from.toLocaleString("id-ID")}{"\u2013"}{to.toLocaleString("id-ID")} dari{" "}
              {total.toLocaleString("id-ID")} {itemLabel}
            </div>
            <div className="page-size-selector">
              <span className="muted">Tampilkan</span>
              <select value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="muted">per halaman</span>
            </div>
          </div>
          <TablePagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </div>
      </div>
    </>
  );
}