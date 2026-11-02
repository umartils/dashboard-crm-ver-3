 // components/blastResult/BlastResultColumns.tsx
 import type { BlastResultRow } from "@/lib/types";
 import type { DataTableColumn } from "@/components/ui/types";
 import { formatDate } from "@/lib/format";
 
 export const BlastResultColumns: DataTableColumn<BlastResultRow>[] = [
   { key: "nama", label: "Nama Donatur", locked: true, sortable: true,
    render: (r) => (
       <div style={{ fontWeight: 600 }}>
         {r.nama || "-"}
       </div>
     ),
   },
   { key: "hp", label: "No. HP", locked: true,},
   {
     key: "status_blast", label: "Status Blast", locked: true,
     render: (r) => (
       <span className="segment-badge" data-blast={r.status_blast || ""}>
         {r.status_blast || "-"}
       </span>
     ),
   },
   {
     key: "is_matched", label: "Status Donor", locked: true,
     render: (r) => (
       r.is_matched ? (
        r.status_blast === "failed" ? (
          <span className="status-invalid">
            Tidak Valid
          </span>
        ) : (
          <span className="status-valid">
            Valid
          </span>
        )
      ) : (
        "-"
      )
     ),
   },
   { key: "is_matched", label: "Match", locked: true, 
    render: (r) => (
      r.is_matched ? 
        <span>Ya</span>
        : <span>Tidak</span>
    )
   },
   { key: "created_at", label: "Tanggal Import", sortable: true, align: "center",
     render: (r) => formatDate(r.created_at) 
   },
   { key: "tgl_prospek", label: "Tanggal Prospek", sortable: true, align: "center",
     render: (r) => formatDate(r.tgl_prospek) 
   },
 ];