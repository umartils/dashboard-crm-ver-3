import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const { path } = await ctx.params;
  const target = new URL(`${process.env.BACKEND_URL}/api/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((v,k)=>target.searchParams.set(k,v));
  const res = await fetch(target, {
    method: req.method,
    headers: { "x-internal-key": process.env.INTERNAL_API_KEY || "", "content-type":"application/json" },
    body: ["GET","HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store"
  });
  return new NextResponse(res.body, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
}
export const GET = proxy; export const POST = proxy;
