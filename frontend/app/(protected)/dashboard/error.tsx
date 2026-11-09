// app/dashboard/error.tsx
"use client";
import ConnectionError from "@/components/ui/ConnectionError";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ConnectionError kind="unknown" message="Terjadi kesalahan saat memuat halaman." />;
}