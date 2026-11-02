"use client";

import { useEffect, useState, useCallback } from "react";

export interface ColumnOption {
  key: string;
  label: string;
  locked?: boolean;
}

interface UseColumnVisibilityOptions {
  columns: ColumnOption[];
  defaultVisible: string[];
  storageKey: string;
}

export function useColumnVisibility({
  columns,
  defaultVisible,
  storageKey,
}: UseColumnVisibilityOptions) {
  const [visibleKeys, setVisibleKeys] = useState<string[]>(defaultVisible);

  // load preferensi tersimpan saat mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const validKeys = new Set(columns.map((c) => c.key));
      const lockedKeys = columns.filter((c) => c.locked).map((c) => c.key);

      if (
        Array.isArray(parsed) &&
        parsed.every((k) => typeof k === "string" && validKeys.has(k)) &&
        lockedKeys.every((k) => parsed.includes(k))
      ) {
        setVisibleKeys(parsed);
      }
    } catch {
      // biarkan default kalau localStorage korup / gagal parse
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = useCallback(
    (next: string[]) => {
      setVisibleKeys(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // localStorage bisa gagal di private mode / quota penuh, aman diabaikan
      }
    },
    [storageKey]
  );

  const toggleColumn = useCallback(
    (key: string) => {
      const col = columns.find((c) => c.key === key);
      if (col?.locked) return;

      const next = visibleKeys.includes(key)
        ? visibleKeys.filter((k) => k !== key)
        : [...visibleKeys, key];

      persist(next);
    },
    [columns, visibleKeys, persist]
  );

  const allSelected = columns.every((c) => visibleKeys.includes(c.key));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      persist(columns.filter((c) => c.locked).map((c) => c.key));
    } else {
      persist(columns.map((c) => c.key));
    }
  }, [allSelected, columns, persist]);

  const activeColumns = columns.filter((c) => visibleKeys.includes(c.key));

  return {
    visibleKeys,
    activeColumns,
    allSelected,
    toggleColumn,
    toggleAll,
    setVisibleKeys: persist,
  };
}