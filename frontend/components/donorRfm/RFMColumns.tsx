// app/donors/donorColumns.tsx
import { rupiah } from "@/lib/api";
import type { DonorRFM } from "@/lib/types";
import type { DataTableColumn } from "@/components/ui/types";
import { formatLongDate } from "@/lib/format"; 
import { SquarePen } from "lucide-react";

interface Handlers {
  onEdit: (donor: DonorRFM) => void;
  canEdit: boolean;
}
 
export function RFMColumns({onEdit, canEdit}: Handlers): DataTableColumn<DonorRFM>[] {
  return [
    { key: "nama", label: "Nama", locked: true, sortable: true, defaultVisible: true },
    { key: "hp", label: "No. HP", locked: true, defaultVisible: true },
    {
      key: "rfm_segment", label: "Segmen", locked: true, defaultVisible: true,
      render: (r) => (
        <span className="segment-badge" data-segment={r.rfm_segment || ""}>
          {r.rfm_segment || "-"}
        </span>
      ),
    },
    { 
      key: "recency_days", label: "Recency (Hari)", sortable: true, align: "center",
      render: (r) => (r.recency_days != null ? Number(r.recency_days).toLocaleString("id-ID") : "-") 
    },
    { 
      key: "frequency", label: "Frequency", sortable: true, align: "center",
      render: (r) => Number(r.frequency || 0).toLocaleString("id-ID") 
    },
    { 
      key: "monetary", label: "Monetary", sortable: true, defaultVisible: true,
      render: (r) => <strong>{rupiah(r.monetary || 0)}</strong> 
    },
    { 
      key: "last_donation", label: "Donasi Terakhir",
      render: (r) => <strong>{rupiah(r.last_donation || 0)}</strong> 
    },
    { key: "program_favorit", label: "Program Favorit" },
    { key: "payment_favorit", label: "Payment Favorit" },
    { 
      key: "last_donation_date", label: "Terakhir Donasi", sortable: true, align: "center",
      defaultVisible: true, render: (r) => formatLongDate(r.last_donation_date) 
    },
    // { key: "jenis_donor", label: "Jenis Donor", locked: true, defaultVisible: true },
    {
      key: "is_valid", label: "Jenis Valid", locked: true, defaultVisible: true,
      render: (r) => {
        const valid = String(r.is_valid) === "1";
        return (
          <span className="segment-badge" data-valid={valid ? "valid" : "tidak valid"}>
            {valid ? "Valid" : "Tidak Valid"}
          </span>
        );
      },
    },
    { key: "program_category", label: "Kategori Program" },
    { 
      key: "tgl_prospek", label: "Tanggal Prospek", sortable: true, align: "center",
      render: (r) => formatLongDate(r.tgl_prospek) },
    {
      key: "actions",
      label: "Aksi",
      locked: true,
      defaultVisible: true,
      align: "center",
      render: (r) => (
        <div className="row-actions">
          <button
            type="button"
            className="icon-button-edit"
            aria-label={`Edit ${r.nama}`}
            title={canEdit ? "Edit status valid" : "Hanya admin yang dapat mengedit"}
            disabled={!canEdit}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(r);
            }}
          >
            <SquarePen size={16} />
          </button>
        </div>
      ),
    },
  ];
}

// export const RFMColumns: DataTableColumn<DonorRFM>[] = [
  
// ];