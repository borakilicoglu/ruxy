"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react/toast";

import { DashboardInput } from "@/components/dashboard-input";
import { DashboardAction } from "@/components/dashboard-action";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardSelect } from "@/components/dashboard-select";
import { updateSettings, type SettingsResponse } from "@/lib/api";

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

  const normalized = value.replaceAll("_", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function requireString(formData: FormData, field: string, label: string) {
  const raw = formData.get(field);

  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${label} is required.`);
  }

  return raw.trim();
}

function requireNonNegativeInteger(
  formData: FormData,
  field: string,
  label: string,
) {
  const value = Number(requireString(formData, field, label));

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return value;
}

export function SettingsForm({ settings }: { settings: SettingsResponse }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const panelSummary = [
    { label: "Routing mode", value: strategyLabel(settings.routing_strategy) },
    { label: "Health cadence", value: `${settings.health_interval_secs} sec` },
    { label: "Timeout", value: `${settings.timeout_ms} ms` },
    { label: "Concurrency", value: `${settings.concurrency}` },
  ] as const;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    try {
      setIsSaving(true);

      await updateSettings({
        routing_strategy: requireString(
          formData,
          "routing_strategy",
          "Routing strategy",
        ),
        pool_label: requireString(formData, "pool_label", "Pool label"),
        max_retries: requireNonNegativeInteger(
          formData,
          "max_retries",
          "Max retries",
        ),
        selection_timeout_ms: requireNonNegativeInteger(
          formData,
          "selection_timeout_ms",
          "Selection timeout",
        ),
        health_interval_secs: requireNonNegativeInteger(
          formData,
          "health_interval_secs",
          "Health interval",
        ),
        cooldown_secs: requireNonNegativeInteger(
          formData,
          "cooldown_secs",
          "Cooldown",
        ),
        timeout_ms: requireNonNegativeInteger(
          formData,
          "timeout_ms",
          "Timeout",
        ),
        concurrency: requireNonNegativeInteger(
          formData,
          "concurrency",
          "Concurrency",
        ),
        failure_threshold: requireNonNegativeInteger(
          formData,
          "failure_threshold",
          "Failure threshold",
        ),
        recovery_threshold: requireNonNegativeInteger(
          formData,
          "recovery_threshold",
          "Recovery threshold",
        ),
      });

      toast.success("Settings saved");
      router.refresh();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <DashboardPageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardAction
              form="settings-form"
              type="reset"
              variant="standard"
            >
              Reset
            </DashboardAction>
            <DashboardAction
              disabled={isSaving}
              form="settings-form"
              type="submit"
              variant="primary"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </DashboardAction>
          </div>
        }
        eyebrow="Control Plane"
        title="Routing and health settings"
      />

      <section className="overflow-hidden bg-(--bg-panel) border-b border-(--line)">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 xl:[&>*:not(:last-child)]:border-r xl:*:border-(--line)">
          {panelSummary.map((item) => (
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

      <form
        className="grid flex-1 grid-rows-[1fr]"
        id="settings-form"
        onSubmit={handleSubmit}
      >
        <section className="grid h-full xl:grid-cols-[1fr_1fr]">
          <article className="flex h-full flex-col bg-(--bg-panel) p-4.5 border-r border-(--line)">
            <div className="grid gap-1">
              <span className="text-[0.76rem] uppercase tracking-[0.14em] text-muted">
                Routing
              </span>
              <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-(--text)">
                Selection behavior
              </h2>
            </div>

            <div className="mt-5 grid flex-1 gap-4 content-start">
              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                  Strategy
                </span>
                <DashboardSelect
                  defaultValue={settings.routing_strategy}
                  name="routing_strategy"
                  options={[...strategyOptions]}
                />
              </div>

              <div className="grid gap-2">
                <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                  Pool label
                </span>
                <DashboardInput
                  defaultValue={settings.pool_label}
                  name="pool_label"
                />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                    Max retries
                  </span>
                  <DashboardInput
                    defaultValue={`${settings.max_retries}`}
                    name="max_retries"
                    type="number"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                    Selection timeout
                  </span>
                  <DashboardInput
                    defaultValue={`${settings.selection_timeout_ms}`}
                    name="selection_timeout_ms"
                    type="number"
                  />
                </div>
              </div>

              <div className="mt-auto border border-(--line) bg-(--bg-panel-soft) p-4 text-[0.84rem] leading-relaxed text-muted">
                {strategyLabel(settings.routing_strategy)} is currently active.
                The control plane will only route through entries marked healthy
                and skip degraded or cooling rows.
              </div>
            </div>
          </article>

          <article className="flex h-full flex-col bg-(--bg-panel) p-4.5">
            <div className="grid gap-1">
              <span className="text-[0.76rem] uppercase tracking-[0.14em] text-muted">
                Health Checks
              </span>
              <h2 className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] text-(--text)">
                Worker thresholds
              </h2>
            </div>

            <div className="mt-5 grid flex-1 gap-4 content-start">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                    Interval
                  </span>
                  <DashboardSelect
                    defaultValue={`${settings.health_interval_secs}`}
                    name="health_interval_secs"
                    options={[...healthIntervalOptions]}
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                    Cooldown
                  </span>
                  <DashboardSelect
                    defaultValue={`${settings.cooldown_secs}`}
                    name="cooldown_secs"
                    options={[...cooldownOptions]}
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                    Timeout (ms)
                  </span>
                  <DashboardInput
                    defaultValue={`${settings.timeout_ms}`}
                    name="timeout_ms"
                    type="number"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                    Concurrency
                  </span>
                  <DashboardInput
                    defaultValue={`${settings.concurrency}`}
                    name="concurrency"
                    type="number"
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                    Failure threshold
                  </span>
                  <DashboardInput
                    defaultValue={`${settings.failure_threshold}`}
                    name="failure_threshold"
                    type="number"
                  />
                </div>
                <div className="grid gap-2">
                  <span className="text-[0.76rem] uppercase tracking-[0.08em] text-muted">
                    Recovery threshold
                  </span>
                  <DashboardInput
                    defaultValue={`${settings.recovery_threshold}`}
                    name="recovery_threshold"
                    type="number"
                  />
                </div>
              </div>

              <div className="mt-auto border border-(--line) bg-(--bg-panel-soft) p-4 text-[0.84rem] leading-relaxed text-muted">
                These controls now submit to the control-plane settings endpoint
                and persist for the current running dev session.
              </div>
            </div>
          </article>
        </section>
      </form>
    </>
  );
}
