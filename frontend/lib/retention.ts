// lib/retention.ts — tipe dan formatter halaman Donatur Retention

export type RetentionRow = {
  bulan_retensi: string; // "2026-02-01"
  donatur_bulan_sebelumnya: number;
  kembali: number;
  churn: number;
  retensi_pct: number | null;
  is_final: boolean; // false = bulan masih berjalan
};

export type RetentionSummary = {
  latest_month: string;
  latest_pct: number;
  delta_vs_prev: number | null;
  average_pct: number;
  highest: { month: string; pct: number };
  lowest: { month: string; pct: number };
  latest_prev_donors: number;
  latest_churn: number;
};

export type RetentionMonthlyResponse = {
  data: RetentionRow[];
  summary: RetentionSummary | null;
  last_updated: string | null;
};

export type CohortCell = {
  offset: number;
  active_donors: number;
  pct: number | null;
  is_final: boolean;
};

export type CohortRow = {
  cohort_month: string;
  cohort_size: number;
  cells: CohortCell[];
};

export type RetentionCohortResponse = {
  data: CohortRow[];
  max_offset: number;
  last_updated: string | null;
};

export const COHORT_MAX_OFFSET = 6;

// ---- Formatter -------------------------------------------------------------

export const formatInt = (n: number) => n.toLocaleString("id-ID");

export const formatPct = (n: number | null | undefined) =>
  n == null
    ? "–"
    : `${n.toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`;

export function formatMonth(iso: string, long = false) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(
    "id-ID",
    long ? { month: "long", year: "numeric" } : { month: "short", year: "2-digit" }
  );
}

export function formatDateTime(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}