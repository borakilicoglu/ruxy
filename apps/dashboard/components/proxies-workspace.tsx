"use client";

import { ArrowClockwise, Funnel, Plus, X } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react/toast";
import { DashboardCheckbox } from "@/components/dashboard-checkbox";
import { DashboardInput } from "@/components/dashboard-input";
import { DashboardSelect } from "@/components/dashboard-select";
import { createProxy, deleteProxy, type ProxyItem } from "@/lib/api";

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

function parseOptional(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function parseTags(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildGhostProxy(index: number): ProxyItem {
  return {
    id: `ghost-${index}`,
    scheme: index % 3 === 0 ? "http" : "socks5",
    host: "77.104.76.230",
    port: 8080,
    username: null,
    tags: ["residential", "eu"],
    status: "healthy",
    score: 0,
    avg_latency_ms: 4291,
    success_rate: 1,
    consecutive_failures: 0,
    last_checked_at: "2026-10-26T15:48:35.223467Z",
    cooldown_until: null,
    created_at: "",
    updated_at: "",
    request_count: 1,
  };
}

function ProxyTableRow({
  proxy,
  selected = false,
  ghost = false,
  onToggle,
  onDelete,
}: {
  proxy: ProxyItem;
  selected?: boolean;
  ghost?: boolean;
  onToggle?: (checked: boolean) => void;
  onDelete?: () => void;
}) {
  const ghostClass = ghost ? "animate-pulse" : "";
  const ghostTextClass = ghost ? "rounded bg-white/8 text-transparent select-none" : "";
  const ghostSoftTextClass = ghost ? "rounded bg-white/5 text-transparent select-none" : "";
  const ghostPillClass = ghost ? "border-transparent bg-white/6 text-transparent" : "";

  return (
    <tr className={ghost ? "" : "hover:bg-white/2"}>
      <td className="w-11 border-b border-white/8 px-[14px] py-[14px] align-middle">
        {ghost ? (
          <div className="h-4 w-4 rounded-[5px] bg-white/6 animate-pulse" />
        ) : (
          <DashboardCheckbox checked={selected} onCheckedChange={onToggle} />
        )}
      </td>
      <td className="border-b border-white/8 px-[14px] py-[14px] align-middle text-[0.95rem] text-[var(--muted-strong)]">
        <div className="flex flex-col gap-1">
          <span
            className={`text-[0.92rem] text-[var(--text)] ${ghostClass} ${ghostTextClass}`}
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {proxy.host}:{proxy.port}
          </span>
          <span
            className={`text-[0.76rem] text-[var(--muted)] ${ghostClass} ${ghostSoftTextClass}`}
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {proxy.tags.length ? proxy.tags.join(", ") : "untagged"}
          </span>
        </div>
      </td>
      <td className="border-b border-white/8 px-[14px] py-[14px] align-middle text-[0.95rem] text-[var(--muted-strong)]">
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[0.72rem] uppercase tracking-[0.08em] ${ghostClass} ${ghostPillClass}`}
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          {proxy.scheme}
        </span>
      </td>
      <td className="border-b border-white/8 px-[14px] py-[14px] align-middle text-[0.95rem] text-[var(--muted-strong)]">
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-white/8 px-2.5 py-1 text-[0.76rem] uppercase tracking-[0.08em] ${ghostClass} ${ghostPillClass}`}
          style={ghost ? undefined : { color: `var(--${proxy.status.replace("_", "-")})` }}
        >
          <span className={`h-[7px] w-[7px] rounded-full ${ghost ? "bg-white/0" : "bg-current"}`} />
          {formatStatusLabel(proxy.status)}
        </span>
      </td>
      <td className="border-b border-white/8 px-[14px] py-[14px] align-middle text-[0.82rem] text-[var(--muted)]" style={{ fontFamily: "var(--font-mono), monospace" }}>
        <span className={`${ghostClass} ${ghostTextClass}`}>{proxy.request_count ?? Math.max(0, 1 - proxy.consecutive_failures)}</span>
      </td>
      <td className="border-b border-white/8 px-[14px] py-[14px] align-middle text-[0.82rem] text-[var(--muted)]" style={{ fontFamily: "var(--font-mono), monospace" }}>
        <span className={`${ghostClass} ${ghostTextClass}`}>
          {proxy.success_rate ? `${(proxy.success_rate * 100).toFixed(1)}%` : "0.0%"}
        </span>
      </td>
      <td className="border-b border-white/8 px-[14px] py-[14px] align-middle text-[0.82rem] text-[var(--muted)]" style={{ fontFamily: "var(--font-mono), monospace" }}>
        <span className={`${ghostClass} ${ghostTextClass}`}>
          {proxy.avg_latency_ms ? `${proxy.avg_latency_ms}ms` : "0ms"}
        </span>
      </td>
      <td className="border-b border-white/8 px-[14px] py-[14px] align-middle text-[0.78rem] text-[var(--muted)]" style={{ fontFamily: "var(--font-mono), monospace" }}>
        <span className={`${ghostClass} ${ghostTextClass}`}>{formatTimestamp(proxy.last_checked_at)}</span>
      </td>
      <td className="border-b border-white/8 px-[14px] py-[14px] align-middle text-[0.95rem] text-[var(--muted-strong)]">
        {ghost ? (
          <div className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-transparent bg-white/6 px-3.5 text-sm text-transparent animate-pulse select-none">
            Delete
          </div>
        ) : (
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
            onClick={onDelete}
            type="button"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

export function ProxiesWorkspace({
  initialItems,
  total,
}: {
  initialItems: ProxyItem[];
  total: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialItems);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [schemeFilter, setSchemeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [hasAuthFilter, setHasAuthFilter] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const createFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setRows(initialItems);
  }, [initialItems]);

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

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCreatePanel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen]);

  const filteredItems = rows.filter((proxy) => {
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
      tagFilter.trim().length === 0 || tags.includes(tagFilter.trim().toLowerCase());

    const matchesAuth = !hasAuthFilter || Boolean(proxy.username);

    return matchesSearch && matchesScheme && matchesStatus && matchesTag && matchesAuth;
  });

  const activeFilterCount = [
    schemeFilter !== "all",
    statusFilter !== "all",
    tagFilter.trim().length > 0,
    hasAuthFilter,
  ].filter(Boolean).length;

  const visibleIds = filteredItems.map((item) => item.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const ghostRows = Array.from({ length: 10 }, (_, index) => rows[index] ?? buildGhostProxy(index));

  function clearFilters() {
    setSchemeFilter("all");
    setStatusFilter("all");
    setTagFilter("");
    setHasAuthFilter(false);
  }

  function openCreatePanel() {
    setIsCreateOpen(true);
  }

  function closeCreatePanel() {
    setIsCreateVisible(false);
    window.setTimeout(() => setIsCreateOpen(false), 220);
  }

  function toggleRowSelection(id: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    );
  }

  function toggleVisibleSelection(checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return [...new Set([...current, ...visibleIds])];
      }

      return current.filter((id) => !visibleIds.includes(id));
    });
  }

  function exportVisibleRows() {
    const header = ["address", "protocol", "status", "requests", "success_rate", "avg_response_ms", "last_check"];
    const lines = filteredItems.map((proxy) => [
      `${proxy.host}:${proxy.port}`,
      proxy.scheme,
      proxy.status,
      String(proxy.request_count ?? Math.max(0, 1 - proxy.consecutive_failures)),
      proxy.success_rate ? `${(proxy.success_rate * 100).toFixed(1)}%` : "0.0%",
      proxy.avg_latency_ms ? `${proxy.avg_latency_ms}` : "0",
      proxy.last_checked_at ?? "",
    ]);

    const csv = [header, ...lines].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ruxy-proxies.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteSelectedRows() {
    const targetIds = selectedIds;

    if (targetIds.length === 0) {
      return;
    }

    try {
      await Promise.all(targetIds.map((id) => deleteProxy(id)));
      router.refresh();

      setRows((current) => current.filter((row) => !targetIds.includes(row.id)));
      setSelectedIds([]);
      toast.success("Selected proxies deleted");
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete proxies");
    }
  }

  async function deleteSingleRow(id: string) {
    try {
      await deleteProxy(id);
      router.refresh();

      setRows((current) => current.filter((row) => row.id !== id));
      setSelectedIds((current) => current.filter((item) => item !== id));
      toast.success("Proxy deleted");
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete proxy");
    }
  }

  async function handleCreateProxy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreating) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const host = parseOptional(formData.get("host"));
    const scheme = parseOptional(formData.get("scheme")) ?? "http";
    const portValue = parseOptional(formData.get("port"));

    if (!host || !portValue) {
      toast.danger("Host and port are required.");
      return;
    }

    const port = Number(portValue);

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      toast.danger("Port must be a valid integer between 1 and 65535.");
      return;
    }

    setIsCreating(true);

    try {
      await createProxy({
        scheme,
        host,
        port,
        username: parseOptional(formData.get("username")),
        password: parseOptional(formData.get("password")),
        tags: parseTags(formData.get("tags")),
      });

      createFormRef.current?.reset();
      closeCreatePanel();
      router.refresh();
      toast.success("Proxy created");
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to create proxy");
    } finally {
      setIsCreating(false);
    }
  }

  function handleReloadPool() {
    if (isReloading) {
      return;
    }

    setIsReloading(true);

    window.setTimeout(() => {
      router.refresh();
      setIsReloading(false);
    }, 2000);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Proxies
          </span>
          <h2
            className="text-[1.02rem]"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {total} total proxies
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[#d6d6d6] px-3.5 text-sm font-semibold text-[#111] transition hover:bg-[#f2f2f2]"
            onClick={openCreatePanel}
            type="button"
          >
            <Plus size={15} weight="bold" />
            Add Proxy
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
            onClick={handleReloadPool}
            type="button"
          >
            <ArrowClockwise
              className={isReloading ? "animate-spin" : undefined}
              size={15}
              weight="bold"
            />
            Reload Pool
          </button>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
                type="button"
              >
                Bulk Actions
                <span className="text-[0.82rem]">▾</span>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                className="z-50 grid min-w-[220px] gap-1 rounded-[14px] border border-[var(--line-strong)] bg-[var(--bg-panel-soft)] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                sideOffset={10}
              >
                <button
                  className="rounded-[10px] px-3 py-2 text-left text-sm text-[var(--muted-strong)] transition hover:bg-white/6"
                  onClick={() => toggleVisibleSelection(true)}
                  type="button"
                >
                  Select visible rows
                </button>
                <button
                  className="rounded-[10px] px-3 py-2 text-left text-sm text-[var(--muted-strong)] transition hover:bg-white/6"
                  onClick={() => setSelectedIds([])}
                  type="button"
                >
                  Clear selection
                </button>
                <button
                  className="rounded-[10px] px-3 py-2 text-left text-sm text-[var(--muted-strong)] transition hover:bg-white/6"
                  onClick={exportVisibleRows}
                  type="button"
                >
                  Export visible rows
                </button>
                <button
                  className="rounded-[10px] px-3 py-2 text-left text-sm text-[#e7a3a3] transition hover:bg-[#3a1f1f]"
                  onClick={deleteSelectedRows}
                  type="button"
                >
                  Delete selected
                </button>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <DashboardInput
            aria-label="Search proxies"
            className="min-w-[300px] flex-1 text-sm max-sm:min-w-0"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by address ..."
            value={searchQuery}
          />
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
                type="button"
              >
                <Funnel size={15} weight="bold" />
                Filter
                {activeFilterCount > 0 ? (
                  <span className="rounded-full border border-white/8 px-1.5 py-0.5 text-[0.68rem] leading-none">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                alignOffset={0}
                className="z-50 grid w-[360px] gap-4 rounded-[14px] border border-[var(--line-strong)] bg-[var(--bg-panel-soft)] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                side="bottom"
                sideOffset={6}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="grid gap-1">
                    <span className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                      Filters
                    </span>
                    <span className="text-sm text-[var(--muted-strong)]">
                      Refine the visible proxy list
                    </span>
                  </div>
                  <button
                    className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)] transition hover:text-[var(--text)]"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <span className="text-[0.74rem] uppercase tracking-[0.08em] text-[var(--muted)]">
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
                    <span className="text-[0.74rem] uppercase tracking-[0.08em] text-[var(--muted)]">
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
                    <span className="text-[0.74rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                      Tag contains
                    </span>
                    <DashboardInput
                      onChange={(event) => setTagFilter(event.target.value)}
                      placeholder="eu, residential, premium"
                      value={tagFilter}
                    />
                  </div>

                  <label className="flex h-10 items-center gap-3 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)]">
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

      {isReloading ? (
        <div className="overflow-x-auto rounded-[14px] border border-white/8">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr>
                <th className="w-11 border-b border-white/8 px-[14px] py-[14px]" />
                {["Address", "Protocol", "Status", "Requests", "Success Rate", "Latency", "Last check", "Action"].map((heading) => (
                  <th
                    className="border-b border-white/8 px-[14px] py-[14px] text-left text-[0.82rem] whitespace-nowrap text-[var(--muted-strong)]"
                    key={heading}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ghostRows.map((proxy, index) => (
                <ProxyTableRow ghost key={`ghost-${proxy.id}-${index}`} proxy={proxy} />
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[var(--line-strong)] p-9 text-center text-[var(--muted)]">
          {rows.length === 0 ? "No proxies have been created yet." : "No proxies match the current filters."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-white/8">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr>
                <th className="w-11 border-b border-white/8 px-[14px] py-[14px] text-left text-[0.82rem] whitespace-nowrap text-[var(--muted-strong)]">
                  <DashboardCheckbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleVisibleSelection}
                  />
                </th>
                {["Address", "Protocol", "Status", "Requests", "Success Rate", "Latency", "Last check", "Action"].map((heading) => (
                  <th
                    className="border-b border-white/8 px-[14px] py-[14px] text-left text-[0.82rem] whitespace-nowrap text-[var(--muted-strong)]"
                    key={heading}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((proxy) => (
                <ProxyTableRow
                  key={proxy.id}
                  onDelete={() => deleteSingleRow(proxy.id)}
                  onToggle={(checked) => toggleRowSelection(proxy.id, checked)}
                  proxy={proxy}
                  selected={selectedIds.includes(proxy.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 text-[0.78rem] text-[var(--muted)]" style={{ fontFamily: "var(--font-mono), monospace" }}>
        <span>{selectedIds.length} of {filteredItems.length} row(s) selected.</span>
        <div className="flex gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]" type="button">
            Previous
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]" type="button">
            Next
          </button>
        </div>
      </div>

      {isCreateOpen ? (
        <div className={`fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px] transition-opacity duration-200 ${isCreateVisible ? "opacity-100" : "opacity-0"}`}>
          <button aria-label="Close panel" className="absolute inset-0 cursor-default" onClick={closeCreatePanel} type="button" />
          <aside className={`relative flex h-full w-full max-w-[480px] flex-col border-l border-white/8 bg-[#131313] shadow-[-20px_0_60px_rgba(0,0,0,0.45)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCreateVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"}`}>
            <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5">
              <div className="grid gap-1">
                <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">Add Proxy</span>
                <h2 className="text-[1.7rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">Create new proxy</h2>
                <p className="text-sm text-[var(--muted)]">Add a new upstream target to the pool.</p>
              </div>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/8 bg-[var(--bg-input)] text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]" onClick={closeCreatePanel} type="button">
                <X size={16} weight="bold" />
              </button>
            </div>

            <form
              className="grid gap-4 overflow-y-auto px-5 py-5"
              onSubmit={handleCreateProxy}
              ref={createFormRef}
            >
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">Scheme</span>
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
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">Host</span>
                <DashboardInput name="host" placeholder="77.104.76.230" required />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">Port</span>
                <DashboardInput name="port" type="number" min="1" max="65535" placeholder="8080" required />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">Username</span>
                <DashboardInput name="username" placeholder="optional" />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">Password</span>
                <DashboardInput name="password" placeholder="optional" type="password" />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">Tags</span>
                <DashboardInput name="tags" placeholder="residential, eu, premium" />
              </div>
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/8 pt-4">
                <button className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]" onClick={closeCreatePanel} type="button">
                  Cancel
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[#d6d6d6] px-3.5 text-sm font-semibold text-[#111] transition hover:bg-[#f2f2f2] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isCreating}
                  type="submit"
                >
                  <Plus size={15} weight="bold" />
                  {isCreating ? "Creating..." : "Create Proxy"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
