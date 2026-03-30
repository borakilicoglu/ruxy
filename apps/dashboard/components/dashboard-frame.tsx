"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      className={`grid min-h-screen ${
        isSidebarCollapsed
          ? "lg:grid-cols-[88px_minmax(0,1fr)]"
          : "lg:grid-cols-[240px_minmax(0,1fr)]"
      }`}
    >
      <DashboardSidebar
        isCollapsed={isSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        onNavigate={() => setIsMobileMenuOpen(false)}
        onMobileMenuToggle={() => setIsMobileMenuOpen((current) => !current)}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
        pathname={pathname}
      />

      <div className="min-w-0 min-h-screen bg-(--bg) flex flex-col pt-[88px] lg:pt-0">
        {children}
      </div>
    </div>
  );
}
