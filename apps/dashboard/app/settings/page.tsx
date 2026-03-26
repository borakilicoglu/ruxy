import { DashboardInput } from "@/components/dashboard-input";
import { DashboardSelect } from "@/components/dashboard-select";
import { getSettings } from "@/lib/api";

const strategyOptions = [
  { value: "random", label: "Random healthy" },
  { value: "round_robin", label: "Round robin" },
  { value: "weighted", label: "Weighted" },
] as const;

const healthIntervalOptions = [
  { value: "15", label: "15 seconds" },
  { value: "30", label: "30 seconds" },
  { value: "60", label: "60 seconds" },
] as const;

const cooldownOptions = [
  { value: "60", label: "60 seconds" },
  { value: "120", label: "120 seconds" },
  { value: "300", label: "300 seconds" },
] as const;

function strategyLabel(value: string) {
  if (value === "round_robin") {
    return "Round robin";
  }

  if (value === "random") {
    return "Random healthy";
  }

  return value.replaceAll("_", " ");
}

export default async function SettingsPage() {
  const settings = await getSettings();
  const panelSummary = [
    { label: "Routing mode", value: strategyLabel(settings.routing_strategy) },
    { label: "Health cadence", value: `${settings.health_interval_secs} sec` },
    { label: "Timeout", value: `${settings.timeout_ms} ms` },
    { label: "Concurrency", value: `${settings.concurrency}` },
  ] as const;

  return (
    <main className="grid gap-4">
      <div className="mb-1 flex flex-col gap-1">
        <h1 className="text-[clamp(2rem,2.6vw,2.8rem)] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
          Settings
        </h1>
        <p className="text-base text-[var(--muted)]">
          Tune routing strategy, health thresholds, and worker cadence.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {panelSummary.map((item) => (
          <article
            className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
            key={item.label}
          >
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              {item.label}
            </div>
            <div className="mt-3 text-[1.55rem] leading-none text-[var(--text)]">
              {item.value}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="grid gap-1">
            <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Routing
            </span>
            <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Selection behavior
            </h2>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                Strategy
              </span>
              <DashboardSelect
                defaultValue={settings.routing_strategy}
                options={[...strategyOptions]}
              />
            </div>

            <div className="grid gap-2">
              <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                Pool label
              </span>
              <DashboardInput defaultValue={settings.pool_label} />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Max retries
                </span>
                <DashboardInput defaultValue={`${settings.max_retries}`} type="number" />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Selection timeout
                </span>
                <DashboardInput
                  defaultValue={`${settings.selection_timeout_ms}`}
                  type="number"
                />
              </div>
            </div>

            <div className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4 text-[0.84rem] leading-relaxed text-[var(--muted)]">
              {strategyLabel(settings.routing_strategy)} is currently active. The control plane
              will only route through entries marked healthy and skip degraded or cooling rows.
            </div>
          </div>
        </article>

        <article className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
          <div className="grid gap-1">
            <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Health Checks
            </span>
            <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Worker thresholds
            </h2>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Interval
                </span>
                <DashboardSelect
                  defaultValue={`${settings.health_interval_secs}`}
                  options={[...healthIntervalOptions]}
                />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Cooldown
                </span>
                <DashboardSelect
                  defaultValue={`${settings.cooldown_secs}`}
                  options={[...cooldownOptions]}
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Timeout (ms)
                </span>
                <DashboardInput defaultValue={`${settings.timeout_ms}`} type="number" />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Concurrency
                </span>
                <DashboardInput defaultValue={`${settings.concurrency}`} type="number" />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Failure threshold
                </span>
                <DashboardInput defaultValue={`${settings.failure_threshold}`} type="number" />
              </div>
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Recovery threshold
                </span>
                <DashboardInput defaultValue={`${settings.recovery_threshold}`} type="number" />
              </div>
            </div>

            <div className="rounded-[14px] border border-white/8 bg-[var(--bg-panel-soft)] p-4 text-[0.84rem] leading-relaxed text-[var(--muted)]">
              These controls are currently static, but the layout now matches the
              control surface that will eventually sync with `/api/settings`.
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <span className="text-[0.76rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Save Surface
            </span>
            <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
              Control-plane configuration draft
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[var(--bg-input)] px-3.5 text-sm text-[var(--muted-strong)] transition hover:border-[var(--line-strong)] hover:bg-[#222]" type="button">
              Reset
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/8 bg-[#d6d6d6] px-3.5 text-sm font-semibold text-[#111] transition hover:bg-[#f2f2f2]" type="button">
              Save Changes
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
