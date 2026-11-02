import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
  const target = new URL(`${backendUrl}/api/blast-conversions/export`);
  req.nextUrl.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  const res = await fetch(target, {
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