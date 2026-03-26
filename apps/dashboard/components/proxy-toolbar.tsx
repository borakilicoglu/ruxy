"use client";

import { ArrowClockwise, Plus, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { createProxyAction } from "@/app/proxies/actions";
import { DashboardInput } from "@/components/dashboard-input";
import { DashboardSelect } from "@/components/dashboard-select";

export function ProxyToolbar() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);

  useEffect(() => {
    if (!isCreateOpen) {
      setIsCreateVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsCreateVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isCreateOpen]);

  function openCreatePanel() {
    setIsCreateOpen(true);
  }

  function closeCreatePanel() {
    setIsCreateVisible(false);
    window.setTimeout(() => setIsCreateOpen(false), 220);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-[10px] border border-white/8 bg-[#f2f2f2] px-3.5 py-2.5 text-sm font-semibold text-[#111] transition hover:bg-white"
          onClick={openCreatePanel}
          type="button"
        >
          <Plus size={15} weight="bold" />
          Add Proxy
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
          type="button"
        >
          <ArrowClockwise size={15} weight="bold" />
          Reload Pool
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
          type="button"
        >
          Bulk Actions ▾
        </button>
      </div>

      {isCreateOpen ? (
        <div
          className={`fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px] transition-opacity duration-200 ${
            isCreateVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            aria-label="Close panel"
            className="absolute inset-0 cursor-default"
            onClick={closeCreatePanel}
            type="button"
          />
          <aside
            className={`relative flex h-full w-full max-w-[480px] flex-col border-l border-white/8 bg-[#131313] shadow-[-20px_0_60px_rgba(0,0,0,0.45)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isCreateVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
            }`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5">
              <div className="grid gap-1">
                <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Add Proxy
                </span>
                <h2 className="text-[1.7rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
                  Create new proxy
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Add a new upstream target to the pool.
                </p>
              </div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/8 bg-[var(--bg-input)] text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
                onClick={closeCreatePanel}
                type="button"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <form action={createProxyAction} className="grid gap-4 overflow-y-auto px-5 py-5">
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Scheme
                </span>
                <DashboardSelect
                  defaultValue="http"
                  name="scheme"
                  options={[
                    { value: "http", label: "HTTP" },
                    { value: "https", label: "HTTPS" },
                    { value: "socks5", label: "SOCKS5" },
                  ]}
                />
              </div>

              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Host
                </span>
                <DashboardInput name="host" placeholder="77.104.76.230" required />
              </div>

              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Port
                </span>
                <DashboardInput
                  name="port"
                  type="number"
                  min="1"
                  max="65535"
                  placeholder="8080"
                  required
                />
              </div>

              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Username
                </span>
                <DashboardInput name="username" placeholder="optional" />
              </div>

              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Password
                </span>
                <DashboardInput name="password" placeholder="optional" type="password" />
              </div>

              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Tags
                </span>
                <DashboardInput name="tags" placeholder="residential, eu, premium" />
              </div>

              <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/8 pt-4">
                <button
                  className="inline-flex items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 py-2.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
                  onClick={closeCreatePanel}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-[10px] border border-white/8 bg-[#f2f2f2] px-3.5 py-2.5 text-sm font-semibold text-[#111] transition hover:bg-white"
                  type="submit"
                >
                  <Plus size={15} weight="bold" />
                  Create Proxy
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
