import { sql } from "drizzle-orm";
import {
  check,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  expenseCategories,
  machines,
  materials,
  users,
} from "./master";

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    machineId: uuid("machine_id").references(() => machines.id, {
      onDelete: "set null",
    }),
    technician: text("technician"),
    description: text("description"),
    receiptPath: text("receipt_path"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check("expenses_amount_check", sql`${table.amount} >= 0`)],
);

export const expenseItems = pgTable(
  "expense_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expenseId: uuid("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    qtyPurchase: numeric("qty_purchase", { precision: 12, scale: 3 }).notNull(),
    purchaseUnit: text("purchase_unit").notNull(),
    conversionFactor: numeric("conversion_factor", {
      precision: 12,
      scale: 3,
    }),
    qtyStock: numeric("qty_stock", { precision: 12, scale: 3 }).notNull(),
    stockUnit: text("stock_unit").notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }),
    amount: numeric("amount", { precision: 14, scale: 2 }),
  },
  (table) => [
    check("expense_items_qty_check", sql`${table.qtyStock} > 0`),
  ],
);
