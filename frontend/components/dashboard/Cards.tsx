import { UserCheck, Users, Star, Crown, Wallet } from "lucide-react"
import { rupiah } from "@/lib/api";

export type Summary = {
  total_donors: number;
  valid_donors: number;
  today_transactions: number;
  platinum: number;
  favorite_program: string | null;
  segment_distribution: { name: string; value: number }[];
  top_programs: { name: string; value: number }[];
  top_donors: { name: string; value: number }[];
};

export function Cards (summary: any) {

    return (
        <div className="cards">
        <div className="card">
          <div className="card-header">
            <div className="muted">Total Donatur</div>
            <div className="stat-icon" style={{ background: "var(--primary-tint)", color: "var(--primary-dark)" }}>
              <Users size={15} />
            </div>
          </div>
          <div className="kpi">{summary.total_donors.toLocaleString("id-ID")} Donatur</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="muted">Donatur valid</div>
            <div className="stat-icon" style={{ background: "#FFEDBF", color: "#C96D00" }}>
              <UserCheck size={15} />
            </div>
          </div>
          <div className="kpi">{summary.valid_donors.toLocaleString("id-ID")} Donatur</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="muted">Transaksi hari ini</div>
            <div className="stat-icon" style={{ background: "#FFE39A", color: "#DD7F00" }}>
              <Wallet size={15} />
            </div>
          </div>
          <div className="kpi">{rupiah(summary.today_transactions)}</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="muted">Platinum</div>
            <div className="stat-icon" style={{ background: "#fff0cf", color: "#925f09" }}>
              <Crown size={15} />
            </div>
          </div>
          <div className="kpi">{summary.platinum.toLocaleString("id-ID")} Donatur</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="muted">Program favorit</div>
            <div className="stat-icon" style={{ background: "var(--surface-muted)", color: "var(--charcoal)" }}>
              <Star size={15} />
            </div>
          </div>
          <div className="kpi">{summary.favorite_program || "-"}</div>
        </div>
      </div>
    )
}