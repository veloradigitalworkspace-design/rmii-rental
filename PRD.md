# PRD — Prototype RMI (Rental Mobil Indonesia)

**Klien:** RMI – Rental Mobil Indonesia, Surabaya (kontak WA …6909, "papi")
**Disusun:** 13 November 2026 · Velora Digital
**Target kirim prototype:** 14 November 2026 (sudah dijanjikan ke klien)
**Hosting:** GitHub Pages (statis, tanpa server)

---

## 1. Tujuan

Prototype ini punya satu tugas: membuat pemilik RMI berkata **"ya, ini yang saya mau"** dan lanjut ke penawaran.

Dua keberatan dari chat harus terjawab di layar pertama:

1. *"Sepertinya saya kurang berminat di prototype itu."* Dia menolak contoh umum (rentcar.veloradigitalworks.com). Prototype harus memakai **logo, nama, armada, dan tarif RMI sendiri**.
2. *"Masih banyak kekurangan dalam memudahkan payment."* **Pembayaran setoran adalah fitur utama**, bukan pelengkap.

## 2. Kebutuhan klien (dari chat, kata-katanya sendiri)

| Kebutuhan | Kutipan / sumber |
|---|---|
| Sewa unit ke driver online | "rata rata penyewa adalah pengemudi online" |
| Sewa unit untuk wisata tamu asing | "disewakan perjalanan wisata dgn tamu tamu asing" |
| Driver setor sewa lewat aplikasi | "driver bisa setor sewa di aplikasi tsb" |
| Setoran harian sesuai tarif mobil | "Driver online setor harian sesuai dgn mobil yg disewa" |
| Pengingat jika tidak/lupa bayar | "reminder ke driver jika tidak bayar sewa atau lupa bayar sewa" |
| Pengingat jika 3 hari tidak bayar | "remainder ke penyewa jika dalam tiga hari tidak bayar sewa" |
| Foto unit & posisi unit saat disewa | "foto unit dan posisi unit saat disewa untuk memudah pengecekan" |
| Unit sudah ber-GPS tracker | "Unit sdh terpasang GPS tracker" |
| Mudah input driver baru | "memudahkan dalam input driver baru" |
| Total margin per bulan | "ada total margin /bln" |
| Pembayaran yang mudah | "Masih banyak kekurangan dalam memudahkan payment" |
| Website / promo tour | "Biaya pembuatan aplikasi dan promo tour brp" + 3 video trip |

## 3. Data klien

### 3a. Armada & tarif harian

| Unit | Jumlah | Tarif/hari | Catatan |
|---|---|---|---|
| Toyota Hiace Premio | 1 | Rp950.000 | Lepas kunci; dengan driver negosiasi |
| Toyota Hiace Commuter | 2 | Rp700.000 | Lepas kunci; dengan driver negosiasi |
| Toyota Innova Reborn | 1 | Rp400.000 | |
| Suzuki Ertiga XL7 | 3 | Rp190.000 | |
| Honda New BR-V | 1 | Rp190.000 | |
| Toyota Calya | 6 | Rp160.000 | |
| Wuling | 3 | Rp150.000 | Tipe belum disebut |
| Daihatsu Sigra | 2 | Rp140.000 | |
| **Total** | **19** | | Klien menyebut "17 unit" → konfirmasi |

### 3b. Paket tour (open trip, titik jemput Surabaya)

| Paket | Harga | Isi |
|---|---|---|
| Lava Tour Pronojiwo, Lumajang (1 hari) | Rp625.000/pack, minimum 6 pack | Lava tour Semeru |
| 2D1N Lava Tour + Tumpak Sewu | Rp1.150.000/pack | Hari 1 lava tour, menginap 1 malam di cottage; hari 2 Air Terjun Tumpak Sewu |

Include: kendaraan antar-jemput, breakfast, lunch, tiket masuk, fotografer & drone, titik jemput Surabaya.

### 3c. Aset

- Logo RMI (merah–hitam–putih, motif speedometer) → `assets/logo-rmi.jpg`
- 3 video trip (Tumpak Sewu, dll.) → `assets/video/`

## 4. Pengguna

| Peran | Perangkat | Yang paling penting baginya |
|---|---|---|
| **Pemilik / admin RMI** | HP & laptop | Uang masuk hari ini, siapa yang telat bayar, margin bulan ini, posisi unit |
| **Driver online (penyewa harian)** | HP Android | Tahu tagihan hari ini dan bayar secepat mungkin |
| **Tamu tour (lokal & asing)** | HP | Lihat paket, video, harga, lalu booking lewat WhatsApp |

