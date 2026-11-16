import "server-only";

import { getMaterialCatalog } from "@/features/materials/queries";
import { getMutationData } from "@/features/mutations/queries";

export async function getDashboardData() {
  const [catalog, mutations] = await Promise.all([
    getMaterialCatalog(),
    getMutationData(),
  ]);

  return {
    catalog,
    recentMovements: mutations.movements.slice(0, 5),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
