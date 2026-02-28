import { api, DormExtra } from "@/services/api";
import { DormSettingsForm } from "./DormSettingsForm";

export const dynamic = 'force-dynamic';

export default async function DormSettingsPage() {
  let config: Awaited<ReturnType<typeof api.getDormConfig>> = null;
  let extra: DormExtra = {};
  try {
    config = await api.getDormConfig();
    extra = await api.getDormExtra();
  } catch {
    config = null;
    extra = {};
  }

  return (
    <div className="p-6 md:p-8 bg-background min-h-screen">
      <DormSettingsForm initialConfig={config} initialExtra={extra} />
    </div>
  );
}
