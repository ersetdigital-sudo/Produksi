import type { Metadata } from "next";
import { SchedulePage } from "@/features/schedules/components/SchedulePage";
import { getScheduleData } from "@/features/schedules/queries";

export const metadata: Metadata = { title: "Jadwal Produksi" };
export const dynamic = "force-dynamic";

export default async function JadwalRoute() {
  const data = await getScheduleData();
  return <SchedulePage data={data} />;
}