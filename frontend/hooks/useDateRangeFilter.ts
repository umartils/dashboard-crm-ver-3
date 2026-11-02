"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import { useFilterLoading } from "@/components/FilterLoadings";

type UseDateRangeFilterProps = {
  startDate?: string;
  endDate?: string;

  startParam?: string;
  endParam?: string;
};

export function useDateRangeFilter({
  startDate = "",
  endDate = "",
  startParam = "start_date",
  endParam = "end_date",
}: UseDateRangeFilterProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const [isPending, startTransition] = useTransition();
  const { setLoading } = useFilterLoading();

  /*
   * Sinkronkan local state
   * dengan URL/current filter.
   */
  useEffect(() => { setLocalStart(startDate); }, [startDate]);
  useEffect(() => { setLocalEnd(endDate); }, [endDate]);

  /*
   * Tutup panel ketika klik
   * di luar date filter.
   */
  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        panelRef.current &&
        !panelRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  useEffect(() => {
    setLoading(isPending);
    return () => setLoading(false);
  }, [isPending, setLoading]);

  function pushParams(
    params: URLSearchParams
  ) {
    /*
     * Jika filter berubah,
     * kembali ke page pertama.
     */
    params.delete("page");

    const query = params.toString();
    startTransition(() => {
      router.push(
        query ? `${pathname}?${query}` : pathname
      );
    });

    // router.push( query ? `${pathname}?${query}` : pathname );
  }

  /*
   * Terapkan filter tanggal.
   */
  function handleApply() {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (localStart) {
      params.set(
        startParam,
        localStart
      );
    } else {
      params.delete(
        startParam
      );
    }

    if (localEnd) {
      params.set(
        endParam,
        localEnd
      );
    } else {
      params.delete(
        endParam
      );
    }

    pushParams(params);

    setIsOpen(false);
  }

  /*
   * Reset hanya filter tanggal.
   *
   * Filter segment/program/payment
   * tidak akan terhapus.
   */
  function handleReset() {
    setLocalStart("");
    setLocalEnd("");

    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    params.delete(startParam);
    params.delete(endParam);

    pushParams(params);

    setIsOpen(false);
  }

  function togglePanel() {
    setIsOpen(
      (prev) => !prev
    );
  }

  function getDateLabel() {
    if (
      startDate &&
      endDate
    ) {
      return `${startDate} - ${endDate}`;
    }

    if (startDate) {
      return `Mulai ${startDate}`;
    }

    if (endDate) {
      return `Sampai ${endDate}`;
    }

    return "Tanggal donasi";
  }

  const hasDateFilter =
    Boolean(
      startDate ||
      endDate
    );

  return {
    panelRef,

    isOpen,
    togglePanel,

    localStart,
    setLocalStart,

    localEnd,
    setLocalEnd,

    handleApply,
    handleReset,

    getDateLabel,
    hasDateFilter,
    isPending
  };
}