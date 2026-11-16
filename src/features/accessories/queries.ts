import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  accessoryAssemblies,
  accessoryAssemblyItems,
  colors,
  finishedGoodsMovements,
  materialStockView,
  materials,
  series,
  seriesAccessories,
  sizes,
} from "@/db/schema";
import { toNumber } from "@/lib/format";

export type AccessorySeries = {
  id: string;
  name: string;
  parentSeriesId: string | null;
  parentName: string | null;
  kind: "diproduksi" | "turunan";
  accessoryLabel: string | null;
  accessoryQty: number | null;
  accessoryUnit: string | null;
  accessoryMaterialId: string | null;
};

export type AccessoryColor = { id: string; name: string; colorCode: string };

export type AccessoryMaterial = {
  id: string;
  code: string | null;
  name: string | null;
  label: string;
  unit: string;
  stock: number;
};

export type AccessoryHistoryItem = {
  id: string;
  assembledAt: string;
  childName: string;
  parentName: string;
  colorName: string;
  size: string;
  qty: number;
  orderNo: string | null;
  materials: { label: string; qty: number; unit: string }[];
};

export type FinishedGoodsKey = {
  seriesId: string;
  colorId: string;
  size: string;
  qty: number;
  seriesName: string;
};

export type AccessoriesData = {
  turunan: AccessorySeries[];
  colors: AccessoryColor[];
  sizes: string[];
  accessories: AccessoryMaterial[];
  history: AccessoryHistoryItem[];
  rack: FinishedGoodsKey[];
};

function materialLabel(code: string | null, name: string | null): string {
  if (code && name) return `${code} · ${name}`;
  return code ?? name ?? "Tanpa kode";
}

export async function getAccessoriesData(): Promise<AccessoriesData> {
  const [seriesRows, accessoryRows, histRows, itemRows, colorRows, sizeRows, rackRows] =
    await Promise.all([
      db
        .select({
          id: series.id,
          name: series.name,
          parentSeriesId: series.parentSeriesId,
          kind: series.kind,
        })
        .from(series)
        .where(eq(series.kind, "turunan"))
        .orderBy(asc(series.sortOrder), asc(series.name)),
      db
        .select({
          seriesId: seriesAccessories.seriesId,
          materialId: seriesAccessories.materialId,
          code: materials.code,
          name: materials.name,
          unit: seriesAccessories.unit,
          qtyPerPiece: seriesAccessories.qtyPerPiece,
        })
        .from(seriesAccessories)
        .innerJoin(materials, eq(seriesAccessories.materialId, materials.id)),
      db
        .select({
          id: accessoryAssemblies.id,
          assembledAt: accessoryAssemblies.assembledAt,
          childSeriesId: accessoryAssemblies.childSeriesId,
          parentSeriesId: accessoryAssemblies.parentSeriesId,
          colorId: accessoryAssemblies.colorId,
          size: accessoryAssemblies.size,
          qty: accessoryAssemblies.qty,
          orderNo: accessoryAssemblies.orderNo,
        })
        .from(accessoryAssemblies)
        .orderBy(desc(accessoryAssemblies.assembledAt))
        .limit(60),
      db
        .select({
          assemblyId: accessoryAssemblyItems.assemblyId,
          code: materials.code,
          name: materials.name,
          qty: accessoryAssemblyItems.qty,
          unit: accessoryAssemblyItems.unit,
        })
        .from(accessoryAssemblyItems)
        .innerJoin(materials, eq(accessoryAssemblyItems.materialId, materials.id)),
      db
        .select({
          id: colors.id,
          name: colors.name,
          colorCode: colors.colorCode,
        })
        .from(colors)
        .orderBy(asc(colors.sortOrder)),
      db
        .select({ label: sizes.label })
        .from(sizes)
        .where(eq(sizes.active, true))
        .orderBy(asc(sizes.sortOrder)),
      db
        .select({
          seriesId: finishedGoodsMovements.seriesId,
          colorId: finishedGoodsMovements.colorId,
          size: finishedGoodsMovements.size,
          qty: finishedGoodsMovements.qty,
          seriesName: series.name,
        })
        .from(finishedGoodsMovements)
        .innerJoin(series, eq(finishedGoodsMovements.seriesId, series.id)),
    ]);

  const accessoryBySeries = new Map<string, Omit<AccessorySeries, "id" | "name" | "parentSeriesId" | "parentName" | "kind">>();
  for (const row of accessoryRows) {
    accessoryBySeries.set(row.seriesId, {
      accessoryLabel: materialLabel(row.code, row.name),
      accessoryQty: row.qtyPerPiece === null ? null : toNumber(row.qtyPerPiece),
      accessoryUnit: row.unit,
      accessoryMaterialId: row.materialId,
    });
  }

  const seriesNameById = new Map(
    seriesRows.map((s) => [s.id, s.name]),
  );

  const turunan: AccessorySeries[] = seriesRows.map((s) => ({
    id: s.id,
    name: s.name,
    parentSeriesId: s.parentSeriesId,
    parentName: s.parentSeriesId ? seriesNameById.get(s.parentSeriesId) ?? null : null,
    kind: s.kind,
    ...(accessoryBySeries.get(s.id) ?? {
      accessoryLabel: null,
      accessoryQty: null,
      accessoryUnit: null,
      accessoryMaterialId: null,
    }),
  }));

  const itemByAssembly = new Map<string, AccessoryHistoryItem["materials"]>();
  for (const row of itemRows) {
    const list = itemByAssembly.get(row.assemblyId) ?? [];
    list.push({
      label: materialLabel(row.code, row.name),
      qty: toNumber(row.qty),
      unit: row.unit,
    });
    itemByAssembly.set(row.assemblyId, list);
  }

  const colorNameById = new Map(colorRows.map((c) => [c.id, c.name]));

  const history: AccessoryHistoryItem[] = histRows.map((h) => ({
    id: h.id,
    assembledAt: h.assembledAt,
    childName: seriesNameById.get(h.childSeriesId) ?? "",
    parentName: seriesNameById.get(h.parentSeriesId) ?? "",
    colorName: colorNameById.get(h.colorId) ?? "",
    size: h.size,
    qty: h.qty,
    orderNo: h.orderNo,
    materials: itemByAssembly.get(h.id) ?? [],
  }));

  const rackMap = new Map<string, FinishedGoodsKey>();
  for (const row of rackRows) {
    const key = `${row.seriesId}|${row.colorId}|${row.size}`;
    const cur = rackMap.get(key) ?? {
      seriesId: row.seriesId,
      colorId: row.colorId,
      size: row.size,
      qty: 0,
      seriesName: row.seriesName,
    };
    cur.qty += row.qty;
    rackMap.set(key, cur);
  }
  const rack = Array.from(rackMap.values()).filter((r) => r.qty !== 0);

  const accessoryStock = await db
    .select({
      materialId: materialStockView.materialId,
      qty: materialStockView.qty,
    })
    .from(materialStockView);
  const stockByMaterial = new Map(
    accessoryStock.map((row) => [row.materialId, toNumber(row.qty)]),
  );

  const accessories: AccessoryMaterial[] = accessoryRows.map((row) => ({
    id: row.materialId,
    code: row.code,
    name: row.name,
    label: materialLabel(row.code, row.name),
    unit: row.unit,
    stock: stockByMaterial.get(row.materialId) ?? 0,
  }));

  return {
    turunan,
    colors: colorRows,
    sizes: sizeRows.map((s) => s.label),
    accessories,
    history,
    rack,
  };
}