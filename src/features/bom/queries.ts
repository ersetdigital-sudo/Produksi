import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bomCellSizes,
  bomCells,
  bomRows,
  bomSections,
  materialTypes,
  materials,
  pairingSlots,
  products,
  series,
  seriesAccessories,
  sizes,
} from "@/db/schema";
import { toNumber } from "@/lib/format";

export type BomPattern = "warna" | "size" | "series" | "sama";

export type BomMaterialOption = {
  id: string;
  code: string | null;
  name: string | null;
  label: string;
  unit: string;
  typeName: string;
  group: string;
};

export type BomSeries = {
  id: string;
  name: string;
  kind: "diproduksi" | "turunan";
  parentName: string | null;
  active: boolean;
  sortOrder: number;
  accessories: { label: string; qty: number | null; unit: string }[];
};

export type BomCellView = {
  id: string;
  seriesId: string;
  materialId: string | null;
  materialLabel: string | null;
  qty: number | null;
  unit: string | null;
  unused: boolean;
  sizes: { size: string; materialId: string | null; materialLabel: string | null; qty: number | null }[];
};

export type BomRowView = {
  id: string;
  name: string;
  sectionId: string;
  sectionName: string;
  pattern: BomPattern;
  pairingSlotName: string | null;
  sortOrder: number;
  cells: Record<string, BomCellView>;
};

export type BomSectionView = {
  id: string;
  name: string;
  sortOrder: number;
  rows: BomRowView[];
};

export type BomData = {
  products: { id: string; name: string; slug: string }[];
  seriesByProduct: Record<string, BomSeries[]>;
  productionSeriesByProduct: Record<string, BomSeries[]>;
  sectionsByProduct: Record<string, BomSectionView[]>;
  materials: BomMaterialOption[];
  sizes: string[];
};

function materialLabel(
  code: string | null,
  name: string | null,
): string | null {
  if (code && name) return `${code} · ${name}`;
  return code ?? name;
}

