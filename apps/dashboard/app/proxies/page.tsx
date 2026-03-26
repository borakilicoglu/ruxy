import { ProxiesWorkspace } from "@/components/proxies-workspace";
import { getProxies } from "@/lib/api";

export default async function ProxiesPage() {
  const proxies = await getProxies();

  return (
    <main className="grid gap-4">
      <div className="mb-1 flex flex-col gap-1">
        <h1 className="text-[clamp(2rem,2.6vw,2.8rem)] font-medium leading-none tracking-[-0.04em] text-[var(--text)]">
          Proxies
        </h1>
        <p className="text-base text-[var(--muted)]">
          Manage and monitor your proxy infrastructure
        </p>
      </div>

      <section className="rounded-[18px] border border-white/8 bg-[var(--bg-panel)] p-[18px] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
        <ProxiesWorkspace initialItems={proxies.items} total={proxies.total} />
      </section>
    </main>
  );
}
