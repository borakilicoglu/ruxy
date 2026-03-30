"use client";

import { Funnel } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { deleteProxyAction } from "@/app/proxies/actions";
import type { ProxyItem } from "@/lib/api";
import { DashboardCheckbox } from "@/components/dashboard-checkbox";
import { DashboardInput } from "@/components/dashboard-input";
import { DashboardSelect } from "@/components/dashboard-select";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatusLabel(status: string) {
  return status.replace("_", " ");
}

export function ProxyListPanel({ proxies }: { proxies: ProxyItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [schemeFilter, setSchemeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [hasAuthFilter, setHasAuthFilter] = useState(false);

  const filteredItems = proxies.filter((proxy) => {
    const address = `${proxy.host}:${proxy.port}`.toLowerCase();
    const tags = proxy.tags.join(", ").toLowerCase();
    const search = searchQuery.trim().toLowerCase();

    const matchesSearch =
      search.length === 0 ||
      address.includes(search) ||
      tags.includes(search) ||
      proxy.scheme.toLowerCase().includes(search);

    const matchesScheme =
      schemeFilter === "all" || proxy.scheme.toLowerCase() === schemeFilter;

    const matchesStatus =
      statusFilter === "all" || proxy.status.toLowerCase() === statusFilter;

    const matchesTag =
      tagFilter.trim().length === 0 ||
      tags.includes(tagFilter.trim().toLowerCase());

    const matchesAuth = !hasAuthFilter || Boolean(proxy.username);

    return (
      matchesSearch &&
      matchesScheme &&
      matchesStatus &&
      matchesTag &&
      matchesAuth
    );
  });

  const activeFilterCount = [
    schemeFilter !== "all",
    statusFilter !== "all",
    tagFilter.trim().length > 0,
    hasAuthFilter,
  ].filter(Boolean).length;

  function clearFilters() {
    setSchemeFilter("all");
    setStatusFilter("all");
    setTagFilter("");
    setHasAuthFilter(false);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <DashboardInput
            aria-label="Search proxies"
            className="min-w-75 flex-1 text-sm max-sm:min-w-0"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by address ..."
            value={searchQuery}
          />
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 border border-(--line) bg-[var(--bg-input)] px-3.5 text-sm text-(--muted-strong) transition hover:border-[var(--line-strong)] hover:bg-[#2a2b36]"
                type="button"
              >
                <Funnel size={15} weight="bold" />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="border border-(--line) px-1.5 py-0.5 text-[0.68rem] leading-none">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                className="z-50 grid w-[360px] gap-4 border border-[var(--line-strong)] bg-(--bg-panel-soft) p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                sideOffset={10}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <span className="text-[0.76rem] uppercase tracking-[0.12em] text-muted">
                      Filters
                    </span>
                    <span className="text-sm text-(--muted-strong)">
                      Refine the visible proxy list
                    </span>
                  </div>
                  <button
                    className="text-[0.78rem] uppercase tracking-[0.08em] text-muted transition hover:text-(--text)]"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <span className="text-[0.74rem] uppercase tracking-[0.08em] text-muted">
                      Scheme
                    </span>
                    <DashboardSelect
                      onValueChange={setSchemeFilter}
                      options={[
                        { value: "all", label: "All schemes" },
                        { value: "http", label: "HTTP" },
                        { value: "https", label: "HTTPS" },
                        { value: "socks5", label: "SOCKS5" },
                      ]}
                      value={schemeFilter}
                    />
                  </div>

                  <div className="grid gap-2">
                    <span className="text-[0.74rem] uppercase tracking-[0.08em] text-muted">
                      Status
                    </span>
                    <DashboardSelect
                      onValueChange={setStatusFilter}
                      options={[
                        { value: "all", label: "All statuses" },
                        { value: "healthy", label: "Healthy" },
                        { value: "degraded", label: "Degraded" },
                        { value: "unhealthy", label: "Unhealthy" },
                        { value: "cooling_down", label: "Cooling Down" },
                        { value: "disabled", label: "Disabled" },
                        { value: "unknown", label: "Unknown" },
                      ]}
                      value={statusFilter}
                    />
                  </div>

                  <div className="grid gap-2">
                    <span className="text-[0.74rem] uppercase tracking-[0.08em] text-muted">
                      Tag contains
                    </span>
                    <DashboardInput
                      onChange={(event) => setTagFilter(event.target.value)}
                      placeholder="eu, residential, premium"
                      value={tagFilter}
                    />
                  </div>

                  <label className="flex items-center gap-3 border border-(--line) bg-[var(--bg-input)] px-3.5 py-3 text-sm text-(--muted-strong)">
                    <DashboardCheckbox
                      checked={hasAuthFilter}
                      onCheckedChange={setHasAuthFilter}
                    />
                    Has credentials
                  </label>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <DashboardSelect
            defaultValue="default"
            options={[
              { value: "default", label: "Columns" },
              { value: "compact", label: "Compact" },
              { value: "extended", label: "Extended" },
            ]}
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="border border-dashed border-(--line-strong) p-9 text-center text-muted">
          {proxies.length === 0
            ? "No proxies have been created yet."
            : "No proxies match the current filters."}
        </div>
      ) : (
        <div className="overflow-x-auto border border-(--line)">
          <table className="min-w-245 w-full border-collapse">
            <thead>
              <tr>
                <th className=" border-b border-(--line) px-3.5 py-3.5 text-left text-[0.82rem] whitespace-nowrap text-(--muted-strong)">
                  <DashboardCheckbox />
                </th>
                {[
                  "Address",
                  "Protocol",
                  "Status",
                  "Requests",
                  "Success Rate",
                  "Latency",
                  "Last check",
                  "Action",
                ].map((heading) => (
                  <th
                    className="border-b border-(--line) px-3.5 py-3.5 text-left text-[0.82rem] whitespace-nowrap text-(--muted-strong)"
                    key={heading}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((proxy) => (
                <tr className="hover:bg-white/2" key={proxy.id}>
                  <td className=" border-b border-(--line) px-3.5 py-[14px] align-middle">
                    <DashboardCheckbox />
                  </td>
                  <td className="border-b border-(--line) px-3.5 py-[14px] align-middle text-[0.95rem] text-(--muted-strong)">
                    <div className="flex flex-col gap-1">
                      <span
                        className="text-[0.92rem] text-(--text)]"
                        style={{ fontFamily: "var(--font-mono), monospace" }}
                      >
                        {proxy.host}:{proxy.port}
                      </span>
                      <span
                        className="text-[0.76rem] text-muted"
                        style={{ fontFamily: "var(--font-mono), monospace" }}
                      >
                        {proxy.tags.length ? proxy.tags.join(", ") : "untagged"}
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-(--line) px-3.5 py-3.5 align-middle text-[0.95rem] text-(--muted-strong)">
                    <span
                      className="inline-flex items-center gap-2 border border-(--line) bg-white/4 px-2.5 py-1 text-[0.72rem] uppercase tracking-[0.08em]"
                      style={{ fontFamily: "var(--font-mono), monospace" }}
                    >
                      {proxy.scheme}
                    </span>
                  </td>
                  <td className="border-b border-(--line) px-3.5 py-[14px] align-middle text-[0.95rem] text-(--muted-strong)">
                    <span
                      className="inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.76rem] uppercase tracking-[0.08em]"
                      style={{
                        color: `var(--${proxy.status.replace("_", "-")})`,
                      }}
                    >
                      <span className="h-[7px] w-1.75 bg-current" />
                      {formatStatusLabel(proxy.status)}
                    </span>
                  </td>
                  <td
                    className="border-b border-(--line) px-3.5 py-[14px] align-middle text-[0.82rem] text-muted"
                    style={{ fontFamily: "var(--font-mono), monospace" }}
                  >
                    {proxy.request_count ??
                      Math.max(0, 1 - proxy.consecutive_failures)}
                  </td>
                  <td
                    className="border-b border-(--line) px-3.5 py-3.5 align-middle text-[0.82rem] text-muted"
                    style={{ fontFamily: "var(--font-mono), monospace" }}
                  >
                    {proxy.success_rate
                      ? `${(proxy.success_rate * 100).toFixed(1)}%`
                      : "0.0%"}
                  </td>
                  <td
                    className="border-b border-(--line) px-3.5 py-[14px] align-middle text-[0.82rem] text-muted"
                    style={{ fontFamily: "var(--font-mono), monospace" }}
                  >
                    {proxy.avg_latency_ms ? `${proxy.avg_latency_ms}ms` : "0ms"}
                  </td>
                  <td
                    className="border-b border-(--line) px-3.5 py-[14px] align-middle text-[0.78rem] text-muted"
                    style={{ fontFamily: "var(--font-mono), monospace" }}
                  >
                    {formatTimestamp(proxy.last_checked_at)}
                  </td>
                  <td className="border-b border-(--line) px-3.5 py-3.5 align-middle text-[0.95rem] text-(--muted-strong)">
                    <form action={deleteProxyAction}>
                      <input name="id" type="hidden" value={proxy.id} />
                      <button
                        className="inline-flex items-center gap-2 border border-(--line) bg-(--bg-input) px-3.5 py-2.5 text-sm text-(--muted-strong) transition hover:border-[var(--line-strong)] hover:bg-[#2a2b36]"
                        type="submit"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        className="flex items-center justify-between gap-3 pt-3 text-[0.78rem] text-muted"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        <span>0 of {filteredItems.length} row(s) selected.</span>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 border border-(--line) bg-(--bg-input) px-3.5 py-2.5 text-sm text-(--muted-strong) transition hover:border-(--line-strong) hover:bg-[#2a2b36]"
            type="button"
          >
            Previous
          </button>
          <button
            className="inline-flex items-center gap-2 border border-(--line) bg-(--bg-input) px-3.5 py-2.5 text-sm text-(--muted-strong) transition hover:border-(--line-strong) hover:bg-[#2a2b36]"
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
