// /@/app/dashboard/page.tsx

import { serverApi } from "@/lib/server-api";
import ConnectionError from "@/components/ui/ConnectionError";
import { safeServerApi } from "@/lib/safe-api";
import { rupiah } from "@/lib/api";
import { SegmentChart, ProgramChart, DonorTypeChart, TopDonorsChart } from "@/components/dashboard/Charts";
import { UserCheck, UserPlus, ShieldCheck, Wallet } from "lucide-react";
import { Summary, DonorTypeBreakdown } from "@/lib/types";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FilterLoadingProvider, LoadingContent } from "@/components/FilterLoadings";
 
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type DashboardPageProps = {
  searchParams: Promise<{ start_date?: string; end_date?: string }>;
};

export default async function Dashboard({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const today = todayISO();

  const startDate = params.start_date || today;
  const endDate = params.end_date || today;

  const [summaryRes, donorTypeRes] = await Promise.all([
    safeServerApi<Summary>(`/api/dashboard/summary?start_date=${startDate}&end_date=${endDate}`),
    safeServerApi<DonorTypeBreakdown>(`/api/analytics/donor-type?year=2026&start_date=${startDate}&end_date=${endDate}`),
  ]);

  if (!summaryRes.ok || !donorTypeRes.ok) {
    const err = !summaryRes.ok ? summaryRes : (donorTypeRes as Extract<typeof donorTypeRes, { ok: false }>);
    return (
      <>
        <div className="topbar">
          <h1>Dashboard CRM Donatur</h1>
        </div>
        <ConnectionError kind={err.kind} message={err.message} />
      </>
    );
  }

  const summary = summaryRes.data;
  const donorType = donorTypeRes.data;

  return (
    <FilterLoadingProvider>
      <div className="topbar">
        <div>
          <h1>Dashboard CRM Donatur</h1>
        </div>
      </div>

      <LoadingContent>
        <div className="donor-filter-bar">
          <DateRangeFilter startDate={startDate} endDate={endDate} />
        </div>

        <div className="cards">

          <div className="card">
            <div className="card-header">
              <div className="muted">Donatur valid</div>
              <div className="stat-icon" style={{ background: "var(--info-tint)", color: "var(--info-dark)" }}>
                <UserCheck size={25} />
              </div>
            </div>
            <div className="kpi">{summary.valid_donors.toLocaleString("id-ID")} Donatur</div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="muted">Donatur Aktif</div>
              <div className="stat-icon" style={{ background: "var(--success-tint)", color: "var(--success-dark)" }}>
                <ShieldCheck size={25} />
              </div>
            </div>
            <div className="kpi">{summary.active_donors.toLocaleString("id-ID")} Donatur</div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="muted">Donatur Baru</div>
              <div className="stat-icon" style={{ background: "var(--violet-tint)", color: "var(--violet-dark)" }}>
                <UserPlus size={25} />
              </div>
            </div>
            <div className="kpi">{summary.new_donors.toLocaleString("id-ID")} Donatur</div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="muted">Total Transaksi</div>
              <div className="stat-icon" style={{ background: "var(--gold-tint)", color: "var(--gold-dark)" }}>
                <Wallet size={25} />
              </div>
            </div>
            <div className="kpi">{rupiah(summary.total_transactions)}</div>
          </div>
        </div>

        <div className="grid2">
          <div className="chart-card">
            <h3>Jenis Donor {donorType.year}</h3>
            <div className="chart">
              <DonorTypeChart data={donorType.breakdown} />
            </div>
          </div>
          <div className="chart-card">
            <h3>Top Donatur ({startDate} - {endDate})</h3>
            <div className="chart">
              <TopDonorsChart data={summary.top_donors} />
            </div>
          </div>
        </div>
      </LoadingContent>

      <div className="grid2">
        <div className="chart-card">
          <h3>Distribusi Segmen RFM</h3>
          <div className="chart">
            <SegmentChart data={summary.segment_distribution} />
          </div>
        </div>
        <div className="chart-card">
          <h3>Program Favorit Donor</h3>
          <div className="chart">
            <ProgramChart data={summary.top_programs} />
          </div>
        </div>
      </div>
    </FilterLoadingProvider>
  );
}