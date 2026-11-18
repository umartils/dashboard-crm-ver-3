import { MultiSelectFilterProps } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import SelectSearchInput from "./SelectSearchInput";

export default function MultiSelectFilter({
  label,
  paramKey,
  options,
  selected,
  align = "left",
  onChange,
  labelMap,
  searchable = options.length > 7,
  searchPlaceholder = "Cari...",
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  function closeDropdown() {
    setIsOpen(false);
    setQuery("");
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getLabel(value: string) {
    return labelMap?.[value] ?? value;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery !== "";

  const filteredOptions = useMemo(() => {
    if (!isSearching) return options;
    return options.filter(
      (item) =>
        getLabel(item).toLowerCase().includes(normalizedQuery) ||
        item.toLowerCase().includes(normalizedQuery)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, normalizedQuery, labelMap]);

  function toggleOption(value: string) {
    if (selected.includes(value)) {
      onChange(paramKey, selected.filter((item) => item !== value));
    } else {
      onChange(paramKey, [...selected, value]);
    }
  }

  function getDisplayLabel() {
    if (selected.length === 0) return `Semua ${label}`;
    if (selected.length === 1) return getLabel(selected[0]);
    return `${selected.length} ${label} dipilih`;
  }

  return (
    <div ref={dropdownRef} className="multi-select">
      <button
        type="button"
        className={`multi-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => (isOpen ? closeDropdown() : setIsOpen(true))}
      >
        <span className={selected.length === 0 ? "multi-select-placeholder" : ""}>
          {getDisplayLabel()}
        </span>
        {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {isOpen && (
        <div
          className={`multi-select-dropdown ${
            align === "right" ? "align-right" : ""
          }`}
        >
          {searchable && (
            <>
              <SelectSearchInput
                value={query}
                onChange={setQuery}
                onEscape={closeDropdown}
                placeholder={searchPlaceholder}
              />
              <div className="multi-select-divider" />
            </>
          )}

          {/* "Semua" disembunyikan saat mencari agar tidak membingungkan */}
          {!isSearching && (
            <>
              <div className={`multi-select-option ${ selected.length === 0 ? "selected" : "" }`} onClick={() => onChange(paramKey, [])} >
                <div className="filter-checkbox">
                  {selected.length === 0 && <Check size={14} />}
                </div>
                <span>Semua {label}</span>
              </div>
            </>
          )}

          <div className="multi-select-options">
            {filteredOptions.length === 0 ? (
              <div className="multi-select-empty">
                Tidak ada hasil untuk &ldquo;{query.trim()}&rdquo;
              </div>
            ) : (
              filteredOptions.map((item) => {
                const checked = selected.includes(item);
                return (
                  <div
                    key={item}
                    className={`multi-select-option ${checked ? "selected" : ""}`}
                    onClick={() => toggleOption(item)}
                  >
                    <div className="filter-checkbox">
                      {checked && <Check size={14} />}
                    </div>
                    <span>{getLabel(item)}</span>
                  </div>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="multi-select-footer">
              <button type="button" onClick={() => onChange(paramKey, [])}>
                Reset filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}