import "server-only";

import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  colorPairings,
  colors,
  fabricTypes,
  materialAvailabilityView,
  materials,
  planMaterialRequirements,
  planRequirementIssues,
  planResults,
  productionPlanLines,
  productionPlans,
  products,
  series,
  sizes,
} from "@/db/schema";
import { toNumber } from "@/lib/format";
import type { PlanStatus } from "@/db/schema";

export type PlanLineView = {
  id: string;
  productId: string;
  productName: string;
  seriesId: string;
  seriesName: string;
  colorId: string;
  colorName: string;
  colorCode: string;
  fabricCode: string;
  colorHex: string;
  size: string;
  qty: number;
  lineDone: boolean;
  cutDone: boolean;
  tailorName: string | null;
  sewingPaid: boolean;
};

export type PlanRequirementView = {
  materialId: string;
  code: string | null;
  name: string | null;
  unit: string;
  requiredQty: number;
  reservedQty: number;
  consumedQty: number;
  returnedQty: number;
  usedBackup: boolean;
  colors: string[];
  stock: number;
  available: number;
  status: "cukup" | "kurang" | "cadangan" | "netral" | "belum";
};

export type PlanIssueView = {
  planLineId: string;
  bomRowId: string;
  reason: string;
  detail: string | null;
};

export type PlanResultView = {
  planLineId: string;
  passQty: number;
  defectQty: number;
  defectReason: string | null;
  defectAction: string | null;
};

export type PlanDetail = {
  plan: {
    id: string;
    poNumber: string;
    planDate: string;
    note: string | null;
    status: PlanStatus;
  };
  lines: PlanLineView[];
  requirements: PlanRequirementView[];
  issues: PlanIssueView[];
  results: PlanResultView[];
};

export type PlanListItem = {
  plan: {
    id: string;
    poNumber: string;
    planDate: string;
    note: string | null;
    status: PlanStatus;
  };
  productNames: string[];
  totalQty: number;
  lineCount: number;
  sizeCount: number;
  cutDone: number;
  reserved: boolean;
};

export type ScheduleData = {
  lists: PlanListItem[];
  plans: PlanDetail[];
  products: { id: string; name: string }[];
  sizes: string[];
};

