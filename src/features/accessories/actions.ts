"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  accessoryAssemblies,
  accessoryAssemblyItems,
  finishedGoodsMovements,
  materialStockView,
  materials,
  series,
  seriesAccessories,
  users,
} from "@/db/schema";
import { CURRENT_USER } from "@/features/auth/current-user";
import { computeAssemblyDeltas } from "@/features/stock/assembly";
import { recordAssembly } from "@/features/stock/ledger";
import { assemblySchema } from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateAccessories() {
  revalidatePath("/aksesoris");
  revalidatePath("/mutasi");
  revalidatePath("/material");
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

export async function recordAssemblyAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = assemblySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }
  const data = parsed.data;

  try {
    // Validate child is turunan and parent matches, and accessories defined.
    const [childRows, parentRows] = await Promise.all([
      db
        .select({ id: series.id, kind: series.kind, name: series.name })
        .from(series)
        .where(eq(series.id, data.childSeriesId))
        .limit(1),
      db
        .select({ id: series.id, name: series.name })
        .from(series)
        .where(eq(series.id, data.parentSeriesId))
        .limit(1),
    ]);
    const child = childRows[0];
    const parent = parentRows[0];
    if (!child || child.kind !== "turunan") {
      return { ok: false, error: "Series ini bukan series turunan." };
    }
    if (!parent) return { ok: false, error: "Series induk tidak ditemukan." };

    const accessoryRows = await db
      .select({
        materialId: seriesAccessories.materialId,
        qtyPerPiece: seriesAccessories.qtyPerPiece,
        unit: seriesAccessories.unit,
      })
      .from(seriesAccessories)
      .where(eq(seriesAccessories.seriesId, child.id));

    let deltas;
    try {
      deltas = computeAssemblyDeltas({
        qty: data.qty,
        parentSeriesId: data.parentSeriesId,
        childSeriesId: data.childSeriesId,
        colorId: data.colorId,
        size: data.size,
        accessories: accessoryRows.map((a) => ({
          materialId: a.materialId,
          qtyPerPiece: a.qtyPerPiece === null ? null : Number(a.qtyPerPiece),
          unit: a.unit,
        })),
      });
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message.replace("_", " ")
            : "Isian aksesoris belum lengkap.",
      };
    }

    const actorId = await currentActorId();
    const occurredAt = (() => {
      const [y, m, d] = data.date.split("-").map(Number);
      const now = new Date();
      return new Date(y, (m ?? 1) - 1, d ?? 1, now.getHours(), now.getMinutes(), now.getSeconds());
    })();

    const assemblyId = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(accessoryAssemblies)
        .values({
          assembledAt: data.date,
          childSeriesId: data.childSeriesId,
          parentSeriesId: data.parentSeriesId,
          colorId: data.colorId,
          size: data.size,
          qty: data.qty,
          orderNo: data.orderNo?.trim() || null,
          note: data.note?.trim() || null,
          createdBy: actorId,
        })
        .returning({ id: accessoryAssemblies.id });
      const id = rows[0]?.id;
      if (!id) throw new Error("Gagal membuat catatan aksesoris");

      for (const item of deltas.materials) {
        await tx.insert(accessoryAssemblyItems).values({
          assemblyId: id,
          materialId: item.materialId,
          qty: String(item.qty),
          unit: item.unit,
        });
      }

      await recordAssembly(tx, {
        assemblyId: id,
        deltas,
        actorId,
        occurredAt,
        note: `Pasang aksesoris ${child.name} · ${parent.name}`,
      });

      return id;
    });
    void assemblyId;

    revalidateAccessories();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mencatat pasang aksesoris.",
    };
  }
}