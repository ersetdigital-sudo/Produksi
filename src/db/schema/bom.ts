import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { materials, pairingSlots, products } from "./master";

export type SeriesKind = "diproduksi" | "turunan";
export type BomPattern = "warna" | "size" | "series" | "sama";

export const series = pgTable(
  "series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    kind: text("kind").$type<SeriesKind>().notNull(),
    parentSeriesId: uuid("parent_series_id").references(
      (): AnyPgColumn => series.id,
      { onDelete: "restrict" },
    ),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("series_product_name_unique").on(table.productId, table.name),
    check("series_kind_check", sql`${table.kind} in ('diproduksi','turunan')`),
    check(
      "series_parent_check",
      sql`(${table.kind} = 'diproduksi' and ${table.parentSeriesId} is null) or (${table.kind} = 'turunan' and ${table.parentSeriesId} is not null)`,
    ),
  ],
);

export const seriesAccessories = pgTable("series_accessories", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "restrict" }),
  qtyPerPiece: numeric("qty_per_piece", { precision: 12, scale: 3 }),
  unit: text("unit").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bomSections = pgTable(
  "bom_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("bom_sections_product_name_unique").on(
      table.productId,
      table.name,
    ),
  ],
);

export const bomRows = pgTable(
  "bom_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => bomSections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    pattern: text("pattern").$type<BomPattern>().notNull(),
    pairingSlotId: uuid("pairing_slot_id").references(() => pairingSlots.id, {
      onDelete: "restrict",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    check(
      "bom_rows_pattern_check",
      sql`${table.pattern} in ('warna','size','series','sama')`,
    ),
    check(
      "bom_rows_slot_check",
      sql`${table.pattern} <> 'warna' or ${table.pairingSlotId} is not null`,
    ),
  ],
);

export const bomCells = pgTable(
  "bom_cells",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bomRowId: uuid("bom_row_id")
      .notNull()
      .references(() => bomRows.id, { onDelete: "cascade" }),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    materialId: uuid("material_id").references(() => materials.id, {
      onDelete: "restrict",
    }),
    qtyPerPiece: numeric("qty_per_piece", { precision: 12, scale: 3 }),
    unit: text("unit"),
    unused: boolean("unused").notNull().default(false),
    note: text("note"),
  },
  (table) => [
    uniqueIndex("bom_cells_row_series_unique").on(
      table.bomRowId,
      table.seriesId,
    ),
  ],
);

export const bomCellSizes = pgTable(
  "bom_cell_sizes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bomCellId: uuid("bom_cell_id")
      .notNull()
      .references(() => bomCells.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    materialId: uuid("material_id").references(() => materials.id, {
      onDelete: "restrict",
    }),
    qtyPerPiece: numeric("qty_per_piece", { precision: 12, scale: 3 }),
  },
  (table) => [
    uniqueIndex("bom_cell_sizes_cell_size_unique").on(
      table.bomCellId,
      table.size,
    ),
  ],
);
