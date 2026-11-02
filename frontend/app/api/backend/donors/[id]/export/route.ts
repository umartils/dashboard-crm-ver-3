import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
  const res = await fetch(`${backendUrl}/api/donors/${id}/export`, {
    headers: { "X-Internal-Key": process.env.INTERNAL_API_KEY || "" },
    cache: "no-store",
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "text/csv",
      "content-disposition": res.headers.get("content-disposition") || "attachment",
    },
  });
}