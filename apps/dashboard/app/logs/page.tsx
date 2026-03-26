import { getEvents } from "@/lib/api";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function levelTone(level: string) {
  if (level === "error") {
    return "var(--unhealthy)";
  }

  if (level === "warn" || level === "warning") {
    return "var(--degraded)";
  }

  return "var(--healthy)";
}

export default async function LogsPage() {
  const events = await getEvents();
  const failureCount = events.items.filter((item) => item.level === "error").length;
  const warningCount = events.items.filter((item) => item.level === "warning").length;
  const healthEvents = events.items.filter((item) => item.category === "health").length;
  const operatorActions = events.items.filter((item) =>
    item.actor.includes("dashboard"),
  ).length;

  const logSummary = [
    { label: "Visible Events", value: events.total.toLocaleString() },
    { label: "Failures", value: failureCount.toLocaleString() },
    { label: "Warnings", value: warningCount.toLocaleString() },
    { label: "Health Events", value: healthEvents.toLocaleString() },
    { label: "Operator Actions", value: operatorActions.toLocaleString() },
  ] as const;

  return (
    <main className="grid gap-4">
      <div className="mb-1 flex flex-col gap-1">
        <h1 className="text-[clamp(2rem,2.6vw,2.8rem)] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
          Logs
        </h1>
        <p className="text-base text-[var(--muted)]">
          Review recent operator actions, routing failures, and pool state changes.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {logSummary.map((item) => (
          <article
            className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
            key={item.label}
          >
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              {item.label}
            </div>
            <div className="mt-3 text-[2rem] leading-none text-[var(--text)]">
              {item.value}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Event Stream
            </span>
            <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Latest control-plane and routing events
            </h2>
          </div>
          <div className="inline-flex h-10 items-center rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)]">
            Live API feed
          </div>
        </div>

        <div className="overflow-x-auto rounded-[14px] border border-white/8">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                {["Level", "Category", "Event", "Actor", "Timestamp"].map((heading) => (
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
              {events.items.map((entry) => (
                <tr className="hover:bg-white/2" key={entry.id}>
                  <td className="border-b border-white/8 px-4 py-4 align-top">
                    <span
                      className="inline-flex items-center gap-2 rounded-full border border-white/8 px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                      style={{ color: levelTone(entry.level) }}
                    >
                      <span className="h-[7px] w-[7px] rounded-full bg-current" />
                      {entry.level}
                    </span>
                  </td>
                  <td className="border-b border-white/8 px-4 py-4 align-top text-[0.8rem] uppercase tracking-[0.08em] text-[var(--muted-strong)]">
                    {entry.category}
                  </td>
                  <td className="border-b border-white/8 px-4 py-4 align-top">
                    <div className="grid gap-1">
                      <div className="text-[0.96rem] text-[var(--text)]">
                        {entry.proxy_id ? `Proxy ${entry.proxy_id.slice(0, 8)}` : "System event"}
                      </div>
                      <div className="max-w-[52ch] text-[0.84rem] leading-relaxed text-[var(--muted)]">
                        {entry.message}
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-white/8 px-4 py-4 align-top text-[0.82rem] text-[var(--muted)]">
                    {entry.actor}
                  </td>
                  <td className="border-b border-white/8 px-4 py-4 align-top text-[0.82rem] text-[var(--muted)]">
                    {formatTimestamp(entry.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
