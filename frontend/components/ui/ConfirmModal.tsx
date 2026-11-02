// components/ui/ConfirmModal.tsx
"use client";

import { useEffect } from "react";

interface ConfirmModalProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title, message, confirmLabel = "Hapus", loading = false, error, onConfirm, onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div className="app-modal-backdrop" onClick={() => !loading && onCancel()}>
      <div className="app-modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        {error && <div className="form-error">{error}</div>}
        <div className="app-modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>Batal</button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}