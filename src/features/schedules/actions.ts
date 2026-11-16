"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  bomCellSizes,
  bomCells,
  bomRows,
  colorPairings,
  colors,
  materialStockView,
  materials,
  pairingSlots,
  planMaterialRequirements,
  planRequirementIssues,
  planResults,
  productionPlanLines,
  productionPlans,
  unitConversions,
  users,
} from "@/db/schema";
import { CURRENT_USER } from "@/features/auth/current-user";
import {
  appendFinishedGoodsMovement,
  recordProductionOut,
  recordReserve,
  recordResultPass,
} from "@/features/stock/ledger";
import { computeRequirements } from "@/features/stock/requirements";
import { validateLineResult, isPlanComplete } from "@/features/stock/results";
import { canTransition } from "@/features/stock/workflow";
import { convertQuantity } from "@/features/stock/units";
import { toNumber } from "@/lib/format";
import {
  lineCheckboxSchema,
  receiveResultSchema,
  setTailorSchema,
} from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function revalidateSchedules() {
  revalidatePath("/jadwal");
  revalidatePath("/mutasi");
  revalidatePath("/material");
  revalidatePath("/warna");
  revalidatePath("/");
}

async function currentActorId(): Promise<string | null> {
  const [actor] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.name, CURRENT_USER.name))
    .limit(1);
  return actor?.id ?? null;
}

async function computePlanRequirements(
  tx: Tx,
  planId: string,
): Promise<
  | { ok: true; requirements: { materialId: string; requiredQty: number; unit: string; usedBackup: boolean }[]; issues: { planLineId: string; bomRowId: string; reason: string; detail: string | null }[] }
  | { ok: false; error: string }
> {
  const [lines, rows, rawCells, rawSizeCells, pairingList, materialRows, colorRows, convRows] =
    await Promise.all([
      tx
        .select({
          id: productionPlanLines.id,
          productId: productionPlanLines.productId,
          seriesId: productionPlanLines.seriesId,
          colorId: productionPlanLines.colorId,
          size: productionPlanLines.size,
          qty: productionPlanLines.qty,
        })
        .from(productionPlanLines)
        .where(eq(productionPlanLines.planId, planId)),
      tx
        .select({
          id: bomRows.id,
          productId: bomRows.productId,
          name: bomRows.name,
          pattern: bomRows.pattern,
          pairingSlotId: bomRows.pairingSlotId,
        })
        .from(bomRows),
      tx
        .select({
          rowId: bomCells.bomRowId,
          seriesId: bomCells.seriesId,
          materialId: bomCells.materialId,
          qty: bomCells.qtyPerPiece,
          unit: bomCells.unit,
          unused: bomCells.unused,
        })
        .from(bomCells),
      tx
        .select({
          rowId: bomCellSizes.bomCellId,
          seriesId: bomCells.seriesId,
          size: bomCellSizes.size,
          materialId: bomCellSizes.materialId,
          qty: bomCellSizes.qtyPerPiece,
        })
        .from(bomCellSizes)
        .innerJoin(bomCells, eq(bomCellSizes.bomCellId, bomCells.id)),
      tx
        .select({
          colorId: colorPairings.colorId,
          slotId: colorPairings.slotId,
          primaryMaterialId: colorPairings.primaryMaterialId,
          backupMaterialId: colorPairings.backupMaterialId,
        })
        .from(colorPairings),
      tx
        .select({
          id: materials.id,
          code: materials.code,
          name: materials.name,
          unit: materials.unit,
          stock: materialStockView.qty,
        })
        .from(materials)
        .leftJoin(materialStockView, eq(materialStockView.materialId, materials.id)),
      tx.select({ id: colors.id, name: colors.name }).from(colors),
      tx
        .select({
          fromUnit: unitConversions.fromUnit,
          toUnit: unitConversions.toUnit,
          factor: unitConversions.factor,
        })
        .from(unitConversions)
        .where(eq(unitConversions.active, true)),
    ]);

  const cells = rawCells.map((c) => ({
    rowId: c.rowId,
    seriesId: c.seriesId,
    materialId: c.materialId,
    qty: c.qty === null ? null : toNumber(c.qty),
    unit: c.unit,
    unused: c.unused,
  }));
  const sizeCells = rawSizeCells.map((c) => ({
    rowId: c.rowId,
    seriesId: c.seriesId,
    size: c.size,
    materialId: c.materialId,
    qty: c.qty === null ? null : toNumber(c.qty),
  }));

  const result = computeRequirements({
    lines,
    rows,
    cells,
    sizeCells,
    pairings: pairingList,
    materials: materialRows.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      unit: m.unit,
      stock: toNumber(m.stock),
    })),
    colors: colorRows,
    conversions: convRows.map((c) => ({
      fromUnit: c.fromUnit,
      toUnit: c.toUnit,
      factor: c.factor === null ? null : toNumber(c.factor),
    })),
  });

  return {
    ok: true,
    requirements: result.requirements.map((r) => ({
      materialId: r.materialId,
      requiredQty: r.requiredQty,
      unit: r.unit,
      usedBackup: r.usedBackup,
    })),
    issues: result.issues.map((i) => ({
      planLineId: i.planLineId,
      bomRowId: i.bomRowId,
      reason: i.reason,
      detail: i.detail,
    })),
  };
}

