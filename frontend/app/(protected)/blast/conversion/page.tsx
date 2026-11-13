import { serverApi } from "@/lib/server-api";
import BlastSettingsForm from "@/components/blastConversion/BlastSettingsForm";
import BlastConversionSummary from "@/components/blastConversion/BlastConversionSummary";
import BlastConversionFilters from "@/components/blastConversion/BlastConversionFilters";
import BlastConversionTable from "@/components/blastConversion/BlastConversionTable";
import BlastConversionButton from "@/components/blastConversion/BlastButton";
 
type Params = {
  page?: string;
  page_size?: string;

  start_date?: string;
  end_date?: string;

  month?: string; // YYYY-MM dari <input type="month">
  donated?: string | string[];
  search?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function BlastConversionPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  // const monthValue = p.month ? `${p.month}-01` : undefined;

  const query = new URLSearchParams();

  Object.entries(p).forEach(([key, value]) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        query.append(key, item);
      });
    } else {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  // const summaryQuery = monthValue ? `?month=${monthValue}` : "";

  const [list, summary, setting] = await Promise.all([
    serverApi<any>(
      `/api/blast-conversions${queryString ? `?${queryString}` : ""}`
    ),
    serverApi<any>(`/api/blast-conversions/summary${queryString ? `?${queryString}` : ""}`),
    serverApi<any>("/api/blast-settings"),
  ]);

  const currentPage = Number(p.page || 1);
  const pageSize = Number(p.page_size || list.page_size || 10);
  console.log(list.data);

  return ( 
    <>
      <div className="topbar">
        <div>
          <h1>Konversi WhatsApp Blast</h1>
        </div>

        <BlastConversionButton /> 
      </div>

      <BlastSettingsForm initialRate={Number(setting.rate_per_message ?? 0)} />

      <BlastConversionSummary summary={summary} />

      <BlastConversionFilters
        current={{
          search: p.search || "",
          start_date: p.start_date || "",
          end_date: p.end_date || "",
          donated: toArray(p.donated),
        }}
      />

      <BlastConversionTable
        rows={list.data}
        total={list.total}
        page={currentPage}
        pageSize={pageSize}
      />
    </>
  );
}