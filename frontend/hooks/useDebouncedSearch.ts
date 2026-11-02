"use client";

import { useEffect, useRef, useState } from "react";
import { useUrlFilters } from "./useUrlFilters";

export function useDebouncedSearch(key = "search", minLength = 3, delay = 450) {
  const { searchParams, updateParam } = useUrlFilters();
  const current = searchParams.get(key) ?? "";
  const [search, setSearch] = useState(current);

  // simpan versi terbaru supaya effect tidak perlu depend ke updateParam / current
  const latest = useRef({ updateParam, current });
  latest.current = { updateParam, current };

  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = search.trim();
      const { updateParam, current } = latest.current;

      if (trimmed.length >= minLength && trimmed !== current) {
        updateParam(key, trimmed);
      } else if (trimmed.length === 0 && current) {
        updateParam(key, "");
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [search, key, minLength, delay]);

  return { search, setSearch };
}