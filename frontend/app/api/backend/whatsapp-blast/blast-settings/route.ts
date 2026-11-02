import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/lib/server-api";

export async function GET() {
  const data = await serverApi<any>("/api/blast-settings");
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  const data = await serverApi<any>("/api/blast-settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });

  return NextResponse.json(data);
}