export async function getBomData(): Promise<BomData> {
  const [
    productRows,
    seriesRows,
    accessoryRows,
    sectionRows,
    rowRows,
    cellRows,
    cellSizeRows,
    materialRows,
    sizeRows,
  ] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, slug: products.slug })
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.sortOrder)),
    db
      .select({
        id: series.id,
        productId: series.productId,
        name: series.name,
        kind: series.kind,
        parentId: series.parentSeriesId,
        active: series.active,
        sortOrder: series.sortOrder,
      })
      .from(series)
      .orderBy(asc(series.sortOrder), asc(series.name)),
    db
      .select({
        seriesId: seriesAccessories.seriesId,
        materialCode: materials.code,
        materialName: materials.name,
        qty: seriesAccessories.qtyPerPiece,
        unit: seriesAccessories.unit,
        sortOrder: seriesAccessories.sortOrder,
      })
      .from(seriesAccessories)
      .innerJoin(materials, eq(seriesAccessories.materialId, materials.id))
      .orderBy(asc(seriesAccessories.sortOrder)),
    db
      .select({
        id: bomSections.id,
        productId: bomSections.productId,
        name: bomSections.name,
        sortOrder: bomSections.sortOrder,
      })
      .from(bomSections)
      .orderBy(asc(bomSections.sortOrder)),
    db
      .select({
        id: bomRows.id,
        productId: bomRows.productId,
        sectionId: bomRows.sectionId,
        name: bomRows.name,
        pattern: bomRows.pattern,
        pairingSlotName: pairingSlots.name,
        sortOrder: bomRows.sortOrder,
      })
      .from(bomRows)
      .leftJoin(pairingSlots, eq(bomRows.pairingSlotId, pairingSlots.id))
      .orderBy(asc(bomRows.sortOrder)),
    db
      .select({
        id: bomCells.id,
        rowId: bomCells.bomRowId,
        seriesId: bomCells.seriesId,
        materialId: bomCells.materialId,
        materialCode: materials.code,
        materialName: materials.name,
        qty: bomCells.qtyPerPiece,
        unit: bomCells.unit,
        unused: bomCells.unused,
      })
      .from(bomCells)
      .leftJoin(materials, eq(bomCells.materialId, materials.id)),
    db
      .select({
        cellId: bomCellSizes.bomCellId,
        size: bomCellSizes.size,
        materialId: bomCellSizes.materialId,
        materialCode: materials.code,
        materialName: materials.name,
        qty: bomCellSizes.qtyPerPiece,
      })
      .from(bomCellSizes)
      .leftJoin(materials, eq(bomCellSizes.materialId, materials.id)),
    db
      .select({
        id: materials.id,
        code: materials.code,
        name: materials.name,
        unit: materials.unit,
        typeName: materialTypes.name,
        group: materialTypes.group,
        typeSort: materialTypes.sortOrder,
      })
      .from(materials)
      .innerJoin(materialTypes, eq(materials.materialTypeId, materialTypes.id))
      .where(eq(materials.active, true))
      .orderBy(asc(materialTypes.sortOrder), asc(materials.sortOrder)),
    db
      .select({ label: sizes.label })
      .from(sizes)
      .where(eq(sizes.active, true))
      .orderBy(asc(sizes.sortOrder)),
  ]);

  const seriesById = new Map(
    seriesRows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        kind: row.kind,
        parentName: row.parentId
          ? seriesRows.find((item) => item.id === row.parentId)?.name ?? null
          : null,
        active: row.active,
        sortOrder: row.sortOrder,
        accessories: [] as BomSeries["accessories"],
      },
    ]),
  );

  for (const row of accessoryRows) {
    const target = seriesById.get(row.seriesId);
    if (!target) continue;
    target.accessories.push({
      label: materialLabel(row.materialCode, row.materialName) ?? "—",
      qty: row.qty === null ? null : toNumber(row.qty),
      unit: row.unit,
    });
  }

  const seriesByProduct: Record<string, BomSeries[]> = {};
  for (const product of productRows) seriesByProduct[product.id] = [];
  for (const row of seriesRows) {
    const target = seriesById.get(row.id);
    if (!target) continue;
    const list = seriesByProduct[row.productId] ?? [];
    list.push(target);
    seriesByProduct[row.productId] = list;
  }

  const productionSeriesByProduct: Record<string, BomSeries[]> = {};
  for (const [productId, items] of Object.entries(seriesByProduct)) {
    productionSeriesByProduct[productId] = items.filter(
      (item) => item.kind === "diproduksi",
    );
  }

  const materialOptions: BomMaterialOption[] = materialRows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    label: materialLabel(row.code, row.name) ?? row.typeName,
    unit: row.unit,
    typeName: row.typeName,
    group: row.group,
  }));

  const sizesByCell = new Map<
    string,
    { size: string; materialId: string | null; materialLabel: string | null; qty: number | null }[]
  >();
  for (const row of cellSizeRows) {
    const list = sizesByCell.get(row.cellId) ?? [];
    list.push({
      size: row.size,
      materialId: row.materialId,
      materialLabel: materialLabel(row.materialCode, row.materialName),
      qty: row.qty === null ? null : toNumber(row.qty),
    });
    sizesByCell.set(row.cellId, list);
  }

  const cellsByRow = new Map<string, Record<string, BomCellView>>();
  for (const row of cellRows) {
    const map = cellsByRow.get(row.rowId) ?? {};
    map[row.seriesId] = {
      id: row.id,
      seriesId: row.seriesId,
      materialId: row.materialId,
      materialLabel: materialLabel(row.materialCode, row.materialName),
      qty: row.qty === null ? null : toNumber(row.qty),
      unit: row.unit,
      unused: row.unused,
      sizes: sizesByCell.get(row.id) ?? [],
    };
    cellsByRow.set(row.rowId, map);
  }

  const sectionsByProduct: Record<string, BomSectionView[]> = {};
  const sectionLookup = new Map<string, BomSectionView>();
  for (const section of sectionRows) {
    const view: BomSectionView = {
      id: section.id,
      name: section.name,
      sortOrder: section.sortOrder,
      rows: [],
    };
    sectionLookup.set(section.id, view);
    const list = sectionsByProduct[section.productId] ?? [];
    list.push(view);
    sectionsByProduct[section.productId] = list;
  }

  for (const row of rowRows) {
    const section = sectionLookup.get(row.sectionId);
    if (!section) continue;
    section.rows.push({
      id: row.id,
      name: row.name,
      sectionId: row.sectionId,
      sectionName: section.name,
      pattern: row.pattern,
      pairingSlotName: row.pairingSlotName,
      sortOrder: row.sortOrder,
      cells: cellsByRow.get(row.id) ?? {},
    });
  }

  return {
    products: productRows,
    seriesByProduct,
    productionSeriesByProduct,
    sectionsByProduct,
    materials: materialOptions,
    sizes: sizeRows.map((row) => row.label),
  };
}
