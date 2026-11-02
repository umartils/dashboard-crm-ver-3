"use client";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { SyncButton } from "../ui/ActionButton";

type props = {
  monthStart: string;
  monthEnd: string;
}

export default function RetentionFilterBar({monthStart, monthEnd} : props) {

  return (
    <div className="donor-filter-bar">
        <div className="retention-filters">
          <DateRangeFilter
            startDate={monthStart}
            endDate={monthEnd}
            startParam="month_start"
            endParam="month_end"
            label="Periode"
          />
        </div>

        <div className="filter-actions">
          <SyncButton endpoint="/api/backend/retention/admin/retention-sync" />
        </div>
      </div>
  )
}