export async function getScheduleData(): Promise<ScheduleData> {
  const [
    planRows,
    lineRows,
    requirementRows,
    issueRows,
    resultRows,
    productRows,
    sizeRows,
  ] = await Promise.all([
    db
      .select({
        id: productionPlans.id,
        poNumber: productionPlans.poNumber,
        planDate: productionPlans.planDate,
        note: productionPlans.note,
        status: productionPlans.status,
      })
      .from(productionPlans)
      .orderBy(desc(productionPlans.planDate)),
    db
      .select({
        id: productionPlanLines.id,
        planId: productionPlanLines.planId,
        productId: productionPlanLines.productId,
        productName: products.name,
        seriesId: productionPlanLines.seriesId,
        seriesName: series.name,
        colorId: productionPlanLines.colorId,
        colorName: colors.name,
        colorCode: colors.colorCode,
        fabricCode: fabricTypes.code,
        colorHex: colors.hex,
        size: productionPlanLines.size,
        qty: productionPlanLines.qty,
        lineDone: productionPlanLines.lineDone,
        cutDone: productionPlanLines.cutDone,
        tailorName: productionPlanLines.tailorName,
        sewingPaid: productionPlanLines.sewingPaid,
      })
      .from(productionPlanLines)
      .innerJoin(products, eq(productionPlanLines.productId, products.id))
      .innerJoin(series, eq(productionPlanLines.seriesId, series.id))
      .innerJoin(colors, eq(productionPlanLines.colorId, colors.id))
      .innerJoin(fabricTypes, eq(colors.fabricTypeId, fabricTypes.id)),
    db
      .select({
        planId: planMaterialRequirements.planId,
        materialId: planMaterialRequirements.materialId,
        code: materials.code,
        name: materials.name,
        unit: planMaterialRequirements.unit,
        requiredQty: planMaterialRequirements.requiredQty,
        reservedQty: planMaterialRequirements.reservedQty,
        consumedQty: planMaterialRequirements.consumedQty,
        returnedQty: planMaterialRequirements.returnedQty,
        usedBackup: planMaterialRequirements.usedBackup,
      })
      .from(planMaterialRequirements)
      .innerJoin(
        materials,
        eq(planMaterialRequirements.materialId, materials.id),
      ),
    db
      .select({
        planId: planRequirementIssues.planId,
        planLineId: planRequirementIssues.planLineId,
        bomRowId: planRequirementIssues.bomRowId,
        reason: planRequirementIssues.reason,
        detail: planRequirementIssues.detail,
      })
      .from(planRequirementIssues),
    db
      .select({
        planId: productionPlanLines.planId,
        planLineId: planResults.planLineId,
        passQty: planResults.passQty,
        defectQty: planResults.defectQty,
        defectReason: planResults.defectReason,
        defectAction: planResults.defectAction,
      })
      .from(planResults)
      .innerJoin(
        productionPlanLines,
        eq(planResults.planLineId, productionPlanLines.id),
      ),
    db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.sortOrder)),
    db
      .select({ label: sizes.label })
      .from(sizes)
      .where(eq(sizes.active, true))
      .orderBy(asc(sizes.sortOrder)),
  ]);

  const [stockRows, pairingRows] = await Promise.all([
    db
      .select({
        materialId: materialAvailabilityView.materialId,
        unit: materialAvailabilityView.unit,
        qty: materialAvailabilityView.qty,
        available: materialAvailabilityView.availableQty,
      })
      .from(materialAvailabilityView),
    db
      .select({
        primaryId: colorPairings.primaryMaterialId,
        backupId: colorPairings.backupMaterialId,
        colorName: colors.name,
      })
      .from(colorPairings)
      .innerJoin(colors, eq(colorPairings.colorId, colors.id)),
  ]);

  const colorByMaterial = new Map<string, string[]>();
  for (const row of pairingRows) {
    const ids = [row.primaryId, row.backupId].filter(Boolean) as string[];
    for (const id of ids) {
      const list = colorByMaterial.get(id) ?? [];
      if (!list.includes(row.colorName)) list.push(row.colorName);
      colorByMaterial.set(id, list);
    }
  }

  const stockByMaterial = new Map(
    stockRows.map((row) => [row.materialId, toNumber(row.qty)]),
  );
  const availableByMaterial = new Map(
    stockRows.map((row) => [row.materialId, toNumber(row.available)]),
  );

  const lineByPlan = new Map<string, PlanLineView[]>();
  for (const row of lineRows) {
    const list = lineByPlan.get(row.planId) ?? [];
    list.push({
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      seriesId: row.seriesId,
      seriesName: row.seriesName,
      colorId: row.colorId,
      colorName: row.colorName,
      colorCode: row.colorCode,
      fabricCode: row.fabricCode,
      colorHex: row.colorHex,
      size: row.size,
      qty: row.qty,
      lineDone: row.lineDone,
      cutDone: row.cutDone,
      tailorName: row.tailorName,
      sewingPaid: row.sewingPaid,
    });
    lineByPlan.set(row.planId, list);
  }

  const reqByPlan = new Map<string, PlanRequirementView[]>();
  for (const row of requirementRows) {
    const list = reqByPlan.get(row.planId) ?? [];
    list.push({
      materialId: row.materialId,
      code: row.code,
      name: row.name,
      unit: row.unit,
      requiredQty: toNumber(row.requiredQty),
      reservedQty: toNumber(row.reservedQty),
      consumedQty: toNumber(row.consumedQty),
      returnedQty: toNumber(row.returnedQty),
      usedBackup: row.usedBackup,
      colors: colorByMaterial.get(row.materialId) ?? [],
      stock: stockByMaterial.get(row.materialId) ?? 0,
      available: availableByMaterial.get(row.materialId) ?? 0,
      status: "netral",
    });
    reqByPlan.set(row.planId, list);
  }

  const issueByPlan = new Map<string, PlanIssueView[]>();
  for (const row of issueRows) {
    const list = issueByPlan.get(row.planId) ?? [];
    list.push({
      planLineId: row.planLineId,
      bomRowId: row.bomRowId,
      reason: row.reason,
      detail: row.detail,
    });
    issueByPlan.set(row.planId, list);
  }

  const resultByPlan = new Map<string, PlanResultView[]>();
  for (const row of resultRows) {
    const list = resultByPlan.get(row.planId) ?? [];
    list.push({
      planLineId: row.planLineId,
      passQty: toNumber(row.passQty),
      defectQty: toNumber(row.defectQty),
      defectReason: row.defectReason,
      defectAction: row.defectAction,
    });
    resultByPlan.set(row.planId, list);
  }

  const plans: PlanDetail[] = planRows
    .map((plan) => {
      const lines = lineByPlan.get(plan.id) ?? [];
      const requirements = (reqByPlan.get(plan.id) ?? []).map((req) => {
        const needed = req.requiredQty;
        let status: PlanRequirementView["status"] = "netral";
        if (req.requiredQty > 0) {
          const available = availableByMaterial.get(req.materialId) ?? 0;
          if (available >= needed) status = "cukup";
          else if (req.usedBackup && req.reservedQty > 0) status = "cadangan";
          else status = "kurang";
        }
        return { ...req, status };
      });
      return {
        plan: {
          id: plan.id,
          poNumber: plan.poNumber,
          planDate: plan.planDate,
          note: plan.note,
          status: plan.status,
        },
        lines,
        requirements,
        issues: issueByPlan.get(plan.id) ?? [],
        results: resultByPlan.get(plan.id) ?? [],
      };
    })
    .sort((a, b) => (a.plan.planDate < b.plan.planDate ? -1 : 1));

  const lists: PlanListItem[] = plans.map((plan) => ({
    plan: plan.plan,
    productNames: Array.from(new Set(plan.lines.map((l) => l.productName))),
    totalQty: plan.lines.reduce((n, l) => n + l.qty, 0),
    lineCount: plan.lines.length,
    sizeCount: Array.from(new Set(plan.lines.map((l) => l.size))).length,
    cutDone: plan.lines.filter((l) => l.cutDone).length,
    reserved: plan.plan.status === "reserved",
  }));

  return {
    lists,
    plans,
    products: productRows,
    sizes: sizeRows.map((s) => s.label),
  };
}