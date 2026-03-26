import Link from "next/link";

import { getEvents, getHealthSummary, getMetricsOverview, getProxies } from "@/lib/api";

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
  const [summary, proxies, metrics, events] = await Promise.all([
    getHealthSummary(),
    getProxies(),
    getMetricsOverview(),
    getEvents(),
  ]);
  const recentProxies = proxies.items.slice(0, 5);
  const recentEvents = events.items.slice(0, 4);
  const healthyRatio = metrics.healthy_ratio;
  const attentionCount = metrics.needs_attention;
  const averageLatency = metrics.average_latency_ms ?? 0;
  const averageSuccessRate =
    proxies.items.reduce((total, proxy) => total + (proxy.success_rate ?? 0), 0) /
    Math.max(proxies.items.length, 1);
  const proxiesWithAuth = proxies.items.filter((proxy) => Boolean(proxy.username)).length;

  return (
    <main className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-[clamp(2rem,2.6vw,2.8rem)] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
          Overview
        </h1>
        <p className="text-base text-[var(--muted)]">
          Monitor pool health, recent operator activity, and live routing posture.
        </p>
      </div>

      <section className="grid gap-3 lg:grid-cols-4">
        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <span className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Pool Size
          </span>
          <div className="mt-3 text-[2.15rem] leading-none text-[var(--text)]">
            {summary.total.toLocaleString()}
          </div>
          <div className="mt-2 text-[0.85rem] text-[var(--muted)]">
            total proxies currently visible to the control plane
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <span className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Healthy Ratio
          </span>
          <div className="mt-3 text-[2.15rem] leading-none text-[var(--text)]">
            {formatPercent(healthyRatio)}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-[var(--healthy)]"
              style={{ width: `${Math.max(healthyRatio * 100, 2)}%` }}
            />
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <span className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Average Latency
          </span>
          <div className="mt-3 text-[2.15rem] leading-none text-[var(--text)]">
            {formatLatency(Math.round(averageLatency))}
          </div>
          <div className="mt-2 text-[0.85rem] text-[var(--muted)]">
            visible pool average across current snapshot entries
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <span className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Need Attention
          </span>
          <div className="mt-3 text-[2.15rem] leading-none text-[var(--text)]">
            {attentionCount.toLocaleString()}
          </div>
          <div className="mt-2 text-[0.85rem] text-[var(--muted)]">
            degraded, cooling, and unhealthy entries combined
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-1">
              <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                Pool Health
              </span>
              <h2 className="text-[1.4rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
                Distribution across live proxy states
              </h2>
            </div>
            <Link
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
              href="/health"
            >
              Open metrics
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {statusCards.map((card) => (
              <div
                className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4"
                key={card.key}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                    {card.label}
                  </span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: card.tone }}
                  />
                </div>
                <div className="mt-4 text-[2rem] leading-none text-[var(--text)]">
                  {summary[card.key].toLocaleString()}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: card.tone,
                      width: `${Math.max((summary[card.key] / Math.max(summary.total, 1)) * 100, 2)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="grid gap-1">
            <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Operator View
            </span>
            <h2 className="text-[1.4rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Quick control readout
            </h2>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                Authentication Coverage
              </div>
              <div className="mt-3 text-[1.65rem] leading-none text-[var(--text)]">
                {proxiesWithAuth} / {proxies.items.length}
              </div>
              <div className="mt-2 text-[0.84rem] text-[var(--muted)]">
                visible proxies currently have credentials attached
              </div>
            </div>

            <div className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                Average Success Rate
              </div>
              <div className="mt-3 text-[1.65rem] leading-none text-[var(--text)]">
                {formatPercent(averageSuccessRate)}
              </div>
              <div className="mt-2 text-[0.84rem] text-[var(--muted)]">
                based on the current visible snapshot entries
              </div>
            </div>

            <div className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                Current Focus
              </div>
              <div className="mt-3 text-[1.2rem] leading-snug text-[var(--text)]">
                {attentionCount > 0
                  ? "Investigate degraded and cooling nodes before expanding rotation."
                  : "Pool is stable enough to route aggressively without operator changes."}
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-1">
              <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                Recent Activity
              </span>
              <h2 className="text-[1.4rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
                Latest operator-facing events
              </h2>
            </div>
            <Link
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
              href="/logs"
            >
              Open logs
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {recentEvents.map((event) => (
              <div
                className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4"
                key={event.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="text-[0.98rem] text-[var(--text)]">
                      {formatStatusLabel(event.category)} / {event.actor}
                    </div>
                    <div className="text-[0.84rem] leading-relaxed text-[var(--muted)]">
                      {event.message}
                    </div>
                  </div>
                  <span className="text-[0.74rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-1">
              <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                Live Snapshot
              </span>
              <h2 className="text-[1.4rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
                Top visible pool entries
              </h2>
            </div>
            <Link
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]"
              href="/proxies"
            >
              Open table
            </Link>
          </div>

          {recentProxies.length === 0 ? (
            <div className="mt-5 rounded-[14px] border border-dashed border-[var(--line-strong)] p-9 text-center text-[var(--muted)]">
              No proxies available yet.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[14px] border border-white/8">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Address", "Protocol", "Status", "Success", "Latency", "Last Check"].map((heading) => (
                      <th
                        className="border-b border-white/8 px-4 py-3 text-left text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]"
                        key={heading}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProxies.map((proxy) => (
                    <tr className="hover:bg-white/2" key={proxy.id}>
                      <td className="border-b border-white/8 px-4 py-3 align-middle">
                        <div className="flex flex-col gap-1">
                          <span className="text-[0.92rem] text-[var(--text)]">
                            {proxy.host}:{proxy.port}
                          </span>
                          <span className="text-[0.76rem] text-[var(--muted)]">
                            {proxy.tags.length ? proxy.tags.join(", ") : "untagged"}
                          </span>
                        </div>
                      </td>
                      <td className="border-b border-white/8 px-4 py-3 text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted-strong)]">
                        {proxy.scheme}
                      </td>
                      <td className="border-b border-white/8 px-4 py-3">
                        <span
                          className="inline-flex items-center gap-2 rounded-full border border-white/8 px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                          style={{ color: `var(--${proxy.status.replace("_", "-")})` }}
                        >
                          <span className="h-[7px] w-[7px] rounded-full bg-current" />
                          {formatStatusLabel(proxy.status)}
                        </span>
                      </td>
                      <td className="border-b border-white/8 px-4 py-3 text-[0.82rem] text-[var(--muted)]">
                        {formatPercent(proxy.success_rate ?? 0)}
                      </td>
                      <td className="border-b border-white/8 px-4 py-3 text-[0.82rem] text-[var(--muted)]">
                        {formatLatency(proxy.avg_latency_ms)}
                      </td>
                      <td className="border-b border-white/8 px-4 py-3 text-[0.82rem] text-[var(--muted)]">
                        {formatTimestamp(proxy.last_checked_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
