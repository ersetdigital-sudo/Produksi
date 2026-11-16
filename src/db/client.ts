import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum diisi");
}

const parsedUrl = new URL(connectionString);
parsedUrl.searchParams.delete("sslmode");
const databaseUrl = parsedUrl.toString();

const globalForDb = globalThis as unknown as {
  samaquPool?: Pool;
};

const pool =
  globalForDb.samaquPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    // Supavisor memakai rantai sertifikat yang tidak ada di trust store runtime Next.
    // Koneksi tetap TLS; verifikasi cert dilewati. Ganti dengan CA pinning untuk produksi.
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.samaquPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
