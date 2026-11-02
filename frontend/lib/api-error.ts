// lib/api-error.ts
export async function getErrorMessage(res: Response): Promise<string> {
  const fallback = `Permintaan gagal (${res.status})`;
  const raw = await res.text();
  if (!raw) return fallback;

  try {
    const data = JSON.parse(raw);
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.detail === "string") return data.detail;
    // validasi FastAPI (422): detail berupa array
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ") || fallback;
    }
  } catch {
    // body bukan JSON (mis. HTML dari proxy), tampilkan apa adanya jika pendek
    return raw.length < 200 ? raw : fallback;
  }
  return fallback;
}