"use client";

import { useState } from "react"; 
import { usePagination } from "@/hooks/usePagination";
import { DonorSummaryModal } from "./Modal";
import { DonorSummary } from "@/lib/types"
import DataTable from "../ui/DataTable";

import { DonorSummaryColumns } from "./DonorSummaryColumns";

export default function DonorSummaryTable({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: DonorSummary[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const { goToPage, changePageSize } = usePagination({ totalPages, mode: "url" });

  return (
    <>
      <DataTable 
        columns={DonorSummaryColumns}
        rows ={rows}
        rowKey={(r) => r.id_donor}
        total={total}
        page={page}
        pageSize={pageSize}
        itemLabel="donor"
        onRowClick={(r) => setSelectedId(r.id_donor)}
      />
      
      {selectedId !== null && (
        <DonorSummaryModal donorId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}