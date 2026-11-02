// /@/components/DateRangeFilter.tsx
"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { useDateRangeFilter, } from "@/hooks/useDateRangeFilter";

type DateRangeFilterProps = {
  startDate?: string;
  endDate?: string;

  startParam?: string;
  endParam?: string;

  label?: string;

  align?: "left" | "right";
};

export default function DateRangeFilter({
  startDate = "",
  endDate = "",
  startParam = "start_date",
  endParam = "end_date",
  label = "Tanggal donasi",
  align = "left",
}: DateRangeFilterProps) {
  const {
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
  } = useDateRangeFilter({
    startDate,
    endDate,
    startParam,
    endParam,
  });
  
  const displayLabel = hasDateFilter ? getDateLabel() : label;

  return (
    <div ref={panelRef} className="date-filter" >

      <button
        type="button"
        className={`
          date-filter-trigger
          ${isOpen ? "is-open" : ""}
          ${hasDateFilter ? "has-value" : ""}
        `}
        onClick={togglePanel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="date-filter-label">
          <CalendarDays size={17} />
          <span>
            {displayLabel}
          </span>
        </div>

        {isOpen ? (
          <ChevronUp size={17} />
        ) : (
          <ChevronDown size={17} />
        )}
      </button>

      {/* PANEL */}

      {isOpen && (
        <div
          className={`
            date-filter-panel
            ${
              align === "left"
                ? "align-left"
                : "align-right"
            }
          `}
          role="dialog"
          aria-label="Pilih rentang tanggal"
        >
          <p className="date-filter-title">Rentang tanggal</p>
          <div className="date-filter-fields">
            <div className="date-filter-field">
              <label htmlFor={`${startParam}-input`}>Dari</label>
              <input
                id={`${startParam}-input`}
                type="date"
                value={localStart}
                max={
                  localEnd ||
                  undefined
                }
                onChange={(e) =>
                  setLocalStart(
                    e.target.value
                  )
                }
              />
            </div>


            <div className="date-filter-separator"> sampai </div>
            <div className="date-filter-field">
              <label htmlFor={`${endParam}-input`}> Sampai </label>
              <input
                id={`${endParam}-input`}
                type="date"
                value={localEnd}
                min={
                  localStart ||
                  undefined
                }
                onChange={(e) =>
                  setLocalEnd(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="date-filter-actions">
            <button
              type="button"
              className="date-filter-reset"
              onClick={handleReset}
            >
              Reset
            </button>

            <button
              type="button"
              className="date-filter-apply"
              onClick={handleApply}
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}