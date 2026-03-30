import Link from "next/link";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import {
  getEvents,
  getHealthChecks,
  getHealthSummary,
  getLatencyMetrics,
  getMetricsOverview,
  getProxies,
  getSuccessRateMetrics,
} from "@/lib/api";

const statusCards = [
  { key: "healthy", label: "Healthy", tone: "var(--healthy)" },
  { key: "degraded", label: "Degraded", tone: "var(--degraded)" },
  { key: "unhealthy", label: "Unhealthy", tone: "var(--unhealthy)" },
  { key: "cooling_down", label: "Cooling", tone: "var(--cooling-down)" },
  { key: "disabled", label: "Disabled", tone: "var(--disabled)" },
  { key: "unknown", label: "Unknown", tone: "var(--unknown)" },
] as const;

function formatStatusLabel(status: string) {
  return status.replace("_", " ");
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatency(value: number | null) {
  if (!value) {
    return "0ms";
  }

  return `${value}ms`;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OverviewPage() {
  const [
    summary,
    proxies,
    metrics,
    events,
    latencyMetrics,
    successRateMetrics,
    healthChecks,
  ] = await Promise.all([
    getHealthSummary(),
    getProxies(),
    getMetricsOverview(),
    getEvents(),
    getLatencyMetrics(),
    getSuccessRateMetrics(),
    getHealthChecks(),
  ]);
  const recentProxies = proxies.items.slice(0, 5);
  const recentEvents = events.items.slice(0, 4);
  const latestHealthChecks = healthChecks.items.slice(0, 6);
  const attentionEntries = proxies.items
    .filter((proxy) =>
      ["degraded", "unhealthy", "cooling_down"].includes(proxy.status),
    )
    .slice(0, 6);
  const healthyRatio = metrics.healthy_ratio;
  const healthyRatioCells = Math.max(
    0,
    Math.min(16, Math.round(healthyRatio * 16)),
  );
  const attentionCount = metrics.needs_attention;
  const averageLatency = metrics.average_latency_ms ?? 0;
  const proxiesWithAuth = proxies.items.filter((proxy) =>
    Boolean(proxy.username),
  ).length;
  const total = Math.max(summary.total, 1);
  const bestLatencyBand = latencyMetrics.items.reduce(
    (selected, item) => (item.count > selected.count ? item : selected),
    latencyMetrics.items[0] ?? { label: "No data", count: 0 },
  );
  const bestSuccessBucket = successRateMetrics.items.reduce(
    (selected, item) => (item.count > selected.count ? item : selected),
    successRateMetrics.items[0] ?? { label: "No data", count: 0 },
  );

  return (
    <main className="grid">
      <DashboardPageHeader
        actions={
          <>
            <div className="inline-flex items-center gap-2 border border-(--line) bg-transparent px-3 py-1.5 text-[0.8rem] text-muted">
              <span className="h-2 w-2 bg-(--healthy)" />
              {metrics.selection_ready.toLocaleString()} selection ready
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="inline-flex h-10 items-center border border-(--line) bg-(--bg-input) px-3.5 text-sm text-(--muted-strong) transition hover:border-[var(--line-strong)] hover:bg-[#2a2b36]"
                href="/events"
              >
                Open events
              </Link>
              <Link
                className="inline-flex h-10 items-center border border-(--line) bg-(--bg-input) px-3.5 text-sm text-(--muted-strong) transition hover:border-[var(--line-strong)] hover:bg-[#2a2b36]"
                href="/proxies"
              >
                Open proxies
              </Link>
            </div>
          </>
        }
        eyebrow="Operations Board"
        title="Live pool operations, events, and recent checks"
      />
      <section className="overflow-hidden bg-(--bg-panel) shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="border-b border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Summary
        </div>
        <div className="divide-y divide-white/8 md:grid md:grid-cols-2 md:divide-y-0 md:[&>*:nth-child(odd)]:border-r md:[&>*:nth-child(-n+2)]:border-b xl:grid-cols-4 xl:[&>*:nth-child(2)]:border-r xl:[&>*:nth-child(-n+2)]:border-b-0">
          <article className="px-5 py-4 xl:border-r xl:border-(--line)">
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
              Pool Size
            </div>
            <div className="mt-3 text-[1.55rem] leading-none text-(--text)">
              {summary.total.toLocaleString()}
            </div>
            <div className="mt-2 text-[0.84rem] text-muted">
              total proxies currently visible to the control plane
            </div>
          </article>

          <article className="px-5 py-4 xl:border-r xl:border-(--line)">
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
              Healthy Ratio
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="text-[2.05rem] leading-none text-(--text)">
                {formatPercent(healthyRatio)}
              </div>
              <div className="grid w-fit grid-cols-4 gap-1">
                {Array.from({ length: 16 }, (_, index) => {
                  const isTopRight = index === 3;
                  const filledIndex = index > 3 ? index - 1 : index;
                  const isFilled =
                    !isTopRight && filledIndex < healthyRatioCells;

                  return (
                    <span
                      className={
                        isFilled ? "bg-[var(--healthy)]" : "bg-white/6"
                      }
                      key={index}
                      style={{ height: "0.3rem", width: "0.3rem" }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="mt-2 text-[0.84rem] text-muted">
              healthy share across visible pool entries
            </div>
          </article>

          <article className="px-5 py-4 xl:border-r xl:border-(--line)">
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
              Average Latency
            </div>
            <div className="mt-3 text-[1.55rem] leading-none text-[var(--text)]">
              {formatLatency(Math.round(averageLatency))}
            </div>
            <div className="mt-2 text-[0.84rem] text-muted">
              visible pool average across current snapshot entries
            </div>
          </article>

          <article className="px-5 py-4">
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
              Need Attention
            </div>
            <div className="mt-3 text-[1.55rem] leading-none text-[var(--text)]">
              {attentionCount.toLocaleString()}
            </div>
            <div className="mt-2 text-[0.84rem] text-muted">
              degraded, cooling, and unhealthy entries combined
            </div>
          </article>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-(--line) px-5 py-3">
          <div className="grid gap-1">
            <div className="text-[0.76rem] uppercase tracking-[0.12em] text-muted">
              Attention Queue
            </div>
            <div className="text-[0.84rem] text-muted">
              Entries currently blocking clean rotation across the visible pool.
            </div>
          </div>
          <div className="inline-flex h-8 items-center border border-(--line) bg-[var(--bg-input)] px-3 text-[0.78rem] text-(--muted-strong)">
            {attentionEntries.length} active
          </div>
        </div>
        {attentionEntries.length > 0 ? (
          <div className="divide-y divide-white/8">
            {attentionEntries.map((proxy) => (
              <div
                className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.35fr)_160px_120px_120px_140px] md:items-center"
                key={proxy.id}
              >
                <div className="grid gap-1">
                  <div className="text-[0.96rem] text-[var(--text)]">
                    {proxy.host}:{proxy.port}
                  </div>
                  <div className="text-[0.82rem] text-muted">
                    {proxy.tags.length ? proxy.tags.join(", ") : "untagged"}
                  </div>
                </div>
                <div>
                  <span
                    className="inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                    style={{
                      color: `var(--${proxy.status.replace("_", "-")})`,
                    }}
                  >
                    <span className="h-[7px] w-[7px] bg-current" />
                    {formatStatusLabel(proxy.status)}
                  </span>
                </div>
                <div className="text-[0.84rem] text-muted">
                  {formatLatency(proxy.avg_latency_ms)}
                </div>
                <div className="text-[0.84rem] text-muted">
                  {formatPercent(proxy.success_rate ?? 0)}
                </div>
                <div className="text-[0.84rem] text-muted">
                  {formatTimestamp(proxy.last_checked_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-4 text-[0.9rem] text-muted">
            No degraded, cooling, or unhealthy proxies are visible right now.
          </div>
        )}

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Pool State
        </div>
        <div className="divide-y divide-white/8">
          {statusCards.map((card) => (
            <div
              className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(180px,0.8fr)_90px_minmax(0,1fr)] md:items-center"
              key={card.key}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5"
                  style={{ backgroundColor: card.tone }}
                />
                <span className="text-[0.94rem] text-[var(--text)]">
                  {card.label}
                </span>
              </div>
              <div className="text-[0.92rem] text-(--muted-strong)">
                {summary[card.key].toLocaleString()}
              </div>
              <div className="grid gap-2">
                <div className="h-1.5 overflow-hidden bg-white/6">
                  <div
                    className="h-full"
                    style={{
                      backgroundColor: card.tone,
                      width: `${Math.max((summary[card.key] / total) * 100, 2)}%`,
                    }}
                  />
                </div>
                <div className="text-[0.78rem] text-muted">
                  {formatPercent(summary[card.key] / total)} of visible pool
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Recent Events
        </div>
        {recentEvents.length > 0 ? (
          <div className="divide-y divide-white/8">
            {recentEvents.map((event) => (
              <div
                className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_140px_140px] md:items-center"
                key={event.id}
              >
                <div className="grid gap-1">
                  <div className="text-[0.95rem] text-[var(--text)]">
                    {formatStatusLabel(event.category)} / {event.actor}
                  </div>
                  <div className="text-[0.84rem] leading-relaxed text-muted">
                    {event.message}
                  </div>
                </div>
                <div className="text-[0.82rem] uppercase tracking-[0.08em] text-muted">
                  {event.level}
                </div>
                <div className="text-[0.82rem] text-muted">
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-4 text-[0.9rem] text-muted">
            No recent events are available yet.
          </div>
        )}

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Pool Snapshot
        </div>
        {recentProxies.length > 0 ? (
          <div className="divide-y divide-white/8">
            {recentProxies.map((proxy) => (
              <div
                className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_100px_130px_100px_120px_120px] md:items-center"
                key={proxy.id}
              >
                <div className="grid gap-1">
                  <div className="text-[0.96rem] text-[var(--text)]">
                    {proxy.host}:{proxy.port}
                  </div>
                  <div className="text-[0.82rem] text-muted">
                    {proxy.tags.length ? proxy.tags.join(", ") : "untagged"}
                  </div>
                </div>
                <div className="text-[0.78rem] uppercase tracking-[0.08em] text-(--muted-strong)">
                  {proxy.scheme}
                </div>
                <div>
                  <span
                    className="inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                    style={{
                      color: `var(--${proxy.status.replace("_", "-")})`,
                    }}
                  >
                    <span className="h-[7px] w-[7px] bg-current" />
                    {formatStatusLabel(proxy.status)}
                  </span>
                </div>
                <div className="text-[0.84rem] text-muted">
                  {formatPercent(proxy.success_rate ?? 0)}
                </div>
                <div className="text-[0.84rem] text-muted">
                  {formatLatency(proxy.avg_latency_ms)}
                </div>
                <div className="text-[0.84rem] text-muted">
                  {formatTimestamp(proxy.last_checked_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-4 text-[0.9rem] text-muted">
            No proxies available yet.
          </div>
        )}

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Health Checks
        </div>
        {latestHealthChecks.length > 0 ? (
          <div className="divide-y divide-white/8">
            {latestHealthChecks.map((item) => (
              <div
                className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_110px_100px_80px_140px] md:items-center"
                key={`${item.proxy_id}-${item.checked_at}`}
              >
                <div className="grid gap-1">
                  <div className="text-[0.95rem] text-[var(--text)]">
                    Proxy {item.proxy_id.slice(0, 8)}
                  </div>
                  <div className="text-[0.82rem] text-muted">
                    {item.error_kind ?? "No transport error"}
                    {item.http_status ? ` · HTTP ${item.http_status}` : ""}
                  </div>
                </div>
                <div>
                  <span
                    className="inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                    style={{
                      color: item.success
                        ? "var(--healthy)"
                        : "var(--unhealthy)",
                    }}
                  >
                    <span className="h-[7px] w-[7px] bg-current" />
                    {item.success ? "success" : "failure"}
                  </span>
                </div>
                <div className="text-[0.84rem] text-muted">
                  {formatLatency(item.latency_ms)}
                </div>
                <div className="text-[0.84rem] text-muted">
                  {item.http_status ?? "n/a"}
                </div>
                <div className="text-[0.84rem] text-muted">
                  {formatTimestamp(item.checked_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-4 text-[0.9rem] text-muted">
            No recorded health checks are available yet.
          </div>
        )}

        <div className="border-t border-(--line) bg-(--bg-panel-soft)">
          <div className="border-b border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
            Snapshot Notes
          </div>
          <div className="divide-y divide-white/8 md:grid md:grid-cols-3 md:divide-y-0 md:[&>*:not(:last-child)]:border-r md:[&>*]:border-(--line)">
            <div className="px-5 py-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-muted">
                Authentication Coverage
              </div>
              <div className="mt-3 text-[1.1rem] leading-none text-[var(--text)]">
                {proxiesWithAuth} / {proxies.items.length}
              </div>
              <div className="mt-2 text-[0.84rem] text-muted">
                visible proxies currently have credentials attached...
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-muted">
                Dominant Latency Band
              </div>
              <div className="mt-3 text-[1.1rem] leading-snug text-[var(--text)]">
                {bestLatencyBand.label}
              </div>
              <div className="mt-2 text-[0.84rem] text-muted">
                {bestLatencyBand.count.toLocaleString()} proxies are clustered
                here
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-muted">
                Dominant Success Bucket
              </div>
              <div className="mt-3 text-[1.1rem] leading-snug text-[var(--text)]">
                {bestSuccessBucket.label}
              </div>
              <div className="mt-2 text-[0.84rem] text-muted">
                {bestSuccessBucket.count.toLocaleString()} proxies fall into
                this bucket
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
