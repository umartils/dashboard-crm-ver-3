// app/admin/users/UserEditModal.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CRMUser } from "@/lib/types";

export default function UserEditModal({
  user, onClose, onSaved,
}: {
  user: CRMUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [isActive, setIsActive] = useState(Boolean(user.is_active));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { 
      setError("Email wajib diisi"); 
      return; 
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, is_active: isActive }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.detail || "Gagal menyimpan perubahan");
      onSaved();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-modal-backdrop" onClick={() => !saving && onClose()}>
      <div className="app-modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Edit User</h3>

        <form onSubmit={handleSubmit} className="app-modal-form">
          <label className="form-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={saving} />
          </label>

          <label className="checkbox-field">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={saving} />
            <span>Akun aktif</span>
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="app-modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}