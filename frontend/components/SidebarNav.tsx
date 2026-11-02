"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ShieldCheck, UserCog,
  RefreshCw, Megaphone, ListClock, ChartNoAxesCombined,
  RotateCcwClock, ChartPie, Info, FileChartPie,
  SquareUserRound, ChevronDown,
  UserX, UserGroup
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const rfmMenu: NavItem[] = [
  { href: "/guide", label: "RFM Guide", icon: Info },
  { href: "/donors/rfm", label: "Data Donatur RFM", icon: ChartPie },
  { href: "/history", label: "History Segment", icon: ListClock },
]

const mnDonorItems: NavItem[] = [
  { href: "/donors/summary", label: "Donatur MN", icon: SquareUserRound },
  { href: "/donors/retention", label: "Retention MN", icon: FileChartPie },
  { href: "/donors/non", label: "Non Donation", icon: UserX },
];

const blastNavItems: NavItem[] = [
  { href: "/blast/history", label: "History Blast", icon: RotateCcwClock },
  { href: "/blast/conversion", label: "Blast Conversion", icon: ChartNoAxesCombined },
];

const adminNavItems: NavItem[] = [
  { href: "/users", label: "User Access", icon: UserCog },
  { href: "/sync-log", label: "Sync Log", icon: RefreshCw },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  subitem,
}: NavItem & { active: boolean; subitem?: boolean }) {
  return (
    <Link
      href={href}
      className={subitem ? "nav-subitem" : undefined}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={subitem ? 17 : 18} />
      <span>{label}</span>
    </Link>
  );
}

function NavGroup({
  id,
  title,
  icon: TitleIcon,
  items,
  pathname,
  className = "nav-parent",
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  pathname: string;
  className?: string;
}) {
  const hasActiveChild = items.some((item) => isPathActive(pathname, item.href));
  const [open, setOpen] = useState(hasActiveChild);

  // Buka otomatis jika user berpindah ke halaman yang ada di dalam grup ini
  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const panelId = `nav-group-${id}`;

  return (
    <div className={`${className}${open ? " is-open" : ""}`}>
      <Link
        href="#"
        role="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.preventDefault();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
      >
        <TitleIcon size={18} />
        <span>{title}</span>
        <ChevronDown size={16} className="nav-group-chevron" />
      </Link>

      <div id={panelId} className="nav-collapse">
        <div className="nav-submenu">
          {items.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              subitem
              active={isPathActive(pathname, item.href)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
 
export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          {...item}
          active={isPathActive(pathname, item.href)}
        />
      ))}

      <NavGroup
        id="donor"
        title="Donor Menu"
        icon={Users}
        items={mnDonorItems}
        pathname={pathname}
      />

      <NavGroup
        id="donor_rfm"
        title="RFM Menu"
        icon={UserGroup}
        items={rfmMenu}
        pathname={pathname}
      />

      <NavGroup
        id="blast"
        title="Blast Menu"
        icon={Megaphone}
        items={blastNavItems}
        pathname={pathname}
      />

      {isAdmin && (
        <NavGroup
          id="admin"
          title="Administration"
          icon={ShieldCheck}
          items={adminNavItems}
          pathname={pathname}
          className="nav-admin"
        />
      )}
    </nav>
  );
}