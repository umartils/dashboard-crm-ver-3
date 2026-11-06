"use client";

import { BlastConversionRow } from "@/lib/types";
import DataTable from "../ui/DataTable";
import { BlastResultColumns } from "./ConversionColumns";

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