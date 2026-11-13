// components/user/UserEditModal.tsx
"use client";
 
import { FormEvent, useEffect, useState } from "react";
import type { CRMUser } from "@/lib/types";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { SquarePen } from "lucide-react";
import SelectFilter from "../ui/SelectFilter";

export default function UserEditModal({
  user, onClose, onSaved,
}: {
  user: CRMUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [isActive, setIsActive] = useState(Boolean(user.is_active));
  const [role, setRole] = useState(user.role);
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
        body: JSON.stringify(
          { 
            email: cleanEmail, 
            is_active: isActive,
            role,
          }
        ),
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
        <div className="app-modal-header-wrapper">
          <div className="app-modal-header">
            <SquarePen size={20} />
            <h3>Edit User ({user.email})</h3>
          </div>

          <button type="button" className="app-modal-header-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="app-modal-form">
          <label className="form-field">
            <span className="modal-field-label">Email</span>
            <input className="app-modal-input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={saving} />
          </label>

          {/* <label className="form-field">
            <span className="modal-field-label">Role</span>
          </label>
          <SelectFilter 
            label="Role"
            paramKey="role"
            options={["admin", "user"]}
            labelMap={{ admin: "Admin", user: "User" }}
            selected={user}
            onChange={setRole}
            showAllOption={false}
            placeholder="Pilih role"
          /> */}

          <div className="form-field">
            <span className="modal-field-label">Role</span>
            <SelectFilter
              label="Role"
              paramKey="role"
              options={["admin", "user"]}
              labelMap={{ admin: "Admin", user: "User" }}
              selected={role}
              onChange={(_, value) => setRole(value)}
              showAllOption={false}
              placeholder="Pilih role"
            />
          </div>

          <ToggleSwitch
            label={isActive ? "Active" : "Non-Active"}
            checked={isActive}
            onChange={setIsActive}
            disabled={saving}
          />

          {error && <div className="form-error">{error}</div>}

          <div className="app-modal-actions">
            <button type="button" className="btn-danger" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="btn-secondary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}