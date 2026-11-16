import { Card, EmptyState } from "@/components/ui/primitives";

export function PagePlaceholder({ phase }: { phase: string }) {
  return (
    <Card>
      <EmptyState
        title="Halaman ini dibangun pada fase berikutnya"
        description={`${phase}. Fondasi tampilan, navigasi, dan komponen bersama sudah siap.`}
      />
    </Card>
  );
}
