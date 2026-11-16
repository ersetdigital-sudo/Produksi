# Mockup Dashboard Produksi SAMAQU — catatan untuk agent

Ini MOCKUP desain, bukan kode produksi. File .dc.html berisi markup (template dengan {{hole}}) + CSS + logika contoh (class Component di bagian bawah). Pakai sebagai acuan tampilan, istilah, dan alur. Semua angka adalah data contoh; teks [dalam kurung siku] = placeholder yang belum ada datanya.

## Halaman (D = desktop 1280, M = mobile 390)
- Main: riset warna & sistem desain (token warna ada di samaqu.css :root)
- 1 Beranda · 2 Katalog Warna · 3 Stok Material · 4 Mutasi Stok
- 5 Pengeluaran (+ M5b form catat) · 6 Mesin · 7 Pengaturan
- 8 Jadwal Produksi (tab Lembar potong / Bahan / Terima hasil, cetak lembar potong)
- 10 Pasang Aksesoris (D10/M10) · 9 Bahan per Pcs (D9)

## Aturan UI
- Bahasa Indonesia, tanpa emoji, kontras WCAG AA.
- Status selalu teks + ikon: Aman / Menipis / Pakai cadangan / Habis.
- Stok kurang = peringatan, tapi tetap boleh simpan.
- Form selalu di drawer/overlay (desktop) atau layar penuh / bottom sheet (mobile).
- Tabel gaya sheet yang compact; tab berwarna, bukan dropdown.

## Model data yang disepakati
- 3 daftar master: Kain (jenis kain + warna), Material (kode + stok), Pasangan (warna -> kode per slot, boleh ada cadangan).
- Series: jenis `diproduksi` (Jiharkah, Nahawand, edisi baru ditambah via data + "salin dari") atau `turunan` (induk + aksesoris):
  Imron = Jiharkah + kancing diamond, Bayati = Jiharkah + eyelet, Karim = Nahawand + kancing diamond, Imalah = Nahawand + pin collar. Series punya flag aktif.
- Bahan per Pcs = matriks per produk: baris = bagian/item, kolom = series diproduksi. Pola baris: ikut warna kain, ikut size, beda per series, sama semua. Sel boleh "tidak dipakai".
  Kain keras: Jiharkah kerah 750 GSM double lem; Nahawand kerah 750 GSM single lem; plaket & klep 750 GSM single lem; kantong Babud M90; manset Tangerine M33.
- Kemasan kirim (box, wrapping, kartu ucapan) TIDAK di Bahan per Pcs; terpotong saat pesanan dikemas.
- Saran skema: series(produk, nama, jenis, induk, aktif); baris_bahan(produk, bagian, pola); isi_sel(baris x series -> item, qty | tidak dipakai); aksesoris_turunan(series, item, qty).

## Alur stok
1. Pengeluaran kategori "Pembelian bahan" (banyak baris item) -> otomatis barang masuk di Mutasi Stok, dengan konversi satuan (mis. 1 gross = 144 pcs).
2. Jadwal Produksi: Draft -> Disetujui (bahan dicadangkan) -> Berjalan (bahan keluar, mutasi "Keluar ke produksi PO ...") -> Selesai.
3. Terima hasil per baris jadwal: lolos + defect + belum diterima = target. Defect wajib alasan + tindak lanjut (Perbaikan/Reject). Boleh bertahap. Tandai selesai diblokir selama ada selisih. Sisa bahan bisa dikembalikan.
4. Barang jadi masuk rak HANYA lewat Terima hasil (yang lolos).
5. Pasang Aksesoris: ambil baju dari rak series induk + kurangi stok aksesoris -> jadi series turunan. Tidak lewat Jadwal Produksi.

## Belum diputuskan
- Stok barang jadi: kirim otomatis ke ops (office.samaqu.id) atau disimpan lokal — ditunda.
- Angka [isi]: meter kain keras per bagian (beda per size?), jumlah aksesoris per baju, benang per baju, size di atas XXL.
