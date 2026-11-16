"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  materialStockView,
  materials,
  unitConversions,
  users,
} from "@/db/schema";
import { CURRENT_USER } from "@/features/auth/current-user";
import { appendStockMovement } from "@/features/stock/ledger";
import { opnameNote } from "@/features/stock/opname";
import { convertQuantity } from "@/features/stock/units";
import { toNumber } from "@/lib/format";
import {
  manualInSchema,
  manualOutSchema,
  opnameSchema,
} from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

function occurredAtFor(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const now = new Date();
  return new Date(
    year,
    (month ?? 1) - 1,
    day ?? 1,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  );
}

async function getActorId(): Promise<string | null> {
  const [actor] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.name, CURRENT_USER.name))
    .limit(1);
  return actor?.id ?? null;
}

function revalidateStock() {
  revalidatePath("/mutasi");
  revalidatePath("/material");
  revalidatePath("/warna");
  revalidatePath("/bahan");
  revalidatePath("/");
}

export async function recordManualOut(input: unknown): Promise<ActionResult> {
  const parsed = manualOutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }
  const data = parsed.data;
  const actorId = await getActorId();

  try {
    await db.transaction(async (tx) => {
      for (const item of data.items) {
        const [material] = await tx
          .select({ unit: materials.unit })
          .from(materials)
          .where(eq(materials.id, item.materialId))
          .limit(1);
        if (!material) throw new Error("Material tidak ditemukan");

        await appendStockMovement(tx, {
          materialId: item.materialId,
          qty: -item.qty,
          unit: material.unit,
          kind: "out",
          referenceType: "manual",
          colorId: item.colorId ?? null,
          note:
            data.note ||
            (item.usedBackup
              ? "Keluar manual · pakai cadangan"
              : "Keluar manual"),
          occurredAt: occurredAtFor(data.date),
          createdBy: actorId,
        });
      }
    });
    revalidateStock();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan barang keluar.",
    };
  }
}

export async function recordManualIn(input: unknown): Promise<ActionResult> {
  const parsed = manualInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }
  const data = parsed.data;
  const actorId = await getActorId();

  try {
    const [material] = await db
      .select({ unit: materials.unit })
      .from(materials)
      .where(eq(materials.id, data.materialId))
      .limit(1);
    if (!material) return { ok: false, error: "Material tidak ditemukan." };

    const conversions = await db
      .select({
        fromUnit: unitConversions.fromUnit,
        toUnit: unitConversions.toUnit,
        factor: unitConversions.factor,
      })
      .from(unitConversions)
      .where(eq(unitConversions.active, true));

    let qtyStock: number;
    try {
      qtyStock = convertQuantity(
        data.qty,
        data.unit,
        material.unit,
        conversions.map((item) => ({
          fromUnit: item.fromUnit,
          toUnit: item.toUnit,
          factor: item.factor === null ? null : toNumber(item.factor),
        })),
      );
    } catch {
      return {
        ok: false,
        error: `Konversi ${data.unit} ke ${material.unit} belum diatur di Pengaturan.`,
      };
    }

    await db.transaction(async (tx) => {
      await appendStockMovement(tx, {
        materialId: data.materialId,
        qty: qtyStock,
        unit: material.unit,
        kind: "in",
        referenceType: "manual",
        note: data.note || "Masuk manual",
        occurredAt: occurredAtFor(data.date),
        createdBy: actorId,
      });
    });
    revalidateStock();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan barang masuk." };
  }
}

export async function recordOpname(input: unknown): Promise<ActionResult> {
  const parsed = opnameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }
  const data = parsed.data;
  const actorId = await getActorId();

  try {
    const [material] = await db
      .select({ unit: materials.unit })
      .from(materials)
      .where(eq(materials.id, data.materialId))
      .limit(1);
    if (!material) return { ok: false, error: "Material tidak ditemukan." };

    const [stock] = await db
      .select({ qty: materialStockView.qty })
      .from(materialStockView)
      .where(eq(materialStockView.materialId, data.materialId))
      .limit(1);

    const recordedQty = toNumber(stock?.qty);
    const delta = data.countedQty - recordedQty;
    if (delta === 0) return { ok: true };

    await db.transaction(async (tx) => {
      await appendStockMovement(tx, {
        materialId: data.materialId,
        qty: delta,
        unit: material.unit,
        kind: "opname",
        referenceType: "opname",
        note: opnameNote(data.countedQty, recordedQty, data.reason),
        occurredAt: occurredAtFor(data.date),
        createdBy: actorId,
      });
    });
    revalidateStock();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan opname." };
  }
}
