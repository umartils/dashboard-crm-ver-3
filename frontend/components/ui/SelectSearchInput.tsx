import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

export default function SelectSearchInput({
  value,
  onChange,
  onEscape,
  onEnter, 
  placeholder = "Cari...",
}: {
  value: string;
  onChange: (value: string) => void;
  onEscape: () => void;
  onEnter?: () => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // komponen ini hanya dirender saat dropdown terbuka, jadi fokus otomatis saat mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="multi-select-search">
      <Search size={13} className="multi-select-search-icon" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // cegah submit form di dalam modal
            onEnter?.();
          }
          if (e.key === "Escape") {
            e.stopPropagation(); // cegah modal ikut tertutup
            onEscape();
          }
        }}
      />
      {value && (
        <button
          type="button"
          className="multi-select-search-clear"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Hapus pencarian"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}