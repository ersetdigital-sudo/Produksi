import "server-only";

import { asc, count, eq, isNotNull } from "drizzle-orm";
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
import { toNumber } from "@/lib/format";

export type SettingsSlot = {
  id: string;
  name: string;
  materialTypeId: string;
  materialTypeName: string;
  sortOrder: number;
  pairingCount: number;
  bomCount: number;
};

export type SettingsType = {
  id: string;
  name: string;
  group: string;
  unit: string;
  defaultMin: number;
  sortOrder: number;
  materialCount: number;
  slotCount: number;
};

export type SettingsConversion = {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: number | null;
  scope: string;
  active: boolean;
};

export type SettingsCategory = {
  id: string;
  name: string;
  requiresMachine: boolean;
  isPurchase: boolean;
  sortOrder: number;
  expenseCount: number;
};

export type SettingsData = {
  slots: SettingsSlot[];
  types: SettingsType[];
  conversions: SettingsConversion[];
  categories: SettingsCategory[];
};

export async function getSettingsData(): Promise<SettingsData> {
  const [
    slotRows,
    typeRows,
    conversionRows,
    categoryRows,
    slotPairingCounts,
    slotBomCounts,
    typeMaterialCounts,
    typeSlotCounts,
    categoryExpenseCounts,
  ] = await Promise.all([
    db
      .select({
        id: pairingSlots.id,
        name: pairingSlots.name,
        materialTypeId: pairingSlots.materialTypeId,
        materialTypeName: materialTypes.name,
        sortOrder: pairingSlots.sortOrder,
      })
      .from(pairingSlots)
      .innerJoin(materialTypes, eq(pairingSlots.materialTypeId, materialTypes.id))
      .where(eq(pairingSlots.active, true))
      .orderBy(asc(pairingSlots.sortOrder), asc(pairingSlots.name)),
    db
      .select({
        id: materialTypes.id,
        name: materialTypes.name,
        group: materialTypes.group,
        unit: materialTypes.unit,
        defaultMin: materialTypes.defaultMin,
        sortOrder: materialTypes.sortOrder,
      })
      .from(materialTypes)
      .where(eq(materialTypes.active, true))
      .orderBy(asc(materialTypes.sortOrder), asc(materialTypes.name)),
    db
      .select({
        id: unitConversions.id,
        fromUnit: unitConversions.fromUnit,
        toUnit: unitConversions.toUnit,
        factor: unitConversions.factor,
        scope: unitConversions.scope,
        active: unitConversions.active,
      })
      .from(unitConversions)
      .orderBy(asc(unitConversions.scope), asc(unitConversions.fromUnit)),
    db
      .select({
        id: expenseCategories.id,
        name: expenseCategories.name,
        requiresMachine: expenseCategories.requiresMachine,
        isPurchase: expenseCategories.isPurchase,
        sortOrder: expenseCategories.sortOrder,
      })
      .from(expenseCategories)
      .where(eq(expenseCategories.active, true))
      .orderBy(asc(expenseCategories.sortOrder), asc(expenseCategories.name)),
    db
      .select({ slotId: colorPairings.slotId, total: count() })
      .from(colorPairings)
      .groupBy(colorPairings.slotId),
    db
      .select({ slotId: bomRows.pairingSlotId, total: count() })
      .from(bomRows)
      .where(isNotNull(bomRows.pairingSlotId))
      .groupBy(bomRows.pairingSlotId),
    db
      .select({ typeId: materials.materialTypeId, total: count() })
      .from(materials)
      .groupBy(materials.materialTypeId),
    db
      .select({ typeId: pairingSlots.materialTypeId, total: count() })
      .from(pairingSlots)
      .groupBy(pairingSlots.materialTypeId),
    db
      .select({ categoryId: expenses.categoryId, total: count() })
      .from(expenses)
      .groupBy(expenses.categoryId),
  ]);

  const slotPairingMap = new Map(
    slotPairingCounts.map((row) => [row.slotId, Number(row.total)]),
  );
  const slotBomMap = new Map(
    slotBomCounts.map((row) => [row.slotId ?? "", Number(row.total)]),
  );
  const typeMaterialMap = new Map(
    typeMaterialCounts.map((row) => [row.typeId, Number(row.total)]),
  );
  const typeSlotMap = new Map(
    typeSlotCounts.map((row) => [row.typeId, Number(row.total)]),
  );
  const categoryExpenseMap = new Map(
    categoryExpenseCounts.map((row) => [row.categoryId, Number(row.total)]),
  );

  return {
    slots: slotRows.map((row) => ({
      id: row.id,
      name: row.name,
      materialTypeId: row.materialTypeId,
      materialTypeName: row.materialTypeName,
      sortOrder: row.sortOrder,
      pairingCount: slotPairingMap.get(row.id) ?? 0,
      bomCount: slotBomMap.get(row.id) ?? 0,
    })),
    types: typeRows.map((row) => ({
      id: row.id,
      name: row.name,
      group: row.group,
      unit: row.unit,
      defaultMin: toNumber(row.defaultMin),
      sortOrder: row.sortOrder,
      materialCount: typeMaterialMap.get(row.id) ?? 0,
      slotCount: typeSlotMap.get(row.id) ?? 0,
    })),
    conversions: conversionRows.map((row) => ({
      id: row.id,
      fromUnit: row.fromUnit,
      toUnit: row.toUnit,
      factor: row.factor === null ? null : toNumber(row.factor),
      scope: row.scope,
      active: row.active,
    })),
    categories: categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      requiresMachine: row.requiresMachine,
      isPurchase: row.isPurchase,
      sortOrder: row.sortOrder,
      expenseCount: categoryExpenseMap.get(row.id) ?? 0,
    })),
  };
}
