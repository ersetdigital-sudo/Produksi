import type { Metadata } from "next";
import { AccessoryPage } from "@/features/accessories/components/AccessoryPage";
import { getAccessoriesData } from "@/features/accessories/queries";

export const metadata: Metadata = { title: "Pasang Aksesoris" };
export const dynamic = "force-dynamic";

export default async function AksesorisRoute() {
  const data = await getAccessoriesData();
  return <AccessoryPage data={data} />;
}