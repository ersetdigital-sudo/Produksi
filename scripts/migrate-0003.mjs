import { Pool } from "pg";
process.loadEnvFile(".env.local");
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete("sslmode");
url.port = "5432";
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 1 });
const ddl = `
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_kind_check";
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_kind_check"
  CHECK ("kind" in ('purchase_in','in','out','production_out','production_return','assembly_out','opname','reserve','adjustment'));
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_qty_check";
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_qty_check"
  CHECK ("qty" <> 0 OR "kind" = 'reserve');
`;
await pool.query(ddl);
console.log("migration 0003 applied");
await pool.end();