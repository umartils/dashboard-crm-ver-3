export async function api<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed (${response.status}): ${response.statusText}`
    );
  }

  return response.json();
}
export const rupiah=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v);
