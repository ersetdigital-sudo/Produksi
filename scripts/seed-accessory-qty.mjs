import { Pool } from "pg";
process.loadEnvFile(".env.local");
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete("sslmode");
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, max: 1 });
// Fill accessory qty per piece per mockup D10: Imron 6, Bayati 2, Karim 6, Imalah 1.
await pool.query(
  `update series_accessories sa
     set qty_per_piece = case
       when s.name = 'Imron' then 6
       when s.name = 'Bayati' then 2
       when s.name = 'Karim' then 6
       when s.name = 'Imalah' then 1
     end
   from series s
   where sa.series_id = s.id and s.kind = 'turunan'`,
);
console.log("accessory qty seeded");
await pool.end();