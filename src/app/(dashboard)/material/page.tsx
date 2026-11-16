import type { Metadata } from "next";
import { MaterialCatalog } from "@/features/materials/components/MaterialCatalog";
import { getMaterialCatalog } from "@/features/materials/queries";

export const metadata: Metadata = { title: "Stok Material" };
export const dynamic = "force-dynamic";

export default async function MaterialPage() {
  const data = await getMaterialCatalog();
  return <MaterialCatalog data={data} />;
}
