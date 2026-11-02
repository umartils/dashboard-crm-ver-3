"use client";

import { Search } from "lucide-react";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";

type SearchInputProps = {
  placeholder?: string;
  paramKey?: string;   // nama query param di URL
  minLength?: number;
  delay?: number;
  className?: string;
};

export default function SearchInput({
  placeholder = "Cari nama / no HP donor...",
  paramKey = "search",
  minLength = 3,
  delay = 450,
  className = "",
}: SearchInputProps) {
  const { search, setSearch } = useDebouncedSearch(paramKey, minLength, delay);

  const showHint = search.length > 0 && search.trim().length < minLength;

  return (
    <div className={`filter-search ${className}`.trim()}>
      <div className="filter-search-field">
        <Search size={17} className="filter-search-icon" />

        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showHint && (
        <div className="filter-hint">
          Ketik minimal {minLength} karakter
        </div>
      )}
    </div>
  );
}