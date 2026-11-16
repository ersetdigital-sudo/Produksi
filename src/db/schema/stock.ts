import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  numeric,
  pgTable,
  pgView,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { colors, materials, users } from "./master";
import { series } from "./bom";

export type StockMovementKind =
  | "purchase_in"
  | "in"
  | "out"
  | "production_out"
  | "production_return"
  | "assembly_out"
  | "opname"
  | "reserve"
  | "adjustment";

export type FinishedGoodsKind =
  | "production_in"
  | "assembly_in"
  | "assembly_out"
  | "opname"
  | "adjustment";

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
    unit: text("unit").notNull(),
    kind: text("kind").$type<StockMovementKind>().notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    colorId: uuid("color_id").references(() => colors.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "stock_movements_kind_check",
      sql`${table.kind} in ('purchase_in','in','out','production_out','production_return','assembly_out','opname','adjustment')`,
    ),
    check("stock_movements_qty_check", sql`${table.qty} <> 0`),
  ],
);

export const finishedGoodsMovements = pgTable(
  "finished_goods_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "restrict" }),
    colorId: uuid("color_id")
      .notNull()
      .references(() => colors.id, { onDelete: "restrict" }),
    size: text("size").notNull(),
    qty: integer("qty").notNull(),
    kind: text("kind").$type<FinishedGoodsKind>().notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "finished_goods_movements_kind_check",
      sql`${table.kind} in ('production_in','assembly_in','assembly_out','opname','adjustment')`,
    ),
    check("finished_goods_movements_qty_check", sql`${table.qty} <> 0`),
  ],
);

export const accessoryAssemblies = pgTable("accessory_assemblies", {
  id: uuid("id").primaryKey().defaultRandom(),
  assembledAt: date("assembled_at", { mode: "string" }).notNull(),
  childSeriesId: uuid("child_series_id")
    .notNull()
    .references(() => series.id, { onDelete: "restrict" }),
  parentSeriesId: uuid("parent_series_id")
    .notNull()
    .references(() => series.id, { onDelete: "restrict" }),
  colorId: uuid("color_id")
    .notNull()
    .references(() => colors.id, { onDelete: "restrict" }),
  size: text("size").notNull(),
  qty: integer("qty").notNull(),
  orderNo: text("order_no"),
  note: text("note"),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "restrict",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accessoryAssemblyItems = pgTable("accessory_assembly_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  assemblyId: uuid("assembly_id")
    .notNull()
    .references(() => accessoryAssemblies.id, { onDelete: "cascade" }),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id, { onDelete: "restrict" }),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit").notNull(),
});

export const materialStockView = pgView("v_material_stock", {
  materialId: uuid("material_id").notNull(),
  unit: text("unit").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
}).existing();

export const finishedGoodsStockView = pgView("v_finished_goods_stock", {
  seriesId: uuid("series_id").notNull(),
  colorId: uuid("color_id").notNull(),
  size: text("size").notNull(),
  qty: integer("qty").notNull(),
}).existing();

export const materialAvailabilityView = pgView("v_material_availability", {
  materialId: uuid("material_id").notNull(),
  unit: text("unit").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
  reservedQty: numeric("reserved_qty", { precision: 12, scale: 3 }).notNull(),
  availableQty: numeric("available_qty", {
    precision: 12,
    scale: 3,
  }).notNull(),
}).existing();
