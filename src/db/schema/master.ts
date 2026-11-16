import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type UserRole = "admin" | "owner" | "viewer";
export type MaterialGroup =
  | "warna"
  | "kain_keras"
  | "penguat"
  | "label"
  | "packing"
  | "aksesoris";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    role: text("role").$type<UserRole>().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check("users_role_check", sql`${table.role} in ('admin','owner','viewer')`)],
);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const fabricTypes = pgTable("fabric_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const colors = pgTable("colors", {
  id: uuid("id").primaryKey().defaultRandom(),
  fabricTypeId: uuid("fabric_type_id")
    .notNull()
    .references(() => fabricTypes.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  colorCode: text("color_code").notNull(),
  hex: text("hex").notNull(),
  photoPath: text("photo_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const colorProducts = pgTable(
  "color_products",
  {
    colorId: uuid("color_id")
      .notNull()
      .references(() => colors.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.colorId, table.productId] })],
);

export const materialTypes = pgTable("material_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  group: text("group").$type<MaterialGroup>().notNull(),
  unit: text("unit").notNull(),
  defaultMin: numeric("default_min", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    materialTypeId: uuid("material_type_id")
      .notNull()
      .references(() => materialTypes.id, { onDelete: "restrict" }),
    code: text("code"),
    name: text("name"),
    unit: text("unit").notNull(),
    minStock: numeric("min_stock", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    note: text("note"),
  },
  (table) => [
    uniqueIndex("materials_type_code_unique").on(
      table.materialTypeId,
      table.code,
    ),
  ],
);

export const pairingSlots = pgTable("pairing_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  materialTypeId: uuid("material_type_id")
    .notNull()
    .references(() => materialTypes.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const colorPairings = pgTable(
  "color_pairings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    colorId: uuid("color_id")
      .notNull()
      .references(() => colors.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => pairingSlots.id, { onDelete: "cascade" }),
    primaryMaterialId: uuid("primary_material_id").references(
      () => materials.id,
      { onDelete: "restrict" },
    ),
    backupMaterialId: uuid("backup_material_id").references(
      () => materials.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    uniqueIndex("color_pairings_color_slot_unique").on(
      table.colorId,
      table.slotId,
    ),
  ],
);

export const unitConversions = pgTable("unit_conversions", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUnit: text("from_unit").notNull(),
  toUnit: text("to_unit").notNull(),
  factor: numeric("factor", { precision: 12, scale: 3 }),
  scope: text("scope").notNull(),
  active: boolean("active").notNull().default(true),
});

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  requiresMachine: boolean("requires_machine").notNull().default(false),
  isPurchase: boolean("is_purchase").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const machines = pgTable("machines", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  brand: text("brand"),
  purchaseYear: integer("purchase_year"),
  status: text("status").$type<"active" | "broken">().notNull().default("active"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sizes = pgTable("sizes", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
