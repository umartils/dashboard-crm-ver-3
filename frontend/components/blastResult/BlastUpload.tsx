"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

export default function BlastUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const UPLOAD_ENDPOINT = "/api/backend/whatsapp-blast/upload";

  async function processFile(file: File) {
    const toastId = toast.loading(
      "Mengupload dan memproses file blast..."
    );
 
    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await _getErrorMessage(response);
        const error = new Error(message) as Error & { status?: number };
        // throw new Error(
        //   message || "Gagal memproses file blast."
        // );
        error.status = response.status;
        throw error;
      }

      const result = await response.json();

      toast.success("File blast berhasil diproses.", {
        id: toastId,
        description: `${result.updated_count} donor diupdate, ${result.not_found_count} nomor tidak ditemukan.`,
      });

      router.refresh(); 
      } catch (error) {
        console.error("Upload blast error:", error);

        const status = (error as { status?: number }).status;
        const message =
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat upload.";

        // Duplikat = peringatan, bukan error
        if (status === 409) {
          toast.warning("File sudah pernah diunggah.", {
            id: toastId,
            description: message,
          });
        } else {
          toast.error("Upload gagal.", {
            id: toastId,
            description: message,
          });
        }
      } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);

    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  return (
    <label
      htmlFor="blast-upload-input"
      className={`dropzone ${isDragging ? "is-dragging" : ""} ${
        isUploading ? "is-uploading" : ""
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    > 
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={isUploading}
        id="blast-upload-input"
        className="dropzone-input"
      />

      <div className="dropzone-icon">
        <UploadCloud size={22} />
      </div>

      <p className="dropzone-title">
        {isUploading ? "Memproses file..." : "Drag & drop file"}
      </p>

      {!isUploading && (
        <p className="dropzone-subtitle">
          atau{" "}
          <span className="dropzone-browse">
            klik untuk browse
          </span>
        </p>
      )}

      <p className="dropzone-hint">XLSX &middot; XLS &middot; CSV</p>
    </label>
  );
}

async function _getErrorMessage(response: Response): Promise<string> {
  const fallback = "Gagal memproses file blast.";

  try {
    const data = await response.json();
    const detail = data?.detail;

    // HTTPException: detail berupa string
    if (typeof detail === "string") return detail;

    // Validasi FastAPI (422): detail berupa array of { msg, loc }
    if (Array.isArray(detail)) {
      return (
        detail
          .map((d) => d?.msg)
          .filter(Boolean)
          .join(", ") || fallback
      );
    }

    return data?.message || fallback;
  } catch {
    // Body bukan JSON (misalnya error 502/504 dari proxy)
    if (response.status >= 500) {
      return "Server sedang bermasalah. Coba lagi beberapa saat.";
    }
    return fallback;
  }
}