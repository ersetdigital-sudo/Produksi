import "server-only";

import { asc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bomCellSizes,
  bomCells,
  bomRows,
  colorPairings,
  colors,
  materialStockView,
  materialTypes,
  materials,
  pairingSlots,
  products,
  series,
  seriesAccessories,
} from "@/db/schema";
import { getStockStatus, type StockStatus } from "@/features/stock/status";
import { formatQty, toNumber } from "@/lib/format";

export type MaterialGroupKey =
  | "warna"
  | "kain_keras"
  | "penguat"
  | "label"
  | "packing"
  | "aksesoris";

export const materialGroupLabels: Record<MaterialGroupKey, string> = {
  warna: "Ikut warna kain",
  kain_keras: "Kain keras",
  penguat: "Penguat & kancing",
  label: "Label & tag",
  packing: "Packing produk",
  aksesoris: "Aksesoris turunan",
};

export const materialGroupOrder: MaterialGroupKey[] = [
  "warna",
  "kain_keras",
  "penguat",
  "label",
  "packing",
  "aksesoris",
];

export type MaterialView = {
  id: string;
  typeId: string;
  typeName: string;
  group: MaterialGroupKey;
  code: string | null;
  name: string | null;
  unit: string;
  stock: number;
  min: number;
  status: StockStatus;
  usage: string;
  usageSub: string;
  role: "Kode utama" | "Pengganti" | "Bahan umum";
  usageColor: { name: string; code: string; hex: string } | null;
  note: string;
  detailNote: string | null;
  backup: {
    code: string;
    name: string | null;
    stock: number;
    unit: string;
    min: number;
  } | null;
  primaryForBackup: { code: string; name: string | null; colorName: string } | null;
};

export type MaterialTypeView = {
  id: string;
  name: string;
  unit: string;
  group: MaterialGroupKey;
  defaultMin: number;
  materials: MaterialView[];
};

export type MaterialGroupView = {
  key: MaterialGroupKey;
  label: string;
  count: number;
  types: MaterialTypeView[];
};

export type MaterialCatalogData = {
  groups: MaterialGroupView[];
  types: { id: string; name: string; unit: string; group: MaterialGroupKey; defaultMin: number }[];
  total: number;
};

type PairingUse = {
  colorId: string;
  colorName: string;
  colorCode: string;
  colorHex: string;
  slotName: string;
  primaryId: string;
  backupId: string | null;
};

type BomUse = {
  materialId: string;
  rowName: string;
  pattern: string;
  seriesName: string;
  productName: string;
};