export async function advancePlan(input: unknown): Promise<ActionResult> {
  const { planId, to } = input as { planId: string; to: string };
  if (!["reserved", "running", "done", "cancelled"].includes(to)) {
    return { ok: false, error: "Status tujuan tidak valid." };
  }

  try {
    return await db.transaction(async (tx) => {
      const [plan] = await tx
        .select({
          id: productionPlans.id,
          poNumber: productionPlans.poNumber,
          status: productionPlans.status,
        })
        .from(productionPlans)
        .where(eq(productionPlans.id, planId))
        .limit(1);
      if (!plan) throw new Error("Jadwal tidak ditemukan.");
      if (!canTransition(plan.status, to as never)) {
        throw new Error(`Status ${plan.status} tidak bisa diubah ke ${to}.`);
      }

      const actorId = await currentActorId();
      const now = new Date();

      if (to === "reserved") {
        const result = await computePlanRequirements(tx, planId);
        if (!result.ok) throw new Error(result.error);
        for (const req of result.requirements) {
          await tx.insert(planMaterialRequirements).values({
            planId,
            materialId: req.materialId,
            requiredQty: String(req.requiredQty),
            unit: req.unit,
            reservedQty: String(req.requiredQty),
            usedBackup: req.usedBackup,
            status: "reserved",
          });
        }
        for (const issue of result.issues) {
          await tx.insert(planRequirementIssues).values({
            planId,
            planLineId: issue.planLineId,
            bomRowId: issue.bomRowId,
            reason: issue.reason,
            detail: issue.detail,
          });
        }
        await recordReserve(tx, {
          planId,
          poNumber: plan.poNumber,
          requirements: result.requirements.map((r) => ({
            materialId: r.materialId,
            qty: r.requiredQty,
            unit: r.unit,
          })),
          actorId,
          occurredAt: now,
        });
        await tx
          .update(productionPlans)
          .set({ status: "reserved", approvedAt: now })
          .where(eq(productionPlans.id, planId));
      } else if (to === "running") {
        const reqs = await tx
          .select({
            materialId: planMaterialRequirements.materialId,
            reserved: planMaterialRequirements.reservedQty,
            unit: planMaterialRequirements.unit,
          })
          .from(planMaterialRequirements)
          .where(
            and(
              eq(planMaterialRequirements.planId, planId),
              eq(planMaterialRequirements.status, "reserved"),
            ),
          );
        await recordProductionOut(tx, {
          planId,
          poNumber: plan.poNumber,
          requirements: reqs
            .filter((r) => toNumber(r.reserved) > 0)
            .map((r) => ({
              materialId: r.materialId,
              qty: toNumber(r.reserved),
              unit: r.unit,
            })),
          actorId,
          occurredAt: now,
        });
        await tx
          .update(planMaterialRequirements)
          .set({ consumedQty: planMaterialRequirements.reservedQty, status: "consumed" })
          .where(eq(planMaterialRequirements.planId, planId));
        await tx
          .update(productionPlans)
          .set({ status: "running", startedAt: now })
          .where(eq(productionPlans.id, planId));
      } else if (to === "done") {
        const lines = await tx
          .select({ id: productionPlanLines.id, qty: productionPlanLines.qty })
          .from(productionPlanLines)
          .where(eq(productionPlanLines.planId, planId));
        const results = await tx
          .select({
            planLineId: planResults.planLineId,
            passQty: planResults.passQty,
            defectQty: planResults.defectQty,
          })
          .from(planResults);
        const resultMap: Record<string, { passQty: number; defectQty: number }> = {};
        for (const r of results) resultMap[r.planLineId] = r;
        if (!isPlanComplete(lines, resultMap)) {
          throw new Error(
            "Belum bisa ditandai selesai. Masih ada baris yang belum terima hasil lengkap.",
          );
        }
        await tx
          .update(productionPlans)
          .set({ status: "done", finishedAt: now })
          .where(eq(productionPlans.id, planId));
      } else if (to === "cancelled") {
        const released = await tx
          .select({
            materialId: planMaterialRequirements.materialId,
            reserved: planMaterialRequirements.reservedQty,
            unit: planMaterialRequirements.unit,
          })
          .from(planMaterialRequirements)
          .where(
            and(
              eq(planMaterialRequirements.planId, planId),
              eq(planMaterialRequirements.status, "reserved"),
            ),
          );
        await tx
          .update(planMaterialRequirements)
          .set({ status: "released", reservedQty: "0" })
          .where(
            and(
              eq(planMaterialRequirements.planId, planId),
              eq(planMaterialRequirements.status, "reserved"),
            ),
          );
        if (released.length > 0) {
          await recordReserve(tx, {
            planId,
            poNumber: plan.poNumber,
            requirements: released.map((r) => ({
              materialId: r.materialId,
              qty: -toNumber(r.reserved),
              unit: r.unit,
            })),
            actorId,
            occurredAt: now,
          });
        }
        await tx
          .update(productionPlans)
          .set({ status: "cancelled", finishedAt: now })
          .where(eq(productionPlans.id, planId));
      }

      revalidateSchedules();
      return { ok: true };
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal mengubah jadwal.",
    };
  }
}

export async function saveLineCheckbox(input: unknown): Promise<ActionResult> {
  const parsed = lineCheckboxSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian tidak valid" };
  }
  const data = parsed.data;
  try {
    await db
      .update(productionPlanLines)
      .set({
        [data.field]: data.value,
        [data.field === "cutDone" ? "cutAt" : data.field]: data.field === "cutDone" ? (data.value ? new Date() : null) : undefined,
      })
      .where(
        and(
          eq(productionPlanLines.id, data.lineId),
          eq(productionPlanLines.planId, data.planId),
        ),
      );
    revalidateSchedules();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan lembar potong." };
  }
}

