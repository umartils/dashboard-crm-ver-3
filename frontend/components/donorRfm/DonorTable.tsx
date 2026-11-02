// DonorTable.tsx
"use client";

import { useMemo, useState } from "react";
import DataTable from "@/components/ui/DataTable";
import ColumnSelector from "@/components/ui/ColumnSelector";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { RFMColumns } from "./RFMColumns";
import { DonorModal } from "./DonorModal";
import type { DonorRFM } from "@/lib/types";

const defaultVisible = RFMColumns
  .filter((c) => c.defaultVisible || c.locked)
  .map((c) => c.key);

export default function DonorTable(props: { rows: DonorRFM[]; total: number; page: number; pageSize: number }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { visibleKeys, activeColumns, allSelected, toggleColumn, toggleAll } =
    useColumnVisibility({
      columns: RFMColumns,
      defaultVisible,
      storageKey: "donor-table-visible-columns",
    });

  const visibleColumns = useMemo(() => {
    const map = new Map(RFMColumns.map((c) => [c.key, c]));
    return activeColumns.map((c) => map.get(c.key)!).filter(Boolean);
  }, [activeColumns]);
 
  return (
    <>
      <DataTable
        {...props}
        columns={visibleColumns}
        rowKey={(r) => r.id_donor}
        itemLabel="donor" 
        emptyMessage="Data donor tidak ditemukan."
        onRowClick={(r) => setSelectedId(Number(r.id_donor))}
        toolbar={ 
          <div className="column-selector-wrap">
            <ColumnSelector
              columns={RFMColumns}
              visibleKeys={visibleKeys}
              allSelected={allSelected}
              onToggleColumn={toggleColumn}
              onToggleAll={toggleAll}
            />
          </div>
        }
      />
      {selectedId !== null && <DonorModal donorId={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}