import { auth } from "@/auth";
import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://backend:8000";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        detail: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      {
        detail: "Forbidden",
      },
      {
        status: 403,
      }
    );
  }

  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams();

  for (const key of ["page", "page_size"]) {
    const value = Number(incoming.get(key));
    if (Number.isInteger(value) && value > 0) params.set(key, String(value));
  }

  const query = params.toString();

  const response = await fetch(
    `${backendUrl}/api/admin/users${query ? `?${query}` : ""}`,
    {
      headers: {
        "X-Internal-Key": process.env.INTERNAL_API_KEY || "",
        "X-User-Email": session.user.email || "",
      },
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({ detail: "Respons backend tidak valid" }));
  return NextResponse.json(data, { status: response.status });
}

export async function POST( request: Request ) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        detail: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      {
        detail: "Hanya admin yang dapat menambahkan user",
      },
      {
        status: 403,
      }
    );
  }

  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      {
        detail: "Email wajib diisi",
      },
      {
        status: 400,
      }
    );
  }

  const response = await fetch(
    `${backendUrl}/api/admin/users`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "X-Internal-Key":
          process.env.INTERNAL_API_KEY || "",

        "X-User-Email":
          session.user.email || "",
      },

      body: JSON.stringify({ email, }),

      cache: "no-store",
    }
  );
  const data = await response.json();

  return NextResponse.json( data, { status: response.status, } );
}