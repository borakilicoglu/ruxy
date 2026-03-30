import { SettingsForm } from "@/components/settings-form";
import { getSettings } from "@/lib/api";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <main className="flex flex-1 flex-col">
      <SettingsForm settings={settings} />
    </main>
  );
}
