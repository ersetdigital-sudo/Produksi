"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  bomCellSizes,
  bomCells,
  bomRows,
  materials,
  series,
  seriesAccessories,
} from "@/db/schema";
import { cellInputSchema, seriesInputSchema } from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveCell(input: unknown): Promise<ActionResult> {
  const parsed = cellInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }
  const data = parsed.data;

  try {
    const [cell] = await db
      .select({
        id: bomCells.id,
        pattern: bomRows.pattern,
        unit: bomCells.unit,
      })
      .from(bomCells)
      .innerJoin(bomRows, eq(bomCells.bomRowId, bomRows.id))
      .where(eq(bomCells.id, data.cellId))
      .limit(1);

    if (!cell) return { ok: false, error: "Sel tidak ditemukan." };

    await db.transaction(async (tx) => {
      if (data.unused) {
        await tx
          .update(bomCells)
          .set({ unused: true })
          .where(eq(bomCells.id, data.cellId));
        if (cell.pattern === "size") {
          await tx
            .delete(bomCellSizes)
            .where(eq(bomCellSizes.bomCellId, data.cellId));
        }
        return;
      }

      if (cell.pattern === "size") {
        await tx
          .update(bomCells)
          .set({
            unused: false,
            materialId: null,
            qtyPerPiece: null,
            unit: null,
          })
          .where(eq(bomCells.id, data.cellId));
        await tx
          .delete(bomCellSizes)
          .where(eq(bomCellSizes.bomCellId, data.cellId));

        const values = (data.sizes ?? [])
          .filter((size) => size.materialId || size.qty !== null)
          .map((size) => ({
            bomCellId: data.cellId,
            size: size.size,
            materialId: size.materialId ?? null,
            qtyPerPiece: size.qty === null ? null : String(size.qty),
          }));
        if (values.length > 0) {
          await tx.insert(bomCellSizes).values(values);
        }
        return;
      }

      let unit = cell.unit;
      const materialId =
        cell.pattern === "warna" ? null : data.materialId ?? null;

      if (materialId) {
        const [material] = await tx
          .select({ unit: materials.unit })
          .from(materials)
          .where(eq(materials.id, materialId))
          .limit(1);
        unit = material?.unit ?? unit;
      }

      await tx
        .update(bomCells)
        .set({
          unused: false,
          materialId,
          qtyPerPiece:
            data.qty === null || data.qty === undefined
              ? null
              : String(data.qty),
          unit,
        })
        .where(eq(bomCells.id, data.cellId));
    });

    revalidatePath("/bahan");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan sel. Coba lagi." };
  }
}

export async function addSeries(input: unknown): Promise<ActionResult> {
  const parsed = seriesInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }
  const data = parsed.data;

  try {
    const duplicates = await db
      .select({ id: series.id })
      .from(series)
      .where(
        sql`${series.productId} = ${data.productId} and lower(${series.name}) = lower(${data.name})`,
      )
      .limit(1);
    if (duplicates.length > 0) {
      return { ok: false, error: "Nama series sudah dipakai di produk ini." };
    }

    await db.transaction(async (tx) => {
      const [max] = await tx
        .select({ value: sql<number>`coalesce(max(${series.sortOrder}), 0)` })
        .from(series)
        .where(eq(series.productId, data.productId));

      const [created] = await tx
        .insert(series)
        .values({
          productId: data.productId,
          name: data.name,
          kind: data.kind,
          parentSeriesId:
            data.kind === "turunan" ? data.parentSeriesId ?? null : null,
          sortOrder: Number(max?.value ?? 0) + 1,
        })
        .returning({ id: series.id });

      if (!created) throw new Error("Gagal membuat series");

      if (data.kind === "turunan") {
        if (!data.accessoryMaterialId) {
          throw new Error("Aksesoris tambahan wajib dipilih");
        }
        const [material] = await tx
          .select({ unit: materials.unit })
          .from(materials)
          .where(eq(materials.id, data.accessoryMaterialId))
          .limit(1);
        await tx.insert(seriesAccessories).values({
          seriesId: created.id,
          materialId: data.accessoryMaterialId,
          qtyPerPiece:
            data.accessoryQty === null || data.accessoryQty === undefined
              ? null
              : String(data.accessoryQty),
          unit: material?.unit ?? "pcs",
        });
        return;
      }

      const rows = await tx
        .select({ id: bomRows.id })
        .from(bomRows)
        .where(eq(bomRows.productId, data.productId));

      const sourceCells = data.copyFromSeriesId
        ? await tx
            .select({
              id: bomCells.id,
              rowId: bomCells.bomRowId,
              materialId: bomCells.materialId,
              qtyPerPiece: bomCells.qtyPerPiece,
              unit: bomCells.unit,
              unused: bomCells.unused,
            })
            .from(bomCells)
            .where(eq(bomCells.seriesId, data.copyFromSeriesId))
        : [];

      const sourceByRow = new Map(
        sourceCells.map((cell) => [cell.rowId, cell]),
      );

      for (const row of rows) {
        const source = sourceByRow.get(row.id);
        const [newCell] = await tx
          .insert(bomCells)
          .values({
            bomRowId: row.id,
            seriesId: created.id,
            materialId: source?.materialId ?? null,
            qtyPerPiece: source?.qtyPerPiece ?? null,
            unit: source?.unit ?? null,
            unused: source?.unused ?? false,
          })
          .returning({ id: bomCells.id });

        if (source && newCell) {
          const sizeRows = await tx
            .select({
              size: bomCellSizes.size,
              materialId: bomCellSizes.materialId,
              qtyPerPiece: bomCellSizes.qtyPerPiece,
            })
            .from(bomCellSizes)
            .where(eq(bomCellSizes.bomCellId, source.id));
          if (sizeRows.length > 0) {
            await tx.insert(bomCellSizes).values(
              sizeRows.map((size) => ({
                bomCellId: newCell.id,
                size: size.size,
                materialId: size.materialId,
                qtyPerPiece: size.qtyPerPiece,
              })),
            );
          }
        }
      }
    });

    revalidatePath("/bahan");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menambah series. Coba lagi.",
    };
  }
}

export async function toggleSeriesActive(
  seriesId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await db.update(series).set({ active }).where(eq(series.id, seriesId));
    revalidatePath("/bahan");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal mengubah status series." };
  }
}
