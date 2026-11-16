import type { Metadata } from "next";
import { ColorCatalog } from "@/features/colors/components/ColorCatalog";
import { getColorCatalog } from "@/features/colors/queries";

export const metadata: Metadata = { title: "Katalog Warna" };
export const dynamic = "force-dynamic";

export default async function WarnaPage() {
  const data = await getColorCatalog();
  return <ColorCatalog data={data} />;
}
