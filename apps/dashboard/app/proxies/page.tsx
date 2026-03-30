import { ProxiesWorkspace } from "@/components/proxies-workspace";
import { getProxies } from "@/lib/api";

export default async function ProxiesPage() {
  const proxies = await getProxies();

  return (
    <main className="grid bg-(--bg-panel)">
      <ProxiesWorkspace initialItems={proxies.items} total={proxies.total} />
    </main>
  );
}
