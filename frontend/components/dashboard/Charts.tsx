"use client";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { useIsMobile } from "@/hooks/useIsMobile";

const PIE_CHART_COLORS = [
  "#C96D00",
  "#FDAB45",
  "#FDC44A",
  "#FDBB6A",
  "#FDE0B0",
  "#FF8A00", 
  "#EE8300",
];

const DONOR_TYPE_COLORS: Record<string, string> = {
  new: "#F3A100",
  retained: "#FFC43D",
  reactivated: "#FFD56C",
};

function colorFor(name: string, index: number) {
  return PIE_CHART_COLORS[index % PIE_CHART_COLORS.length];
}

export function SegmentChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const isMobile = useIsMobile(640);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 4, right: 4, bottom: 8, left: -4 }}>
        <Pie
          data={sortedData}
          dataKey="value"
          nameKey="name"
          cx="38%"
          cy={isMobile ? "42%" : "50%"}
          outerRadius={isMobile ? 75 : 95}
          innerRadius={isMobile ? 48 : 55}
          paddingAngle={2}
          label={false}
          labelLine={false}
          
        >
          {sortedData.map((entry, index) => (
            <Cell key={entry.name} fill={colorFor(entry.name, index)} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number, name: string) => [value.toLocaleString("id-ID"), name]} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          itemSorter={(entry: any) => {
            return -(entry?.payload?.value ?? 0);
          }}
          wrapperStyle={{ fontSize: 12, lineHeight: "22px", marginRight: "10px" }}
          formatter={(value: string, entry: any) => {
            const sliceValue = entry?.payload?.value ?? 0;
            const percent = total > 0 ? Math.round((sliceValue / total) * 100) : 0;
            return `${value} (${percent}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DonorTypeChart({
  data,
}: {
  data: { type: string; label: string; count: number; percentage: number }[];
}) {
  const chartData = data.map((d) => ({ name: d.label, value: d.count, percentage: d.percentage, key: d.type }));
  const isMobile = useIsMobile();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          outerRadius={isMobile ? 75 : 95}
          innerRadius={isMobile ? 48 : 55}
          paddingAngle={2}
          label={(entry) => (
            <text
              x={entry.x}
              y={entry.y}
              textAnchor={entry.textAnchor}
              fontSize={14}
              fill="#4c4d4f"
            >
              {`${entry.name} ${entry.percentage}%`}
            </text>
          )}
        >
          {chartData.map((entry) => (
            <Cell key={entry.key} fill={DONOR_TYPE_COLORS[entry.key] || "#6b7280"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string, item: any) => [
            `${value.toLocaleString("id-ID")} (${item?.payload?.percentage ?? 0}%)`,
            name,
          ]}
        />
        {/* <Legend verticalAlign="bottom" height={36} iconType="circle" /> */}
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProgramChart({ data }: { data: { name: string; value: number }[] }) {
  const isMobile = useIsMobile();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={ isMobile 
        ? { left: 0, right: 12} 
        : { left: 8, right: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" fontSize={isMobile ? 11 : 13}/>
        <YAxis type="category" dataKey="name" width={130} fontSize={ isMobile ? 11 : 12 } />
        <Tooltip formatter={(value: number) => value.toLocaleString("id-ID")} />
        <Bar dataKey="value" fill="#e99000" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer> 
  );
}
 
export function TopDonorsChart({ data }: { data: { name: string; value: number }[] }) {
  const isMobile = useIsMobile();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={ isMobile 
        ? { left: 0, right: 12} 
        : { left: 8, right: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" fontSize={isMobile ? 11 : 13}/>
        <YAxis type="category" dataKey="name" width={130} fontSize={ isMobile ? 11 : 12 } />
        <Tooltip formatter={(value: number) => `Rp${value.toLocaleString("id-ID")}`} />
        <Bar dataKey="value" fill="#e99000" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
