import type { Metadata } from "next";
import { BomPage } from "@/features/bom/components/BomPage";
import { getBomData } from "@/features/bom/queries";

export const metadata: Metadata = { title: "Bahan per Pcs" };
export const dynamic = "force-dynamic";

export default async function BahanRoute() {
  const data = await getBomData();
  return <BomPage data={data} />;
}
