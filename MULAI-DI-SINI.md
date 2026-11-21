**Paket revisi UI dan fitur** — Mulai dari [PASANG-REVISI.md](PASANG-REVISI.md). Dokumen di bawah mencatat versi dasar V2.

# Memasang KawanBelajarku V2

Paket ini melanjutkan **kawanbelajarku-remake-final.zip**. Konfigurasi publik di `assets/config.js` tetap menunjuk ke proyek Supabase lama. Instalasi situs berupa file statis tanpa npm, build, atau Edge Function. SQL harus dipasang terpisah di Supabase. Mengunggah situs saja belum mengaktifkan ruang kuis.

## 1. Periksa sebelum mengubah

1. Unduh ZIP dari GitHub untuk menyimpan versi situs yang sedang aktif. Jika ada perubahan setelah arsip remake terakhir, bandingkan dahulu dengan isi paket ini.
2. Simpan cadangan database beserta skema, fungsi, kebijakan, dan data. Catat konfigurasi Auth dan simpan salinan objek Storage secara terpisah. Pastikan cadangan dapat dibaca. Untuk latihan migrasi, gunakan salinan lokal dengan versi PostgreSQL dan layanan Supabase yang sesuai.
3. Buka **Supabase lama → SQL Editor → New query**. Jalankan `sql/01-preflight.sql`, lalu `sql/04-live-preflight.sql`. Keduanya hanya membaca. Simpan hasilnya. Periksa khususnya tipe ID, grants, RPC lama, trigger pendaftaran, bucket privat, policy, dan entitas kelas/sesi yang mungkin sudah ada. Jika nama tabel bentrok atau sistem sekolah sudah memiliki entitas setara, sesuaikan pemetaan sebelum memasang.
4. Periksa riwayat pemasangan remake. Jika `02-remake.sql` sudah pernah berhasil, jalankan `03-verifikasi.sql` untuk mengeceknya. Jika belum, baca README remake, lalu jalankan `02-remake.sql` dan `03-verifikasi.sql`. Skrip 02 menata izin pada tabel lama. Pertahankan cadangan dan periksa kebijakan kustom terlebih dahulu.
5. Sesudah basis remake terverifikasi, jalankan **05-live.sql**, **06-belajar.sql**, lalu **07-akses-tamu.sql**, masing-masing satu kali dan sebagai satu skrip lengkap. Tunggu *Success* sebelum lanjut. Jika ada kesalahan, transaksi skrip itu batal. Langkah yang sudah berhasil sebelumnya tetap terpasang. Jangan mengulang skrip yang sudah berhasil.
6. Jalankan `08-verifikasi-v2.sql`. Setiap `hasil` harus cocok dengan `harapan`. Jalankan `09-uji-sesi.sql` di salinan uji dengan satu profil admin dan satu siswa. Skrip menguji dua mode dan membatalkan transaksi di akhir.
7. Sesi menggunakan Postgres Changes pada `public.kb_live_signal`. Tabel ini ditambahkan ke publikasi oleh langkah 05. Simpan `kb_private` di luar daftar skema Data API yang diekspos. Sinyal hanya memuat kode dan nomor revisi. Browser memanggil RPC untuk membaca keadaan yang diizinkan.

## 2. Atur Auth dan akses guru

- Pertahankan **Site URL** dan daftar redirect login/reset untuk domain Pages yang digunakan. Pendaftaran dan email pemulihan mengikuti pengaturan Auth proyek lama.
- Akun siswa dan guru memakai login sekolah. Admin dapat membuka **Kelas & pengguna → Akses guru**, memilih akun, lalu memberikan izin. Akun guru berikutnya diarahkan ke Ruang Guru. Izin tambahan disimpan di database, terpisah dari kolom role lama. Untuk guru yang sudah memiliki role dasar `teacher` atau `guru`, pencabutan izin tambahan tetap menghormati role dasar itu.
- **Opsional untuk tamu:** setelah 07 terpasang, periksa juga kebijakan tabel/bucket dan fungsi kustom sekolah di luar paket ini. Supabase memberikan role PostgreSQL `authenticated` kepada pengguna anonim. Aktifkan **Allow anonymous sign-ins** di Auth hanya bila menginginkan peserta tamu. Akun tamu harus diizinkan lagi oleh host per ruang. Identitas sementara dipulihkan dari sesi Auth di browser yang sama. Tamu yang menghapus data browser kehilangan identitas tersebut.
- JSZip dan pdf-lib dibundel untuk ekspor lokal. SDK Supabase v2 dimuat lewat jsDelivr dan font lewat Google Fonts. Browser memerlukan internet untuk login dan kuis. Tidak ada secret atau service-role key dalam konfigurasi frontend.

## 3. Pasang ke GitHub dan Cloudflare Pages

1. Ekstrak ZIP. Di branch uji repo, unggah semua file dan folder sebagai satu pembaruan. Pertahankan nama dan susunan folder. `index.html`, `live.html`, `guru.html`, `assets/`, dan `_headers` berada di root.
2. Gunakan project Cloudflare Pages yang sudah terhubung ke repo. Pilih preset **None**, tanpa langkah build, dan direktori keluaran root. Buka deployment preview. Untuk unggah langsung, gunakan paket situs setelah memeriksa langkah pemasangan database di atas.
3. Jalankan pemeriksaan di `PENGUJIAN.md` dengan akun sekolah. Setelah lulus, gunakan commit yang sama untuk deployment production.

## 4. Coba sesi pertama

**Guru** masuk ke Ruang Guru, pilih **Buat kuis**, isi pertanyaan dan kunci, lalu simpan. Di **Mulai sesi live**, pilih kuis, beri nama sesi dan klik **Buat ruang**. Bagikan kode enam karakter.

**Siswa** membuka **Beranda → Masukkan kode**, memilih nama dan avatar, lalu masuk lobi. Guru memulai kuis. Untuk mode dipandu guru, guru memilih soal berikutnya. Setelah sesi selesai, siswa melihat hasil dan guru membuka **Laporan guru → Unduh PDF / Unduh Excel**.

## 5. Pemulihan

Jika deployment frontend bermasalah, kembalikan commit atau deployment Pages sebelumnya. Pertahankan tabel V2 agar hasil, tugas, dan riwayat baru tidak hilang. Untuk menghentikan sesi baru saat pemulihan, tarik halaman V2 dari deployment dan cabut EXECUTE fungsi pembuat ruang jika perlu. Menarik halaman saja tidak menutup akses RPC.

Mengembalikan database ke cadangan juga mengembalikan data ke waktu cadangan itu. Sebelum pemulihan database, hentikan penulisan baru dan ekspor perubahan setelah cadangan, termasuk hasil dan berkas Storage. Tinjau perubahan izin dalam skrip 02 dan 07. Uji pemulihan pada salinan dahulu, lalu rekonsiliasi data yang berubah. Paket tidak menjalankan DROP otomatis untuk membuang data pengguna.

Referensi resmi: [Cloudflare Pages untuk situs HTML statis](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/), [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous).
