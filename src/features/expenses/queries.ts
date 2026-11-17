import "server-only";

import { asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  expenseCategories,
  expenseItems,
  expenses,
  machines,
  materialStockView,
  materialTypes,
  materials,
  unitConversions,
  users,
} from "@/db/schema";
import { toNumber } from "@/lib/format";
import { signPhotos } from "@/features/photos/storage";

export type ExpenseView = {
  id: string;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  isPurchase: boolean;
  amount: number;
  machineName: string | null;
  description: string | null;
  hasReceipt: boolean;
  receiptUrl: string | null;
  items: {
    materialLabel: string;
    qtyPurchase: number;
    purchaseUnit: string;
    qtyStock: number;
    stockUnit: string;
  }[];
};

export type ExpenseCategoryView = {
  id: string;
  name: string;
  isPurchase: boolean;
  total: number;
  count: number;
};

export type ExpenseSummary = {
  monthTotal: number;
  monthCount: number;
  byCategory: ExpenseCategoryView[];
  prevMonth: string;
  prevMonthTotal: number;
  prevMonthCount: number;
};

export type PurchaseMaterialOption = {
  id: string;
  code: string | null;
  name: string | null;
  label: string;
  unit: string;
  group: string;
};

export type ExpenseLookup = {
  categories: { id: string; name: string; isPurchase: boolean }[];
  machines: { id: string; name: string }[];
  materials: PurchaseMaterialOption[];
  conversions: { fromUnit: string; toUnit: string; factor: number | null }[];
  currentMonth: string;
};

function materialLabel(code: string | null, name: string | null): string {
  if (code && name) return `${code} · ${name}`;
  return code ?? name ?? "Tanpa kode";
}

export async function getExpenseLookup(): Promise<ExpenseLookup> {
  const [categories, machinesRows, materialRows, conversionRows] =
    await Promise.all([
      db
        .select({
          id: expenseCategories.id,
          name: expenseCategories.name,
          isPurchase: expenseCategories.isPurchase,
        })
        .from(expenseCategories)
        .where(eq(expenseCategories.active, true))
        .orderBy(asc(expenseCategories.sortOrder)),
      db.select({ id: machines.id, name: machines.name }).from(machines),
      db
        .select({
          id: materials.id,
          code: materials.code,
          name: materials.name,
          unit: materials.unit,
          group: materialTypes.group,
        })
        .from(materials)
        .innerJoin(materialTypes, eq(materials.materialTypeId, materialTypes.id))
        .where(eq(materials.active, true))
        .orderBy(materialTypes.sortOrder, materials.sortOrder),
      db
        .select({
          fromUnit: unitConversions.fromUnit,
          toUnit: unitConversions.toUnit,
          factor: unitConversions.factor,
        })
        .from(unitConversions)
        .where(eq(unitConversions.active, true)),
    ]);

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return {
    categories: categories.map((item) => ({
      id: item.id,
      name: item.name,
      isPurchase: item.isPurchase,
    })),
    machines: machinesRows.map((item) => ({ id: item.id, name: item.name })),
    materials: materialRows.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      label: materialLabel(item.code, item.name),
      unit: item.unit,
      group: item.group,
    })),
    conversions: conversionRows.map((item) => ({
      fromUnit: item.fromUnit,
      toUnit: item.toUnit,
      factor: item.factor === null ? null : toNumber(item.factor),
    })),
    currentMonth: `${now.getFullYear()}-${month}`,
  };
}

