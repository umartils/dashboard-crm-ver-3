"use client";

import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CRMUser } from "@/lib/types";
import DataTable from "@/components/ui/DataTable";
import ConfirmModal from "@/components/ui/ConfirmModal";
import UserEditModal from "./UserEditModal";
import { UserColumns } from "./UserColumns";

type UserTableProps = {
  users: CRMUser[];
  total: number;
  page: number;
  pageSize: number;
};

export default function UserTable({ users, total, page, pageSize }: UserTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [editingUser, setEditingUser] = useState<CRMUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<CRMUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");

  const columns = useMemo(
    () =>
      UserColumns({
        onEdit: setEditingUser,
        onDelete: (u) => {
          setDeleteError("");
          setDeletingUser(u);
        },
      }),
    []
  );

  async function handleDelete() {
    if (!deletingUser) return;

    setDeleting(true);
    setDeleteError("");
 
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, { method: "DELETE" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok){
        toast.error("Gagal menghapus user");
        throw new Error(result.detail || "Gagal menghapus user");
      } 

      const removed = deletingUser.email;
      setDeletingUser(null);
      toast.success(`${removed} berhasil dihapus`);

      // baris terakhir di halaman ini terhapus: mundur satu halaman
      if (users.length === 1 && page > 1) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(page - 1));
        router.replace(`${pathname}?${params.toString()}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setDeleteError(err.message || "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {notice && <div className="form-success">{notice}</div>}

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        itemLabel="akun"
        emptyMessage="Belum ada user terdaftar."
        total={total}
        page={page}
        pageSize={pageSize}
        header={ 
          <div className="user-table-header">
            <div>
              <h3>User Terdaftar</h3>
              <div className="muted">
                {total.toLocaleString("id-ID")} akun memiliki akses CRM
              </div>
            </div>
          </div>
        }
      />

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setNotice(`Data ${editingUser.email} berhasil diperbarui.`);
            setEditingUser(null);
            router.refresh();
          }}
        />
      )}

      {deletingUser && (
        <ConfirmModal
          title="Hapus User"
          message={
            <>
              Akses CRM untuk <strong>{deletingUser.email}</strong> akan dihapus permanen. Lanjutkan?
            </>
          }
          loading={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => setDeletingUser(null)}
        />
      )}
    </>
  );
}