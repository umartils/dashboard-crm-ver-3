import { serverApi } from "@/lib/server-api";
import { auth } from "@/auth";
// import DonorFilters from "@/components/DonorPage/DonorFilters";
// import DonorTable from "@/components/DonorPage/DonorTable";

type Params = {
  page?: string;
  page_size?: string;
  program?: string | string[];
  payment?: string | string[];
  program_categories?: string | string[];
  campaign?: string | string [];

  start_date?: string;
  end_date?: string;

  search?: string;
}

export default async function Transactions({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams
  const session = await auth();

}