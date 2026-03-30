"use client";

import Link from "next/link";
import { Bungee } from "next/font/google";
import {
  ArrowCircleRight,
  Article,
  Chalkboard,
  GearSix,
  HardDrives,
  List,
  Stack,
  X,
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
  { href: "/events", label: "Events", icon: Article },
  { href: "/settings", label: "Settings", icon: GearSix },
];

type DashboardSidebarProps = {
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  pathname: string;
  onNavigate?: () => void;
  onMobileMenuToggle: () => void;
  onToggle: () => void;
};

export function DashboardSidebar({
  isCollapsed,
  isMobileMenuOpen,
  pathname,
  onNavigate,
  onMobileMenuToggle,
  onToggle,
}: DashboardSidebarProps) {
  return (
    <aside
      className={`fixed inset-x-0 top-0 z-30 flex flex-col gap-0 border-b border-(--line) bg-[#17181f] px-4 py-4.5 lg:sticky lg:h-screen lg:gap-4 lg:border-b-0 ${
        isCollapsed ? "lg:px-3 lg:pr-3" : "lg:pr-3.5"
      }`}
    >
      <div
        className={`border-b-0 pb-0 lg:pb-5 ${
          isCollapsed ? "flex justify-center px-0" : "flex items-center gap-0.5"
        }`}
      >
        <div className="flex flex-1 items-center gap-0.5">
          <Binary
            className="shrink-0 text-(--accent)"
            size={48}
            strokeWidth={1.8}
          />
          {!isCollapsed ? (
            <div className="flex flex-col gap-1">
              <div
                className={`text-[1.34rem] leading-none tracking-[0.06em] ${logoFont.className} text-(--text)`}
              >
                RUXY
              </div>
              <div className="text-[0.92rem] leading-none uppercase tracking-[0.08em] text-muted">
                Proxy Rotator
              </div>
            </div>
          ) : null}
        </div>
        <button
          aria-expanded={isMobileMenuOpen}
          aria-label={
            isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          className="inline-flex h-10 w-10 items-center justify-center border border-(--line) bg-(--bg-input) text-(--text) transition hover:border-(--line-strong) hover:bg-[#2a2b36] lg:hidden"
          onClick={onMobileMenuToggle}
          type="button"
        >
          {isMobileMenuOpen ? (
            <X size={18} weight="bold" />
          ) : (
            <List size={18} weight="bold" />
          )}
        </button>
      </div>

      <div
        className={`absolute inset-x-0 top-full z-40 border-b border-(--line) bg-[#17181f] px-4 pb-4 ${
          isMobileMenuOpen ? "block" : "hidden"
        } lg:static lg:z-auto lg:block lg:border-b-0 lg:bg-transparent lg:px-0 lg:pb-0`}
      >
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
                      className={`flex items-center py-2.75 text-(--muted-strong) transition hover:bg-white/4 ${
                        isCollapsed ? "justify-center px-0" : "gap-2.5 px-3"
                      } ${isActive ? "bg-white/7 text-(--text)" : ""}`}
                      href={item.href}
                      onClick={onNavigate}
                    >
                      <span
                        className={`inline-flex items-center justify-center text-muted ${
                          isCollapsed ? "w-4.5" : "w-7"
                        }`}
                      >
                        <Icon size={isCollapsed ? 18 : 28} weight="regular" />
                      </span>
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </Link>
                  </Tooltip.Trigger>
                  {isCollapsed ? (
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="z-80 border border-white/6 bg-[#151515] px-2 py-1 text-[0.74rem] text-muted shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
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
      </div>

      <div
        className={`hidden mt-auto pt-3.5 pb-1 text-[0.82rem] text-muted lg:block ${
          isCollapsed ? "px-0" : "px-2"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 text-(--muted-strong)">
              <HardDrives
                className="text-(--healthy)"
                size={32}
                weight="regular"
              />
              <span>System Healthy</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
