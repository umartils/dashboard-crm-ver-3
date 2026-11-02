import { NextResponse } from "next/server";
import { serverApi } from "@/lib/server-api";

export async function POST() {
  const data = await serverApi<any>("/api/blast-conversions/sync", {
    method: "POST",
  });

  return NextResponse.json(data);
}