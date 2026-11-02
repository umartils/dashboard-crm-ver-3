"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Filters } from "@/lib/types";

import MultiSelectFilter from "@/components/ui/MultiSelectFilter";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import SearchInput from "@/components/ui/SearchInputFiled";

type SegmentHistoryCurrent = {
  search: string;
  old_segment: string[];
  new_segment: string[];
  start_date: string;
  end_date: string;
};

export default function SegmentHistoryFilters({
  filters,
  current,
}: {
  filters: Filters;
  current: SegmentHistoryCurrent;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParams, updateMultiParam } = useUrlFilters();

  return (
    <div className="donor-filter-bar">
      <SearchInput />

      <MultiSelectFilter
        label="segmen lama"
        paramKey="old_segment"
        options={filters.segments}
        selected={current.old_segment}
        onChange={updateMultiParam}
      />

      <MultiSelectFilter
        label="segmen baru"
        paramKey="new_segment"
        options={filters.segments}
        selected={current.new_segment}
        align="right"
        onChange={updateMultiParam}
      />
 
      <DateRangeFilter
        startDate={current.start_date}
        endDate={current.end_date}
        startParam="start_date"
        endParam="end_date"
        label="Tanggal perubahan"
        align="right"
      />
    </div>
  );
}