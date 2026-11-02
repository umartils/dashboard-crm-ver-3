// components/retention/CohortHeatmap.tsx
import { CohortRow, formatInt, formatMonth } from "@/lib/retention";

type Props = {
  rows: CohortRow[];
  maxOffset: number;
};

// Makin tinggi persen, makin pekat. Teks tetap gelap supaya kontras terjaga.
const cellBackground = (pct: number) =>
  `color-mix(in srgb, var(--brand-400) ${Math.max(pct, 6)}%, var(--brand-50))`;

export default function CohortHeatmap({ rows, maxOffset }: Props) {
  const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i);

  return (
    <div className="retention-table-wrap">
      <table className="cohort-table">
        <thead>
          <tr>
            <th scope="col">Kohort</th>
            <th scope="col" className="num">
              Donatur
            </th>
            {offsets.map((o) => (
              <th key={o} scope="col">
                Bulan {o}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const byOffset = new Map(row.cells.map((c) => [c.offset, c]));
            return (
              <tr key={row.cohort_month}>
                <th scope="row">{formatMonth(row.cohort_month, true)}</th>
                <td className="num">{formatInt(row.cohort_size)}</td>
                {offsets.map((o) => {
                  const cell = byOffset.get(o);
                  if (!cell || cell.pct == null) return <td key={o} />;
                  return (
                    <td
                      key={o}
                      className={`cell ${cell.is_final ? "" : "is-partial"}`}
                      style={{ background: cellBackground(cell.pct) }}
                      title={`${formatInt(cell.active_donors)} donatur${
                        cell.is_final ? "" : " (bulan berjalan)"
                      }`}
                    >
                      {Math.round(cell.pct)}%
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}