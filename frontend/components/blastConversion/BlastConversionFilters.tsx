"use client";

import DateRangeFilter from "../ui/DateRangeFilter";
import SearchInput from "../ui/SearchInputFiled";
import { useUrlFilters } from "@/hooks/useUrlFilters";

type Current = {
  search: string;
  // month: string; // format YYYY-MM
  start_date: string;
  end_date: string;
  donated: string[]; 
};

export default function BlastConversionFilters({
  current,
}: {
  current: Current;
}) {
  const { updateParam, } = useUrlFilters();

  return ( 
    <div className="donor-filter-bar">
      <SearchInput placeholder="Cari donor..." />
      <DateRangeFilter
        startDate={current.start_date}
        endDate={current.end_date}
        startParam="start_date"
        endParam="end_date"
        label="Tanggal blast"
        align="left"
      />

      <div className="filter-field">
        {/* <label htmlFor="blast-donated-select">Status konversi</label> */}
        <select
          id="blast-donated-select"
          value={current.donated}
          onChange={(e) => updateParam("donated", e.target.value)}
        >
          <option value="">Semua Status</option>
          <option value="1">Konversi (Donasi)</option>
          <option value="0">Belum Konversi</option>
        </select>
      </div>
    </div>
  );
}