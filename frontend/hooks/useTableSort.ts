"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useTableSort<T extends string>(defaultSortBy?: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortBy = (searchParams.get("sort_by") as T | null) ?? defaultSortBy ?? null;
  const sortOrder = searchParams.get("sort_order") ?? "desc";

  const toggleSort = useCallback(
    (key: T) => {
      const params = new URLSearchParams(searchParams.toString());

      if (sortBy !== key) {
        params.set("sort_by", key);
        params.set("sort_order", "desc");
      } else if (sortOrder === "desc") {
        params.set("sort_order", "asc");
      } else {
        params.delete("sort_by");
        params.delete("sort_order");
      }

      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, sortBy, sortOrder, router, pathname]
  );

  return { sortBy, sortOrder, toggleSort };
}