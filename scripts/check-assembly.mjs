import { Pool } from "pg";
process.loadEnvFile(".env.local");
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete("sslmode");
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 1 });

const asm = await pool.query(
  `select a.assembled_at::text, a.size, a.qty, cs.name as child, ps.name as parent, c.name as color
   from accessory_assemblies a
   join series cs on cs.id = a.child_series_id
   join series ps on ps.id = a.parent_series_id
   join colors c on c.id = a.color_id
   order by a.created_at desc limit 3`,
);
const mov = await pool.query(
  `select kind, qty, reference_type from finished_goods_movements order by created_at desc limit 4`,
);
const sm = await pool.query(
  `select kind, qty, unit, note from stock_movements where kind='assembly_out' order by created_at desc limit 3`,
);
console.log("assemblies", JSON.stringify(asm.rows));
console.log("finished", JSON.stringify(mov.rows));
console.log("stock", JSON.stringify(sm.rows));
await pool.end();