type SizeUse = {
  materialId: string;
  rowName: string;
  size: string;
  seriesName: string;
  productName: string;
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function getMaterialCatalog(): Promise<MaterialCatalogData> {
  const [
    typeRows,
    materialRows,
    stockRows,
    pairingRows,
    bomUseRows,
    sizeUseRows,
    accessoryRows,
  ] = await Promise.all([
    db
      .select({
        id: materialTypes.id,
        name: materialTypes.name,
        group: materialTypes.group,
        unit: materialTypes.unit,
        defaultMin: materialTypes.defaultMin,
        sort: materialTypes.sortOrder,
      })
      .from(materialTypes)
      .where(eq(materialTypes.active, true))
      .orderBy(asc(materialTypes.sortOrder), asc(materialTypes.name)),
    db
      .select({
        id: materials.id,
        typeId: materials.materialTypeId,
        code: materials.code,
        name: materials.name,
        unit: materials.unit,
        minStock: materials.minStock,
        sortOrder: materials.sortOrder,
      })
      .from(materials)
      .where(eq(materials.active, true))
      .orderBy(
        asc(materials.sortOrder),
        sql`${materials.code} asc nulls last`,
        sql`${materials.name} asc nulls last`,
      ),
    db
      .select({ materialId: materialStockView.materialId, qty: materialStockView.qty })
      .from(materialStockView),
    db
      .select({
        primaryId: colorPairings.primaryMaterialId,
        backupId: colorPairings.backupMaterialId,
        colorId: colors.id,
        colorName: colors.name,
        colorCode: colors.colorCode,
        colorHex: colors.hex,
        slotName: pairingSlots.name,
      })
      .from(colorPairings)
      .innerJoin(colors, eq(colorPairings.colorId, colors.id))
      .innerJoin(pairingSlots, eq(colorPairings.slotId, pairingSlots.id)),
    db
      .select({
        materialId: bomCells.materialId,
        rowName: bomRows.name,
        pattern: bomRows.pattern,
        seriesName: series.name,
        productName: products.name,
      })
      .from(bomCells)
      .innerJoin(bomRows, eq(bomCells.bomRowId, bomRows.id))
      .innerJoin(series, eq(bomCells.seriesId, series.id))
      .innerJoin(products, eq(bomRows.productId, products.id))
      .where(isNotNull(bomCells.materialId))
      .orderBy(asc(bomRows.sortOrder), asc(series.name)),
    db
      .select({
        materialId: bomCellSizes.materialId,
        rowName: bomRows.name,
        size: bomCellSizes.size,
        seriesName: series.name,
        productName: products.name,
      })
      .from(bomCellSizes)
      .innerJoin(bomCells, eq(bomCellSizes.bomCellId, bomCells.id))
      .innerJoin(bomRows, eq(bomCells.bomRowId, bomRows.id))
      .innerJoin(series, eq(bomCells.seriesId, series.id))
      .innerJoin(products, eq(bomRows.productId, products.id))
      .where(isNotNull(bomCellSizes.materialId))
      .orderBy(asc(bomRows.sortOrder), asc(bomCellSizes.size)),
    db
      .select({
        materialId: seriesAccessories.materialId,
        seriesName: series.name,
      })
      .from(seriesAccessories)
      .innerJoin(series, eq(seriesAccessories.seriesId, series.id)),
  ]);

  const stockByMaterial = new Map(
    stockRows.map((row) => [row.materialId, toNumber(row.qty)]),
  );

  const typeById = new Map(
    typeRows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        group: row.group as MaterialGroupKey,
        unit: row.unit,
        defaultMin: toNumber(row.defaultMin),
      },
    ]),
  );

  const primaryUses = new Map<string, PairingUse[]>();
  const backupUses = new Map<string, PairingUse[]>();

  for (const row of pairingRows) {
    const use: PairingUse = {
      colorId: row.colorId,
      colorName: row.colorName,
      colorCode: row.colorCode,
      colorHex: row.colorHex,
      slotName: row.slotName,
      primaryId: row.primaryId ?? "",
      backupId: row.backupId,
    };
    if (row.primaryId) {
      const list = primaryUses.get(row.primaryId) ?? [];
      list.push(use);
      primaryUses.set(row.primaryId, list);
    }
    if (row.backupId) {
      const list = backupUses.get(row.backupId) ?? [];
      list.push(use);
      backupUses.set(row.backupId, list);
    }
  }

  const bomUses = new Map<string, BomUse[]>();
  for (const row of bomUseRows) {
    if (!row.materialId) continue;
    const list = bomUses.get(row.materialId) ?? [];
    list.push({
      materialId: row.materialId,
      rowName: row.rowName,
      pattern: row.pattern,
      seriesName: row.seriesName,
      productName: row.productName,
    });
    bomUses.set(row.materialId, list);
  }

  const sizeUses = new Map<string, SizeUse[]>();
  for (const row of sizeUseRows) {
    if (!row.materialId) continue;
    const list = sizeUses.get(row.materialId) ?? [];
    list.push({
      materialId: row.materialId,
      rowName: row.rowName,
      size: row.size,
      seriesName: row.seriesName,
      productName: row.productName,
    });
    sizeUses.set(row.materialId, list);
  }

  const accessoryUses = new Map<string, string[]>();
  for (const row of accessoryRows) {
    const list = accessoryUses.get(row.materialId) ?? [];
    list.push(row.seriesName);
    accessoryUses.set(row.materialId, list);
  }

  const baseById = new Map(
    materialRows.map((row) => {
      const type = typeById.get(row.typeId);
      const stock = stockByMaterial.get(row.id) ?? 0;
      const min = toNumber(row.minStock);
      return [
        row.id,
        {
          id: row.id,
          typeId: row.typeId,
          typeName: type?.name ?? "Material",
          group: type?.group ?? ("warna" as MaterialGroupKey),
          code: row.code,
          name: row.name,
          unit: row.unit,
          stock,
          min,
        },
      ];
    }),
  );

  const materialViews: MaterialView[] = materialRows.map((row) => {
    const base = baseById.get(row.id);
    if (!base) throw new Error("Material tidak ditemukan");
    const prim = primaryUses.get(row.id) ?? [];
    const back = backupUses.get(row.id) ?? [];
    const bom = bomUses.get(row.id) ?? [];
    const sizes = sizeUses.get(row.id) ?? [];
    const accessories = accessoryUses.get(row.id) ?? [];

    let usage = "—";
    let usageSub = "Belum dipakai di Bahan per Pcs";
    let role: MaterialView["role"] = "Bahan umum";
    let usageColor: MaterialView["usageColor"] = null;

    if (prim.length > 0) {
      const first = prim[0];
      if (first) {
        usage = unique(prim.map((item) => item.colorName)).join(", ");
        usageSub = "Warna kain yang memakai kode ini saat dijahit";
        role = "Kode utama";
        usageColor = {
          name: first.colorName,
          code: first.colorCode,
          hex: first.colorHex,
        };
      }
    } else if (back.length > 0) {
      const first = back[0];
      if (first) {
        const primary = baseById.get(first.primaryId);
        usage = first.colorName;
        usageSub = `Pengganti untuk kode ${primary?.code ?? "—"}`;
        role = "Pengganti";
        usageColor = {
          name: first.colorName,
          code: first.colorCode,
          hex: first.colorHex,
        };
      }
    } else if (accessories.length > 0) {
      usage = unique(accessories).join(", ");
      usageSub = "Series turunan yang memakai aksesoris ini";
    } else if (bom.length > 0 || sizes.length > 0) {
      const productNames = unique([
        ...bom.map((item) => item.productName),
        ...sizes.map((item) => item.productName),
      ]);
      const seriesNames = unique([
        ...bom.map((item) => item.seriesName),
        ...sizes.map((item) => item.seriesName),
      ]);

      if (sizes.length > 0) {
        usage = `Size ${unique(sizes.map((item) => item.size)).join(", ")}`;
      } else if (base.group === "penguat") {
        usage = "Semua series";
      } else if (
        base.group === "packing" &&
        productNames.length === 1
      ) {
        usage = productNames[0] ?? "—";
      } else if (productNames.length > 1) {
        usage = "Semua produk";
      } else if (base.group === "kain_keras") {
        usage = bom.some((item) => item.pattern === "series")
          ? unique(
              bom.map((item) =>
                item.pattern === "series"
                  ? `${item.rowName} ${item.seriesName}`
                  : item.rowName,
              ),
            ).join(", ")
          : unique(bom.map((item) => item.rowName)).join(", ");
      } else if (bom.some((item) => item.pattern === "series")) {
        usage = unique(
          bom.map((item) =>
            item.pattern === "series"
              ? `${item.rowName} ${item.seriesName}`
              : item.rowName,
          ),
        ).join(", ");
      } else if (seriesNames.length > 1) {
        usage = "Semua series";
      } else {
        usage = seriesNames[0] ?? productNames[0] ?? "—";
      }
      usageSub = "Bagian atau series yang memakai bahan ini";
    }

    const primaryUse = prim[0];
    const backupId = primaryUse?.backupId
      ? baseById.get(primaryUse.backupId)
      : null;
    const backup = backupId
      ? {
          code: backupId.code ?? backupId.name ?? "—",
          name: backupId.name,
          stock: backupId.stock,
          unit: backupId.unit,
          min: backupId.min,
        }
      : null;

    const backupUse = back[0];
    const primary = backupUse
      ? baseById.get(backupUse.primaryId)
      : null;
    const primaryForBackup = primary
      ? {
          code: primary.code ?? primary.name ?? "—",
          name: primary.name,
          colorName: backupUse?.colorName ?? "",
        }
      : null;

    const status = getStockStatus({
      hasPrimary: true,
      stock: base.stock,
      min: base.min,
      hasBackup: Boolean(backup),
      backupStock: backup?.stock ?? 0,
    });

    let note = "—";
    let detailNote: string | null = null;
    if (status === "cadangan" && backup) {
      note = `Habis, sementara diganti ${backup.code}`;
      detailNote = `Kode ini habis. Untuk sementara produksi ${
        usageColor?.name ?? "warna terkait"
      } memakai ${backup.code} sebagai gantinya. Catat barang masuk kalau kode ini sudah dibeli lagi.`;
    } else if (status === "menipis") {
      note = `Di bawah minimum ${formatQty(base.min)} ${base.unit}`;
      detailNote = `Sisa ${formatQty(base.stock)} ${base.unit}, di bawah batas minimum ${formatQty(
        base.min,
      )} ${base.unit}. Segera beli lagi sebelum habis.`;
    } else if (status === "habis") {
      note = "Tidak ada pengganti";
      detailNote =
        "Kode ini habis dan tidak punya pengganti. Produksi yang membutuhkan bahan ini tertahan sampai ada barang masuk.";
    } else if (role === "Pengganti" && primaryForBackup) {
      note = `Pengganti untuk ${primaryForBackup.code}`;
    }

    return {
      id: base.id,
      typeId: base.typeId,
      typeName: base.typeName,
      group: base.group,
      code: base.code,
      name: base.name,
      unit: base.unit,
      stock: base.stock,
      min: base.min,
      status,
      usage,
      usageSub,
      role,
      usageColor,
      note,
      detailNote,
      backup,
      primaryForBackup,
    };
  });

  const materialsByType = new Map<string, MaterialView[]>();
  for (const material of materialViews) {
    const list = materialsByType.get(material.typeId) ?? [];
    list.push(material);
    materialsByType.set(material.typeId, list);
  }

  const types: MaterialTypeView[] = typeRows.map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    group: row.group as MaterialGroupKey,
    defaultMin: toNumber(row.defaultMin),
    materials: materialsByType.get(row.id) ?? [],
  }));

  const groups: MaterialGroupView[] = materialGroupOrder.map((key) => {
    const groupTypes = types.filter((type) => type.group === key);
    return {
      key,
      label: materialGroupLabels[key],
      count: groupTypes.reduce(
        (total, type) => total + type.materials.length,
        0,
      ),
      types: groupTypes,
    };
  });

  return {
    groups,
    types: typeRows.map((row) => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      group: row.group as MaterialGroupKey,
      defaultMin: toNumber(row.defaultMin),
    })),
    total: materialViews.length,
  };
}
