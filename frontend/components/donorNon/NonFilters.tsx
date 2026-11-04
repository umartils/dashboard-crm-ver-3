"use client";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { ExportButton, SyncButton } from "../ui/ActionButton";
import SearchInput from "../ui/SearchInputFiled";
import DateRangeFilter from "../ui/DateRangeFilter";
import MultiSelectFilter from "../ui/MultiSelectFilter";

type Props = {
    querySearch:string;
    start_date: string;
    end_date: string;
    option_is_valid: string[];
    is_valid: string [];
}  

export default function DonorNonFilters( { querySearch, start_date, end_date, is_valid, option_is_valid }: Props ) {
    const { searchParams, updateMultiParam } = useUrlFilters();

    return (
        <div className="donor-filter-bar">
            <SearchInput />
            <DateRangeFilter
              startDate={start_date}
              endDate={end_date}
              startParam="start_date"
              endParam="end_date"
              label="Tanggal Registrasi"
              align="right"
            />
            <MultiSelectFilter
              label="jenis valid"
              paramKey="is_valid"
              options={option_is_valid}
              selected={
                is_valid ?? []
              }
              onChange={updateMultiParam}
              labelMap={{ "1": "Valid", "0": "Tidak Valid" }}
            />

            <div className="filter-actions">
                <SyncButton endpoint="/api/backend/admin/non-sync" />
                <ExportButton endpoint={
                    `/api/backend/export/non${ searchParams.toString() 
                        ? `?${searchParams.toString()}` 
                        : "" 
                    }
                `} />
            </div>
        </div> 
    )
}