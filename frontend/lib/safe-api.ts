// lib/safe-api.ts
import { serverApi } from "@/lib/server-api";

export type ApiErrorKind = "db" | "backend" | "unknown";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: ApiErrorKind; message: string };

function classify(err: unknown): { kind: ApiErrorKind; message: string } {
  const msg = err instanceof Error ? err.message : String(err);

  if (/503|DB_UNAVAILABLE/i.test(msg)) {
    return { kind: "db", message: "Tidak dapat terhubung dengan database zains." };
  }
  if (/ECONNREFUSED|fetch failed|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
    return { kind: "backend", message: "Tidak dapat terhubung dengan backend." };
  }
  return { kind: "unknown", message: "Terjadi kesalahan saat memuat data." };
}

export async function safeServerApi<T>(
  path: string,
  retries = 1,
  delayMs = 500
): Promise<ApiResult<T>> {
  let last: { kind: ApiErrorKind; message: string } | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return { ok: true, data: await serverApi<T>(path) };
    } catch (err) {
      last = classify(err);
      console.error(`[safeServerApi] ${path} (percobaan ${attempt + 1})`, err);
      if (last.kind === "unknown") break; // jangan retry error non-koneksi
      if (attempt < retries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return { ok: false, ...last! };
}