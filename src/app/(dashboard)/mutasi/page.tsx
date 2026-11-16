import type { Metadata } from "next";
import { MutationPage } from "@/features/mutations/components/MutationPage";
import { getMutationData } from "@/features/mutations/queries";

export const metadata: Metadata = { title: "Mutasi Stok" };
export const dynamic = "force-dynamic";

export default async function MutasiRoute({
  searchParams,
}: {
  searchParams: Promise<{ drawer?: string; materialId?: string }>;
}) {
  const params = await searchParams;
  const data = await getMutationData();
  const drawer =
    params.drawer === "keluar" ||
    params.drawer === "masuk" ||
    params.drawer === "opname"
      ? params.drawer
      : null;
  return (
    <MutationPage
      data={data}
      initialDrawer={drawer}
      initialMaterialId={params.materialId ?? null}
    />
  );
}
