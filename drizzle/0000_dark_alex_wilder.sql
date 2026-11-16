CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "color_pairings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"color_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"primary_material_id" uuid,
	"backup_material_id" uuid
);
--> statement-breakpoint
CREATE TABLE "color_products" (
	"color_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "color_products_color_id_product_id_pk" PRIMARY KEY("color_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "colors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fabric_type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color_code" text NOT NULL,
	"hex" text NOT NULL,
	"photo_path" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"requires_machine" boolean DEFAULT false NOT NULL,
	"is_purchase" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fabric_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "fabric_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"brand" text,
	"purchase_year" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"group" text NOT NULL,
	"unit" text NOT NULL,
	"default_min" numeric(12, 3) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_type_id" uuid NOT NULL,
	"code" text,
	"name" text,
	"unit" text NOT NULL,
	"min_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "pairing_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"material_type_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "sizes_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "unit_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_unit" text NOT NULL,
	"to_unit" text NOT NULL,
	"factor" numeric(12, 3),
	"scope" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('admin','owner','viewer'))
);
--> statement-breakpoint
CREATE TABLE "bom_cell_sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bom_cell_id" uuid NOT NULL,
	"size" text NOT NULL,
	"material_id" uuid,
	"qty_per_piece" numeric(12, 3)
);
--> statement-breakpoint
CREATE TABLE "bom_cells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bom_row_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"material_id" uuid,
	"qty_per_piece" numeric(12, 3),
	"unit" text,
	"unused" boolean DEFAULT false NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "bom_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"name" text NOT NULL,
	"pattern" text NOT NULL,
	"pairing_slot_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "bom_rows_pattern_check" CHECK ("bom_rows"."pattern" in ('warna','size','series','sama')),
	CONSTRAINT "bom_rows_slot_check" CHECK ("bom_rows"."pattern" <> 'warna' or "bom_rows"."pairing_slot_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "bom_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"parent_series_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "series_kind_check" CHECK ("series"."kind" in ('diproduksi','turunan')),
	CONSTRAINT "series_parent_check" CHECK (("series"."kind" = 'diproduksi' and "series"."parent_series_id" is null) or ("series"."kind" = 'turunan' and "series"."parent_series_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "series_accessories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"qty_per_piece" numeric(12, 3),
	"unit" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_material_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"required_qty" numeric(12, 3) NOT NULL,
	"unit" text NOT NULL,
	"reserved_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"consumed_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"returned_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"used_backup" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	CONSTRAINT "plan_material_requirements_status_check" CHECK ("plan_material_requirements"."status" in ('reserved','released','consumed'))
);
--> statement-breakpoint
CREATE TABLE "plan_requirement_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_line_id" uuid NOT NULL,
	"bom_row_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"detail" text
);
--> statement-breakpoint
CREATE TABLE "plan_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_line_id" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pass_qty" integer DEFAULT 0 NOT NULL,
	"defect_qty" integer DEFAULT 0 NOT NULL,
	"defect_reason" text,
	"defect_action" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_results_qty_check" CHECK ("plan_results"."pass_qty" >= 0 and "plan_results"."defect_qty" >= 0),
	CONSTRAINT "plan_results_defect_check" CHECK ("plan_results"."defect_qty" = 0 or ("plan_results"."defect_reason" is not null and "plan_results"."defect_action" is not null and "plan_results"."defect_action" in ('repair','reject')))
);
--> statement-breakpoint
CREATE TABLE "po_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_plan_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"color_id" uuid NOT NULL,
	"size" text NOT NULL,
	"qty" integer NOT NULL,
	"cut_done" boolean DEFAULT false NOT NULL,
	"cut_at" timestamp with time zone,
	"tailor_name" text,
	"sewing_paid" boolean DEFAULT false NOT NULL,
	"line_done" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "production_plan_lines_qty_check" CHECK ("production_plan_lines"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "production_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"plan_date" date NOT NULL,
	"note" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"approved_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_plans_po_number_unique" UNIQUE("po_number"),
	CONSTRAINT "production_plans_status_check" CHECK ("production_plans"."status" in ('draft','reserved','running','done','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "accessory_assemblies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assembled_at" date NOT NULL,
	"child_series_id" uuid NOT NULL,
	"parent_series_id" uuid NOT NULL,
	"color_id" uuid NOT NULL,
	"size" text NOT NULL,
	"qty" integer NOT NULL,
	"order_no" text,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_assembly_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assembly_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"unit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finished_goods_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"color_id" uuid NOT NULL,
	"size" text NOT NULL,
	"qty" integer NOT NULL,
	"kind" text NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finished_goods_movements_kind_check" CHECK ("finished_goods_movements"."kind" in ('production_in','assembly_in','assembly_out','opname','adjustment')),
	CONSTRAINT "finished_goods_movements_qty_check" CHECK ("finished_goods_movements"."qty" <> 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"qty" numeric(12, 3) NOT NULL,
	"unit" text NOT NULL,
	"kind" text NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"color_id" uuid,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_kind_check" CHECK ("stock_movements"."kind" in ('purchase_in','in','out','production_out','production_return','assembly_out','opname','adjustment')),
	CONSTRAINT "stock_movements_qty_check" CHECK ("stock_movements"."qty" <> 0)
);
--> statement-breakpoint
CREATE TABLE "expense_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"qty_purchase" numeric(12, 3) NOT NULL,
	"purchase_unit" text NOT NULL,
	"conversion_factor" numeric(12, 3),
	"qty_stock" numeric(12, 3) NOT NULL,
	"stock_unit" text NOT NULL,
	"unit_price" numeric(14, 2),
	"amount" numeric(14, 2),
	CONSTRAINT "expense_items_qty_check" CHECK ("expense_items"."qty_stock" > 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_date" date NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"machine_id" uuid,
	"technician" text,
	"description" text,
	"receipt_path" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "color_pairings" ADD CONSTRAINT "color_pairings_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color_pairings" ADD CONSTRAINT "color_pairings_slot_id_pairing_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."pairing_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color_pairings" ADD CONSTRAINT "color_pairings_primary_material_id_materials_id_fk" FOREIGN KEY ("primary_material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color_pairings" ADD CONSTRAINT "color_pairings_backup_material_id_materials_id_fk" FOREIGN KEY ("backup_material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color_products" ADD CONSTRAINT "color_products_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "color_products" ADD CONSTRAINT "color_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colors" ADD CONSTRAINT "colors_fabric_type_id_fabric_types_id_fk" FOREIGN KEY ("fabric_type_id") REFERENCES "public"."fabric_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_material_type_id_material_types_id_fk" FOREIGN KEY ("material_type_id") REFERENCES "public"."material_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_slots" ADD CONSTRAINT "pairing_slots_material_type_id_material_types_id_fk" FOREIGN KEY ("material_type_id") REFERENCES "public"."material_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_cell_sizes" ADD CONSTRAINT "bom_cell_sizes_bom_cell_id_bom_cells_id_fk" FOREIGN KEY ("bom_cell_id") REFERENCES "public"."bom_cells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_cell_sizes" ADD CONSTRAINT "bom_cell_sizes_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_cells" ADD CONSTRAINT "bom_cells_bom_row_id_bom_rows_id_fk" FOREIGN KEY ("bom_row_id") REFERENCES "public"."bom_rows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_cells" ADD CONSTRAINT "bom_cells_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_cells" ADD CONSTRAINT "bom_cells_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_rows" ADD CONSTRAINT "bom_rows_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_rows" ADD CONSTRAINT "bom_rows_section_id_bom_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."bom_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_rows" ADD CONSTRAINT "bom_rows_pairing_slot_id_pairing_slots_id_fk" FOREIGN KEY ("pairing_slot_id") REFERENCES "public"."pairing_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_sections" ADD CONSTRAINT "bom_sections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_parent_series_id_series_id_fk" FOREIGN KEY ("parent_series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_accessories" ADD CONSTRAINT "series_accessories_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_accessories" ADD CONSTRAINT "series_accessories_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_material_requirements" ADD CONSTRAINT "plan_material_requirements_plan_id_production_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."production_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_material_requirements" ADD CONSTRAINT "plan_material_requirements_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_requirement_issues" ADD CONSTRAINT "plan_requirement_issues_plan_id_production_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."production_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_requirement_issues" ADD CONSTRAINT "plan_requirement_issues_plan_line_id_production_plan_lines_id_fk" FOREIGN KEY ("plan_line_id") REFERENCES "public"."production_plan_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_requirement_issues" ADD CONSTRAINT "plan_requirement_issues_bom_row_id_bom_rows_id_fk" FOREIGN KEY ("bom_row_id") REFERENCES "public"."bom_rows"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_results" ADD CONSTRAINT "plan_results_plan_line_id_production_plan_lines_id_fk" FOREIGN KEY ("plan_line_id") REFERENCES "public"."production_plan_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_results" ADD CONSTRAINT "plan_results_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_plan_lines" ADD CONSTRAINT "production_plan_lines_plan_id_production_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."production_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_plan_lines" ADD CONSTRAINT "production_plan_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_plan_lines" ADD CONSTRAINT "production_plan_lines_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_plan_lines" ADD CONSTRAINT "production_plan_lines_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_plans" ADD CONSTRAINT "production_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_assemblies" ADD CONSTRAINT "accessory_assemblies_child_series_id_series_id_fk" FOREIGN KEY ("child_series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_assemblies" ADD CONSTRAINT "accessory_assemblies_parent_series_id_series_id_fk" FOREIGN KEY ("parent_series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_assemblies" ADD CONSTRAINT "accessory_assemblies_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_assemblies" ADD CONSTRAINT "accessory_assemblies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_assembly_items" ADD CONSTRAINT "accessory_assembly_items_assembly_id_accessory_assemblies_id_fk" FOREIGN KEY ("assembly_id") REFERENCES "public"."accessory_assemblies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_assembly_items" ADD CONSTRAINT "accessory_assembly_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods_movements" ADD CONSTRAINT "finished_goods_movements_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods_movements" ADD CONSTRAINT "finished_goods_movements_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finished_goods_movements" ADD CONSTRAINT "finished_goods_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "color_pairings_color_slot_unique" ON "color_pairings" USING btree ("color_id","slot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "materials_type_code_unique" ON "materials" USING btree ("material_type_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "bom_cell_sizes_cell_size_unique" ON "bom_cell_sizes" USING btree ("bom_cell_id","size");--> statement-breakpoint
CREATE UNIQUE INDEX "bom_cells_row_series_unique" ON "bom_cells" USING btree ("bom_row_id","series_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bom_sections_product_name_unique" ON "bom_sections" USING btree ("product_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "series_product_name_unique" ON "series" USING btree ("product_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_material_requirements_plan_material_unique" ON "plan_material_requirements" USING btree ("plan_id","material_id");