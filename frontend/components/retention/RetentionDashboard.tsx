// components/retention/RetentionDashboard.tsx
import { ArrowDown, ArrowUp, Percent, TrendingUp, Trophy, UserMinus, RefreshCcw, Repeat, UserRoundX } from "lucide-react";
import {
  COHORT_MAX_OFFSET,
  formatDateTime,
  formatInt,
  formatMonth,
  formatPct,
  RetentionCohortResponse,
  RetentionMonthlyResponse,
} from "@/lib/retention";
import CohortHeatmap from "./CorhortHeatmap";
import RetentionCharts from "./RetentionCharts";
import RetentionFilterBar from "./RetentionFilters";

type Props = {
  monthStart: string;
  monthEnd: string;
  monthly: RetentionMonthlyResponse;
  cohort: RetentionCohortResponse;
};

export default function RetentionDashboard({
  monthStart,
  monthEnd,
  monthly,
  cohort,
}: Props) {
  const rows = monthly?.data ?? [];
  const finalRows = rows.filter((r) => r.is_final && r.retensi_pct != null);
  const summary = monthly?.summary ?? null;
  const delta = summary?.delta_vs_prev ?? null;

  return (
    <div className="retention-page">
      <div className="topbar">
        <div>
          <h1>Donatur Retention</h1>
        </div>
      </div>

      <RetentionFilterBar monthStart={monthStart} monthEnd={monthEnd} />

      <div className="retention-note">
        <strong>Definisi:</strong> retensi bulan M = donatur bulan M-1 yang berdonasi lagi
        di bulan M ÷ total donatur bulan M-1 × 100. Contoh: Januari 1.000 donatur, 800
        berdonasi lagi di Februari, retensi Februari = 80%.
        {monthly?.last_updated && (
          <span className="muted"> Terakhir diperbarui {formatDateTime(monthly.last_updated)}.</span>
        )}
      </div>

      {rows.length === 0 && (
        <div className="state-box">
          Belum ada data retensi pada periode ini. Pastikan sync retensi sudah dijalankan.
        </div>
      )}

      {rows.length > 0 && (
        <>
          {summary && (
            <div className="cards">
              <div className="card">
                <div className="card-header">
                  <p className="muted">Retensi {formatMonth(summary.latest_month, true)}</p>
                  <span className="stat-icon stat-icon--brand" aria-hidden="true">
                    <Percent size={18} />
                  </span>
                </div>
                <div className="kpi">{formatPct(summary.latest_pct)}</div>
                {delta != null && (
                  <span className={`delta ${delta >= 0 ? "is-up" : "is-down"}`}>
                    {delta >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {Math.abs(delta).toLocaleString("id-ID", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{" "}
                    poin vs bulan sebelumnya
                  </span>
                )}
              </div>

              <div className="card">
                <div className="card-header">
                  <p className="muted">Rata-rata periode</p>
                  <span className="stat-icon stat-icon--info" aria-hidden="true">
                    <TrendingUp size={18} />
                  </span>
                </div>
                <div className="kpi">{formatPct(summary.average_pct)}</div>
                <p className="muted">{finalRows.length} bulan terhitung</p>
              </div>

              <div className="card">
                <div className="card-header">
                  <p className="muted">Retensi tertinggi</p>
                  <span className="stat-icon stat-icon--success" aria-hidden="true">
                    <Repeat size={18} />
                  </span>
                </div>
                <div className="kpi">{formatPct(summary.highest.pct)}</div>
                <p className="muted">
                  {formatMonth(summary.highest.month, true)} · terendah{" "}
                  {formatPct(summary.lowest.pct)} ({formatMonth(summary.lowest.month)})
                </p>
              </div>

              <div className="card">
                <div className="card-header">
                  <p className="muted">Donatur Churn</p>
                  <span className="stat-icon stat-icon--danger" aria-hidden="true">
                    <UserRoundX size={18} />
                  </span>
                </div>
                <div className="kpi">{formatInt(summary.latest_churn)}</div>
                <p className="muted">
                  dari {formatInt(summary.latest_prev_donors)} donatur bulan sebelumnya
                </p>
              </div>
            </div>
          )}

          <RetentionCharts rows={finalRows} average={summary?.average_pct ?? null} />

          {cohort && cohort.data.length > 0 && (
            <div className="chart-card retention-section">
              <h3>Cohort retensi</h3>
              <p className="muted retention-sub">
                Persen donatur baru tiap kohort yang masih berdonasi pada bulan ke-0, 1, 2,
                dan seterusnya. Sel bergaris putus-putus = bulan berjalan.
              </p>
              <CohortHeatmap rows={cohort.data} maxOffset={COHORT_MAX_OFFSET} />
            </div>
          )}

          <div className="chart-card retention-section">
            <h3>Detail bulanan</h3>
            <div className="retention-table-wrap">
              <table className="retention-table">
                <thead>
                  <tr>
                    <th scope="col">Bulan</th>
                    <th scope="col" className="num">Donatur bulan sebelumnya</th>
                    <th scope="col" className="num">Kembali</th>
                    <th scope="col" className="num">Churn</th>
                    <th scope="col" className="num">Retensi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.bulan_retensi} className={r.is_final ? "" : "is-live"}>
                      <th scope="row">
                        {formatMonth(r.bulan_retensi, true)}
                        {!r.is_final && <span className="badge-live">On going</span>}
                      </th>
                      <td className="num">{formatInt(r.donatur_bulan_sebelumnya)}</td>
                      <td className="num">{formatInt(r.kembali)}</td>
                      <td className="num">{r.is_final ? formatInt(r.churn) : "–"}</td>
                      <td className="num">
                        <strong>{r.is_final ? formatPct(r.retensi_pct) : "–"}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}