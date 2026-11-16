# Prompt untuk agent coding

Kamu akan membangun Dashboard Produksi & Stok Bahan SAMAQU berdasarkan mockup di folder ini.

## Baca dulu
1. Baca BACA-DULU.md sampai habis: isinya aturan UI, model data, dan alur stok yang sudah disepakati.
2. Baca samaqu.css: ini sistem desain (token warna di :root, tombol, badge status, tab, drawer, tabel gaya sheet).
3. Buka setiap file .dc.html sebagai ACUAN, bukan kode untuk disalin. Isinya: markup + CSS per halaman + class Component berisi data contoh dan logika interaksi. File ini butuh runtime kanvas, jadi tidak bisa dibuka langsung di browser.
4. Folder screenshots/ (kalau ada) adalah tampilan asli tiap layar. Jadikan patokan visual utama.

Jangan mulai ngoding sebelum kamu bisa menjelaskan balik alur stok dan model series (diproduksi vs turunan) dengan kata-katamu sendiri.

## Stack
- Next.js versi stabil terbaru (cek dulu versinya), App Router, TypeScript strict.
- Server Components secara default; Client Component hanya untuk bagian interaktif (drawer, form, tab).
- Mutasi data lewat Server Actions; validasi input dengan Zod.
- Database: [isi pilihan: Supabase Postgres / lainnya]. Skema lewat file migrasi, bukan klik di dashboard.
- Styling: pakai ulang samaqu.css sebagai global CSS (token + komponen dasar), lalu CSS Modules per komponen. Jangan ganti warna, ukuran, radius, atau jarak. Font Plus Jakarta Sans via next/font.
- Tanpa library UI besar. Ikon cukup SVG inline seperti di mockup (atau satu library ikon garis yang mirip).

## Supaya hasilnya sama dengan mockup
- Teks, label, dan istilah persis seperti mockup (Bahasa Indonesia). Jangan diganti atau diterjemahkan.
- Status selalu teks + ikon: Aman / Menipis / Pakai cadangan / Habis.
- Form selalu di drawer (desktop) atau layar penuh / bottom sheet (mobile). Tidak ada form yang terbuka permanen di halaman.
- Sidebar sticky dan bisa diciutkan; hanya konten yang scroll; scrollbar menu disembunyikan.
- Tabel compact gaya Google Sheet; tab berwarna, bukan dropdown.
- Mobile 390px adalah prioritas. Desktop 1280px.
- Setelah tiap halaman selesai: ambil screenshot di 1280 dan 390, bandingkan dengan screenshot mockup, perbaiki selisihnya, lalu laporkan ke saya beserta screenshot-nya.
- Hati-hati nama class yang bentrok dengan samaqu.css (contoh: .hr sudah dipakai untuk garis pemisah).

## Supaya gampang di-maintain
- Struktur per fitur: app/(dashboard)/<halaman>, features/<fitur>/{components,actions,queries,schema}.ts, components/ui untuk komponen bersama (Drawer, Tabs, StatusBadge, SheetTable, Button, Field).
- Satu komponen satu tanggung jawab. Kalau pola muncul dua kali, jadikan komponen bersama.
- Data master (kain, warna, material, series, Bahan per Pcs, kategori pengeluaran, konversi satuan) disimpan di database, tidak di-hardcode. Series, warna, dan bahan baru harus bisa ditambah tanpa ubah kode.
- Logika stok (cadangkan, keluarkan, terima hasil, pasang aksesoris, pembelian jadi barang masuk) ada di satu modul server dan dicatat sebagai baris mutasi. Stok dihitung dari mutasi, bukan diedit langsung.
- Nama variabel dan fungsi dalam bahasa Inggris, teks UI dalam Bahasa Indonesia.
- Tulis tes untuk logika stok dan perhitungan kebutuhan bahan.

## Urutan kerja (berhenti dan lapor tiap fase)
1. Rencana: skema database, daftar route, daftar komponen bersama. Tunggu persetujuan saya.
2. Fondasi: layout, sidebar, komponen UI bersama, samaqu.css.
3. Data master: Katalog Warna, Stok Material, Pengaturan, Bahan per Pcs.
4. Alur stok: Mutasi Stok, Pengeluaran (Pembelian bahan), Jadwal Produksi (Lembar potong, Bahan, Terima hasil, cetak), Pasang Aksesoris.
5. Beranda dan Mesin.

## Yang belum diputuskan (jangan ditebak, tanya saya)
- Stok barang jadi dikirim ke ops (office.samaqu.id) atau disimpan lokal: ditunda, buat terpisah dulu.
- Angka yang ditulis [isi] di mockup.
- Login dan peran: Lea admin (input), Ardo dan Surya owner, Pak Manto lihat saja.
