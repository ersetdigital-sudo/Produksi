"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  materialTypes,
  materials,
  stockMovements,
  users,
} from "@/db/schema";
import { toNumber } from "@/lib/format";
import { materialInputSchema } from "./schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createMaterial(input: unknown): Promise<ActionResult> {
  const parsed = materialInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }

  const data = parsed.data;
  const code = data.code?.trim() || null;
  const name = data.name?.trim() || null;

  try {
    await db.transaction(async (tx) => {
      const [type] = await tx
        .select({
          id: materialTypes.id,
          name: materialTypes.name,
          unit: materialTypes.unit,
          defaultMin: materialTypes.defaultMin,
        })
        .from(materialTypes)
        .where(eq(materialTypes.id, data.materialTypeId))
        .limit(1);

      if (!type) {
        throw new Error("Jenis material tidak ditemukan");
      }

      if (code) {
        const [existing] = await tx
          .select({ id: materials.id })
          .from(materials)
          .where(
            and(
              eq(materials.materialTypeId, data.materialTypeId),
              eq(materials.code, code),
            ),
          )
          .limit(1);
        if (existing) {
          throw new Error(`Kode ${code} sudah ada di jenis ${type.name}`);
        }
      }

      const [actor] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.name, "Lea"))
        .limit(1);

      const minStock =
        data.minStock !== undefined
          ? data.minStock
          : toNumber(type.defaultMin);

      const [material] = await tx
        .insert(materials)
        .values({
          materialTypeId: data.materialTypeId,
          code,
          name,
          unit: type.unit,
          minStock: String(minStock),
        })
        .returning({ id: materials.id });

      if (!material) {
        throw new Error("Gagal membuat material");
      }

      const initialStock = data.initialStock ?? 0;
      if (initialStock > 0) {
        await tx.insert(stockMovements).values({
          materialId: material.id,
          qty: String(initialStock),
          unit: type.unit,
          kind: "in",
          referenceType: "opening",
          note: "Stok awal",
          createdBy: actor?.id ?? null,
        });
      }
    });

    revalidatePath("/material");
    revalidatePath("/warna");
    revalidatePath("/bahan");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan material. Coba lagi.",
    };
  }
}
