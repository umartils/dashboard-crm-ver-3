"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FilterLoadingContextValue = {
  isLoading: boolean;
  setLoading: (value: boolean) => void;
};

/*
 * Default no-op, jadi DateRangeFilter tetap aman dipakai
 * di halaman yang tidak memakai provider (mis. halaman Donors).
 */
const FilterLoadingContext =
  createContext<FilterLoadingContextValue>({
    isLoading: false,
    setLoading: () => {},
  });

export function FilterLoadingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isLoading, setLoading] = useState(false);

  const value = useMemo(
    () => ({ isLoading, setLoading }),
    [isLoading]
  );

  return (
    <FilterLoadingContext.Provider value={value}>
      {children}
    </FilterLoadingContext.Provider>
  );
}

export function useFilterLoading() {
  return useContext(FilterLoadingContext);
}

/*
 * Bungkus area konten yang datanya bergantung pada filter.
 */
export function LoadingContent({
  children,
}: {
  children: ReactNode;
}) {
  const { isLoading } = useFilterLoading();

  return (
    <div
      className={`filter-loading-wrap ${
        isLoading ? "is-loading" : ""
      }`}
      aria-busy={isLoading}
    >
      <div className="filter-loading-content">
        {children}
      </div>

      {isLoading && (
        <div
          className="filter-loading-overlay"
          role="status"
          aria-live="polite"
        >
          <span className="filter-loading-spinner" />
          <span className="muted">Memuat data...</span>
        </div>
      )}
    </div>
  );
}