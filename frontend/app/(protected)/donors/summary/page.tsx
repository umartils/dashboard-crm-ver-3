import { serverApi } from "@/lib/server-api";
import DonorSummaryFilters from "@/components/donorSummary/DonorSummaryFilterbar";
import DonorSummaryTable from "@/components/donorSummary/DonorSummaryTable";
import DonorSummaryCard from "@/components/donorSummary/DonorSummaryCard";
import { FilterLoadingProvider, LoadingContent } from "@/components/FilterLoadings";

type Params = {
  page?: string;
  page_size?: string;
  search?: string;
  jenis_donor?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: string;
};

function toArray( value: string | string[] | undefined ): string[] {
  if (!value) return [];
  return Array.isArray(value)
    ? value
    : [value];
}

export default async function DonorSummaryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  const query = new URLSearchParams();

  Object.entries(p).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });

  const queryString = query.toString();

  const cardQuery = new URLSearchParams();

  toArray(p.jenis_donor).forEach((j) => cardQuery.append("jenis_donor", j));
  if (p.start_date) cardQuery.set("start_date", p.start_date);
  if (p.end_date) cardQuery.set("end_date", p.end_date);
  const cardQueryString = cardQuery.toString();

  const [list, filters, cardSummary] = await Promise.all([
    serverApi<any>(`/api/donor-summary${queryString ? `?${queryString}` : ""}`),
    serverApi<any>("/api/donor-summary/filters"),
    serverApi<any>(
      `/api/donor-summary/card${cardQueryString ? `?${cardQueryString}` : ""}`
    ),
  ]);

  const currentPage = Number(p.page || 1);
  const pageSize = Number(p.page_size || list.page_size || 5);

  return (
    <FilterLoadingProvider>
      <div className="donor-page">
        <div className="topbar">
          <div>
            <h1>Daftar Donatur</h1>
          </div>
        </div>

        <DonorSummaryFilters
          filters={filters}
          current={{
            search: p.search || "",
            jenis_donor: toArray(p.jenis_donor),
            start_date: p.start_date || "",
            end_date: p.end_date || "",
          }}
        />
        <LoadingContent>

          <DonorSummaryCard summary={cardSummary} />

          <DonorSummaryTable
            rows={list.data}
            total={list.total}
            page={currentPage}
            pageSize={pageSize}
          />
        </LoadingContent>
      </div>
    </FilterLoadingProvider>
  );
}