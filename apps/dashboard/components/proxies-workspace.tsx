"use client";

import {
  ArrowClockwise,
  DotsThreeOutline,
  Plus,
  X,
} from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react/toast";
import { DashboardAction } from "@/components/dashboard-action";
import { DashboardInput } from "@/components/dashboard-input";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardSelect } from "@/components/dashboard-select";
import {
  createProxy,
  deleteProxy,
  updateProxy,
  type ProxyItem,
} from "@/lib/api";

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

function ProxyCard({
  proxy,
  ghost = false,
  onEdit,
  onDelete,
}: {
  proxy: ProxyItem;
  ghost?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const ghostClass = ghost ? "animate-pulse" : "";
  const ghostTextClass = ghost ? "bg-white/8 text-transparent select-none" : "";
  const ghostSoftTextClass = ghost
    ? "bg-white/5 text-transparent select-none"
    : "";
  const ghostPillClass = ghost
    ? "border-transparent bg-white/6 text-transparent"
    : "";
  const cellMonoStyle = { fontFamily: "var(--font-mono), monospace" } as const;

  return (
    <article
      className={`flex h-full flex-col bg-(--bg-panel) p-5 transition ${
        ghost ? "" : "hover:bg-white/2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {ghost ? (
            <div className="mt-1 h-4 w-4 bg-white/6 animate-pulse" />
          ) : null}
          <div className="flex flex-col gap-1">
            <span
              className={`text-[0.92rem] text-(--text) ${ghostClass} ${ghostTextClass}`}
              style={cellMonoStyle}
            >
              {proxy.host}:{proxy.port}
            </span>
            <span
              className={`text-[0.76rem] text-muted ${ghostClass} ${ghostSoftTextClass}`}
              style={cellMonoStyle}
            >
              {proxy.tags.length ? proxy.tags.join(", ") : "untagged"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center text-[0.95rem] text-(--muted-strong)">
          {ghost ? (
            <div className="mx-auto inline-flex h-10 w-10 items-center justify-center border border-transparent bg-white/6 text-transparent animate-pulse select-none">
              .
            </div>
          ) : (
            <Popover.Root>
              <Popover.Trigger asChild>
                <DashboardAction
                  aria-label="Open row actions"
                  className="mx-auto"
                  iconOnly
                  variant="standard"
                >
                  <DotsThreeOutline
                    className="translate-x-px"
                    size={16}
                    weight="fill"
                  />
                </DashboardAction>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  className="z-40 grid min-w-40 gap-1 border border-(--line-strong) bg-(--bg-panel-soft) p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                  sideOffset={8}
                >
                  <button
                    className="px-3 py-2 text-left text-sm text-(--muted-strong) transition hover:bg-white/6"
                    onClick={onEdit}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-2 text-left text-sm text-[#e7a3a3] transition hover:bg-[#3a1f1f]"
                    onClick={onDelete}
                    type="button"
                  >
                    Delete
                  </button>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 border border-(--line) bg-white/4 px-2.5 py-1 text-[0.72rem] uppercase tracking-[0.08em] ${ghostClass} ${ghostPillClass}`}
          style={cellMonoStyle}
        >
          {proxy.scheme}
        </span>
        <span
          className={`inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.76rem] uppercase tracking-[0.08em] ${ghostClass} ${ghostPillClass}`}
          style={
            ghost
              ? undefined
              : { color: `var(--${proxy.status.replace("_", "-")})` }
          }
        >
          <span
            className={`h-1.75 w-1.75 ${ghost ? "bg-white/0" : "bg-current"}`}
          />
          {formatStatusLabel(proxy.status)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-(--line) pt-4">
        {[
          {
            label: "Requests",
            value:
              proxy.request_count ??
              Math.max(0, 1 - proxy.consecutive_failures),
          },
          {
            label: "Success Rate",
            value: proxy.success_rate
              ? `${(proxy.success_rate * 100).toFixed(1)}%`
              : "0.0%",
          },
          {
            label: "Latency",
            value: proxy.avg_latency_ms ? `${proxy.avg_latency_ms}ms` : "0ms",
          },
          {
            label: "Last check",
            value: formatTimestamp(proxy.last_checked_at),
          },
        ].map((item) => (
          <div className="grid gap-1" key={item.label}>
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-muted">
              {item.label}
            </span>
            <span
              className={`text-[0.82rem] text-(--muted-strong) ${ghostClass} ${ghostTextClass}`}
              style={cellMonoStyle}
            >
              {String(item.value)}
            </span>
          </div>
        ))}
      </div>
    </article>
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [editingProxy, setEditingProxy] = useState<ProxyItem | null>(null);
  const panelFormRef = useRef<HTMLFormElement>(null);

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

  const filteredItems = rows;
  const ghostRows = Array.from(
    { length: 10 },
    (_, index) => rows[index] ?? buildGhostProxy(index),
  );

  function openCreatePanel() {
    setEditingProxy(null);
    setIsCreateOpen(true);
  }

  function openEditPanel(proxy: ProxyItem) {
    setEditingProxy(proxy);
    setIsCreateOpen(true);
  }

  function closeCreatePanel() {
    setIsCreateVisible(false);
    window.setTimeout(() => {
      setIsCreateOpen(false);
      setEditingProxy(null);
    }, 220);
  }

  async function deleteSingleRow(id: string) {
    try {
      await deleteProxy(id);
      router.refresh();

      setRows((current) => current.filter((row) => row.id !== id));
      toast.success("Proxy deleted");
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to delete proxy",
      );
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
      const payload = {
        scheme,
        host,
        port,
        username: parseOptional(formData.get("username")),
        password: parseOptional(formData.get("password")),
        tags: parseTags(formData.get("tags")),
      };

      if (editingProxy) {
        const updated = await updateProxy(editingProxy.id, payload);
        setRows((current) =>
          current.map((row) => (row.id === editingProxy.id ? updated : row)),
        );
        toast.success("Proxy updated");
      } else {
        await createProxy(payload);
        panelFormRef.current?.reset();
        toast.success("Proxy created");
      }

      closeCreatePanel();
      router.refresh();
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : editingProxy
            ? "Failed to update proxy"
            : "Failed to create proxy",
      );
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
      <DashboardPageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardAction
              icon={<Plus size={15} weight="bold" />}
              onClick={openCreatePanel}
              variant="primary"
            >
              Add Proxy
            </DashboardAction>
            <DashboardAction
              icon={
                <ArrowClockwise
                  className={isReloading ? "animate-spin" : undefined}
                  size={15}
                  weight="bold"
                />
              }
              onClick={handleReloadPool}
              variant="standard"
            >
              Reload Pool
            </DashboardAction>
          </div>
        }
        eyebrow="Proxy Workspace"
        title="Proxy pool controls and active entries"
      />

      {isReloading ? (
        <div className="grid divide-y divide-(--line) md:grid-cols-2 md:divide-y-0 md:[&>*:nth-child(odd)]:border-r md:[&>*]:border-b md:[&>*]:border-(--line) xl:grid-cols-4 xl:[&>*:not(:last-child)]:border-r">
          {ghostRows.map((proxy, index) => (
            <ProxyCard ghost key={`ghost-${proxy.id}-${index}`} proxy={proxy} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="border border-dashed border-(--line-strong) p-9 text-center text-muted">
          {rows.length === 0
            ? "No proxies have been created yet."
            : "No proxies match the current filters."}
        </div>
      ) : (
        <div className="grid divide-y divide-(--line) md:grid-cols-2 md:divide-y-0 md:[&>*:nth-child(odd)]:border-r md:[&>*]:border-b md:[&>*]:border-(--line) xl:grid-cols-4 xl:[&>*:not(:last-child)]:border-r">
          {filteredItems.map((proxy) => (
            <ProxyCard
              key={proxy.id}
              onEdit={() => openEditPanel(proxy)}
              onDelete={() => deleteSingleRow(proxy.id)}
              proxy={proxy}
            />
          ))}
        </div>
      )}

      {isCreateOpen ? (
        <div
          className={`fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[1px] transition-opacity duration-200 ${isCreateVisible ? "opacity-100" : "opacity-0"}`}
        >
          <button
            aria-label="Close panel"
            className="absolute inset-0 cursor-default"
            onClick={closeCreatePanel}
            type="button"
          />
          <aside
            className={`relative flex h-full w-full max-w-120 flex-col border-l border-(--line) bg-[#17181f] shadow-[-20px_0_60px_rgba(0,0,0,0.45)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCreateVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"}`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-(--line) px-5 py-5">
              <div className="grid gap-1">
                <span className="text-[0.76rem] uppercase tracking-[0.14em] text-muted">
                  {editingProxy ? "Edit Proxy" : "Add Proxy"}
                </span>
                <h2 className="text-[1.7rem] font-medium leading-none tracking-[-0.04em] text-(--text)">
                  {editingProxy ? "Update proxy" : "Create new proxy"}
                </h2>
                <p className="text-sm text-muted">
                  {editingProxy
                    ? "Modify the upstream target configuration."
                    : "Add a new upstream target to the pool."}
                </p>
              </div>
              <DashboardAction
                iconOnly
                onClick={closeCreatePanel}
                variant="standard"
              >
                <X size={16} weight="bold" />
              </DashboardAction>
            </div>

            <form
              className="grid gap-4 overflow-y-auto px-5 py-5"
              key={editingProxy?.id ?? "create"}
              onSubmit={handleCreateProxy}
              ref={panelFormRef}
            >
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-muted">
                  Scheme
                </span>
                <DashboardSelect
                  defaultValue={editingProxy?.scheme ?? "http"}
                  name="scheme"
                  options={[
                    { value: "http", label: "HTTP" },
                    { value: "https", label: "HTTPS" },
                    { value: "socks5", label: "SOCKS5" },
                  ]}
                />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-muted">
                  Host
                </span>
                <DashboardInput
                  defaultValue={editingProxy?.host ?? ""}
                  name="host"
                  placeholder="77.104.76.230"
                  required
                />
                <span className="text-[0.74rem] text-muted">
                  Use host only. Enter the port in the port field.
                </span>
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-muted">
                  Port
                </span>
                <DashboardInput
                  defaultValue={
                    editingProxy?.port ? String(editingProxy.port) : ""
                  }
                  name="port"
                  type="number"
                  min="1"
                  max="65535"
                  placeholder="8080"
                  required
                />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-muted">
                  Username
                </span>
                <DashboardInput
                  defaultValue={editingProxy?.username ?? ""}
                  name="username"
                  placeholder="optional"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-muted">
                  Password
                </span>
                <DashboardInput
                  name="password"
                  placeholder="optional"
                  type="password"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-muted">
                  Tags
                </span>
                <DashboardInput
                  defaultValue={editingProxy?.tags.join(", ") ?? ""}
                  name="tags"
                  placeholder="residential, eu, premium"
                />
              </div>
              {editingProxy ? (
                <p className="text-[0.76rem] text-muted">
                  Updating a proxy resets its current health snapshot and puts
                  it back into the unknown state.
                </p>
              ) : null}
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-(--line) pt-4">
                <DashboardAction onClick={closeCreatePanel} variant="standard">
                  Cancel
                </DashboardAction>
                <DashboardAction
                  disabled={isCreating}
                  icon={<Plus size={15} weight="bold" />}
                  type="submit"
                  variant="primary"
                >
                  {isCreating
                    ? editingProxy
                      ? "Saving..."
                      : "Creating..."
                    : editingProxy
                      ? "Save Changes"
                      : "Create Proxy"}
                </DashboardAction>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
