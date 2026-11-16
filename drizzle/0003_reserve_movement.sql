-- Mutasi cadangan: reserve dicatat sebagai baris mutasi (qty 0, tidak mengubah stok).
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_kind_check";
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_kind_check"
  CHECK ("kind" in ('purchase_in','in','out','production_out','production_return','assembly_out','opname','reserve','adjustment'));
--> statement-breakpoint
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_qty_check";
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_qty_check"
  CHECK ("qty" <> 0 OR "kind" = 'reserve');
