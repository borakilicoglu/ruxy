"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bungee } from "next/font/google";
import {
  CaretLeft,
  CaretRight,
  ChartScatter,
  Chalkboard,
  Article,
  GearSix,
  SidebarSimple,
  Stack,
} from "@phosphor-icons/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Binary } from "lucide-react";

const logoFont = Bungee({
  subsets: ["latin"],
  weight: "400",
});

const navItems = [
  { href: "/", label: "Overview", icon: Chalkboard },
  { href: "/proxies", label: "Proxies", icon: Stack },
  { href: "/health", label: "System Metrics", icon: ChartScatter },
  { href: "/logs", label: "Logs", icon: Article },
  { href: "/settings", label: "Settings", icon: GearSix },
];

function buildBreadcrumb(pathname: string) {
  if (pathname === "/") {
    return ["Overview"];
  }

  return [
    "Overview",
    ...pathname
      .split("/")
      .filter(Boolean)
      .map((part) => {
        if (part === "proxies") {
          return "Proxies";
        }

        if (part === "health") {
          return "System Metrics";
        }

        if (part === "logs") {
          return "Proxy Logs";
        }

        if (part === "settings") {
          return "Settings";
        }

        return part[0].toUpperCase() + part.slice(1);
      }),
  ];
}

export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const breadcrumb = buildBreadcrumb(pathname);
  const monoStyle = { fontFamily: "var(--font-mono), monospace" } as const;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div
      className={`grid min-h-screen ${
        isSidebarCollapsed
          ? "lg:grid-cols-[88px_minmax(0,1fr)]"
          : "lg:grid-cols-[240px_minmax(0,1fr)]"
      }`}
    >
      <aside
        className={`top-0 flex flex-col gap-4 border-b border-white/8 bg-linear-to-b from-[#0d0d0d] to-[#111111] px-4 py-[18px] lg:sticky lg:h-screen lg:border-r lg:border-b-0 ${
          isSidebarCollapsed ? "lg:px-3 lg:pr-3" : "lg:pr-[14px]"
        }`}
      >
        <div
          className={`border-b border-white/8 pt-2.5 pb-3.5 ${
            isSidebarCollapsed
              ? "flex justify-center px-0"
              : "flex items-center gap-0.5 px-2"
          }`}
        >
          <Binary
            className="shrink-0 text-[var(--accent)]"
            size={44}
            strokeWidth={1.8}
          />
          {!isSidebarCollapsed ? (
            <div className="flex flex-col gap-1">
              <div
                className={`${logoFont.className} text-[1.2rem] leading-none tracking-[0.06em]`}
              >
                RUXY
              </div>
              <div className="text-[0.88rem] leading-none uppercase tracking-[0.08em] text-[var(--muted)]">
                Proxy Rotator
              </div>
            </div>
          ) : null}
        </div>

        <nav className="grid gap-1.5 lg:grid-cols-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Tooltip.Provider
                delayDuration={120}
                key={`${item.href}-${item.label}`}
              >
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Link
                      className={`flex items-center rounded-[10px] py-[11px] text-[var(--muted-strong)] transition hover:bg-white/4 ${
                        isSidebarCollapsed
                          ? "justify-center px-0"
                          : "gap-2.5 px-3"
                      } ${isActive ? "bg-white/7 text-[var(--text)]" : ""}`}
                      href={item.href}
                    >
                      <span
                        className={`inline-flex items-center justify-center text-[var(--muted)] ${
                          isSidebarCollapsed ? "w-[18px]" : "w-7"
                        }`}
                      >
                        <Icon
                          size={isSidebarCollapsed ? 18 : 28}
                          weight="regular"
                        />
                      </span>
                      {!isSidebarCollapsed ? <span>{item.label}</span> : null}
                    </Link>
                  </Tooltip.Trigger>
                  {isSidebarCollapsed ? (
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-[80] rounded-[9px] border border-white/6 bg-[#151515] px-2 py-1 text-[0.74rem] text-[var(--muted)] shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
                        side="right"
                        sideOffset={8}
                      >
                        {item.label}
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  ) : null}
                </Tooltip.Root>
              </Tooltip.Provider>
            );
          })}
        </nav>

        <div
          className={`mt-auto border-t border-white/8 pt-3.5 pb-1 text-[0.82rem] text-[var(--muted)] ${
            isSidebarCollapsed ? "flex justify-center px-0" : "px-2"
          }`}
        >
          {isSidebarCollapsed ? (
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--healthy)]" />
          ) : (
            <div className="grid gap-1">
              <div className="flex items-center gap-2 text-[var(--muted-strong)]">
                <span className="h-2 w-2 rounded-full bg-[var(--healthy)]" />
                <span>System Healthy</span>
              </div>
              <div className="text-[0.76rem] text-[var(--muted)]">
                4780 proxies in pool
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-white/8 bg-[rgba(9,9,9,0.92)] px-5 backdrop-blur-md">
          <button
            className="grid h-[26px] w-[26px] place-items-center text-[var(--muted)] transition hover:text-[var(--text)]"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            type="button"
          >
            <SidebarSimple
              className={isSidebarCollapsed ? "-scale-x-100" : undefined}
              size={16}
              weight="bold"
            />
          </button>
          <div
            className="flex flex-wrap items-center gap-2 text-[0.82rem] text-[var(--muted)]"
            style={monoStyle}
          >
            {breadcrumb.flatMap((item, index) => {
              const parts: React.ReactNode[] = [];

              if (index > 0) {
                parts.push(
                  <span
                    className="mx-1 inline-flex items-center text-[var(--muted)]"
                    key={`separator-${item}-${index}`}
                  >
                    <CaretRight size={12} weight="bold" />
                  </span>,
                );
              }

              parts.push(
                item === "Overview" ? (
                  <Link
                    className="inline-flex items-center transition hover:text-[var(--text)]"
                    href="/"
                    key={`${item}-${index}`}
                  >
                    {item}
                  </Link>
                ) : (
                  <span
                    className={
                      index === breadcrumb.length - 1
                        ? "inline-flex items-center text-[var(--muted-strong)]"
                        : "inline-flex items-center"
                    }
                    key={`${item}-${index}`}
                  >
                    {item}
                  </span>
                ),
              );

              return parts;
            })}
          </div>
        </header>

        <div className="px-[22px] pt-[18px] pb-7 max-sm:px-3.5">{children}</div>
      </div>
    </div>
  );
}
