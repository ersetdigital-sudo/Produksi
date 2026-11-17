# SAMAQU Produksi

Dashboard produksi dan stok bahan SAMAQU. Dibangun dari mockup desain
(`D6-Mesin.dc.html` dan `M6-Mesin.dc.html` masih disimpan sebagai acuan untuk
halaman Mesin yang belum dikerjakan; mockup halaman lain sudah dikonversi dan
dihapus).

## Stack

- Next.js 16.4.6 (App Router, Turbopack) + React 19 + TypeScript strict
- Server Components default, Client Component hanya untuk bagian interaktif
- Server Actions + Zod untuk semua mutasi
- Supabase Postgres + Drizzle ORM (`pg` driver), migrasi berupa file SQL di `drizzle/`
- `samaqu.css` sebagai global CSS, CSS Modules untuk layout komponen
- Plus Jakarta Sans + JetBrains Mono lewat `next/font`

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi kredensial Supabase
npm run dev
```

Buka `http://localhost:3000`.

> Catatan mesin ini: npm disetel `omit=dev` dan `NODE_ENV=production`, jadi
> pasang dependensi pengembangan dengan `npm install --include=dev`.

Perintah lain:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Database

```bash
npm run db:generate   # schema Drizzle -> file SQL di drizzle/
npm run db:migrate    # jalankan migrasi lewat pooler Supabase
npm run db:seed       # isi data master awal
```

Aplikasi memakai driver `pg`. Supabase Supavisor memakai rantai sertifikat yang
tidak ada di trust store runtime Next, jadi `sslmode` dihapus dari URL dan
verifikasi sertifikat dimatikan di `src/db/client.ts`. Untuk produksi, ganti
dengan CA pinning.

## Perbandingan mockup

`scripts/render-mockup.mjs` merender file `.dc.html` (mengisi template dan
`sc-if`/`sc-for`) menjadi HTML berdiri sendiri, supaya bisa di-screenshot
berdampingan dengan hasil aplikasi.

```bash
node scripts/render-mockup.mjs D6-Mesin.dc.html <output.html>
```

## Struktur

```
src/app/(dashboard)      halaman + shell
src/components/ui        komponen bersama (Drawer, Tabs, SheetTable, ...)
src/components/shell     sidebar, tab bar mobile, AppShell
src/features/<fitur>     queries, actions, schema, components
src/features/stock       satu modul aturan stok + perhitungan kebutuhan bahan
src/db                   client, schema Drizzle, seed
drizzle/                 file migrasi SQL
```

## Tangkapan layar

Setelah tiap halaman selesai, screenshot 1280 dan 390 disimpan di
`docs/screenshots/` (tidak di-commit).
