import {
  Users,
  ChartNoAxesCombined,
  Wallet,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { rupiah } from "@/lib/api";

export type DonorSummaryCardData = {
  total_donasi: number;
  jumlah_donatur: number;
  jumlah_donasi: number;
  growth_pct: number | null;
  previous_total_donasi: number;
};

export default function DonorSummaryCard({
  summary,
}: {
  summary: DonorSummaryCardData;
}) {
  const growth = summary.growth_pct;
  const isUp = growth !== null && growth >= 0;
  const GrowthIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className="cards">
      <div className="summary-card">
        <div className="card-header">
          <div className="muted">Total Donasi</div>
          <div
            className="stat-icon"
            style={{ background: "var(--gold-tint)", color: "var(--gold-dark)" }}
          >
            <CircleDollarSign size={25} />
          </div>
        </div>
        <div className="kpi">{rupiah(summary.total_donasi)}</div>
      </div>

      <div className="summary-card">
        <div className="card-header">
          <div className="muted">Jumlah Donatur</div>
          <div
            className="stat-icon"
            style={{ background: "var(--info-tint)", color: "var(--info-dark)" }}
          >
            <Users size={25} />
          </div>
        </div>
        <div className="kpi">
          {summary.jumlah_donatur.toLocaleString("id-ID")} Donatur
        </div>
      </div>

      <div className="summary-card">
        <div className="card-header">
          <div className="muted">Jumlah Donasi</div>
          <div
            className="stat-icon"
            style={{ background: "var(--violet-tint)", color: "var(--violet-dark)" }}
          >
            <Wallet size={25} />
          </div>
        </div>
        <div className="kpi">
          {summary.jumlah_donasi.toLocaleString("id-ID")} Transaksi
        </div>
      </div>

      <div className="summary-card">
        <div className="card-header">
          <div className="muted">Growth (vs tahun lalu)</div>
          <div
            className="stat-icon"
            style={{ background: "var(--success-tint)", color: "var(--success-dark)" }}
          >
            <ChartNoAxesCombined size={25} />
          </div>
        </div>
        <div
          className="kpi"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color:
              growth === null
                ? undefined
                : isUp
                ? "var(--success-dark)"
                : "var(--danger-dark, #ff0000)",
          }}
        >
          {growth === null ? (
            "-"
          ) : (
            <>
              <GrowthIcon size={22} />
              {isUp ? "+" : ""}
              {growth.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%
            </>
          )}
        </div>
        <div className="summary-muted" style={{ fontSize: 12 }}>
          {summary.previous_total_donasi > 0
            ? `Nilai tahun lalu: ${rupiah(summary.previous_total_donasi)}`
            : "Belum ada data tahun lalu"}
        </div>
      </div>
    </div>
  );
}