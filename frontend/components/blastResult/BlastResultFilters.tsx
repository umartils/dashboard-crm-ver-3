"use client";

import MultiSelectFilter from "@/components/ui/MultiSelectFilter";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import SearchInput from "@/components/ui/SearchInputFiled";

const STATUS_OPTIONS = ["delivered", "read", "failed"];

type BlastResultCurrent = {
  search: string;
  status: string[]; 
  import_start_date: string;
  import_end_date: string; 
  blast_start_date: string;
  blast_end_date: string;
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
        startDate={current.import_start_date}
        endDate={current.import_end_date}
        startParam="import_start_date"
        endParam="import_end_date"
        label="Tanggal import"
        align="left"
      />
      <DateRangeFilter
        startDate={current.blast_start_date}
        endDate={current.blast_end_date}
        startParam="blast_start_date"
        endParam="blast_end_date"
        label="Tanggal blast"
        align="right"
      />
    </div>
  );
}