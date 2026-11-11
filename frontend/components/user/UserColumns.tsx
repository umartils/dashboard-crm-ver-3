// app/admin/users/userColumns.tsx
import type { DataTableColumn } from "@/components/ui/types";
import type { CRMUser } from "@/lib/types";
import { SquarePen, Trash2 } from "lucide-react";

interface Handlers {
  onEdit: (user: CRMUser) => void;
  onDelete: (user: CRMUser) => void;
}

  
export function UserColumns({onEdit, onDelete}: Handlers): DataTableColumn<CRMUser>[]{
  return [
    {
      key: "email",
      label: "Email",
      locked: true,
      defaultVisible: true,
      render: (u) => <strong>{u.email}</strong>,
    },
    { key: "role", label: "Role", defaultVisible: true },
    {
      key: "is_active",
      label: "Status",
      defaultVisible: true,
      render: (u) => (u.is_active ? "Aktif" : "Nonaktif"),
    },
    {
      key: "created_at",
      label: "Created at",
      defaultVisible: true,
      render: (u) => (u.created_at ? new Date(u.created_at).toLocaleString("id-ID") : "-"),
    },
    {
      key: "actions",
      label: "Aksi",
      locked: true,
      defaultVisible: true,
      align: "center",
      render: (u) => (
        <div className="row-actions">
          <button type="button" className="icon-button-edit" aria-label={`Edit ${u.email}`} title="Edit" onClick={() => onEdit(u)}>
            <SquarePen size={16} />
          </button>
          <button type="button" className="icon-button-delete" aria-label={`Hapus ${u.email}`} title="Hapus" onClick={() => onDelete(u)}>
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]
}