## 5. Ruang lingkup prototype

Tiga bagian, dibuka dari satu halaman awal dengan tombol pilih peran: **Admin · Driver · Website Tour**.

### 5a. Admin (P0 kecuali disebut lain)

1. **Dashboard** — dibuka pertama, satu layar:
   - Setoran masuk hari ini (Rp dan jumlah driver), target hari ini
   - Pendapatan & **margin bulan ini**
   - Status unit: tersedia / disewa driver / disewa wisata / servis
   - **Daftar telat bayar** dengan jumlah hari telat dan tombol "Kirim pengingat"
2. **Setoran**
   - Tabel per hari: driver, unit, tarif, status (Lunas / Belum / Telat N hari), metode (QRIS / VA / transfer / tunai), jam bayar
   - Setoran via QRIS/VA **tercatat otomatis** (tidak perlu cek mutasi manual) — ini jawaban utama soal "payment"
   - Setoran tunai/transfer manual: catat dengan satu tombol + foto bukti
3. **Pengingat otomatis**
   - Aturan default: H+0 jam 20.00 pengingat halus → H+1 pengingat → **H+3 peringatan ke penyewa + notifikasi ke admin**
   - Pratinjau isi pesan WhatsApp; tombol kirim membuka WhatsApp dengan pesan terisi (simulasi)
   - Admin bisa ubah jam dan isi pesan (P1)
4. **Unit**
   - 19 unit dengan foto, plat (contoh), tarif, status, driver aktif
   - **Peta posisi unit** (posisi simulasi, label "data GPS contoh")
   - Riwayat serah terima: foto kondisi unit saat diambil & dikembalikan
5. **Driver**
   - Daftar driver, unit yang dipegang, total setoran bulan ini, tunggakan
   - **Tambah driver baru dalam 1 layar**: nama, no. WA, foto KTP, foto SIM, pilih unit → tarif otomatis terisi dari unit
6. **Sewa wisata** (P1): catat sewa Hiace/Innova untuk wisata — lepas kunci atau dengan driver (harga negosiasi diisi manual), tanggal, tamu
7. **Laporan margin bulanan**
   - Pendapatan (setoran driver + sewa wisata + tour) − biaya (servis, operasional — diisi admin) = **margin**
   - Grafik per hari dalam bulan berjalan + margin per unit (unit mana paling menguntungkan)

### 5b. Aplikasi driver (tampilan HP, P0)

1. **Beranda**: logo RMI, unit yang dipegang, **tagihan hari ini besar di tengah** + tombol **Bayar Sekarang**
2. **Bayar**: pilih QRIS atau Virtual Account → tampil kode QR / nomor VA (simulasi) → tombol "Saya sudah bayar (simulasi)" → layar **Pembayaran berhasil** → status di Admin langsung berubah jadi Lunas
3. **Pengingat**: banner merah jika ada tunggakan ("Setoran 2 hari belum dibayar: Rp320.000")
4. **Riwayat setoran**: daftar per tanggal
5. **Serah terima unit**: ambil foto 4 sisi + odometer + BBM, lokasi tersimpan (simulasi)

Target: dari buka aplikasi sampai setoran lunas **maksimal 3 ketukan**.

### 5c. Website tour (P0)

- Dua bahasa, tombol **ID / EN**
- Hero: video trip (autoplay tanpa suara, loop) + judul + tombol "Booking via WhatsApp"
- Dua kartu paket (3b) dengan harga, minimum peserta, itinerary per hari, daftar include
- **Galeri 3 video** trip (dengan poster/thumbnail, putar saat ditekan)
- Titik jemput Surabaya
- Bagian **Sewa armada wisata**: Hiace Premio, Hiace Commuter, Innova Reborn (lepas kunci; dengan driver hubungi)
- Form booking singkat (paket, tanggal, jumlah peserta, nama) → membuka WhatsApp dengan pesan terisi
- SEO dasar: judul & deskripsi halaman "Semeru Lava Tour & Tumpak Sewu from Surabaya"

## 6. Alur utama yang harus bisa didemokan

