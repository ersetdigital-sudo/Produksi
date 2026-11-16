import type { Metadata } from "next";
import { SettingsPage } from "@/features/settings/components/SettingsPage";
import { getSettingsData } from "@/features/settings/queries";

export const metadata: Metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function PengaturanRoute() {
  const data = await getSettingsData();
  return <SettingsPage data={data} />;
}