export async function getExpensePage(
  yearMonth: string,
): Promise<{ expenses: ExpenseView[]; summary: ExpenseSummary }> {
  const [y, m] = yearMonth.split("-").map(Number);
  const prevDate = new Date(y, (m ?? 1) - 2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const [categoryRows, expenseRows, itemRows, prevRows] = await Promise.all([
    db.select().from(expenseCategories).orderBy(asc(expenseCategories.sortOrder)),
    db
      .select({
        id: expenses.id,
        expenseDate: expenses.expenseDate,
        categoryId: expenses.categoryId,
        amount: expenses.amount,
        description: expenses.description,
        machineId: expenses.machineId,
        machineName: machines.name,
        categoryName: expenseCategories.name,
        isPurchase: expenseCategories.isPurchase,
        hasReceipt: sql<boolean>`${expenses.receiptPath} is not null`,
        receiptPath: expenses.receiptPath,
        userName: users.name,
      })
      .from(expenses)
      .innerJoin(
        expenseCategories,
        eq(expenses.categoryId, expenseCategories.id),
      )
      .leftJoin(machines, eq(expenses.machineId, machines.id))
      .leftJoin(users, eq(expenses.createdBy, users.id))
      .where(sql`to_char(${expenses.expenseDate}, 'YYYY-MM') = ${yearMonth}`)
      .orderBy(desc(expenses.expenseDate)),
    db
      .select({
        expenseId: expenseItems.expenseId,
        qtyPurchase: expenseItems.qtyPurchase,
        purchaseUnit: expenseItems.purchaseUnit,
        qtyStock: expenseItems.qtyStock,
        stockUnit: expenseItems.stockUnit,
        materialCode: materials.code,
        materialName: materials.name,
      })
      .from(expenseItems)
      .innerJoin(materials, eq(expenseItems.materialId, materials.id)),
    db
      .select({
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        cnt: count(),
      })
      .from(expenses)
      .where(sql`to_char(${expenses.expenseDate}, 'YYYY-MM') = ${prevMonth}`),
  ]);

  const itemsByExpense = new Map<string, ExpenseView["items"]>();
  for (const item of itemRows) {
    const list = itemsByExpense.get(item.expenseId) ?? [];
    list.push({
      materialLabel: materialLabel(item.materialCode, item.materialName),
      qtyPurchase: toNumber(item.qtyPurchase),
      purchaseUnit: item.purchaseUnit,
      qtyStock: toNumber(item.qtyStock),
      stockUnit: item.stockUnit,
    });
    itemsByExpense.set(item.expenseId, list);
  }

  const receiptUrls = await signPhotos(
    expenseRows
      .map((row) => row.receiptPath)
      .filter((path): path is string => Boolean(path)),
  );

  const expensesView: ExpenseView[] = expenseRows.map((row) => ({
    id: row.id,
    expenseDate: row.expenseDate,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    isPurchase: row.isPurchase,
    amount: toNumber(row.amount),
    machineName: row.machineName,
    description: row.description,
    hasReceipt: Boolean(row.hasReceipt),
    receiptUrl: row.receiptPath ? receiptUrls.get(row.receiptPath) ?? null : null,
    items: itemsByExpense.get(row.id) ?? [],
  }));

  const monthTotal = expensesView.reduce((sum, item) => sum + item.amount, 0);
  const byCategory: ExpenseCategoryView[] = categoryRows.map((category) => {
    const inMonth = expensesView.filter(
      (item) => item.categoryId === category.id,
    );
    return {
      id: category.id,
      name: category.name,
      isPurchase: category.isPurchase,
      total: inMonth.reduce((sum, item) => sum + item.amount, 0),
      count: inMonth.length,
    };
  });

  const prev = prevRows[0];
  return {
    expenses: expensesView,
    summary: {
      monthTotal,
      monthCount: expensesView.length,
      byCategory,
      prevMonth,
      prevMonthTotal: toNumber(prev?.total),
      prevMonthCount: Number(prev?.cnt ?? 0),
    },
  };
}

export async function listExpenseMonths(): Promise<string[]> {
  const rows = await db
    .select({
      yearMonth: sql<string>`to_char(${expenses.expenseDate}, 'YYYY-MM')`,
    })
    .from(expenses)
    .groupBy(sql`to_char(${expenses.expenseDate}, 'YYYY-MM')`)
    .orderBy(desc(sql`to_char(${expenses.expenseDate}, 'YYYY-MM')`));
  return rows.map((row) => row.yearMonth);
}

export async function countExpenseCategories(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(expenseCategories)
    .where(eq(expenseCategories.active, true));
  return Number(row?.total ?? 0);
}