1. **Driver bayar setoran** → buka app driver → Bayar → QRIS → berhasil → pindah ke Admin → setoran driver itu sudah Lunas otomatis.
2. **Driver telat 3 hari** → Admin dashboard menampilkan driver merah "Telat 3 hari" → pratinjau pesan peringatan → kirim.
3. **Tambah driver baru** → isi 1 form → driver muncul di daftar dengan tagihan harian sesuai unit.
4. **Cek margin** → Laporan → margin bulan ini + unit paling menguntungkan.
5. **Cek posisi unit** → Unit → peta → klik unit → driver, status, foto serah terima terakhir.
6. **Tamu booking tour** → website → pilih 2D1N → isi form → WhatsApp terbuka dengan detail booking.

## 7. Data contoh

- 19 unit sesuai tabel 3a; plat nomor contoh (L xxxx xx)
- ±12 driver dengan **nama fiktif**; 2–3 driver berstatus telat (1, 2, dan 3 hari) agar fitur pengingat terlihat
- Riwayat setoran 30 hari terakhir dibuat otomatis agar grafik margin terisi
- Semua layar memberi label kecil **"Data contoh"**
- Tombol **Reset data contoh** di Admin

## 8. Batasan teknis (karena GitHub Pages statis)

| Fitur | Di prototype | Di aplikasi sungguhan |
|---|---|---|
| Login | Tombol pilih peran, tanpa password | Login admin & driver |
| Pembayaran | Simulasi QRIS/VA | Payment gateway (mis. Midtrans/Xendit) |
| Posisi unit | Titik simulasi di peta Surabaya | Integrasi API penyedia GPS tracker klien |
| Pengingat | Pratinjau + buka WhatsApp | Terkirim otomatis terjadwal (WhatsApp API, berbayar per pesan) |
| Penyimpanan | Browser (localStorage), bisa di-reset | Database server |
| Foto | Dipilih dari galeri, tidak di-upload | Disimpan di server |

## 9. Teknis & struktur repo

```
rmi-prototype/
├── index.html          halaman awal: pilih Admin / Driver / Website Tour
├── admin.html
├── driver.html         tampilan HP (di laptop tampil dalam bingkai HP)
├── tour.html           website tour (ID/EN)
├── assets/
│   ├── logo-rmi.jpg
│   ├── video/          3 video .mp4 + poster .jpg
│   └── units/          foto unit (gambar umum per model)
├── js/data.js          data contoh
├── js/app.js
└── css/style.css
```

- HTML/CSS/JS biasa, tanpa build step, supaya langsung jalan di GitHub Pages
- Peta: Leaflet + OpenStreetMap (cantumkan atribusi)
- Grafik: Chart.js atau SVG sederhana
- Warna dari logo: merah RMI, hitam, putih; mobile-first
- **Video:** kompres ke H.264 .mp4, ±720p, target ≤10 MB per video (GitHub menolak file >100 MB); sertakan poster .jpg agar halaman cepat terbuka
- Tambahkan `<meta name="robots" content="noindex">` di admin & driver (prototype, bukan untuk Google)
- Repo GitHub Pages bersifat publik: jangan masukkan data pribadi pelanggan/driver asli

## 10. Kriteria berhasil

- Klien mengenali usahanya sendiri dalam 5 detik pertama (logo, nama, unit, tarif)
- Alur bayar setoran driver ≤3 ketukan dan langsung terlihat di Admin
- Pemilik bisa menjawab "siapa yang telat bayar?" dan "berapa margin bulan ini?" dari dashboard tanpa berpindah halaman
- Website tour enak dibuka di HP dan videonya langsung terlihat
- Klien setuju dijadwalkan presentasi atau meminta penawaran

## 11. Pertanyaan terbuka (tanyakan ke klien)

1. Jumlah unit 17 atau 19? (rincian yang dikirim berjumlah 19)
2. Tipe Wuling yang mana (Confero / Formo / lainnya)?
3. "Pack" di paket tour = per orang?
4. Paket 1 hari (Rp625.000) termasuk apa saja? Apakah minimum 6 juga berlaku untuk 2D1N?
5. Nama cottage tempat menginap (di chat tertulis "Kaliningrad Cottages") — ejaan yang benar?
6. Setelah telat 3 hari, apa tindakan berikutnya? (denda, unit ditarik, mesin dimatikan via GPS?)
7. Margin dihitung dari pendapatan dikurangi apa saja? (servis, cicilan unit, asuransi, gaji?)
8. Metode bayar yang paling diinginkan driver: QRIS, transfer VA, potong otomatis, atau tunai?
9. Merek / layanan GPS tracker yang dipakai? (menentukan bisa tidaknya integrasi)
10. Tarif dengan driver untuk wisata — ada patokan?
11. Video mana untuk hero, mana untuk galeri?
