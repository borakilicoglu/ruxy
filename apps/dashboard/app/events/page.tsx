import { DashboardPageHeader } from "@/components/dashboard-page-header";
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

export default async function EventsPage() {
  const events = await getEvents();
  const failureCount = events.items.filter(
    (item) => item.level === "error",
  ).length;
  const warningCount = events.items.filter(
    (item) => item.level === "warning",
  ).length;
  const healthEvents = events.items.filter(
    (item) => item.category === "health",
  ).length;
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
    <main className="grid">
      <DashboardPageHeader
        eyebrow="Event Stream"
        title="Latest control-plane and routing events"
      />
      <section className="overflow-hidden border-b border-(--line) bg-(--bg-panel)">
        <div className="grid divide-y divide-(--line) md:grid-cols-5 md:divide-y-0 md:[&>*:not(:last-child)]:border-r md:*:border-(--line)">
          {logSummary.map((item) => (
            <article className="px-5 py-4" key={item.label}>
              <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
                {item.label}
              </div>
              <div className="mt-3 text-[1.55rem] leading-none text-(--text)">
                {item.value}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden bg-(--bg-panel) shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-245 border-collapse">
            <thead>
              <tr>
                {["Level", "Category", "Event", "Actor", "Timestamp"].map(
                  (heading) => (
                    <th
                      className="border-b border-(--line) px-4 py-3 text-left text-[0.78rem] uppercase tracking-[0.08em] text-muted"
                      key={heading}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {events.items.map((entry) => (
                <tr className="hover:bg-white/2" key={entry.id}>
                  <td className="border-b border-(--line) px-4 py-4 align-top">
                    <span
                      className="inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                      style={{ color: levelTone(entry.level) }}
                    >
                      <span className="h-1.75 w-1.75 bg-current" />
                      {entry.level}
                    </span>
                  </td>
                  <td className="border-b border-(--line) px-4 py-4 align-top text-[0.8rem] uppercase tracking-[0.08em] text-(--muted-strong)">
                    {entry.category}
                  </td>
                  <td className="border-b border-(--line) px-4 py-4 align-top">
                    <div className="grid gap-1">
                      <div className="text-[0.96rem] text-(--text)">
                        {entry.proxy_id
                          ? `Proxy ${entry.proxy_id.slice(0, 8)}`
                          : "System event"}
                      </div>
                      <div className="max-w-[52ch] text-[0.84rem] leading-relaxed text-muted">
                        {entry.message}
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-(--line) px-4 py-4 align-top text-[0.82rem] text-muted">
                    {entry.actor}
                  </td>
                  <td className="border-b border-(--line) px-4 py-4 align-top text-[0.82rem] text-muted">
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
