import { Filters } from "@/lib/types";

// Sentinel yang disimpan di URL saat user sengaja memilih "Semua"
// untuk filter yang punya defaultValue. Tanpa ini, "Semua" tidak bisa
// dibedakan dari "param belum pernah disentuh" (keduanya sama-sama
// hilang dari URL).
export const FILTER_ALL_SENTINEL = "__all__";

export type MultiFilterDef = {
  /** key di object `filters` (daftar opsi) yang dikirim backend */
  key: keyof Filters;
  /** nama query param di URL */
  paramKey: string;
  label: string;
  align?: "left" | "right";
  labelMap?: Record<string, string>;
  /**
   * Nilai default saat param BELUM ADA di URL sama sekali.
   * Kosongkan (atau tidak diisi) kalau default filter memang "semua".
   */
  defaultValue?: string[];
};

/**
 * Resolusi nilai `selected` untuk satu multi-select filter,
 * berdasarkan URLSearchParams + config default/sentinel-nya.
 */
export function resolveMultiSelectValues(
  searchParams: URLSearchParams,
  def: Pick<MultiFilterDef, "paramKey" | "defaultValue">
): string[] {
  const { paramKey, defaultValue = [] } = def;

  if (!searchParams.has(paramKey)) {
    return defaultValue;
  }

  const raw = searchParams.getAll(paramKey);

  if (raw.includes(FILTER_ALL_SENTINEL)) {
    return [];
  }

  return raw;
}