// app/donors/donorColumns.tsx
import { rupiah } from "@/lib/api";
import type { DonorSummary } from "@/lib/types";
import type { DataTableColumn } from "@/components/ui/types";
import { formatDate } from "@/lib/format"; // pindahkan formatDate ke util umum

export const DonorSummaryColumns: DataTableColumn<DonorSummary>[] = [
  { key: "nama", label: "Nama", sortable: true },
  { key: "no_telp", label: "No. HP",  },
  { key: "jenis_donor", label: "Jenis Donatur",  },
  { key: "jumlah_donasi", label: "Jumlah Donasi", sortable: true, align: "center",
    render: (r) => Number(r.jumlah_donasi || 0).toLocaleString("id-ID") 
  },
  { key: "max_donation", label: "Donasi Terbesar", sortable: true,
    render: (r) => <center>{rupiah(r.max_donation || 0)}</center> 
  },
  { key: "total_donasi", label: "Total Donasi", sortable: true,
    render: (r) => <strong>{rupiah(r.total_donasi || 0)}</strong> 
  },
  { key: "last_donation", label: "Donasi Terakhir", sortable: true,
    render: (r) => <strong>{rupiah(r.last_donation || 0)}</strong> 
  },
  { key: "tgl_terakhir", label: "Tanggal Donasi Terakhir", sortable: true,
    render: (r) => <center>{formatDate(r.tgl_terakhir || '-')}</center> 
  },
  { key: "campaign_terakhir", label: "Campaign Terakhir",  },
];