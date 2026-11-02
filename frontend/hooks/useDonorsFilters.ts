import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  FILTER_ALL_SENTINEL,
  MultiFilterDef,
  resolveMultiSelectValues,
} from "@/lib/filters";

const SEARCH_DEBOUNCE_MS = 450;
const MIN_SEARCH_LENGTH = 3;

type UseDonorFiltersOptions = {
  initialSearch: string;
  multiFilters: MultiFilterDef[];
  syncEndpoint?: string;
};

export function useDonorFilters({
  initialSearch,
  multiFilters,
  syncEndpoint = "/api/backend/admin/sync",
}: UseDonorFiltersOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dateOpen, setDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState(initialSearch);
  const [isSyncing, setIsSyncing] = useState(false);

  // Tutup dropdown date-range saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateRef.current &&
        !dateRef.current.contains(event.target as Node)
      ) {
        setDateOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      params.delete("page");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [router, pathname]
  );

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      pushParams(params);
    },
    [searchParams, pushParams]
  );

  const updateMultiParam = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);

      const def = multiFilters.find((f) => f.paramKey === key);
      const hasDefault = !!def?.defaultValue?.length;

      if (values.length === 0 && hasDefault) {
        // User sengaja pilih "Semua" pada filter yang punya default.
        // Tandai eksplisit lewat sentinel, jangan hapus key dari URL,
        // supaya bisa dibedakan dari "belum pernah disentuh".
        params.append(key, FILTER_ALL_SENTINEL);
      } else {
        values.forEach((value) => params.append(key, value));
      }

      pushParams(params);
    },
    [searchParams, multiFilters, pushParams]
  );

  const getSelected = useCallback(
    (paramKey: string): string[] => {
      const def = multiFilters.find((f) => f.paramKey === paramKey);
      return resolveMultiSelectValues(searchParams, {
        paramKey,
        defaultValue: def?.defaultValue,
      });
    },
    [searchParams, multiFilters]
  );

  // Debounce search -> sinkron ke URL
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

  const handleSync = useCallback(async () => {
    if (isSyncing) return;

    const toastId = toast.loading(
      "Sinkronisasi data sedang berjalan..."
    );

    try {
      setIsSyncing(true);

      const response = await fetch(syncEndpoint, { method: "POST" });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Gagal melakukan sinkronisasi data.");
      }

      toast.success("Sinkronisasi data berhasil.", {
        id: toastId,
        description: "Data donor berhasil diperbarui dari sumber terbaru.",
      });

      router.refresh();
    } catch (error) {
      console.error("Sync donor error:", error);

      toast.error("Sinkronisasi gagal.", {
        id: toastId,
        description:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat sinkronisasi data.",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, syncEndpoint, router]);

  return {
    searchParams,
    search,
    setSearch,
    dateOpen,
    setDateOpen,
    dateRef,
    isSyncing,
    updateParam,
    updateMultiParam,
    getSelected,
    handleSync,
  };
}