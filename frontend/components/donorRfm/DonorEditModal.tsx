"use client";

import { FormEvent, useEffect, useState } from "react";
import type { DonorRFM } from "@/lib/types";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { SquarePen } from "lucide-react";

export default function DonorEditModal({
  donor, onClose, onSaved,
}: {
  donor: DonorRFM;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [hp, setHp] = useState(donor.hp);
  const [isValid, setIsValid] = useState(String(donor.is_valid) === "1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/rfm/${donor.id_donor}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hp: hp, is_valid: isValid }),
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
            <h3>Edit Status Donor ({donor.nama})</h3>
          </div>

          <button type="button" className="app-modal-header-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="app-modal-form">
          <label className="form-field">
            <span className="modal-field-label">No Telp</span>
            <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} required disabled={saving} />
          </label>

          <ToggleSwitch
            label={isValid ? "Jenis valid" : "Jenis tidak valid"}
            checked={isValid}
            onChange={setIsValid}
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