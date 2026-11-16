import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { colors, materials, products, users } from "./master";
import { bomRows, series } from "./bom";

export type PlanStatus = "draft" | "reserved" | "running" | "done" | "cancelled";
export type RequirementStatus = "reserved" | "released" | "consumed";
export type DefectAction = "repair" | "reject";

export const poCounters = pgTable("po_counters", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
});

export const productionPlans = pgTable(
  "production_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poNumber: text("po_number").notNull().unique(),
    planDate: date("plan_date", { mode: "string" }).notNull(),
    note: text("note"),
    status: text("status").$type<PlanStatus>().notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "production_plans_status_check",
      sql`${table.status} in ('draft','reserved','running','done','cancelled')`,
    ),
  ],
);

export const productionPlanLines = pgTable(
  "production_plan_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => productionPlans.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "restrict" }),
    colorId: uuid("color_id")
      .notNull()
      .references(() => colors.id, { onDelete: "restrict" }),
    size: text("size").notNull(),
    qty: integer("qty").notNull(),
    cutDone: boolean("cut_done").notNull().default(false),
    cutAt: timestamp("cut_at", { withTimezone: true }),
    tailorName: text("tailor_name"),
    sewingPaid: boolean("sewing_paid").notNull().default(false),
    lineDone: boolean("line_done").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [check("production_plan_lines_qty_check", sql`${table.qty} > 0`)],
);

export const planMaterialRequirements = pgTable(
  "plan_material_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => productionPlans.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    requiredQty: numeric("required_qty", { precision: 12, scale: 3 }).notNull(),
    unit: text("unit").notNull(),
    reservedQty: numeric("reserved_qty", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    consumedQty: numeric("consumed_qty", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    returnedQty: numeric("returned_qty", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    usedBackup: boolean("used_backup").notNull().default(false),
    status: text("status")
      .$type<RequirementStatus>()
      .notNull()
      .default("reserved"),
  },
  (table) => [
    uniqueIndex("plan_material_requirements_plan_material_unique").on(
      table.planId,
      table.materialId,
    ),
    check(
      "plan_material_requirements_status_check",
      sql`${table.status} in ('reserved','released','consumed')`,
    ),
  ],
);

export const planRequirementIssues = pgTable("plan_requirement_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => productionPlans.id, { onDelete: "cascade" }),
  planLineId: uuid("plan_line_id")
    .notNull()
    .references(() => productionPlanLines.id, { onDelete: "cascade" }),
  bomRowId: uuid("bom_row_id")
    .notNull()
    .references(() => bomRows.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  detail: text("detail"),
});

export const planResults = pgTable(
  "plan_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planLineId: uuid("plan_line_id")
      .notNull()
      .references(() => productionPlanLines.id, { onDelete: "cascade" }),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    passQty: integer("pass_qty").notNull().default(0),
    defectQty: integer("defect_qty").notNull().default(0),
    defectReason: text("defect_reason"),
    defectAction: text("defect_action").$type<DefectAction>(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "plan_results_qty_check",
      sql`${table.passQty} >= 0 and ${table.defectQty} >= 0`,
    ),
    check(
      "plan_results_defect_check",
      sql`${table.defectQty} = 0 or (${table.defectReason} is not null and ${table.defectAction} is not null and ${table.defectAction} in ('repair','reject'))`,
    ),
  ],
);
