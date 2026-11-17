"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  colorPairings,
  colorProducts,
  colors,
} from "@/db/schema";
import { colorInputSchema } from "./schema";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveColor(input: unknown): Promise<ActionResult> {
  const parsed = colorInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }

  const data = parsed.data;

  try {
    await db.transaction(async (tx) => {
      let colorId = data.id;

      if (colorId) {
        await tx
          .update(colors)
          .set({
            name: data.name,
            fabricTypeId: data.fabricTypeId,
            colorCode: data.colorCode,
            hex: data.hex,
          })
          .where(eq(colors.id, colorId));
      } else {
        const [row] = await tx
          .insert(colors)
          .values({
            name: data.name,
            fabricTypeId: data.fabricTypeId,
            colorCode: data.colorCode,
            hex: data.hex,
          })
          .returning({ id: colors.id });
        if (!row) throw new Error("Gagal membuat warna");
        colorId = row.id;
      }

      await tx.delete(colorProducts).where(eq(colorProducts.colorId, colorId));
      if (data.productIds.length > 0) {
        await tx.insert(colorProducts).values(
          data.productIds.map((productId) => ({
            colorId,
            productId,
          })),
        );
      }

      await tx.delete(colorPairings).where(eq(colorPairings.colorId, colorId));
      const pairings = data.pairings.filter(
        (pairing) => pairing.primaryMaterialId,
      );
      if (pairings.length > 0) {
        await tx.insert(colorPairings).values(
          pairings.map((pairing) => ({
            colorId,
            slotId: pairing.slotId,
            primaryMaterialId: pairing.primaryMaterialId,
            backupMaterialId: pairing.backupMaterialId,
          })),
        );
      }
    });

    revalidatePath("/warna");
    revalidatePath("/material");
    revalidatePath("/bahan");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan warna. Coba lagi." };
  }
}
