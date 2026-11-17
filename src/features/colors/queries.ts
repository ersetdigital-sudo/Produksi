import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  colorPairings,
  colorProducts,
  colors,
  fabricTypes,
  materialStockView,
  materialTypes,
  materials,
  pairingSlots,
  products,
} from "@/db/schema";
import {
  getStockStatus,
  summarizeColorStatus,
  type ColorSummary,
  type StockStatus,
} from "@/features/stock/status";
import { toNumber } from "@/lib/format";

export type MaterialInfo = {
  id: string;
  code: string | null;
  name: string | null;
  unit: string;
  min: number;
  stock: number;
  typeId: string;
  typeName: string;
};

export type ColorPairingView = {
  slotId: string;
  slotName: string;
  primary: MaterialInfo | null;
  backup: MaterialInfo | null;
  status: StockStatus;
};

export type ColorView = {
  id: string;
  name: string;
  colorCode: string;
  hex: string;
  fabricId: string;
  fabricCode: string;
  products: { id: string; name: string; slug: string }[];
  pairings: ColorPairingView[];
  summary: ColorSummary;
};

export type SlotView = {
  id: string;
  name: string;
  materialTypeId: string;
  materials: MaterialInfo[];
};

export type ColorCatalogData = {
  colors: ColorView[];
  slots: SlotView[];
  fabrics: { id: string; code: string }[];
  products: { id: string; name: string; slug: string }[];
};

export async function getColorCatalog(): Promise<ColorCatalogData> {
  const [
    colorRows,
    fabricRows,
    productRows,
    productLinks,
    slotRows,
    materialRows,
    stockRows,
    pairingRows,
  ] = await Promise.all([
    db
      .select({
        id: colors.id,
        name: colors.name,
        colorCode: colors.colorCode,
        hex: colors.hex,
        fabricId: colors.fabricTypeId,
        fabricCode: fabricTypes.code,
        fabricSort: fabricTypes.sortOrder,
        sort: colors.sortOrder,
      })
      .from(colors)
      .innerJoin(fabricTypes, eq(colors.fabricTypeId, fabricTypes.id))
      .where(eq(colors.active, true))
      .orderBy(asc(fabricTypes.sortOrder), asc(colors.sortOrder), asc(colors.name)),
    db
      .select({ id: fabricTypes.id, code: fabricTypes.code })
      .from(fabricTypes)
      .where(eq(fabricTypes.active, true))
      .orderBy(asc(fabricTypes.sortOrder)),
    db
      .select({ id: products.id, name: products.name, slug: products.slug })
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.sortOrder)),
    db
      .select({
        colorId: colorProducts.colorId,
        productId: products.id,
        name: products.name,
        slug: products.slug,
        sort: products.sortOrder,
      })
      .from(colorProducts)
      .innerJoin(products, eq(colorProducts.productId, products.id))
      .orderBy(asc(products.sortOrder)),
    db
      .select({
        id: pairingSlots.id,
        name: pairingSlots.name,
        materialTypeId: pairingSlots.materialTypeId,
      })
      .from(pairingSlots)
      .where(eq(pairingSlots.active, true))
      .orderBy(asc(pairingSlots.sortOrder)),
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
      })
      .from(materials)
      .innerJoin(materialTypes, eq(materials.materialTypeId, materialTypes.id))
      .where(eq(materials.active, true))
      .orderBy(
        asc(materialTypes.sortOrder),
        sql`${materials.code} asc nulls last`,
        sql`${materials.name} asc nulls last`,
      ),
    db
      .select({ materialId: materialStockView.materialId, qty: materialStockView.qty })
      .from(materialStockView),
    db.select({
      colorId: colorPairings.colorId,
      slotId: colorPairings.slotId,
      primaryId: colorPairings.primaryMaterialId,
      backupId: colorPairings.backupMaterialId,
    }).from(colorPairings),
  ]);

  const stockByMaterial = new Map(
    stockRows.map((row) => [row.materialId, toNumber(row.qty)]),
  );

  const materialById = new Map<string, MaterialInfo>();
  for (const row of materialRows) {
    materialById.set(row.id, {
      id: row.id,
      code: row.code,
      name: row.name,
      unit: row.unit,
      min: toNumber(row.minStock),
      stock: stockByMaterial.get(row.id) ?? 0,
      typeId: row.typeId,
      typeName: row.typeName,
    });
  }

  const productsByColor = new Map<
    string,
    { id: string; name: string; slug: string }[]
  >();
  for (const link of productLinks) {
    const list = productsByColor.get(link.colorId) ?? [];
    list.push({ id: link.productId, name: link.name, slug: link.slug });
    productsByColor.set(link.colorId, list);
  }

  const pairingByKey = new Map(
    pairingRows.map((row) => [`${row.colorId}:${row.slotId}`, row]),
  );

  const slots: SlotView[] = slotRows.map((slot) => ({
    id: slot.id,
    name: slot.name,
    materialTypeId: slot.materialTypeId,
    materials: materialRows
      .filter((row) => row.typeId === slot.materialTypeId)
      .map((row) => materialById.get(row.id))
      .filter((row): row is MaterialInfo => Boolean(row)),
  }));

  const colorViews: ColorView[] = colorRows.map((color) => {
    const pairings: ColorPairingView[] = slots.map((slot) => {
      const pairing = pairingByKey.get(`${color.id}:${slot.id}`);
      const primary = pairing?.primaryId
        ? materialById.get(pairing.primaryId) ?? null
        : null;
      const backup = pairing?.backupId
        ? materialById.get(pairing.backupId) ?? null
        : null;

      return {
        slotId: slot.id,
        slotName: slot.name,
        primary,
        backup,
        status: getStockStatus({
          hasPrimary: Boolean(primary),
          stock: primary?.stock ?? 0,
          min: primary?.min ?? 0,
          hasBackup: Boolean(backup),
          backupStock: backup?.stock ?? 0,
        }),
      };
    });

    return {
      id: color.id,
      name: color.name,
      colorCode: color.colorCode,
      hex: color.hex,
      fabricId: color.fabricId,
      fabricCode: color.fabricCode,
      products: productsByColor.get(color.id) ?? [],
      pairings,
      summary: summarizeColorStatus(pairings.map((pairing) => pairing.status)),
    };
  });

  return {
    colors: colorViews,
    slots,
    fabrics: fabricRows,
    products: productRows,
  };
}
