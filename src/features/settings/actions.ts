"use server";

import { count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  bomRows,
  colorPairings,
  expenseCategories,
  expenses,
  materialTypes,
  materials,
  pairingSlots,
  unitConversions,
} from "@/db/schema";
import {
  conversionInputSchema,
  expenseCategoryInputSchema,
  materialTypeInputSchema,
  slotInputSchema,
} from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateSettings() {
  revalidatePath("/pengaturan");
  revalidatePath("/material");
  revalidatePath("/warna");
  revalidatePath("/bahan");
  revalidatePath("/pengeluaran");
  revalidatePath("/mutasi");
}

export async function saveSlot(input: unknown): Promise<ActionResult> {
  const parsed = slotInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian belum lengkap" };
  }
  const data = parsed.data;

  try {
    if (data.id) {
      const [existing] = await db
        .select({
          materialTypeId: pairingSlots.materialTypeId,
        })
        .from(pairingSlots)
        .where(eq(pairingSlots.id, data.id))
        .limit(1);
      if (!existing) return { ok: false, error: "Slot tidak ditemukan." };

      if (existing.materialTypeId !== data.materialTypeId) {
        const [pairingCount] = await db
          .select({ total: count() })
          .from(colorPairings)
          .where(eq(colorPairings.slotId, data.id));
        if (Number(pairingCount?.total ?? 0) > 0) {
          return {
            ok: false,
            error:
              "Slot ini sudah punya kode pasangan. Kosongkan pasangan di Katalog Warna dulu sebelum mengganti jenis material.",
          };
        }
      }

      await db
        .update(pairingSlots)
        .set({ name: data.name, materialTypeId: data.materialTypeId })
        .where(eq(pairingSlots.id, data.id));
    } else {
      const [max] = await db
        .select({ value: sql<number>`coalesce(max(${pairingSlots.sortOrder}), 0)` })
        .from(pairingSlots);
      await db.insert(pairingSlots).values({
        name: data.name,
        materialTypeId: data.materialTypeId,
        sortOrder: Number(max?.value ?? 0) + 1,
      });
    }
    revalidateSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan slot. Coba lagi." };
  }
}

export async function deleteSlot(id: string): Promise<ActionResult> {
  try {
    const [usage] = await db
      .select({ total: count() })
      .from(bomRows)
      .where(eq(bomRows.pairingSlotId, id));
    if (Number(usage?.total ?? 0) > 0) {
      return {
        ok: false,
        error:
          "Slot ini masih dipakai di Bahan per Pcs. Hapus atau ubah barisnya dulu.",
      };
    }
    await db.delete(pairingSlots).where(eq(pairingSlots.id, id));
    revalidateSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus slot. Coba lagi." };
  }
}

export async function saveMaterialType(input: unknown): Promise<ActionResult> {
  const parsed = materialTypeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian belum lengkap" };
  }
  const data = parsed.data;

  try {
    if (data.id) {
      const [existing] = await db
        .select({ unit: materialTypes.unit })
        .from(materialTypes)
        .where(eq(materialTypes.id, data.id))
        .limit(1);
      if (!existing) return { ok: false, error: "Jenis material tidak ditemukan." };

      if (existing.unit !== data.unit) {
        const [materialCount] = await db
          .select({ total: count() })
          .from(materials)
          .where(eq(materials.materialTypeId, data.id));
        if (Number(materialCount?.total ?? 0) > 0) {
          return {
            ok: false,
            error:
              "Satuan tidak bisa diubah karena jenis ini sudah punya kode material.",
          };
        }
      }

      await db
        .update(materialTypes)
        .set({
          name: data.name,
          unit: data.unit,
          defaultMin: String(data.defaultMin),
        })
        .where(eq(materialTypes.id, data.id));
    } else {
      const [max] = await db
        .select({ value: sql<number>`coalesce(max(${materialTypes.sortOrder}), 0)` })
        .from(materialTypes);
      await db.insert(materialTypes).values({
        name: data.name,
        group: "warna",
        unit: data.unit,
        defaultMin: String(data.defaultMin),
        sortOrder: Number(max?.value ?? 0) + 1,
      });
    }
    revalidateSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan jenis material. Coba lagi." };
  }
}

export async function deleteMaterialType(id: string): Promise<ActionResult> {
  try {
    const [materialCount] = await db
      .select({ total: count() })
      .from(materials)
      .where(eq(materials.materialTypeId, id));
    if (Number(materialCount?.total ?? 0) > 0) {
      return {
        ok: false,
        error: `Jenis ini masih punya ${materialCount?.total} kode di Stok Material. Hapus atau pindahkan kode-kodenya dulu.`,
      };
    }

    const [slotCount] = await db
      .select({ total: count() })
      .from(pairingSlots)
      .where(eq(pairingSlots.materialTypeId, id));
    if (Number(slotCount?.total ?? 0) > 0) {
      return {
        ok: false,
        error:
          "Slot pasangan masih mengambil kode dari jenis ini. Hapus atau ubah slotnya dulu.",
      };
    }

    await db.delete(materialTypes).where(eq(materialTypes.id, id));
    revalidateSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus jenis material. Coba lagi." };
  }
}

export async function saveConversion(input: unknown): Promise<ActionResult> {
  const parsed = conversionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian belum lengkap" };
  }
  const data = parsed.data;

  try {
    if (data.id) {
      await db
        .update(unitConversions)
        .set({
          fromUnit: data.fromUnit,
          toUnit: data.toUnit,
          factor: data.factor === null ? null : String(data.factor),
          scope: data.scope,
        })
        .where(eq(unitConversions.id, data.id));
    } else {
      await db.insert(unitConversions).values({
        fromUnit: data.fromUnit,
        toUnit: data.toUnit,
        factor: data.factor === null ? null : String(data.factor),
        scope: data.scope,
      });
    }
    revalidateSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan konversi. Coba lagi." };
  }
}

export async function deleteConversion(id: string): Promise<ActionResult> {
  try {
    await db.delete(unitConversions).where(eq(unitConversions.id, id));
    revalidateSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus konversi. Coba lagi." };
  }
}

export async function saveExpenseCategory(input: unknown): Promise<ActionResult> {
  const parsed = expenseCategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Isian belum lengkap" };
  }
  const data = parsed.data;

  try {
    if (data.id) {
      await db
        .update(expenseCategories)
        .set({
          name: data.name,
          requiresMachine: data.requiresMachine,
        })
        .where(eq(expenseCategories.id, data.id));
    } else {
      const [max] = await db
        .select({ value: sql<number>`coalesce(max(${expenseCategories.sortOrder}), 0)` })
        .from(expenseCategories);
      await db.insert(expenseCategories).values({
        name: data.name,
        requiresMachine: data.requiresMachine,
        isPurchase: false,
        sortOrder: Number(max?.value ?? 0) + 1,
      });
    }
    revalidateSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan kategori. Nama mungkin sudah dipakai." };
  }
}

export async function deleteExpenseCategory(id: string): Promise<ActionResult> {
  try {
    const [usage] = await db
      .select({ total: count() })
      .from(expenses)
      .where(eq(expenses.categoryId, id));
    if (Number(usage?.total ?? 0) > 0) {
      return {
        ok: false,
        error:
          "Kategori ini masih dipakai di catatan Pengeluaran. Riwayatnya harus tetap tersimpan.",
      };
    }
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
    revalidateSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus kategori. Coba lagi." };
  }
}
