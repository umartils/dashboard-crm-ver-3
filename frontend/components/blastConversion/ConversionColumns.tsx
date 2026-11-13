// components/blastConversion/ConversionColumns.tsx
import type { BlastConversionRow } from "@/lib/types";
import type { DataTableColumn } from "@/components/ui/types";
import { formatDate, formatMonth } from "@/lib/format";
import { rupiah } from "@/lib/api";
 
export const BlastResultColumns: DataTableColumn<BlastConversionRow>[] = [
  { key: "nama_donor", label: "Nama Donatur", locked: true, sortable: true,},
  { key: "phone_clean", label: "No. HP", locked: true,},
  // { key: "blast_month", label: "Bulan Blast", locked: true},
  { key: "blast_month", label: "Bulan Blast", sortable: true, align: "center",
    render: (r) => <center>{formatMonth(r.blast_month)}</center>
  },
  { key: "first_blast_date", label: "Tanggal Blast Pertama", sortable: true, align: "center",
    render: (r) => <center>{formatDate(r.first_blast_date)}</center>
  },
  { 
   key: "blast_count", label: "Jumlah Blast", locked: true, sortable: true, align: "center",
   render: (r) => <center>{r.blast_count || 0}</center>
  },
  { key: "donated", label: "Status", locked: true, 
   render: (r) => (
     r.donated 
       ? 
       <span className="status-valid">Konversi</span>
       : 
       <span className="status-invalid">Belum</span>
   )
  },
  { 
   key: "donation_count", label: "Frekuensi Donasi", locked: true, sortable: true, align: "center",
   render: (r) => <center>{r.donation_count || 0}</center>
  },
  { 
   key: "donation_amount", label: "Jumlah Donasi", locked: true, sortable: true, align: "center",
   render: (r) => <center>{rupiah(r.donation_amount || 0)}</center>
  },
];