"use client";

import { BlastConversionRow } from "@/lib/types";
import DataTable from "../ui/DataTable";
import { BlastResultColumns } from "./ConversionColumns";

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
  rows: BlastConversionRow[]; 
  total: number;
  page: number;
  pageSize: number;
}) {

  return (
    <>
      <DataTable 
        rows={rows}
        rowKey={(r) => r.id}
        columns={BlastResultColumns}
        total={total}
        page={page}
        pageSize={pageSize}
        emptyMessage="Belum ada data konversi blast."
      />
    </>
  );
}