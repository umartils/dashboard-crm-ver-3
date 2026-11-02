import { serverApi } from "@/lib/server-api";
import DonorsTable from "@/components/donorNon/DonorsTable";
import DonorNonFilters from "@/components/donorNon/NonFilters";
 
type Params = {
    page?: string;
    pageSize?: string;
    search?: string;
    start_date?: string;
    end_date?: string; 
    is_valid?:  string | string[];
}

function toArray( value: string | string[] | undefined ): string[] {
  if (!value) return [];
  return Array.isArray(value)
    ? value
    : [value];
}
 
export default async function DonorNonPage({ searchParams, } : { searchParams: Promise<Params>; }) {
  const p = await searchParams;
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
  // const donors = await serverApi<any>(`/api/donor-non${queryString ? `?${queryString}` : ""}`)
  const [donors, filters] = await Promise.all([
    serverApi<any>(
      `/api/donor-non${queryString ? `?${queryString}` : ""}`
    ),

    serverApi<any>("/api/filters"),
  ]);

  const currentPage = Number(p.page || 1);
  const pageSize =
    Number(
      p.pageSize ||
      donors.page_size ||
      5
    );

  return ( 
    <div className="donor-page">
      <div className="topbar">
        <div>
          <h1>Data Donor Non Donation</h1>
        </div>
      </div>
      <DonorNonFilters
        is_valid={toArray(p.is_valid)} 
        option_is_valid={filters.is_valid}
        querySearch={p.search ?? ''} 
        start_date={p.start_date ?? ''}
        end_date={p.end_date ?? ''}
      />
      <DonorsTable
        donors={donors.data}
        page={currentPage}
        pageSize={pageSize}
        total={donors.total}
        // querySearch={p.search || ""}
      />
    </div>
  )
}
