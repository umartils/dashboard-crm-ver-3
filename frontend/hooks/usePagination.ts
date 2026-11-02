"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type UsePaginationOptions = {
  totalPages: number;
  mode?: "url" | "state";
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void; // BARU
};

export function usePagination({
  totalPages,
  mode = "url",
  onPageChange,
  onPageSizeChange, // BARU
}: UsePaginationOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages) {
      return;
    }

    if (mode === "state") {
      onPageChange?.(targetPage);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (targetPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(targetPage));
    }

    const queryString = params.toString();

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function changePageSize(size: number) {
    // Mode "state": biarkan parent yang kelola page size
    if (mode === "state") {
      onPageSizeChange?.(size); // BARU — sebelumnya cuma `return`
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    params.set("page_size", String(size));
    params.delete("page");

    const queryString = params.toString();

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return {
    goToPage,
    changePageSize,
  };
}