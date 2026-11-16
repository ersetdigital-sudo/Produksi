"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  expenseCategories,
  expenseItems,
  expenses,
  materials,
  unitConversions,
  users,
} from "@/db/schema";
import { CURRENT_USER } from "@/features/auth/current-user";
import { appendStockMovement } from "@/features/stock/ledger";
import { convertQuantity } from "@/features/stock/units";
import { expenseSheetSchema } from "./schema";

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

function revalidateFinance() {
  revalidatePath("/pengeluaran");
  revalidatePath("/mutasi");
  revalidatePath("/material");
  revalidatePath("/warna");
  revalidatePath("/mesin");
  revalidatePath("/");
}

export async function recordExpense(input: unknown): Promise<ActionResult> {
  const parsed = expenseSheetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Isian belum lengkap",
    };
  }
  const data = parsed.data;
  const actorId = await getActorId();

  try {
    const [category] = await db
      .select({
        id: expenseCategories.id,
        name: expenseCategories.name,
        isPurchase: expenseCategories.isPurchase,
        requiresMachine: expenseCategories.requiresMachine,
      })
      .from(expenseCategories)
      .where(eq(expenseCategories.id, data.categoryId))
      .limit(1);
    if (!category) return { ok: false, error: "Kategori tidak ditemukan." };

    if (category.requiresMachine && !data.machineId) {
      return { ok: false, error: `Kategori ${category.name} wajib pilih mesin.` };
    }

    const conversions = await db
      .select({
        fromUnit: unitConversions.fromUnit,
        toUnit: unitConversions.toUnit,
        factor: unitConversions.factor,
      })
      .from(unitConversions)
      .where(eq(unitConversions.active, true));

    const converted = conversions.map((item) => ({
      fromUnit: item.fromUnit,
      toUnit: item.toUnit,
      factor: item.factor === null ? null : Number(item.factor),
    }));

    const materialMap = new Map(
      (await db.select().from(materials)).map((material) => [material.id, material]),
    );

    const itemsForInsert: {
      materialId: string;
      qtyPurchase: number;
      purchaseUnit: string;
      conversionFactor: number | null;
      qtyStock: number;
      stockUnit: string;
      unitPrice: number | null;
      amount: number | null;
    }[] = [];

    let totalFromItems = 0;

    for (const line of data.items) {
      const material = materialMap.get(line.materialId);
      if (!material) return { ok: false, error: "Item tidak ditemukan." };

      let qtyStock: number;
      try {
        qtyStock = convertQuantity(
          line.qtyPurchase,
          line.purchaseUnit,
          material.unit,
          converted,
        );
      } catch {
        return {
          ok: false,
          error: `Konversi ${line.purchaseUnit} ke ${material.unit} belum diatur di Pengaturan.`,
        };
      }

      const amount = line.unitPrice === null ? null : line.qtyPurchase * line.unitPrice;
      if (amount !== null) totalFromItems += amount;

      itemsForInsert.push({
        materialId: line.materialId,
        qtyPurchase: line.qtyPurchase,
        purchaseUnit: line.purchaseUnit,
        conversionFactor: line.conversionFactor === null ? null : line.conversionFactor,
        qtyStock,
        stockUnit: material.unit,
        unitPrice: line.unitPrice,
        amount,
      });
    }

    if (category.isPurchase && itemsForInsert.length === 0) {
      return {
        ok: false,
        error:
          "Kategori pembelian belum punya baris barang. Tambahkan minimal satu item.",
      };
    }

    const amount = category.isPurchase ? totalFromItems : data.amount;

    const occurredAt = occurredAtFor(data.date);

    const expenseId = await db.transaction(async (tx) => {
      const expenseRows = await tx
        .insert(expenses)
        .values({
          expenseDate: data.date,
          categoryId: category.id,
          amount: String(amount),
          machineId: data.machineId ?? null,
          description: data.description?.trim() || null,
          receiptPath: data.receiptPath ?? null,
          createdAt: new Date(),
          createdBy: actorId,
        })
        .returning({ id: expenses.id });
      const expenseId = expenseRows[0]?.id;
      if (!expenseId) throw new Error("Gagal membuat pengeluaran");

      if (itemsForInsert.length > 0) {
        await tx.insert(expenseItems).values(
          itemsForInsert.map((item) => ({
            expenseId,
            materialId: item.materialId,
            qtyPurchase: String(item.qtyPurchase),
            purchaseUnit: item.purchaseUnit,
            conversionFactor:
              item.conversionFactor === null ? null : String(item.conversionFactor),
            qtyStock: String(item.qtyStock),
            stockUnit: item.stockUnit,
            unitPrice: item.unitPrice === null ? null : String(item.unitPrice),
            amount: item.amount === null ? null : String(item.amount),
          })),
        );
      }

      for (const item of itemsForInsert) {
        await appendStockMovement(tx, {
          materialId: item.materialId,
          qty: item.qtyStock,
          unit: item.stockUnit,
          kind: "purchase_in",
          referenceType: "expense",
          referenceId: expenseId,
          note: `Pembelian bahan`,
          occurredAt,
          createdBy: actorId,
        });
      }

      return expenseId;
    });
    revalidateFinance();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pengeluaran.",
    };
  }
}

export async function expenseSummary(yearMonth: string): Promise<{
  total: number;
  count: number;
}> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .where(sql`to_char(${expenses.expenseDate}, 'YYYY-MM') = ${yearMonth}`);
  return { total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) };
}