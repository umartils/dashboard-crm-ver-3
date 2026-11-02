// app/retention/page.tsx (sesuaikan folder, mis. di dalam route group dashboard)
import RetentionDashboard from "@/components/retention/RetentionDashboard";
import { serverApi } from "@/lib/server-api";
import {
  COHORT_MAX_OFFSET,
  RetentionCohortResponse,
  RetentionMonthlyResponse,
} from "@/lib/retention";

export const metadata = { title: "Donatur Retention" };

type Params = {
  month_start: string | "2026-01-01";
  month_end?: string;
};

export default async function Retention({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;

  // /api/retention/monthly: filter periode dari URL (month_start, month_end).
  const monthlyQuery = new URLSearchParams();
  if (p.month_start) monthlyQuery.set("month_start", p.month_start);
  if (p.month_end) monthlyQuery.set("month_end", p.month_end);
  const monthlyQueryString = monthlyQuery.toString();

  // /api/retention/cohort: periode yang sama, dipetakan ke cohort_start/cohort_end.
  const cohortQuery = new URLSearchParams({
    max_offset: String(COHORT_MAX_OFFSET),
  });
  if (p.month_start) cohortQuery.set("cohort_start", p.month_start);
  if (p.month_end) cohortQuery.set("cohort_end", p.month_end);

  const [monthly, cohort] = await Promise.all([
    serverApi<RetentionMonthlyResponse>(`/api/retention/monthly${monthlyQueryString ? `?${monthlyQueryString}` : ""}`),

    serverApi<RetentionCohortResponse>(`/api/retention/cohort?${cohortQuery.toString()}`),
  ]);

  return (
    <RetentionDashboard
      monthStart={p.month_start || "2026-01-01"}
      monthEnd={p.month_end || ""}
      monthly={monthly}
      cohort={cohort}
    />
  );
}