"use client";
import { useEffect, useRef, useState, } from "react";

import { Filters, Current } from "@/lib/types";
import MultiSelectFilter from "@/components/ui/MultiSelectFilter";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { ExportButton, SyncButton } from "../ui/ActionButton";

import { useUrlFilters } from "@/hooks/useUrlFilters";
import SearchInput from "@/components/ui/SearchInputFiled";

export default function DonorFilters({
  filters,
  role,
  current,
}: {
  filters: Filters;
  role: string | undefined;
  current: Current;
}) {

  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dateRef.current &&
        !dateRef.current.contains(
          event.target as Node
        )
      ) {
        setDateOpen(false);
      }
    }

    document.addEventListener( "mousedown", handleClickOutside );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const dateRef = useRef<HTMLDivElement>(null);
  const { searchParams, updateParam, updateMultiParam } = useUrlFilters();

  return (
    <div className="donor-filter-bar">
      <SearchInput placeholder="Cari nama / HP / email..." />

      <MultiSelectFilter
        label="segmen"
        paramKey="segment"
        options={filters.segments}
        selected={
          current.segment ?? []
        }
        onChange={updateMultiParam}
      />

      <MultiSelectFilter
        label="program"
        paramKey="program"
        options={filters.programs}
        selected={
          current.program ?? []
        }
        onChange={updateMultiParam}
      />

      <MultiSelectFilter
        label="payment"
        paramKey="payment"
        options={filters.payments}
        selected={
          current.payment ?? []
        }
        onChange={updateMultiParam}
      />

      <DateRangeFilter
        startDate={current.prospect_exclude_start}
        endDate={current.prospect_exclude_end}
        startParam="prospect_exclude_start"
        endParam="prospect_exclude_end"
        label="Belum prospek"
        align="right"
      />

      <DateRangeFilter
        startDate={current.last_donation_start}
        endDate={current.last_donation_end}
        startParam="last_donation_start"
        endParam="last_donation_end"
        label="Terakhir donasi"
      />

      <MultiSelectFilter
        label="rumpun program"
        paramKey="program_categories"
        options={filters.program_categories}
        selected={
          current.program_categories ?? []
        }
        onChange={updateMultiParam}
      />

      <MultiSelectFilter
        label="jenis valid"
        paramKey="is_valid"
        options={filters.is_valid}
        selected={
          current.is_valid ?? []
        }
        onChange={updateMultiParam}
        labelMap={{ "1": "Valid", "0": "Tidak Valid" }}
      />

      <div className="filter-actions">
        {role === "admin" && (
          <SyncButton endpoint="/api/backend/admin/sync" />
        )} 

        <ExportButton endpoint={`/api/backend/export/rfm${
            searchParams.toString()
              ? `?${searchParams.toString()}`
              : ""
          }`}
        />
      </div>
    </div>
  );
}