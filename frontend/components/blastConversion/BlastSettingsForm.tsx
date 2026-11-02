"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Settings2, Save, ReceiptCent } from "lucide-react";

export default function BlastSettingsForm({
  initialRate,
}: {
  initialRate: number;
}) {
  const router = useRouter();
  const [rate, setRate] = useState(String(initialRate));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const numericRate = Number(rate);

    if (Number.isNaN(numericRate) || numericRate < 0) {
      toast.error("Rate tidak valid.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/backend/whatsapp-blast/blast-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate_per_message: numericRate }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan rate.");
      }

      toast.success("Rate biaya blast berhasil disimpan.");
      router.refresh();
    } catch (error) {
      toast.error("Gagal menyimpan rate.", {
        description:
          error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="header-add-wrapper">
      <div className="header-add-card">
        <h3>Setting Rate Blast</h3>
        <p className="muted">
          Masukkan biaya/rate untuk setiap kontak whatsapp blast (Rp)
        </p>
        <form onSubmit={handleSave} className="header-add-form">
          <div className="header-add-input-wrapper">
            <ReceiptCent className="header-add-input-icon" />
            <input 
              id="blast-rate-input"
              type="number"
              min={0}
              step="1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="header-add-form-button"
          >
            <Save />
            {isSaving ? "Menyimpan..." : "Simpan Rate"}
          </button>
        </form>
      </div>
      {/* <div className="blast-settings-field">
        <Settings2 size={17} />

        <label htmlFor="blast-rate-input">
          Rate biaya per nomor (Rp)
        </label>

        <input
          
        />
      </div>
      
      <button
        type="button"
        className="button-wrapper"
        onClick={handleSave}
        disabled={isSaving}
      >
        <Save />
        {isSaving ? "Menyimpan..." : "Simpan Rate"}
      </button> */}
    </div>
  );
}