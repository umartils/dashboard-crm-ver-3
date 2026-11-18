import { SelectFilterProps } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import SelectSearchInput from "./SelectSearchInput";

export default function SelectFilter({
  label,
  paramKey,
  options,
  selected,
  align = "left",
  onChange,
  labelMap,
  allLabel,
  showAllOption = true,
  placeholder,
  searchable = options.length > 7,
  searchPlaceholder = "Cari...",
}: SelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const defaultLabel = allLabel ?? `Semua ${label}`;
  const hasValue = selected !== "";
  const emptyLabel = placeholder ?? defaultLabel;

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

  function handleSelect(value: string) {
    onChange(paramKey, value);
    closeDropdown();
  }

  return (
    <div ref={dropdownRef} className="multi-select">
      <button
        type="button"
        className={`multi-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => (isOpen ? closeDropdown() : setIsOpen(true))}
      >
        <span className={!hasValue ? "multi-select-placeholder" : ""}>
          {hasValue ? getLabel(selected) : emptyLabel}
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
            <SelectSearchInput
              value={query}
              onChange={setQuery}
              onEscape={closeDropdown}
              // Enter memilih hasil pertama, praktis untuk keyboard
              onEnter={() => {
                if (filteredOptions.length > 0) handleSelect(filteredOptions[0]);
              }}
              placeholder={searchPlaceholder}
            />
          )}

          {showAllOption && !isSearching && (
            <>
              <div className="multi-select-divider" />
              <div className={`multi-select-option ${!hasValue ? "selected" : ""}`} onClick={() => handleSelect("")} >
                <div className="filter-checkbox">
                  {!hasValue && <Check size={14} />}
                </div>
                <span>{defaultLabel}</span>
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
                const isSelected = selected === item;
                return (
                  <div
                    key={item}
                    className={`multi-select-option ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="filter-checkbox">
                      {isSelected && <Check size={14} />}
                    </div>
                    <span>{getLabel(item)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}