import { serverApi } from "@/lib/server-api";
import SegmentHistoryFilters from "@/components/segmentHistory/SegmentHistoryFilters";
import SegmentHistoryTable from "@/components/segmentHistory/SegmentHistoryTable";
import SegmentHistorySummary from "@/components/segmentHistory/SegmentHistorySummary";

type Params = {
  page?: string;
  page_size?: string;

  old_segment?: string | string[];
  new_segment?: string | string[];

  start_date?: string;
  end_date?: string;

  search?: string;
}; 

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function SegmentHistoryPage({
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

  const [list, filters] = await Promise.all([
    serverApi<any>(
      `/api/segment-history${queryString ? `?${queryString}` : ""}`
    ),

    serverApi<any>("/api/filters"),
  ]);


  const currentPage = Number(p.page || 1);
  const pageSize = Number(p.page_size || list.page_size || 10);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Riwayat Perubahan Segment</h1>
        </div>
      </div>

      <SegmentHistoryFilters
        filters={filters}
        current={{
          search: p.search || "",
          old_segment: toArray(p.old_segment),
          new_segment: toArray(p.new_segment),
          start_date: p.start_date || "",
          end_date: p.end_date || "",
        }}
      />

      <SegmentHistorySummary rows={list} />

      <div>
        <SegmentHistoryTable
          rows={list.data}
          total={list.total}
          page={currentPage}
          pageSize={pageSize}
        />
      </div>
    </>
  );
}