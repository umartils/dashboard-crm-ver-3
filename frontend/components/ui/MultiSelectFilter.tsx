import { MultiSelectFilterProps } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";


export default function MultiSelectFilter({
  label,
  paramKey,
  options,
  selected,
  align="left",
  onChange,
  labelMap,
}: MultiSelectFilterProps) {
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

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  function getLabel(value: string) {
    return labelMap?.[value] ?? value;
  }

  function toggleOption(value: string) {
    if (selected.includes(value)) {
      onChange(
        paramKey,
        selected.filter(
          (item) => item !== value
        )
      );
    } else {
      onChange(
        paramKey,
        [...selected, value]
      );
    }
  }


  function getDisplayLabel() {
    if (selected.length === 0) {
      return `Semua ${label}`;
    }

    if (selected.length === 1) {
      return getLabel(selected[0]);
    }

    return `${selected.length} ${label} dipilih`;
  }


  return (
    <div
      ref={dropdownRef}
      className="multi-select"
    >
      <button
        type="button"
        className={`multi-select-trigger ${
          isOpen ? "is-open" : ""
        }`}
        onClick={() =>
          setIsOpen((prev) => !prev)
        }
      >
        <span
          className={
            selected.length === 0
              ? "multi-select-placeholder"
              : ""
          }
        >
          {getDisplayLabel()}
        </span>

        {isOpen ? (
          <ChevronUp size={17} />
        ) : (
          <ChevronDown size={17} />
        )}
      </button>
 
 
      {isOpen && (
        <div 
        className={`multi-select-dropdown ${
          align === "right"
            ? "align-right"
            : ""
        }`}>
          <div
            className={`multi-select-option ${
              selected.length === 0
                ? "selected"
                : ""
            }`}
            onClick={() =>
              onChange(paramKey, [])
            }
          >
            <div className="filter-checkbox">
              {selected.length === 0 && (
                <Check size={14} />
              )}
            </div>

            <span>Semua {label}</span>
          </div>


          <div className="multi-select-divider" />
          <div className="multi-select-options">
            {options.map((item) => {
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
            })}
          </div>


          {selected.length > 0 && (
            <div className="multi-select-footer">
              <button
                type="button"
                onClick={() =>
                  onChange(paramKey, [])
                }
              >
                Reset filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}