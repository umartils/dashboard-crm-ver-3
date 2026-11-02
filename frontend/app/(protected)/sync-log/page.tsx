import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import SyncLogTable from "@/components/SyncLogTable";

export type SyncLog = {
  id: number;
  started_at: string | null;
  finished_at: string | null;
  status: string;
  donor_count: number | null;
  message: string | null;
};

type SyncLogResponse = {
  logs: SyncLog[];
};

export default async function SyncLogPage() {
  const session = await auth();
  const data = await serverApi<SyncLogResponse>('/api/admin/sync-log')
  const logs = data.logs ?? [];

  if (!session?.user) {
    redirect("/login");
  }

  if (
    session.user.role !== "admin"
  ) {
    redirect("/dashboard");
  }

  return (
    <>
        <div className="top-bar">
            <div>
                <h1>
                    Sync Log Page
                </h1>
            </div>
        </div>

        <SyncLogTable logs={logs} />
    </>
  )
}