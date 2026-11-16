-- Read models: stok selalu dihitung dari mutasi.
CREATE VIEW "v_material_stock" WITH (security_invoker = true) AS
SELECT
  m."id" AS material_id,
  m."unit" AS unit,
  COALESCE(SUM(sm."qty"), 0)::numeric(12, 3) AS qty
FROM "materials" m
LEFT JOIN "stock_movements" sm ON sm."material_id" = m."id"
GROUP BY m."id", m."unit";
--> statement-breakpoint
CREATE VIEW "v_finished_goods_stock" WITH (security_invoker = true) AS
SELECT
  fg."series_id" AS series_id,
  fg."color_id" AS color_id,
  fg."size" AS size,
  COALESCE(SUM(fg."qty"), 0)::integer AS qty
FROM "finished_goods_movements" fg
GROUP BY fg."series_id", fg."color_id", fg."size";
--> statement-breakpoint
CREATE VIEW "v_material_availability" WITH (security_invoker = true) AS
SELECT
  s."material_id" AS material_id,
  s."unit" AS unit,
  s."qty" AS qty,
  COALESCE(r."reserved_qty", 0)::numeric(12, 3) AS reserved_qty,
  (s."qty" - COALESCE(r."reserved_qty", 0))::numeric(12, 3) AS available_qty
FROM "v_material_stock" s
LEFT JOIN (
  SELECT
    pr."material_id" AS material_id,
    SUM(pr."reserved_qty") AS reserved_qty
  FROM "plan_material_requirements" pr
  WHERE pr."status" = 'reserved'
  GROUP BY pr."material_id"
) r ON r."material_id" = s."material_id";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_material_idx"
  ON "stock_movements" ("material_id", "occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finished_goods_stock_idx"
  ON "finished_goods_movements" ("series_id", "color_id", "size");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_plan_lines_plan_idx"
  ON "production_plan_lines" ("plan_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_results_line_idx"
  ON "plan_results" ("plan_line_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_date_idx"
  ON "expenses" ("expense_date" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_machine_idx"
  ON "expenses" ("machine_id", "expense_date" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "color_pairings_color_idx"
  ON "color_pairings" ("color_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_type_idx"
  ON "materials" ("material_type_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bom_cells_row_idx"
  ON "bom_cells" ("bom_row_id");
--> statement-breakpoint
-- Aplikasi memakai koneksi Postgres langsung. Data API tidak diberi akses.
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.tablename);
  END LOOP;
END $$;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
