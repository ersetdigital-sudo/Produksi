import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { PagePlaceholder } from "../_placeholder";

export const metadata: Metadata = { title: "Mesin" };

export default function MesinPage() {
  return (
    <>
      <PageHeader
        title="Mesin"
        subtitle="Klik salah satu mesin untuk lihat riwayat service-nya."
      />
      <PagePlaceholder phase="Mesin masuk Fase 5 (Beranda dan Mesin)" />
    </>
  );
}