export async function saveTailor(input: unknown): Promise<ActionResult> {
  const parsed = setTailorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Isian tidak valid." };
  const data = parsed.data;
  try {
    await db
      .update(productionPlanLines)
      .set({ tailorName: data.tailorName ?? null })
      .where(eq(productionPlanLines.id, data.lineId));
    revalidateSchedules();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan penjahit." };
  }
}

export async function receivePlanResult(input: unknown): Promise<ActionResult> {
  const parsed = receiveResultSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian tidak valid" };
  }
  const data = parsed.data;
  try {
    return await db.transaction(async (tx) => {
      const [line] = await tx
        .select({
          planId: productionPlanLines.planId,
          qty: productionPlanLines.qty,
          productId: productionPlanLines.productId,
          seriesId: productionPlanLines.seriesId,
          colorId: productionPlanLines.colorId,
          size: productionPlanLines.size,
          seriesKind: sql<string>`(select kind from series where id = ${productionPlanLines.seriesId})`,
        })
        .from(productionPlanLines)
        .where(eq(productionPlanLines.id, data.planLineId))
        .for("update")
        .limit(1);
      if (!line) throw new Error("Baris jadwal tidak ditemukan.");

      // Existing cumulative result.
      const existingRows = await tx
        .select({
          passQty: planResults.passQty,
          defectQty: planResults.defectQty,
        })
        .from(planResults)
        .where(eq(planResults.planLineId, data.planLineId));
      const existingPass = existingRows.reduce((n, r) => n + toNumber(r.passQty), 0);
      const existingDefect = existingRows.reduce((n, r) => n + toNumber(r.defectQty), 0);

      const validation = validateLineResult({
        target: line.qty,
        existingPass,
        existingDefect,
        nextPass: data.pass,
        nextDefect: data.defect,
        defectReason: data.defectReason,
        defectAction: data.defectAction ?? null,
      });
      if (!validation.ok) throw new Error(validation.error);

      const actorId = await currentActorId();
      const now = new Date();

      if (validation.deltaPass > 0) {
        await recordResultPass(tx, {
          planId: line.planId,
          poNumber:
            (await tx
              .select({ poNumber: productionPlans.poNumber })
              .from(productionPlans)
              .where(eq(productionPlans.id, line.planId))
              .limit(1))?.[0]?.poNumber ?? "",
          seriesId: line.seriesId,
          colorId: line.colorId,
          size: line.size,
          passQty: validation.deltaPass,
          actorId,
          occurredAt: now,
        });
      }

      await tx.insert(planResults).values({
        planLineId: data.planLineId,
        receivedAt: now,
        passQty: validation.deltaPass,
        defectQty: validation.deltaDefect,
        defectReason:
          validation.deltaDefect > 0 ? data.defectReason?.trim() || null : null,
        defectAction:
          validation.deltaDefect > 0 ? (data.defectAction ?? null) : null,
        createdBy: actorId,
        createdAt: now,
      });

      revalidateSchedules();
      return { ok: true };
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal menerima hasil.",
    };
  }
}