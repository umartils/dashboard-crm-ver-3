 // components/segmentHistory/SegmentHistoryColumns.tsx
 import type { SegmentHistoryRow } from "@/lib/types";
 import type { DataTableColumn } from "@/components/ui/types";
 import { formatDate } from "@/lib/format";
 
 export const SegmentHistoryColumns: DataTableColumn<SegmentHistoryRow>[] = [
   { key: "nama", label: "Nama", locked: true, sortable: true,
    render: (r) => (
       <div style={{ fontWeight: 600 }}>
         {r.nama || "-"}
       </div>
     ),
   },
   { key: "hp", label: "No. HP", locked: true,},
   {
     key: "old_segment", label: "Segmen Lama", locked: true,
     render: (r) => (
       <span className="segment-badge" data-segment={r.old_segment || ""}>
         {r.old_segment || "-"}
       </span>
     ),
   },
   {
     key: "new_segment", label: "Segmen Baru", locked: true,
     render: (r) => (
       <span className="segment-badge" data-segment={r.new_segment || ""}>
         {r.new_segment || "-"}
       </span>
     ),
   },
   { key: "changed_at", label: "Tanggal Perubahan", sortable: true, align: "center",
     render: (r) => formatDate(r.changed_at) 
   },
 ];