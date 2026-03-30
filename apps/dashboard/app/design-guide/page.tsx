"use client";

import { Palette } from "@phosphor-icons/react";
import { DashboardAction } from "@/components/dashboard-action";
import { DashboardCheckbox } from "@/components/dashboard-checkbox";
import { DashboardInput } from "@/components/dashboard-input";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DashboardSelect } from "@/components/dashboard-select";

const tones = [
  {
    label: "Sidebar",
    value: "#17181f",
    varName: "sidebar",
    textClass: "text-(--text)]",
  },
  {
    label: "Surface",
    value: "#101217",
    varName: "--bg-panel",
    textClass: "text-(--text)]",
  },
  {
    label: "Button",
    value: "#25262e",
    varName: "--bg-input",
    textClass: "text-(--text)]",
  },
  {
    label: "Hover",
    value: "#2a2b36",
    varName: "button-hover",
    textClass: "text-(--text)]",
  },
  {
    label: "Border",
    value: "#2e2f36",
    varName: "--line",
    textClass: "text-(--text)]",
  },
  {
    label: "Muted",
    value: "#9b9b9b",
    varName: "--muted",
    textClass: "text-[#111]",
  },
] as const;

const statuses = [
  { label: "Healthy", tone: "var(--healthy)" },
  { label: "Degraded", tone: "var(--degraded)" },
  { label: "Unhealthy", tone: "var(--unhealthy)" },
  { label: "Cooling", tone: "var(--cooling-down)" },
] as const;

