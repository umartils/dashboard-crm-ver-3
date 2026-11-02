// components/ui/DataTable/types.ts
import type { ReactNode } from "react";
import type { ColumnOption } from "@/hooks/useColumnVisibility";

export interface DataTableColumn<T> extends ColumnOption {
  sortable?: boolean;                    // opsional, default false
  defaultVisible?: boolean;              // ganti DEFAULT_VISIBLE
  align?: "left" | "center" | "right";
  render?: (row: T) => ReactNode;        // kalau kosong: tampilkan row[key] ?? "-"
}