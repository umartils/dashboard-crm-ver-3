import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AddUserForm from "@/components/user/AddUserForm";
import UserTable from "@/components/user/UserTable";
import { serverApi } from "@/lib/server-api";
import type { CRMUser } from "@/lib/types";

type Params = {
  page?: string;
  page_size?: string;
};

type UsersResponse = {
  data: CRMUser[];
  total: number;
  page: number;
  page_size: number;
};

function toPositiveInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const p = await searchParams;
  const page = toPositiveInt(p.page, 1);
  const pageSize = Math.min(toPositiveInt(p.page_size, 5), 100); // sama dengan batas le=100 di backend

  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  const list = await serverApi<UsersResponse>(`/api/admin/users?${query.toString()}`);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>User Access</h1>
        </div>
      </div>
 
      <div className="header-add-wrapper">
        <AddUserForm />
        <UserTable
          users={list.data} 
          total={list.total}
          page={page}
          pageSize={pageSize}
        />
      </div>
    </>
  );
}