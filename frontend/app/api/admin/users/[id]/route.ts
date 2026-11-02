import { auth } from "@/auth";
import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://backend:8000";

type Context = { params: Promise<{ id: string }> };

async function guardAdmin() {
  const session = await auth();

  if (!session?.user) {
    return { error: NextResponse.json({ detail: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ detail: "Hanya admin yang dapat mengelola user" }, { status: 403 }) };
  }
  return { session };
}

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: Context) {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ detail: "ID user tidak valid" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ detail: "Email wajib diisi" }, { status: 400 });
  }

  const response = await fetch(`${backendUrl}/api/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": process.env.INTERNAL_API_KEY || "",
      "X-User-Email": guard.session!.user!.email || "",
    },
    body: JSON.stringify({ email, is_active: Boolean(body.is_active) }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ detail: "Respons backend tidak valid" }));
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await guardAdmin();
  if (guard.error) return guard.error;

  const id = parseId((await params).id);
  if (id === null) {
    return NextResponse.json({ detail: "ID user tidak valid" }, { status: 400 });
  }

  const response = await fetch(`${backendUrl}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      "X-Internal-Key": process.env.INTERNAL_API_KEY || "",
      "X-User-Email": guard.session!.user!.email || "",
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({ detail: "Respons backend tidak valid" }));
  return NextResponse.json(data, { status: response.status });
}