"use client";

// import { usePagination } from "@/hooks/usePagination";
import { SegmentHistoryRow } from "@/lib/types"
import DataTable from "../ui/DataTable";
import { SegmentHistoryColumns } from "./SegmentHistoryColumns";

export default function SegmentHistoryTable({
  rows,
  total,
  page,
  pageSize,
}: { 
  rows: SegmentHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  // const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <DataTable 
        rows={rows}
        rowKey={(r) => r.id}
        columns={SegmentHistoryColumns}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </>
  );
}