export default function DesignGuidePage() {
  return (
    <main className="grid">
      <DashboardPageHeader eyebrow="System" title="Design Guide" />
      <section className="overflow-hidden bg-(--bg-panel) shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <div className="border-b border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Color Tokens
        </div>
        <div className="grid divide-y divide-(--line) md:grid-cols-2 md:divide-y-0 xl:grid-cols-3">
          {tones.map((tone) => (
            <article className="px-5 py-4" key={tone.label}>
              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-1">
                  <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
                    {tone.label}
                  </div>
                  <div className="text-[0.95rem] text-(--text)">
                    {tone.value}
                  </div>
                  <div className="text-[0.78rem] text-muted">
                    {tone.varName}
                  </div>
                </div>
                <div
                  className="h-12 w-20 border border-(--line)"
                  style={{ backgroundColor: tone.value }}
                />
              </div>
            </article>
          ))}
        </div>

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Fonts
        </div>
        <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
          <article className="grid gap-2">
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
              Brand Display
            </div>
            <div className="text-[1.55rem] leading-none tracking-[0.06em] text-(--text) font-['Bungee',cursive]">
              RUXY DISPLAY
            </div>
            <div className="text-[0.82rem] text-muted">`Bungee`</div>
            <div className="text-[0.82rem] text-muted">
              Use for logo and rare branded moments only.
            </div>
          </article>
          <article className="grid gap-2">
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
              Interface Mono
            </div>
            <div
              className="text-[1.15rem] leading-snug text-(--text)"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              IBM Plex Mono 400 / 500
            </div>
            <div className="text-[0.82rem] text-muted">`IBM Plex Mono`</div>
            <div className="text-[0.82rem] text-muted">
              Use for navigation, metrics, tables, controls, and system labels.
            </div>
          </article>
        </div>

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Icon Libraries
        </div>
        <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
          <article className="grid gap-2">
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
              Primary
            </div>
            <div className="text-[1.05rem] text-(--text)">Phosphor Icons</div>
          </article>
          <article className="grid gap-2">
            <div className="text-[0.74rem] uppercase tracking-[0.14em] text-muted">
              Secondary
            </div>
            <div className="text-[1.05rem] text-(--text)">Lucide</div>
          </article>
        </div>

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Typography
        </div>
        <div className="grid gap-4 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[2rem] leading-none tracking-[-0.04em] text-(--text)">
              Dashboard display heading
            </div>
            <span className="border border-(--line) px-2 py-1 text-[0.72rem] uppercase tracking-[0.08em] text-muted">
              h1
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[1.35rem] leading-none tracking-[-0.04em] text-(--text)">
              Section heading
            </div>
            <span className="border border-(--line) px-2 py-1 text-[0.72rem] uppercase tracking-[0.08em] text-muted">
              h2
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-base text-muted">
              Supporting description copy for dashboard context and operational
              notes.
            </div>
            <span className="border border-(--line) px-2 py-1 text-[0.72rem] uppercase tracking-[0.08em] text-muted">
              p
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[0.76rem] uppercase tracking-[0.14em] text-muted">
              Uppercase micro label
            </div>
            <span className="border border-(--line) px-2 py-1 text-[0.72rem] uppercase tracking-[0.08em] text-muted">
              span
            </span>
          </div>
        </div>

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Actions
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-220 border-collapse">
            <thead>
              <tr>
                {["Variant", "Use", "Size", "Example"].map((heading) => (
                  <th
                    className="border-b border-(--line) px-5 py-4 text-left text-[0.78rem] uppercase tracking-[0.08em] text-muted"
                    key={heading}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-5 py-4 text-[0.92rem] text-(--text)">
                  Navigation Item
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  Active sidebar item state
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  `py-[11px]` `px-3` `gap-2.5`
                </td>
                <td className="px-5 py-4">
                  <DashboardAction active variant="navigation">
                    Navigation
                  </DashboardAction>
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4 text-[0.92rem] text-(--text)">
                  Dense
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  Secondary inline actions in tight layouts
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  `h-8` `px-3`
                </td>
                <td className="px-5 py-4">
                  <DashboardAction size="dense" variant="standard">
                    Dense
                  </DashboardAction>
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4 text-[0.92rem] text-(--text)]">
                  Standard
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  Toolbar, form, modal, and table actions
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  `h-10` `px-3.5` `text-sm`
                </td>
                <td className="px-5 py-4">
                  <DashboardAction variant="standard">Standard</DashboardAction>
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4 text-[0.92rem] text-(--text)]">
                  Large
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  Rare CTA moments that need more weight
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  `h-12` `px-4`
                </td>
                <td className="px-5 py-4">
                  <DashboardAction size="lg" variant="standard">
                    Large
                  </DashboardAction>
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4 text-[0.92rem] text-(--text)]">
                  With Icon
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  Primary or featured actions with stronger affordance
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  `h-10` `px-4` `gap-3`
                </td>
                <td className="px-5 py-4">
                  <DashboardAction
                    icon={<Palette size={18} weight="regular" />}
                    variant="primary"
                  >
                    Standard
                  </DashboardAction>
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4 text-[0.92rem] text-(--text)]">
                  Light
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  High-contrast secondary emphasis on dark surfaces
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  `h-10` `px-3.5` `text-sm`
                </td>
                <td className="px-5 py-4">
                  <DashboardAction variant="light">Light</DashboardAction>
                </td>
              </tr>
              <tr>
                <td className="px-5 py-4 text-[0.92rem] text-(--text)]">
                  Pill
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  Status, metadata, and compact read-only labels
                </td>
                <td className="px-5 py-4 text-[0.82rem] text-muted">
                  `h-8` `px-3`
                </td>
                <td className="px-5 py-4">
                  <DashboardAction size="dense" variant="pill">
                    Pill
                  </DashboardAction>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Form Elements
        </div>
        <div className="grid gap-4 px-5 py-5 md:grid-cols-3">
          <DashboardInput defaultValue="residential-eu" />
          <DashboardSelect
            defaultValue="healthy"
            options={[
              { value: "healthy", label: "Healthy" },
              { value: "degraded", label: "Degraded" },
              { value: "unhealthy", label: "Unhealthy" },
            ]}
          />
          <label className="flex h-10 items-center gap-3 border border-(--line) bg-(--bg-input) px-3.5 text-sm text-(--muted-strong)">
            <DashboardCheckbox checked />
            Enabled setting
          </label>
        </div>

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Status Pills
        </div>
        <div className="flex flex-wrap gap-3 px-5 py-5">
          {statuses.map((status) => (
            <span
              className="inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
              key={status.label}
              style={{ color: status.tone }}
            >
              <span className="h-1.75 w-1.75 bg-current" />
              {status.label}
            </span>
          ))}
        </div>

        <div className="border-y border-(--line) px-5 py-3 text-[0.76rem] uppercase tracking-[0.12em] text-muted">
          Table Sample
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-205 border-collapse">
            <thead>
              <tr>
                {[
                  "Proxy",
                  "Protocol",
                  "Status",
                  "Success",
                  "Latency",
                  "Last Check",
                ].map((heading) => (
                  <th
                    className="border-b border-(--line) px-5 py-4 text-left text-[0.78rem] uppercase tracking-[0.08em] text-muted"
                    key={heading}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-white/2">
                <td className="border-b border-(--line) px-5 py-4 text-[0.95rem] text-(--text)]">
                  77.104.76.230:8080
                </td>
                <td className="border-b border-(--line) px-5 py-4 text-[0.82rem] text-muted">
                  HTTP
                </td>
                <td className="border-b border-(--line) px-5 py-4">
                  <span
                    className="inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                    style={{ color: "var(--healthy)" }}
                  >
                    <span className="h-1.75 w-1.75 bg-current" />
                    Healthy
                  </span>
                </td>
                <td className="border-b border-(--line) px-5 py-4 text-[0.82rem] text-muted">
                  98.2%
                </td>
                <td className="border-b border-(--line) px-5 py-4 text-[0.82rem] text-muted">
                  241ms
                </td>
                <td className="border-b border-(--line) px-5 py-4 text-[0.82rem] text-muted">
                  Mar 28, 14:23
                </td>
              </tr>
              <tr className="hover:bg-white/2">
                <td className="border-b border-(--line) px-5 py-4 text-[0.95rem] text-(--text)]">
                  82.15.44.19:9000
                </td>
                <td className="border-b border-(--line) px-5 py-4 text-[0.82rem] text-muted">
                  SOCKS5
                </td>
                <td className="border-b border-(--line) px-5 py-4">
                  <span
                    className="inline-flex items-center gap-2 border border-(--line) px-2.5 py-1 text-[0.74rem] uppercase tracking-[0.08em]"
                    style={{ color: "var(--degraded)" }}
                  >
                    <span className="h-1.75 w-1.75 bg-current" />
                    Degraded
                  </span>
                </td>
                <td className="border-b border-(--line) px-5 py-4 text-[0.82rem] text-muted">
                  84.7%
                </td>
                <td className="border-b border-(--line) px-5 py-4 text-[0.82rem] text-muted">
                  1.9s
                </td>
                <td className="border-b border-(--line) px-5 py-4 text-[0.82rem] text-muted">
                  Mar 28, 14:18
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
