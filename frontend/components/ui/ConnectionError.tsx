// components/ui/ConnectionError.tsx
"use client";
 
import { useTransition } from "react";
import { useRouter } from "next/navigation"; 
import { DatabaseZap, RefreshCw } from "lucide-react";

type Props = { kind: "db" | "backend" | "unknown"; message: string };

export default function ConnectionError({ kind, message }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hint =
    kind === "db"
      ? "Data tidak ditampilkan karena koneksi ke database terputus."
      : kind === "backend"
      ? "Data tidak ditampilkan karena backend tidak merespons."
      : "Coba muat ulang halaman.";

  return (
    <div className="card" style={{ textAlign: "center", padding: 32 }}>
      {/* <DatabaseZap size={40} style={{ color: "var(--success-dark)" }} /> */}
      <h2 style={{ marginTop: 12 }}>{message}</h2>
      <p className="muted">{hint}</p>
      <button
        className="btn-sync" 
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        style={{ marginTop: 16 }}
      >
        <RefreshCw size={16} className={pending ? "spin" : ""} />{" "}
        {pending ? "Mencoba..." : "Coba lagi"}
      </button>
    </div>
  );
}