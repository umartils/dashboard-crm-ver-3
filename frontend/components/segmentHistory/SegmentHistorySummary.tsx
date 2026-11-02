"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ArrowRight } from "lucide-react";
import { SegmentLabelHistoryRow } from "@/lib/types";
import "./style.css";
 
// key = nilai di DB, label = teks di UI, dot = warna titik di baris
const SEGMENTS = [
  { key: "New Donor", label: "New Donor", dot: "#7f77dd" },
  { key: "Champion", label: "Champion", dot: "#ba7517" },
  { key: "Loyal", label: "Loyal", dot: "#378add" },
  { key: "Active", label: "Aktif", dot: "#d85a30" },
  { key: "Potential", label: "Potensial", dot: "#1d9e75" },
  { key: "Passive", label: "Pasif", dot: "#888780" },
];

const RANK: Record<string, number> = {
  Champion: 5,
  Loyal: 4,
  Active: 3,
  Potential: 2,
  Passive: 1,
};

const fmt = (n: number) => n.toLocaleString("id-ID");

function cellStyle(from: string, to: string, value: number, max: number) {
  if (value === 0) return undefined;
  const a = 0.25 + 0.55 * (value / max);

  if (from === to) return { background: "#e5e5e3", color: "#6b6b66" };
  if (from === "New Donor") return { background: `rgba(127,119,221,${a})`, color: "#26215c" };
  if (RANK[to] > RANK[from]) return { background: `rgba(99,153,34,${a})`, color: "#173404" };
  return { background: `rgba(226,75,74,${a})`, color: "#501313" };
}

export default function SegmentHistorySummary({
  rows,
}: {
  rows: SegmentLabelHistoryRow;
}) {
  const router = useRouter();
  const { summary, matrix } = rows;

  const { lookup, max } = useMemo(() => {
    const lookup = new Map<string, number>();
    let max = 1;
    for (const c of matrix ?? []) {
      lookup.set(`${c.old_segment}|${c.new_segment}`, c.total);
      // skala warna hanya dari sel non-diagonal
      if (c.old_segment !== c.new_segment) max = Math.max(max, c.total);
    }
    return { lookup, max };
  }, [matrix]);

  const kpis = [
    { label: "Naik level", value: summary.naik, cls: "up" },
    { label: "Turun level", value: summary.turun, cls: "down" },
    { label: "Tetap", value: summary.tetap, cls: "same" },
    { label: "Donor baru berkembang", value: summary.donor_baru_berkembang, cls: "new" },
  ];

  return (
    <div className="seg-summary-card">
      <div className="seg-summary-head">
        <h3>Ringkasan perubahan segmen</h3>
      </div>

      <div className="seg-kpis">
        {kpis.map((k) => (
          <div className="seg-kpi" key={k.label}>
            <span className="seg-kpi-label">{k.label}</span>
            <span className={`seg-kpi-value ${k.cls}`}>{fmt(k.value)}</span>
          </div>
        ))}
      </div>

      <p className="seg-caption">
        Baris: segmen asal <ArrowRight size={12} /> Kolom: segmen tujuan
      </p>

      <div className="seg-matrix-scroll">
        <div className="seg-matrix">
          <div />
          {SEGMENTS.map((s) => (
            <div className="seg-col-head" key={s.key}>{s.label}</div>
          ))}

          {SEGMENTS.map((from) => (
            <div className="seg-row" key={from.key}>
              <div className="seg-row-head">
                <span className="seg-dot" style={{ background: from.dot }} />
                {from.label}
              </div>
              {SEGMENTS.map((to) => {
                const v = lookup.get(`${from.key}|${to.key}`) ?? 0;
                return (
                  <div
                    key={to.key}
                    className={`seg-cell ${v === 0 ? "empty" : ""}`}
                    style={cellStyle(from.key, to.key, v, max)}
                    title={`${from.label} → ${to.label}: ${fmt(v)}`}
                  >
                    {v === 0 ? "0" : fmt(v)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="seg-legend">
        <span><i style={{ background: "#639922" }} />Naik level</span>
        <span><i style={{ background: "#e24b4a" }} />Turun level</span>
        <span><i style={{ background: "#7f77dd" }} />Dari donor baru</span>
        <span><i style={{ background: "#888780" }} />Tidak pindah</span>
      </div>
    </div>
  );
}