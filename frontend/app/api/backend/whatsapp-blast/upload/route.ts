import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8000";

export async function POST(request: NextRequest) {
  // Parse sebagai FormData (bukan json/text) supaya boundary multipart tetap
  // utuh saat diteruskan ke backend.
  const formData = await request.formData();

  const response = await fetch(`${BACKEND_URL}/api/whatsapp-blast/upload`, {
    method: "POST",
    body: formData,
    headers: {
      "X-Internal-Key": process.env.INTERNAL_API_KEY || "",
    },
  });

  const data = await response.json().catch(() => ({
    detail: "Gagal membaca response dari backend",
  }));

  return NextResponse.json(data, { status: response.status });
}