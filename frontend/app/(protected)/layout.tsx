import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { UserProfile } from "@/components/UserProfile";
import { SidebarNav } from "@/components/SidebarNav";
import { SidebarShell } from "@/components/SidebarShell";
import Image from "next/image";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "admin";

  return (
    <SidebarShell
      sidebarContent={
        <>
          <div className="brand">
            <Image
              src="/images/logo-mini.png"
              alt="Masjid Nusantara"
              width={45}
              height={45}
              className="brand-logo"
              priority
            />

            <span className="brand-title">
              DASHBOARD <br></br>CRM
            </span>
          </div>

          <SidebarNav isAdmin={isAdmin} />

          <div className="sidebar-footer">
            <UserProfile
              name={session.user.name}
              email={session.user.email}
              image={session.user.image}
            />
            <LogoutButton />
          </div>
        </>
      }
    >
      {children}
    </SidebarShell>
  );
}