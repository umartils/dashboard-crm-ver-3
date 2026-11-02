"use client";

// components/retention/RetentionCharts.tsx
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  RetentionRow,
  formatInt,
  formatMonth,
  formatPct,
} from "@/lib/retention";

type ChartRow = RetentionRow & { label: string };

// Ukuran font & tinggi chart dipusatkan di sini agar mudah disesuaikan
const FONT_SIZE = 10;
const CHART_HEIGHT = 250;
const AXIS_TICK = { fontSize: FONT_SIZE, fill: "var(--muted, #6b7280)" };
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };

function RetentionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="chart-tooltip" style={{ fontSize: 11, lineHeight: 1.4 }}>
      <strong>{formatMonth(r.bulan_retensi, true)}</strong>
      <span>{formatInt(r.donatur_bulan_sebelumnya)} donatur bulan sebelumnya</span>
      <span>
        {formatInt(r.kembali)} retensi ({formatPct(r.retensi_pct)})
      </span>
      <span>{formatInt(r.churn)} churn</span>
    </div>
  );
}

type Props = {
  rows: RetentionRow[]; // hanya bulan final
  average: number | null;
};

export default function RetentionCharts({ rows, average }: Props) {
  const data: ChartRow[] = rows.map((r) => ({
    ...r,
    label: formatMonth(r.bulan_retensi),
  }));

  return ( 
    <div className="grid2">
      <div className="retention-chart-card">
        <h3>Retensi per bulan</h3>
        <div className="retention-chart" style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} strokeOpacity={0.6} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tick={AXIS_TICK}
                height={22}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<RetentionTooltip />} />
              {average != null && (
                <ReferenceLine
                  y={average}
                  stroke="var(--secondary)"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{
                    value: `Rata-rata ${formatPct(average)}`,
                    position: "insideBottomRight",
                    fontSize: 10,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="retensi_pct"
                stroke="var(--brand-600)"
                strokeWidth={2}
                dot={{ r: 3, fill: "#fff", strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="retention-chart-card">
        <h3>Donatur bulan sebelumnya: retensi vs churn</h3>
        <div className="retention-chart" style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={CHART_MARGIN} barCategoryGap="25%">
              <CartesianGrid vertical={false} strokeOpacity={0.6} />
              <XAxis 
                dataKey="label"
                tickLine={false}
                tick={AXIS_TICK}
                height={22}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => formatInt(v)}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                content={<RetentionTooltip />}
                cursor={{ fill: "var(--brand-50)" }}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: FONT_SIZE, paddingTop: 4 }}
              />
              <Bar
                dataKey="retensi"
                name="Kembali berdonasi"
                stackId="donor"
                fill="var(--brand-600)"
              />
              <Bar
                dataKey="churn"
                name="Tidak kembali"
                stackId="donor"
                fill="var(--brand-200)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}