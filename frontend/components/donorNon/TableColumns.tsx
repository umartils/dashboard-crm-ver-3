// app/donors/donorColumns.tsx
import type { DonorNon } from "@/lib/types";
import type { DataTableColumn } from "@/components/ui/types";
import { formatDate } from "@/lib/format";

export const DonorNonColumns: DataTableColumn<DonorNon>[] = [
  { key: "nama", label: "Nama", locked: true, sortable: true },
  { key: "hp", label: "No. HP", locked: true },
  { key: "email", label: "Email", locked: true },
  {
    key: "is_valid", label: "Jenis Valid", locked: true,
    render: (r) => {
      const valid = String(r.is_valid) === "1";
      return (
        <span className="segment-badge" data-valid={valid ? "valid" : "tidak valid"}>
          {valid ? "Valid" : "Tidak Valid"}
        </span>
      );
    },
  },
  { key: "tgl_reg", label: "Tanggal Registrasi", sortable: true, align: "center",
    render: (r) => formatDate(r.tgl_reg) || "-"
   },
];