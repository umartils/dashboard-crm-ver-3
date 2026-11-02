import { NextResponse } from "next/server";
import { serverApi } from "@/lib/server-api";

export async function POST() {
  const data = await serverApi<any>("/api/admin/sync/retention", {
    method: "POST",
  });

  return NextResponse.json(data);
}