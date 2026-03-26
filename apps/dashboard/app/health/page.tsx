import {
  getHealthSummary,
  getLatencyMetrics,
  getMetricsOverview,
  getProxies,
  getSuccessRateMetrics,
} from "@/lib/api";

const cards = [
  {
    key: "healthy",
    label: "Healthy",
    description: "Ready for routing",
    tone: "var(--healthy)",
  },
  {
    key: "degraded",
    label: "Degraded",
    description: "Usable but slipping",
    tone: "var(--degraded)",
  },
  {
    key: "unhealthy",
    label: "Unhealthy",
    description: "Out of rotation",
    tone: "var(--unhealthy)",
  },
  {
    key: "cooling_down",
    label: "Cooling Down",
    description: "Temporary pause",
    tone: "var(--cooling-down)",
  },
  {
    key: "disabled",
    label: "Disabled",
    description: "Operator disabled",
    tone: "var(--disabled)",
  },
  {
    key: "unknown",
    label: "Unknown",
    description: "Awaiting signal",
    tone: "var(--unknown)",
  },
] as const;

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatLatency(value: number | null) {
  if (!value) {
    return "0ms";
  }

  return `${value}ms`;
}

export default async function HealthPage() {
  const [summary, metrics, latencyMetrics, successRateMetrics, proxies] = await Promise.all([
    getHealthSummary(),
    getMetricsOverview(),
    getLatencyMetrics(),
    getSuccessRateMetrics(),
    getProxies(),
  ]);
  const total = Math.max(summary.total, 1);
  const avgLatency = latencyMetrics.average_latency_ms ?? metrics.average_latency_ms ?? 0;
  const avgSuccess = successRateMetrics.average_success_rate;
  const degradedShare = (summary.degraded + summary.unhealthy + summary.cooling_down) / total;
  const latencyBands = latencyMetrics.items.map((item) => ({
    ...item,
    tone:
      item.label === "< 250ms" || item.label === "250ms - 500ms"
        ? "var(--healthy)"
        : item.label === "> 5s / no data"
          ? "var(--unhealthy)"
          : "var(--degraded)",
  }));

  return (
    <main className="grid gap-4">
      <div className="mb-1 flex flex-col gap-1">
        <h1 className="text-[clamp(2rem,2.6vw,2.8rem)] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
          System Metrics
        </h1>
        <p className="text-base text-[var(--muted)]">
          Inspect state distribution, latency posture, and routing fitness across the pool.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Total Pool
          </div>
          <div className="mt-3 text-[2.1rem] leading-none text-[var(--text)]">
            {summary.total.toLocaleString()}
          </div>
          <div className="mt-2 text-[0.84rem] text-[var(--muted)]">
            entries visible to the current metrics snapshot
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Healthy Share
          </div>
          <div className="mt-3 text-[2.1rem] leading-none text-[var(--text)]">
            {formatPercent(summary.healthy / total)}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-[var(--healthy)]"
              style={{ width: `${Math.max((summary.healthy / total) * 100, 2)}%` }}
            />
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Average Latency
          </div>
          <div className="mt-3 text-[2.1rem] leading-none text-[var(--text)]">
            {formatLatency(Math.round(avgLatency))}
          </div>
          <div className="mt-2 text-[0.84rem] text-[var(--muted)]">
            across the visible snapshot entries
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Average Success
          </div>
          <div className="mt-3 text-[2.1rem] leading-none text-[var(--text)]">
            {formatPercent(avgSuccess)}
          </div>
          <div className="mt-2 text-[0.84rem] text-[var(--muted)]">
            aggregate success rate across current proxy entries
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="grid gap-1">
            <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              State Distribution
            </span>
            <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Current pool composition
            </h2>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
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
                <p className="mt-2 text-[0.84rem] text-[var(--muted)]">
                  {card.description}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: card.tone,
                      width: `${Math.max((summary[card.key] / total) * 100, 2)}%`,
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
              Routing Posture
            </span>
            <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Immediate operator readout
            </h2>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                Risk Share
              </div>
              <div className="mt-3 text-[1.7rem] leading-none text-[var(--text)]">
                {formatPercent(degradedShare)}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-[var(--degraded)]"
                  style={{ width: `${Math.max(degradedShare * 100, 2)}%` }}
                />
              </div>
            </div>

            <div className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                Current Assessment
              </div>
              <div className="mt-3 text-[1.1rem] leading-snug text-[var(--text)]">
                {degradedShare > 0.08
                  ? "Pool quality is drifting. Review degraded and cooling entries before increasing traffic."
                  : "Pool quality is within a healthy operating band for standard routing."}
              </div>
            </div>

            <div className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4">
              <div className="text-[0.76rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                Best Performing Slice
              </div>
              <div className="mt-3 text-[1.4rem] leading-none text-[var(--text)]">
                {metrics.selection_ready.toLocaleString()} ready nodes
              </div>
              <div className="mt-2 text-[0.84rem] text-[var(--muted)]">
                remain immediately selectable for the routing layer
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="grid gap-1">
            <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Latency Bands
            </span>
            <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Response-time spread
            </h2>
          </div>

          <div className="mt-5 grid gap-3">
            {latencyBands.map((band) => (
              <div
                className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4"
                key={band.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.82rem] uppercase tracking-[0.08em] text-[var(--muted-strong)]">
                    {band.label}
                  </span>
                  <span className="text-[0.9rem] text-[var(--text)]">
                    {band.count.toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: band.tone,
                      width: `${Math.max((band.count / total) * 100, 2)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="grid gap-1">
            <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Current Snapshot
            </span>
            <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Highest-signal pool rows
            </h2>
          </div>

          <div className="mt-5 overflow-x-auto rounded-[14px] border border-white/8">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  {["Address", "Status", "Success", "Latency", "Failures"].map((heading) => (
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
                {proxies.items.slice(0, 6).map((proxy) => (
                  <tr className="hover:bg-white/2" key={proxy.id}>
                    <td className="border-b border-white/8 px-4 py-3 text-[0.9rem] text-[var(--text)]">
                      {proxy.host}:{proxy.port}
                    </td>
                    <td className="border-b border-white/8 px-4 py-3">
                      <span
                        className="inline-flex items-center gap-2 rounded-full border border-white/8 px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                        style={{ color: `var(--${proxy.status.replace("_", "-")})` }}
                      >
                        <span className="h-[7px] w-[7px] rounded-full bg-current" />
                        {proxy.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="border-b border-white/8 px-4 py-3 text-[0.82rem] text-[var(--muted)]">
                      {formatPercent(proxy.success_rate ?? 0)}
                    </td>
                    <td className="border-b border-white/8 px-4 py-3 text-[0.82rem] text-[var(--muted)]">
                      {formatLatency(proxy.avg_latency_ms)}
                    </td>
                    <td className="border-b border-white/8 px-4 py-3 text-[0.82rem] text-[var(--muted)]">
                      {proxy.consecutive_failures}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
