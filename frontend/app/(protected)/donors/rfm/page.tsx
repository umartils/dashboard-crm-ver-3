import { serverApi } from "@/lib/server-api";
import DonorFilters from "@/components/donorRfm/DonorFilters";
import DonorTable from "@/components/donorRfm/DonorTable";
import { auth } from "@/auth";

type Params = {
  page?: string;
  page_size?: string;

  segment?: string | string[];
  program?: string | string[];
  payment?: string | string[];
  jenis_donor?: string | string[];
  program_categories?: string | string[];
  is_valid?: string | string[];

  last_donation_start?: string;
  last_donation_end?: string;

  prospect_exclude_start: string;
  prospect_exclude_end: string;

  search?: string;
};

function toArray( value: string | string[] | undefined ): string[] {
  if (!value) return [];
  return Array.isArray(value)
    ? value
    : [value];
}

export default async function Donors({ searchParams }: { searchParams: Promise<Params>; }) {
  const session = await auth();
  const userRole = session?.user?.role;
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

  const [list, filters] = await Promise.all([
    serverApi<any>(
      `/api/donors${queryString ? `?${queryString}` : ""}`
    ),

    serverApi<any>("/api/filters"),
  ]);

  const currentPage = Number(p.page || 1);
  const pageSize =
    Number(
      p.page_size ||
      list.page_size ||
      5
    );

  return (
    <div className="donor-page">
      <div className="topbar">
        <div>
          <h1>Data Donor RFM</h1>
        </div>
      </div>

      <DonorFilters
        filters={filters}
        role={userRole}
        current={{
          search: p.search || "",
          segment: toArray(p.segment),
          program: toArray(p.program),
          payment: toArray(p.payment),
          jenis_donor: toArray(p.jenis_donor),
          program_categories: toArray(p.program_categories),
          is_valid: toArray(p.is_valid),
          last_donation_start: p.last_donation_start || "",
          last_donation_end: p.last_donation_end || "",
          prospect_exclude_start: p.prospect_exclude_start || "",
          prospect_exclude_end: p.prospect_exclude_end || "",
        }}
      />

      {/* <div className="table-card"> */}
      <DonorTable
        rows={list.data}
        total={list.total}
        page={currentPage}
        pageSize={pageSize}
      />
      {/* </div> */}
    </div>
      
  );
}