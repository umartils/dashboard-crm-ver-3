"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function SidebarShell({
  sidebarContent,
  children,
}: {
  sidebarContent: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes (e.g. after tapping a nav link)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open on mobile
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="layout">
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Tutup menu" : "Buka menu"}
        aria-expanded={isOpen}
        aria-controls="app-sidebar"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div
        className={`sidebar-overlay${isOpen ? " is-open" : ""}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside id="app-sidebar" className={`sidebar${isOpen ? " is-open" : ""}`}>
        {sidebarContent}
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}