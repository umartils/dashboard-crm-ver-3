import { serverApi } from "@/lib/server-api";
import BlastUpload from "@/components/blastResult/BlastUpload";
import BlastResultFilters from "@/components/blastResult/BlastResultFilters";
import BlastResultTable from "@/components/blastResult/BlastResultTable";

type Params = {
  page?: string;
  page_size?: string;

  status?: string | string[];

  start_date?: string;
  end_date?: string;

  search?: string;
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function WhatsappBlastPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
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

  const list = await serverApi<any>(
    `/api/whatsapp-blast/results${queryString ? `?${queryString}` : ""}`
  );

  const currentPage = Number(p.page || 1);
  const pageSize = Number(p.page_size || list.page_size || 10);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>History WhatsApp Blast</h1>
        </div>
      </div> 

      <BlastResultFilters
        current={{
          search: p.search || "",
          status: toArray(p.status),
          start_date: p.start_date || "",
          end_date: p.end_date || "",
        }}
      />

      <BlastUpload />

      {/* <div className="table-card"> */}
        <BlastResultTable
          rows={list.data}
          total={list.total}
          page={currentPage}
          pageSize={pageSize}
        />
      {/* </div> */}
    </>
  );
}