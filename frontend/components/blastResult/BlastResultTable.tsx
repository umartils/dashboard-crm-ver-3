"use client";

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
    </>
  );
}