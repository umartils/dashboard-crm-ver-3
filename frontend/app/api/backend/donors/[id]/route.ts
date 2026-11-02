import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    const backendUrl =
      process.env.BACKEND_URL || "http://backend:8000";

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const targetUrl = queryString
      ? `${backendUrl}/api/donors/${id}/?${queryString}`
      : `${backendUrl}/api/donors/${id}`;

    const response = await fetch(
      targetUrl,
      {
        headers: {
          "X-Internal-Key":
            process.env.INTERNAL_API_KEY || "",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Donor detail proxy error:", error);

    return NextResponse.json(
      {
        detail: "Unable to load donor detail",
      },
      {
        status: 500,
      }
    );
  }
}