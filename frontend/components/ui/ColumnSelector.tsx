"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { ColumnOption } from "@/hooks/useColumnVisibility";

interface ColumnSelectorProps {
  columns: ColumnOption[];
  visibleKeys: string[];
  allSelected: boolean;
  onToggleColumn: (key: string) => void;
  onToggleAll: () => void;
}

export default function ColumnSelector({
  columns,
  visibleKeys,
  allSelected,
  onToggleColumn,
  onToggleAll,
}: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="multi-select">
      <button
        type="button"
        className={`multi-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <SlidersHorizontal size={16} />
          Kolom ({visibleKeys.length}/{columns.length})
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="multi-select-dropdown align-right">
          <div className="multi-select-option" onClick={onToggleAll}>
            <div className="filter-checkbox">
              {allSelected && <Check size={14} />}
            </div>
            <span>{allSelected ? "Batalkan semua" : "Pilih semua"}</span>
          </div>

          <div className="multi-select-divider" />

          <div className="multi-select-options">
            {columns.map((col) => {
              const checked = visibleKeys.includes(col.key);
              return (
                <div
                  key={col.key}
                  className={`multi-select-option ${checked ? "selected" : ""}`}
                  onClick={() => onToggleColumn(col.key)}
                  style={
                    col.locked
                      ? { opacity: 0.6, cursor: "not-allowed" }
                      : undefined
                  }
                >
                  <div className="filter-checkbox">
                    {checked && <Check size={14} />}
                  </div>
                  <span>{col.label}</span>
                  {col.locked && (
                    <span
                      className="muted"
                      style={{ marginLeft: "auto", fontSize: 11 }}
                    >
                      wajib
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}