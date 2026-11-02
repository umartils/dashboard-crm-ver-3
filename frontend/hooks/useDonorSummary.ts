"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 450;
const MIN_SEARCH_LENGTH = 3;

export function useDonorSummaryFilters({ initialSearch }: { initialSearch: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, router, pathname]
  );

  // Debounce search -> sinkron ke URL, sama polanya seperti useDonorFilters
  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = search.trim();

      if (trimmed.length >= MIN_SEARCH_LENGTH) {
        updateParam("search", trimmed);
      }

      if (trimmed.length === 0 && searchParams.get("search")) {
        updateParam("search", "");
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return { search, setSearch };
}