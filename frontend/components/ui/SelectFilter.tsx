import { SelectFilterProps } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

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
}: SelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const defaultLabel = allLabel ?? `Semua ${label}`;
  const hasValue = selected !== "";
  const emptyLabel = placeholder ?? defaultLabel;

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function getLabel(value: string) {
    return labelMap?.[value] ?? value;
  }

  function handleSelect(value: string) {
    onChange(paramKey, value);
    setIsOpen(false); // single select: langsung tutup setelah memilih
  }

  return (
    <div ref={dropdownRef} className="multi-select">
      <button
        type="button"
        className={`multi-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className={!hasValue ? "multi-select-placeholder" : ""}>
            {hasValue ? getLabel(selected) : emptyLabel}
        </span>

        {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {isOpen && (
        <div className={`multi-select-dropdown ${align === "right" ? "align-right" : ""}`}>
            {showAllOption && (
            <>
                <div
                className={`multi-select-option ${!hasValue ? "selected" : ""}`}
                onClick={() => handleSelect("")}
                >
                <div className="filter-checkbox">
                    {!hasValue && <Check size={14} />}
                </div>
                <span>{defaultLabel}</span>
                </div>
                <div className="multi-select-divider" />
            </>
            )}

          <div className="multi-select-options">
            {options.map((item) => {
              const isSelected = selected === item;
              return (
                <div
                  key={item}
                  className={`multi-select-option ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  <div className="filter-checkbox">
                    {isSelected && <Check size={14} />}
                  </div>
                  <span>{getLabel(item)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}