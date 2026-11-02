"use client";

import MultiSelectFilter from "@/components/ui/MultiSelectFilter";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import SearchInput from "@/components/ui/SearchInputFiled";

const STATUS_OPTIONS = ["delivered", "read", "failed"];

type BlastResultCurrent = {
  search: string;
  status: string[];
  start_date: string;
  end_date: string;
};

export default function BlastResultFilters({
  current,
}: { 
  current: BlastResultCurrent;
}) {

  const { updateMultiParam } = useUrlFilters();

  return (
    <div className="donor-filter-bar">
      <SearchInput />

      <MultiSelectFilter
        label="status blast"
        paramKey="status"
        options={STATUS_OPTIONS}
        selected={current.status}
        onChange={updateMultiParam}
      />

      <DateRangeFilter
        startDate={current.start_date}
        endDate={current.end_date}
        startParam="start_date"
        endParam="end_date"
        label="Tanggal import"
        align="right"
      />
    </div>
  );
}