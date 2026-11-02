"use client";

import DateRangeFilter from "@/components/ui/DateRangeFilter";
import MultiSelectFilter from "@/components/ui/MultiSelectFilter";
import { ExportButton, SyncButton } from "../ui/ActionButton";
import SearchInput from "../ui/SearchInputFiled";
import { useUrlFilters } from "@/hooks/useUrlFilters";

type Current = {
  search: string;
  start_date: string;
  jenis_donor: string[];
  end_date: string;
};

type Filters = {
  jenis_donor: string[];
}

export default function DonorSummaryFilters({ current, filters }: { current: Current; filters: Filters }) {
  const { searchParams, updateMultiParam } = useUrlFilters();

  return (
    <div className="donor-filter-bar">
      <SearchInput placeholder="Cari nama / no. telp..." />

      <DateRangeFilter
        startDate={current.start_date}
        endDate={current.end_date}
        startParam="start_date"
        endParam="end_date"
        label="Tanggal donasi terakhir"
      />

      <MultiSelectFilter
        label="jenis donor"
        paramKey="jenis_donor"
        options={filters.jenis_donor}
        selected={
          current.jenis_donor ?? []
        }
        // align="right"
        onChange={updateMultiParam}
      />

      <div className="filter-actions">
        <SyncButton endpoint="/api/backend/admin/summary-sync" />
        <ExportButton endpoint={`/api/backend/donors/export${
          searchParams.toString()
            ? `?${searchParams.toString()}`
            : ""
          }`}
        />
      </div>
    </div>
  );
}