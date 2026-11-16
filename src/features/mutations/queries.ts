import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db/client";
import {
  colors,
  materialStockView,
  materialTypes,
  materials,
  stockMovements,
  unitConversions,
  users,
} from "@/db/schema";
import { getColorCatalog, type ColorCatalogData } from "@/features/colors/queries";
import { toNumber } from "@/lib/format";

export type MovementView = {
  id: string;
  occurredAt: string;
  kind: string;
  qty: number;
  unit: string;
  materialCode: string | null;
  materialName: string | null;
  typeName: string;
  colorName: string | null;
  note: string | null;
  referenceType: string | null;
  userName: string | null;
};

export type MutationSummary = {
  outLast7: number;
  inLast7: number;
  lastOpnameAt: string | null;
  lastOpnameCount: number;
};

export type MutationMaterialOption = {
  id: string;
  code: string | null;
  name: string | null;
  label: string;
  unit: string;
  stock: number;
  min: number;
  typeId: string;
  typeName: string;
};

export type MutationData = {
  movements: MovementView[];
  summary: MutationSummary;
  colors: ColorCatalogData["colors"];
  slots: ColorCatalogData["slots"];
  materials: MutationMaterialOption[];
  types: { id: string; name: string; unit: string }[];
  conversions: { fromUnit: string; toUnit: string; factor: number | null }[];
};

function materialLabel(code: string | null, name: string | null): string {
  if (code && name) return `${code} · ${name}`;
  return code ?? name ?? "Tanpa kode";
}

export async function getMutationData(): Promise<MutationData> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    movementRows,
    outCount,
    inCount,
    lastOpnameRows,
    colorData,
    materialRows,
    conversionRows,
  ] = await Promise.all([
    db
      .select({
        id: stockMovements.id,
        occurredAt: stockMovements.occurredAt,
        kind: stockMovements.kind,
        qty: stockMovements.qty,
        unit: stockMovements.unit,
        note: stockMovements.note,
        referenceType: stockMovements.referenceType,
        colorName: colors.name,
        materialCode: materials.code,
        materialName: materials.name,
        typeName: materialTypes.name,
        userName: users.name,
      })
      .from(stockMovements)
      .innerJoin(materials, eq(stockMovements.materialId, materials.id))
      .innerJoin(materialTypes, eq(materials.materialTypeId, materialTypes.id))
      .leftJoin(colors, eq(stockMovements.colorId, colors.id))
      .leftJoin(users, eq(stockMovements.createdBy, users.id))
      .where(
        or(
          isNull(stockMovements.referenceType),
          notInArray(stockMovements.referenceType, ["seed", "opening"]),
        ),
      )
      .orderBy(desc(stockMovements.occurredAt))
      .limit(120),
    db
      .select({ total: count() })
      .from(stockMovements)
      .where(
        and(
          gte(stockMovements.occurredAt, sevenDaysAgo),
          inArray(stockMovements.kind, [
            "out",
            "production_out",
            "assembly_out",
          ]),
          or(
            isNull(stockMovements.referenceType),
            notInArray(stockMovements.referenceType, ["seed", "opening"]),
          ),
        ),
      ),
    db
      .select({ total: count() })
      .from(stockMovements)
      .where(
        and(
          gte(stockMovements.occurredAt, sevenDaysAgo),
          inArray(stockMovements.kind, ["in", "purchase_in", "production_return"]),
          or(
            isNull(stockMovements.referenceType),
            notInArray(stockMovements.referenceType, ["seed", "opening"]),
          ),
        ),
      ),
    db
      .select({ occurredAt: stockMovements.occurredAt })
      .from(stockMovements)
      .where(eq(stockMovements.kind, "opname"))
      .orderBy(desc(stockMovements.occurredAt))
      .limit(1),
    getColorCatalog(),
    db
      .select({
        id: materials.id,
        code: materials.code,
        name: materials.name,
        unit: materials.unit,
        minStock: materials.minStock,
        typeId: materials.materialTypeId,
        typeName: materialTypes.name,
        typeSort: materialTypes.sortOrder,
        stock: materialStockView.qty,
      })
      .from(materials)
      .innerJoin(materialTypes, eq(materials.materialTypeId, materialTypes.id))
      .leftJoin(materialStockView, eq(materialStockView.materialId, materials.id))
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

  let lastOpnameAt: string | null = null;
  let lastOpnameCount = 0;
  const lastOpname = lastOpnameRows[0];
  if (lastOpname) {
    lastOpnameAt = lastOpname.occurredAt.toISOString();
    const dayStart = new Date(lastOpname.occurredAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const [dayCount] = await db
      .select({ total: count() })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.kind, "opname"),
          gte(stockMovements.occurredAt, dayStart),
          lt(stockMovements.occurredAt, dayEnd),
        ),
      );
    lastOpnameCount = Number(dayCount?.total ?? 0);
  }

  const typeMap = new Map<string, { id: string; name: string; unit: string }>();
  const materialsList: MutationMaterialOption[] = materialRows.map((row) => {
    typeMap.set(row.typeId, {
      id: row.typeId,
      name: row.typeName,
      unit: row.unit,
    });
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      label: materialLabel(row.code, row.name),
      unit: row.unit,
      stock: toNumber(row.stock),
      min: toNumber(row.minStock),
      typeId: row.typeId,
      typeName: row.typeName,
    };
  });

  return {
    movements: movementRows.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      kind: row.kind,
      qty: toNumber(row.qty),
      unit: row.unit,
      materialCode: row.materialCode,
      materialName: row.materialName,
      typeName: row.typeName,
      colorName: row.colorName,
      note: row.note,
      referenceType: row.referenceType,
      userName: row.userName,
    })),
    summary: {
      outLast7: Number(outCount[0]?.total ?? 0),
      inLast7: Number(inCount[0]?.total ?? 0),
      lastOpnameAt,
      lastOpnameCount,
    },
    colors: colorData.colors,
    slots: colorData.slots,
    materials: materialsList,
    types: Array.from(typeMap.values()),
    conversions: conversionRows.map((row) => ({
      fromUnit: row.fromUnit,
      toUnit: row.toUnit,
      factor: row.factor === null ? null : toNumber(row.factor),
    })),
  };
}
