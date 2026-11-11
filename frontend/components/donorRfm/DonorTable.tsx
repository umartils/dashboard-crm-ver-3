"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
import { toast } from "sonner";
import DataTable from "@/components/ui/DataTable";
import ColumnSelector from "@/components/ui/ColumnSelector";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { RFMColumns } from "./RFMColumns";
import { DonorModal } from "./DonorModal";
import DonorEditModal from "./DonorEditModal";
import type { DonorRFM } from "@/lib/types";

export default function DonorTable(props: { rows: DonorRFM[]; total: number; page: number; pageSize: number; role: string | undefined; }) {
  const router = useRouter();
  // const { data: session } = useSession();
  const { role, ...tableProps } = props;
  const isAdmin = role === "admin";

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingDonor, setEditingDonor] = useState<DonorRFM | null>(null);

  const allColumns = useMemo(
    () => RFMColumns({ onEdit: setEditingDonor, canEdit: isAdmin }),
    [isAdmin]
  );

  const defaultVisible = useMemo(
    () => allColumns.filter((c) => c.defaultVisible || c.locked).map((c) => c.key),
    [allColumns]
  );

  const { visibleKeys, activeColumns, allSelected, toggleColumn, toggleAll } =
    useColumnVisibility({
      columns: allColumns,
      defaultVisible,
      storageKey: "donor-table-visible-columns",
    });

  const visibleColumns = useMemo(() => {
    const map = new Map(allColumns.map((c) => [c.key, c]));
    return activeColumns.map((c) => map.get(c.key)!).filter(Boolean);
  }, [activeColumns, allColumns]);

  return (
    <>
      <DataTable
        {...tableProps}
        columns={visibleColumns}
        rowKey={(r) => r.id_donor}
        itemLabel="donor"
        emptyMessage="Data donor tidak ditemukan."
        onRowClick={(r) => setSelectedId(Number(r.id_donor))}
        toolbar={
          <div className="column-selector-wrap">
            <ColumnSelector
              columns={allColumns}
              visibleKeys={visibleKeys}
              allSelected={allSelected}
              onToggleColumn={toggleColumn}
              onToggleAll={toggleAll}
            />
          </div>
        }
      />

      {selectedId !== null && (
        <DonorModal donorId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {editingDonor && (
        <DonorEditModal
          donor={editingDonor}
          onClose={() => setEditingDonor(null)}
          onSaved={() => {
            toast.success(`Status ${editingDonor.nama} berhasil diperbarui`);
            setEditingDonor(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}