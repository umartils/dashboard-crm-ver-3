"use client";

import { toast } from "sonner";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, UserPlus } from "lucide-react";

export default function AddUserForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Email wajib diisi");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(`Terjadi kesalahan: ${result.detail}`);
        throw new Error(result.detail || "Gagal menambahkan user");
      }

      // setSuccess(`${cleanEmail} berhasil mendapatkan akses.`);
      toast.success(`User ${cleanEmail} berhasil mendapatkan akses`)
      setEmail("");
      router.refresh();
    } catch (err: any) {
      // setError(err.message || "Terjadi kesalahan");
      toast.error(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="header-add-card">
      <h3>Tambahkan User</h3>

      <p className="muted">Masukkan alamat email Google yang diperbolehkan login ke CRM.</p>

      <form onSubmit={handleSubmit} className="header-add-form">
        <div className="header-add-input-wrapper">
          <Mail className="header-add-input-icon" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@masjidnusantara.org"
            required
            disabled={saving}
          />
        </div>

        <button type="submit" disabled={saving} className="header-add-form-button">
          <UserPlus />
          {saving ? "Menyimpan..." : "Tambahkan Akses"}
        </button>
      </form>

      {/* {error && <div className="form-error">{error}</div>} */}
      {/* {success && <div className="form-success">{success}</div>} */}
    </div>
  );
}