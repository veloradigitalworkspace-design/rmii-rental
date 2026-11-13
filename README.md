# RMI Fleet – Rental Mobil Indonesia

Sistem manajemen rental + website tour untuk RMI, Surabaya. Dibuat oleh Velora Digital.
Spesifikasi lengkap: [PRD.md](PRD.md).

| Halaman | Isi |
|---|---|
| `index.html` | Halaman awal, pilih Admin / Driver / Website Tour |
| `admin.html` | Dashboard, setoran, pengingat, unit & GPS, driver, sewa wisata, laporan margin |
| `driver.html` | Aplikasi driver: login, tagihan, bayar QRIS/VA, riwayat, serah terima unit, profil |
| `tour.html` | Website tour dua bahasa (ID/EN) + video + booking WhatsApp |

## Cara demo ke klien
1. Buka **driver.html** → **Masuk** (nomor sudah terisi, atau pilih akun di bawah) → **Bayar sekarang** → **QRIS** → **Cek status pembayaran**.
2. Buka **admin.html** → tunggakan berkurang, setoran muncul di "Setoran masuk hari ini".
3. Admin → **Pengingat** → kirim peringatan ke driver yang telat 3 hari.
4. Admin → **Driver** → **Tambah driver** → tagihan harian otomatis sesuai unit.
5. Admin → **Laporan Margin** → margin bulan ini & per unit.

Data tersimpan di browser yang dipakai (localStorage). Demo admin & driver di **HP/laptop yang sama** agar datanya tersambung. Tombol **Reset data contoh** ada di dashboard.

## Upload ke GitHub Pages
1. Buat repository baru di github.com (mis. `rmi-prototype`), pilih **Public**.
2. **Add file → Upload files** → seret semua isi folder ini (termasuk folder `assets`, `css`, `js`) → **Commit changes**.
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main** / **(root)** → **Save**.
4. Tunggu ±1 menit. Link: `https://NAMA-AKUN.github.io/rmi-prototype/`

## Yang perlu diganti sebelum dikirim
- **Nomor WhatsApp RMI**: isi `WA_NUMBER` di `js/data.js` (format `62813...`). Kalau kosong, WhatsApp meminta pilih kontak.
- **Video**: saat ini 1 video Tumpak Sewu dipakai untuk hero dan 3 galeri. Ganti dengan 3 video klien di `assets/video/` (mp4 H.264, ±720p, usahakan < 10 MB) dan sesuaikan `tour.html` bagian `class="reel"`.
- Kompres video: `ffmpeg -i input.mp4 -c:v libx264 -crf 30 -preset veryfast -c:a aac -b:a 64k -movflags +faststart output.mp4`

## Catatan
- Untuk ganti akun driver: menu **Profil → Keluar**, lalu pilih akun lain di halaman login.
- Data demo dibuat ulang otomatis setiap hari (atau hapus data situs di browser untuk mengulang).
- Peta memakai tile CARTO/OpenStreetMap. Untuk pemakaian produksi bervolume besar, gunakan penyedia peta berlisensi (mis. Mapbox/Google Maps).
- Nama driver, plat, transaksi, biaya: **data contoh** (fiktif).
- Pembayaran, posisi GPS, dan pengiriman pengingat **disimulasikan** (belum tersambung payment gateway, API GPS, dan WhatsApp API).
