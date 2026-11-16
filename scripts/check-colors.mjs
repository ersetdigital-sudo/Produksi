import { Pool } from "pg";
process.loadEnvFile(".env.local");
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete("sslmode");
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 1 });
const rows = await pool.query(`select id, name, color_code, hex from colors order by sort_order`);
console.log(rows.rows.map((r) => `${r.name} | ${r.color_code} | ${r.hex}`).join("\n"));
await pool.end();