import { auth } from "@/auth";

export async function serverApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const session = await auth();

  const baseUrl = process.env.BACKEND_URL || "http://backend:8000";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${cleanPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": process.env.INTERNAL_API_KEY || "",
      "X-User-Email": session?.user.email || "",
      ...(options?.headers || {}), 
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Backend API error ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}