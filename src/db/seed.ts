import { eq } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

process.loadEnvFile(".env.local");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diisi di .env.local");
}

const client = postgres(connectionString, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

type MaterialGroup = "warna" | "kain_keras" | "penguat" | "label" | "packing" | "aksesoris";
type BomPattern = "warna" | "size" | "series" | "sama";

type MaterialSeed = {
  key: string;
  type: string;
  code: string | null;
  name: string | null;
  unit: string;
  min: string;
  stock: string;
};

const materialSortOrder: Record<string, number> = {
  m722: 1,
  mBw: 2,
  m172: 3,
  m069: 4,
  mR722: 1,
  m502: 2,
  m697: 3,
  m322: 1,
  m002: 2,
  m503: 3,
  mKerasDouble: 1,
  mKerasSingle: 2,
  mBabud: 3,
  mTangerine: 4,
  mVislin: 1,
  mTrikot: 2,
  mKancingSnap: 3,
  mLabelMerek: 1,
  mLabelS: 2,
  mLabelM: 3,
  mHangTag: 4,
  mTali: 5,
  mOpp: 1,
  mMika: 2,
  mKarton: 3,
  mKlip: 4,
  mDiamond: 1,
  mEyelet: 2,
  mPin: 3,
};

const materialTypes: {
  key: string;
  name: string;
  group: MaterialGroup;
  unit: string;
  defaultMin: string;
  sortOrder: number;
}[] = [
  { key: "benangJahit", name: "Benang Jahit", group: "warna", unit: "cone", defaultMin: "6", sortOrder: 1 },
  { key: "benangObras", name: "Benang Obras", group: "warna", unit: "cone", defaultMin: "6", sortOrder: 2 },
  { key: "benangTarboosh", name: "Benang Tarboosh", group: "warna", unit: "cone", defaultMin: "6", sortOrder: 3 },
  { key: "resleting", name: "Resleting Jepang", group: "warna", unit: "pcs", defaultMin: "50", sortOrder: 4 },
  { key: "kancingManset", name: "Kancing Manset", group: "warna", unit: "gross", defaultMin: "2", sortOrder: 5 },
  { key: "kainKeras", name: "Kain keras", group: "kain_keras", unit: "m", defaultMin: "5", sortOrder: 6 },
  { key: "vislin", name: "Vislin", group: "penguat", unit: "m", defaultMin: "10", sortOrder: 7 },
  { key: "trikot", name: "Trikot", group: "penguat", unit: "m", defaultMin: "10", sortOrder: 8 },
  { key: "kancingSnap", name: "Kancing snap", group: "penguat", unit: "pcs", defaultMin: "200", sortOrder: 9 },
  { key: "labelMerek", name: "Label merek", group: "label", unit: "pcs", defaultMin: "200", sortOrder: 10 },
  { key: "labelSize", name: "Label size", group: "label", unit: "pcs", defaultMin: "50", sortOrder: 11 },
  { key: "hangTag", name: "Hang tag", group: "label", unit: "pcs", defaultMin: "200", sortOrder: 12 },
  { key: "taliHangTag", name: "Tali hang tag", group: "label", unit: "pcs", defaultMin: "200", sortOrder: 13 },
  { key: "plastikOpp", name: "Plastik OPP", group: "packing", unit: "pcs", defaultMin: "100", sortOrder: 14 },
  { key: "mikaKerah", name: "Mika kerah", group: "packing", unit: "pcs", defaultMin: "100", sortOrder: 15 },
  { key: "kartonPunggung", name: "Karton punggung", group: "packing", unit: "pcs", defaultMin: "50", sortOrder: 16 },
  { key: "klipPenjepit", name: "Klip penjepit", group: "packing", unit: "pcs", defaultMin: "300", sortOrder: 17 },
  { key: "kancingDiamond", name: "Kancing diamond", group: "aksesoris", unit: "pcs", defaultMin: "144", sortOrder: 18 },
  { key: "eyelet", name: "Eyelet (mata ayam)", group: "aksesoris", unit: "pcs", defaultMin: "100", sortOrder: 19 },
  { key: "pinCollar", name: "Pin collar", group: "aksesoris", unit: "set", defaultMin: "20", sortOrder: 20 },
];

const materials: MaterialSeed[] = [
  { key: "m722", type: "benangJahit", code: "722", name: "Hitam", unit: "cone", min: "6", stock: "24" },
  { key: "mBw", type: "benangJahit", code: "Bw", name: "Natural", unit: "cone", min: "6", stock: "18" },
  { key: "m172", type: "benangJahit", code: "172", name: null, unit: "cone", min: "6", stock: "0" },
  { key: "m069", type: "benangJahit", code: "069", name: null, unit: "cone", min: "6", stock: "14" },
  { key: "mR722", type: "resleting", code: "722", name: null, unit: "pcs", min: "50", stock: "120" },
  { key: "m502", type: "resleting", code: "502", name: null, unit: "pcs", min: "50", stock: "32" },
  { key: "m697", type: "resleting", code: "697", name: null, unit: "pcs", min: "50", stock: "85" },
  { key: "m322", type: "kancingManset", code: "322", name: "Merak", unit: "gross", min: "2", stock: "6" },
  { key: "m002", type: "kancingManset", code: "002", name: "SJ Star", unit: "gross", min: "2", stock: "4" },
  { key: "m503", type: "kancingManset", code: "503", name: "Merak", unit: "gross", min: "2", stock: "0" },
  { key: "mKerasDouble", type: "kainKeras", code: null, name: "750 GSM double lem", unit: "m", min: "5", stock: "12" },
  { key: "mKerasSingle", type: "kainKeras", code: null, name: "750 GSM single lem", unit: "m", min: "5", stock: "3.5" },
  { key: "mBabud", type: "kainKeras", code: null, name: "Babud M90", unit: "m", min: "5", stock: "20" },
  { key: "mTangerine", type: "kainKeras", code: null, name: "Tangerine M33", unit: "m", min: "5", stock: "0" },
  { key: "mVislin", type: "vislin", code: null, name: "Vislin", unit: "m", min: "10", stock: "30" },
  { key: "mTrikot", type: "trikot", code: null, name: "Trikot", unit: "m", min: "10", stock: "25" },
  { key: "mKancingSnap", type: "kancingSnap", code: null, name: "Kancing snap", unit: "pcs", min: "200", stock: "600" },
  { key: "mLabelMerek", type: "labelMerek", code: null, name: "Label merek", unit: "pcs", min: "200", stock: "850" },
  { key: "mLabelS", type: "labelSize", code: "S", name: "Label size", unit: "pcs", min: "50", stock: "120" },
  { key: "mLabelM", type: "labelSize", code: "M", name: "Label size", unit: "pcs", min: "50", stock: "40" },
  { key: "mHangTag", type: "hangTag", code: null, name: "Hang tag", unit: "pcs", min: "200", stock: "700" },
  { key: "mTali", type: "taliHangTag", code: null, name: "Tali hang tag", unit: "pcs", min: "200", stock: "900" },
  { key: "mOpp", type: "plastikOpp", code: null, name: "Plastik OPP", unit: "pcs", min: "100", stock: "500" },
  { key: "mMika", type: "mikaKerah", code: null, name: "Mika kerah", unit: "pcs", min: "100", stock: "400" },
  { key: "mKarton", type: "kartonPunggung", code: null, name: "Karton punggung", unit: "pcs", min: "50", stock: "30" },
  { key: "mKlip", type: "klipPenjepit", code: null, name: "Klip penjepit", unit: "pcs", min: "300", stock: "1200" },
  { key: "mDiamond", type: "kancingDiamond", code: null, name: "Kancing diamond", unit: "pcs", min: "144", stock: "420" },
  { key: "mEyelet", type: "eyelet", code: null, name: "Eyelet (mata ayam)", unit: "pcs", min: "100", stock: "0" },
  { key: "mPin", type: "pinCollar", code: null, name: "Pin collar", unit: "set", min: "20", stock: "35" },
];

const colors = [
  { key: "Superblack", fabric: "B-01", code: "Col#14", hex: "#17171A", sort: 1 },
  { key: "Broken White", fabric: "B-01", code: "Col#15", hex: "#EFE9DC", sort: 2 },
  { key: "Latte", fabric: "B-01", code: "Col#54", hex: "#B79877", sort: 3 },
  { key: "Navy", fabric: "B-01", code: "Col#7/#10", hex: "#1F2A44", sort: 4 },
  { key: "Grey Indigo", fabric: "B-01", code: "Col#47", hex: "#5B6477", sort: 5 },
  { key: "Mint", fabric: "B-01", code: "Col#67", hex: "#BFDCCB", sort: 6 },
  { key: "Dark Choco", fabric: "B-01", code: "Col#55", hex: "#4A3428", sort: 7 },
  { key: "Blush Beige", fabric: "B-01", code: "Col#73", hex: "#E4CBB8", sort: 8 },
  { key: "Coffee Brown", fabric: "B-02", code: "Col#76", hex: "#6F4E37", sort: 9 },
  { key: "Deep Maroon", fabric: "B-02", code: "Col#80", hex: "#6B2030", sort: 10 },
  { key: "Olive Green", fabric: "B-02", code: "Col#23", hex: "#6B6B3A", sort: 11 },
  { key: "Charcoal Grey", fabric: "A-02 (a)", code: "Col#76", hex: "#3F4245", sort: 12 },
  { key: "Soft Grey", fabric: "A-02 (a)", code: "Col#131", hex: "#B9BBBD", sort: 13 },
];

const pairings: {
  color: string;
  slot: string;
  primary: string;
  backup?: string;
}[] = [
  { color: "Superblack", slot: "benangJahit", primary: "m722" },
  { color: "Superblack", slot: "resleting", primary: "mR722" },
  { color: "Superblack", slot: "kancingManset", primary: "m322" },
  { color: "Broken White", slot: "benangJahit", primary: "mBw" },
  { color: "Broken White", slot: "resleting", primary: "m502" },
  { color: "Broken White", slot: "kancingManset", primary: "m002" },
  { color: "Latte", slot: "benangJahit", primary: "m172", backup: "m069" },
  { color: "Latte", slot: "resleting", primary: "m697" },
  { color: "Latte", slot: "kancingManset", primary: "m503" },
];

type CellSeed = {
  material?: string;
  qty?: string | null;
  unit?: string;
  unused?: boolean;
};

type RowSeed = {
  section: string;
  name: string;
  pattern: BomPattern;
  slot?: string;
  defaultCell?: CellSeed;
  cells?: Record<string, CellSeed>;
  sizeCells?: Record<string, CellSeed>;
};

const thobeRows: RowSeed[] = [
  { section: "Ikut warna kain", name: "Benang jahit", pattern: "warna", slot: "benangJahit", defaultCell: { unit: "cone", qty: null } },
  { section: "Ikut warna kain", name: "Benang obras", pattern: "warna", slot: "benangObras", defaultCell: { unit: "cone", qty: null } },
  { section: "Ikut warna kain", name: "Resleting Jepang", pattern: "warna", slot: "resleting", defaultCell: { unit: "pcs", qty: "1" } },
  { section: "Ikut warna kain", name: "Kancing manset", pattern: "warna", slot: "kancingManset", defaultCell: { unit: "pcs", qty: "6" } },
  { section: "Kain keras", name: "Kerah", pattern: "series", cells: { Jiharkah: { material: "mKerasDouble", qty: null }, Nahawand: { material: "mKerasSingle", qty: null } } },
  { section: "Kain keras", name: "Plaket & klep", pattern: "sama", defaultCell: { material: "mKerasSingle", qty: null } },
  { section: "Kain keras", name: "Kantong", pattern: "sama", defaultCell: { material: "mBabud", qty: null } },
  { section: "Kain keras", name: "Manset", pattern: "sama", defaultCell: { material: "mTangerine", qty: null } },
  { section: "Penguat & kancing", name: "Vislin", pattern: "sama", defaultCell: { material: "mVislin", qty: null } },
  { section: "Penguat & kancing", name: "Trikot", pattern: "sama", defaultCell: { material: "mTrikot", qty: null } },
  { section: "Penguat & kancing", name: "Kancing snap", pattern: "sama", defaultCell: { material: "mKancingSnap", qty: "2" } },
  { section: "Label & tag", name: "Label merek", pattern: "sama", defaultCell: { material: "mLabelMerek", qty: "1" } },
  { section: "Label & tag", name: "Label size", pattern: "size", defaultCell: {}, sizeCells: { S: { material: "mLabelS", qty: "1" }, M: { material: "mLabelM", qty: "1" } } },
  { section: "Label & tag", name: "Hang tag", pattern: "sama", defaultCell: { material: "mHangTag", qty: "1" } },
  { section: "Label & tag", name: "Tali hang tag", pattern: "sama", defaultCell: { material: "mTali", qty: "1" } },
  { section: "Packing produk", name: "Plastik OPP", pattern: "sama", defaultCell: { material: "mOpp", qty: "1" } },
  { section: "Packing produk", name: "Mika kerah", pattern: "sama", defaultCell: { material: "mMika", qty: "1" } },
  { section: "Packing produk", name: "Karton punggung", pattern: "sama", defaultCell: { material: "mKarton", qty: "1" } },
  { section: "Packing produk", name: "Klip penjepit", pattern: "sama", defaultCell: { material: "mKlip", qty: "4" } },
];

const kandoraRows: RowSeed[] = [
  { section: "Ikut warna kain", name: "Benang jahit", pattern: "warna", slot: "benangJahit", defaultCell: { unit: "cone", qty: null } },
  { section: "Ikut warna kain", name: "Benang obras", pattern: "warna", slot: "benangObras", defaultCell: { unit: "cone", qty: null } },
  { section: "Ikut warna kain", name: "Benang tarboosh", pattern: "warna", slot: "benangTarboosh", defaultCell: { unit: "cone", qty: null } },
  { section: "Ikut warna kain", name: "Resleting Jepang non manset", pattern: "warna", slot: "resleting", defaultCell: { unit: "pcs", qty: "2" } },
  { section: "Penguat & kancing", name: "Kancing jepret", pattern: "sama", defaultCell: { material: "mKancingSnap", qty: null } },
  { section: "Label & tag", name: "Label merek", pattern: "sama", defaultCell: { material: "mLabelMerek", qty: "1" } },
  { section: "Label & tag", name: "Label size", pattern: "size", defaultCell: {}, sizeCells: { S: { material: "mLabelS", qty: "1" }, M: { material: "mLabelM", qty: "1" } } },
  { section: "Label & tag", name: "Hang tag", pattern: "sama", defaultCell: { material: "mHangTag", qty: "1" } },
  { section: "Packing produk", name: "Plastik OPP", pattern: "sama", defaultCell: { material: "mOpp", qty: "1" } },
];

async function main() {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .limit(1);
  if (existing.length > 0) {
    console.log("Seed dilewati: database sudah berisi data.");
    return;
  }

  await db.transaction(async (tx) => {
    const userIds = new Map<string, string>();
    const userRows = await tx
      .insert(schema.users)
      .values([
        { name: "Lea", initials: "LE", role: "admin" },
        { name: "Ardo", initials: "AR", role: "owner" },
        { name: "Surya", initials: "SU", role: "owner" },
        { name: "Pak Manto", initials: "PM", role: "viewer" },
      ])
      .returning({ id: schema.users.id, name: schema.users.name });
    for (const row of userRows) userIds.set(row.name, row.id);
    const lea = userIds.get("Lea");
    if (!lea) throw new Error("User Lea gagal dibuat");

    const productRows = await tx
      .insert(schema.products)
      .values([
        { slug: "thobe", name: "Thobe", sortOrder: 1 },
        { slug: "kandora", name: "Kandora", sortOrder: 2 },
        { slug: "koko", name: "Koko", sortOrder: 3 },
        { slug: "vest", name: "Vest", sortOrder: 4 },
      ])
      .returning({ id: schema.products.id, slug: schema.products.slug });
    const productIds = new Map(productRows.map((row) => [row.slug, row.id]));

    const fabricRows = await tx
      .insert(schema.fabricTypes)
      .values([
        { code: "B-01", sortOrder: 1 },
        { code: "B-02", sortOrder: 2 },
        { code: "C-01", sortOrder: 3 },
        { code: "A-02 (a)", sortOrder: 4 },
        { code: "A-02 (b)", sortOrder: 5 },
        { code: "V-S-01", sortOrder: 6 },
      ])
      .returning({ id: schema.fabricTypes.id, code: schema.fabricTypes.code });
    const fabricIds = new Map(fabricRows.map((row) => [row.code, row.id]));

    const colorRows = await tx
      .insert(schema.colors)
      .values(
        colors.map((color) => ({
          fabricTypeId: fabricIds.get(color.fabric) ?? "",
          name: color.key,
          colorCode: color.code,
          hex: color.hex,
          sortOrder: color.sort,
        })),
      )
      .returning({ id: schema.colors.id, name: schema.colors.name });
    const colorIds = new Map(colorRows.map((row) => [row.name, row.id]));

    await tx.insert(schema.colorProducts).values(
      colorRows.flatMap((color) =>
        ["thobe", "kandora"].map((slug) => ({
          colorId: color.id,
          productId: productIds.get(slug) ?? "",
        })),
      ),
    );

    const typeRows = await tx
      .insert(schema.materialTypes)
      .values(materialTypes)
      .returning({ id: schema.materialTypes.id, name: schema.materialTypes.name });
    const typeIdByName = new Map(typeRows.map((row) => [row.name, row.id]));
    const typeIds = new Map<string, string>();
    for (const type of materialTypes) {
      typeIds.set(type.key, typeIdByName.get(type.name) ?? "");
    }

    const materialIds = new Map<string, string>();
    for (const material of materials) {
      const [row] = await tx
        .insert(schema.materials)
        .values({
          materialTypeId: typeIds.get(material.type) ?? "",
          code: material.code,
          name: material.name,
          unit: material.unit,
          minStock: material.min,
          sortOrder: materialSortOrder[material.key] ?? 0,
        })
        .returning({ id: schema.materials.id });
      if (!row) throw new Error(`Material ${material.key} gagal dibuat`);
      materialIds.set(material.key, row.id);
    }

    const stockRows = materials
      .filter((material) => Number(material.stock) !== 0)
      .map((material) => ({
        materialId: materialIds.get(material.key) ?? "",
        qty: material.stock,
        unit: material.unit,
        kind: "in" as const,
        referenceType: "seed",
        note: "Stok awal",
        createdBy: lea,
      }));
    if (stockRows.length > 0) {
      await tx.insert(schema.stockMovements).values(stockRows);
    }

    const slotRows = await tx
      .insert(schema.pairingSlots)
      .values([
        { name: "Benang Jahit", materialTypeId: typeIds.get("benangJahit") ?? "", sortOrder: 1 },
        { name: "Benang Obras", materialTypeId: typeIds.get("benangObras") ?? "", sortOrder: 2 },
        { name: "Benang Tarboosh", materialTypeId: typeIds.get("benangTarboosh") ?? "", sortOrder: 3 },
        { name: "Resleting Jepang", materialTypeId: typeIds.get("resleting") ?? "", sortOrder: 4 },
        { name: "Kancing Manset", materialTypeId: typeIds.get("kancingManset") ?? "", sortOrder: 5 },
      ])
      .returning({ id: schema.pairingSlots.id, name: schema.pairingSlots.name });
    const slotIds = new Map<string, string>();
    ["benangJahit", "benangObras", "benangTarboosh", "resleting", "kancingManset"].forEach(
      (key, index) => {
        slotIds.set(key, slotRows[index]?.id ?? "");
      },
    );

    await tx.insert(schema.colorPairings).values(
      pairings.map((pairing) => ({
        colorId: colorIds.get(pairing.color) ?? "",
        slotId: slotIds.get(pairing.slot) ?? "",
        primaryMaterialId: materialIds.get(pairing.primary) ?? null,
        backupMaterialId: pairing.backup
          ? materialIds.get(pairing.backup) ?? null
          : null,
      })),
    );

    await tx.insert(schema.unitConversions).values([
      { fromUnit: "lusin", toUnit: "cone", factor: "12", scope: "Benang" },
      { fromUnit: "gross", toUnit: "pcs", factor: "144", scope: "Kancing" },
      { fromUnit: "pak", toUnit: "pcs", factor: null, scope: "Resleting" },
    ]);

    await tx.insert(schema.expenseCategories).values([
      { name: "Pembelian bahan", isPurchase: true, sortOrder: 1 },
      { name: "Service mesin", requiresMachine: true, sortOrder: 2 },
      { name: "Sparepart", requiresMachine: true, sortOrder: 3 },
      { name: "Gas", sortOrder: 4 },
      { name: "Alat jahit", sortOrder: 5 },
      { name: "Lain-lain", sortOrder: 6 },
    ]);

    await tx.insert(schema.machines).values([
      { name: "Mesin Obras 1", type: "Obras", status: "active" },
      { name: "Mesin Jahit 1", type: "Jahit", status: "active" },
      { name: "Mesin Jahit 2", type: "Jahit", status: "active" },
      { name: "Mesin Lubang Kancing", type: "Lubang kancing", status: "broken" },
    ]);

    await tx.insert(schema.sizes).values(
      ["XS", "S", "M", "L", "XL", "XXL"].map((label, index) => ({
        label,
        sortOrder: index + 1,
      })),
    );

    await tx.insert(schema.appSettings).values([
      { key: "company_name", value: "SAMAQU" },
      { key: "po_prefix", value: "PO" },
    ]);

    const seriesRows = await tx
      .insert(schema.series)
      .values([
        {
          productId: productIds.get("thobe") ?? "",
          name: "Jiharkah",
          kind: "diproduksi",
          sortOrder: 1,
        },
        {
          productId: productIds.get("thobe") ?? "",
          name: "Nahawand",
          kind: "diproduksi",
          sortOrder: 2,
        },
        {
          productId: productIds.get("kandora") ?? "",
          name: "Tanpa series",
          kind: "diproduksi",
          sortOrder: 1,
        },
      ])
      .returning({ id: schema.series.id, name: schema.series.name });
    const seriesIds = new Map(seriesRows.map((row) => [row.name, row.id]));

    const derivedRows = await tx
      .insert(schema.series)
      .values([
        {
          productId: productIds.get("thobe") ?? "",
          name: "Imron",
          kind: "turunan",
          parentSeriesId: seriesIds.get("Jiharkah") ?? null,
          sortOrder: 3,
        },
        {
          productId: productIds.get("thobe") ?? "",
          name: "Bayati",
          kind: "turunan",
          parentSeriesId: seriesIds.get("Jiharkah") ?? null,
          sortOrder: 4,
        },
        {
          productId: productIds.get("thobe") ?? "",
          name: "Karim",
          kind: "turunan",
          parentSeriesId: seriesIds.get("Nahawand") ?? null,
          sortOrder: 5,
        },
        {
          productId: productIds.get("thobe") ?? "",
          name: "Imalah",
          kind: "turunan",
          parentSeriesId: seriesIds.get("Nahawand") ?? null,
          sortOrder: 6,
        },
      ])
      .returning({ id: schema.series.id, name: schema.series.name });
    for (const row of derivedRows) seriesIds.set(row.name, row.id);

    await tx.insert(schema.seriesAccessories).values([
      { seriesId: seriesIds.get("Imron") ?? "", materialId: materialIds.get("mDiamond") ?? "", qtyPerPiece: null, unit: "pcs", sortOrder: 1 },
      { seriesId: seriesIds.get("Bayati") ?? "", materialId: materialIds.get("mEyelet") ?? "", qtyPerPiece: null, unit: "pcs", sortOrder: 1 },
      { seriesId: seriesIds.get("Karim") ?? "", materialId: materialIds.get("mDiamond") ?? "", qtyPerPiece: null, unit: "pcs", sortOrder: 1 },
      { seriesId: seriesIds.get("Imalah") ?? "", materialId: materialIds.get("mPin") ?? "", qtyPerPiece: null, unit: "set", sortOrder: 1 },
    ]);

    const materialUnits = new Map(materials.map((material) => [material.key, material.unit]));

    const seedBom = async (
      productSlug: string,
      rows: RowSeed[],
    ) => {
      const productId = productIds.get(productSlug);
      if (!productId) throw new Error(`Produk ${productSlug} tidak ditemukan`);
      const productSeries = await tx
        .select({
          id: schema.series.id,
          name: schema.series.name,
          kind: schema.series.kind,
        })
        .from(schema.series)
        .where(eq(schema.series.productId, productId));
      const productionSeries = productSeries.filter(
        (row) => row.kind === "diproduksi",
      );

      const sectionNames = Array.from(new Set(rows.map((row) => row.section)));
      const sectionRows = await tx
        .insert(schema.bomSections)
        .values(
          sectionNames.map((name, index) => ({
            productId,
            name,
            sortOrder: index + 1,
          })),
        )
        .returning({ id: schema.bomSections.id, name: schema.bomSections.name });
      const sectionIds = new Map(sectionRows.map((row) => [row.name, row.id]));

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        if (!row) continue;
        const [rowRow] = await tx
          .insert(schema.bomRows)
          .values({
            productId,
            sectionId: sectionIds.get(row.section) ?? "",
            name: row.name,
            pattern: row.pattern,
            pairingSlotId: row.slot ? slotIds.get(row.slot) ?? null : null,
            sortOrder: index + 1,
          })
          .returning({ id: schema.bomRows.id });
        if (!rowRow) throw new Error(`Baris BOM ${row.name} gagal dibuat`);

        for (const seriesRow of productionSeries) {
          const cell =
            row.cells?.[seriesRow.name] ?? row.defaultCell ?? {};
          if (row.pattern === "size" && !row.cells?.[seriesRow.name]) {
            const [cellRow] = await tx
              .insert(schema.bomCells)
              .values({
                bomRowId: rowRow.id,
                seriesId: seriesRow.id,
                materialId: null,
                qtyPerPiece: null,
                unit: null,
              })
              .returning({ id: schema.bomCells.id });
            if (cellRow && row.sizeCells) {
              const sizeValues = Object.entries(row.sizeCells)
                .filter(([, sizeCell]) => sizeCell.material)
                .map(([size, sizeCell]) => ({
                  bomCellId: cellRow.id,
                  size,
                  materialId: materialIds.get(sizeCell.material ?? "") ?? null,
                  qtyPerPiece: sizeCell.qty ?? null,
                }));
              if (sizeValues.length > 0) {
                await tx.insert(schema.bomCellSizes).values(sizeValues);
              }
            }
            continue;
          }

          const materialKey = cell.material;
          const materialId = materialKey
            ? materialIds.get(materialKey) ?? null
            : null;
          const unit =
            cell.unit ??
            (materialKey ? materialUnits.get(materialKey) ?? null : null);
          await tx.insert(schema.bomCells).values({
            bomRowId: rowRow.id,
            seriesId: seriesRow.id,
            materialId,
            qtyPerPiece: cell.qty ?? null,
            unit,
            unused: cell.unused ?? false,
          });
        }
      }
    };

    await seedBom("thobe", thobeRows);
    await seedBom("kandora", kandoraRows);
  });

  console.log("Seed selesai.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
