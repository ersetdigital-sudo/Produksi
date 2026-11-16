import { Pool } from "pg";
process.loadEnvFile(".env.local");
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete("sslmode");
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 1 });
const assemblies = await pool.query("select id from accessory_assemblies order by created_at");
const ids = assemblies.rows.map((r) => r.id);
if (ids.length) {
  await pool.query("delete from finished_goods_movements where reference_type = 'assembly' and reference_id = any($1)", [ids]);
  await pool.query("delete from stock_movements where reference_type = 'assembly' and reference_id = any($1)", [ids]);
  await pool.query("delete from accessory_assembly_items where assembly_id = any($1)", [ids]);
  await pool.query("delete from accessory_assemblies where id = any($1)", [ids]);
}
console.log("cleared assemblies:", ids.length);
await pool.end();