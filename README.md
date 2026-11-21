# KawanBelajarku Remake

Platform pembelajaran statis untuk GitHub dan Cloudflare Pages. Dashboard siswa, panel admin dan editor menggunakan Supabase Auth, Database, dan Storage dari proyek yang dipakai oleh versi lama. Proyek web tidak memerlukan instalasi atau build. Browser memuat SDK Supabase melalui jsDelivr dan Plus Jakarta Sans melalui Google Fonts.

## Sebelum mengganti situs lama

1. Simpan salinan repo dan backup database. Jadwalkan pemasangan saat situs sepi karena versi lama mengirim nilai kuis dari browser, sedangkan migrasi menutup akses tersebut.
2. Di proyek Supabase lama, buka **SQL Editor**. Jalankan `sql/01-preflight.sql` untuk memeriksa tabel, kolom, fungsi dan policy lama. Jika ada view atau RPC lama yang memberi akses ke kunci jawaban, nilai siswa lain, atau mengubah role, tinjau grant dan sumbernya sebelum peluncuran. Migrasi mengatur tabel yang digunakan situs. Objek khusus di luar arsip hanya dapat diaudit dari proyek asli.
3. Jalankan `sql/02-remake.sql` sebagai satu transaksi. Jika skema berbeda atau muncul error, transaksi batal. Simpan hasil error untuk menyesuaikan migrasi dengan skema asli. Migrasi mempertahankan rekaman materi, akun, progres dan hasil kuis yang sudah ada. Jalankan `sql/03-verifikasi.sql` setelahnya.
4. Di **Authentication → URL Configuration**, set **Site URL** ke domain production dan masukkan URL login serta reset versi deployment yang dipakai. Contoh untuk domain `https://contoh.pages.dev`: `https://contoh.pages.dev/`, `https://contoh.pages.dev/index.html`, `https://contoh.pages.dev/reset-password.html` dan `https://contoh.pages.dev/reset-password`. Jika template email Supabase dikustomisasi, pastikan tautan konfirmasi dan reset tetap menghormati redirect. Pendaftaran mengikuti pengaturan konfirmasi email proyek lama.

## GitHub dan Cloudflare Pages

1. Unduh dan ekstrak ZIP. Buka repo GitHub yang terhubung ke Cloudflare Pages.
2. Pilih **Add file → Upload files**. Unggah **isi** ZIP ke root repo. Pertahankan folder `assets/` dan `sql/`. `index.html` dan `_headers` harus berada di root. Commit ke branch production repo tersebut.
3. Di Pages pilih **Framework preset: None**, **Build command** kosong, dan **Build output directory** `/` apabila file situs berada di root. Untuk repo yang sudah terhubung, periksa deployment baru dari commit GitHub. File JavaScript bersama sekarang berada di `assets/`, sehingga `kb-shared.js` lama dapat dikeluarkan dari repo setelah perpindahan.
4. Setelah deployment, uji dengan satu akun siswa dan satu admin. Konfirmasi email dan reset membutuhkan email nyata, sedangkan pembatasan akses dan pengunggahan privat perlu diuji di proyek Supabase asli.

Dokumentasi [Cloudflare Pages Static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) dan [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls/).

## Peta halaman

| Halaman | Isi |
| --- | --- |
| `index.html`, `reset-password.html` | Masuk, daftar, konfirmasi email, dan pemulihan |
| `kawanbelajarku-dashboard.html` | Beranda siswa, progres, materi terakhir, rekomendasi, pengumuman, dan mata pelajaran populer |
| `pelajaran.html` | Perpustakaan, pencarian dan filter, materi, lampiran, bookmark dan progres |
| `latihan.html` | Kuis, navigasi soal, pengiriman dan riwayat skor |
| `belajar.html` | Agenda, statistik, pencapaian, eksplorasi, langganan, pencarian global, profil dan bantuan |
| `kelola.html` | Statistik penggunaan, konten dasar, soal, pengumuman, hasil siswa |
| `editor.html` | Fitur tambahan, lampiran, rekomendasi, identitas, dan informasi paket |

## Audit dan keputusan implementasi

- Acuan utama `kb1.zip` berisi enam HTML, satu JavaScript bersama, satu SQL, dan README. CSS dan sebagian ikon lama tertanam di HTML atau JS. Dua ZIP terkait juga diperiksa untuk membandingkan halaman dan dependensi. `kawanbelajarku1.zip` tidak menyertakan skrip bersama yang dirujuk halaman.
- Versi lama membaca kunci soal dari browser dan menulis skor langsung. Remake menyimpan salinan soal dan kunci di skema privat untuk setiap percobaan yang sedang berjalan. Browser menerima soal dan pilihan. Skor dihitung oleh RPC, dan pengiriman ulang untuk percobaan yang sama mengembalikan hasil yang sudah tersimpan.
- Tabel inti yang dipertahankan adalah `profiles`, `subjects`, `materials`, `quizzes`, `questions`, `quiz_results`, dan `progress`. Migrasi menambahkan kolom seperlunya serta memastikan `site_config`, `features`, `attachments`, dan `announcements` tersedia. Papan penggunaan menghitung akun dari profil ber-role `student`. Tabel `students` lama tidak diubah dan tidak menjadi sumber otorisasi situs ini.
- Admin mengarsipkan mapel, materi, kuis, pengumuman atau fitur, lalu dapat memulihkan arsip. Menghapus soal yang dikonfirmasi tidak menghapus hasil kuis. Lampiran unggahan baru memakai bucket privat `kb-learning`. Menghapus lampiran melepas referensinya, sehingga siswa tidak bisa meminta URL privat baru. Objek fisik tetap tersedia bagi pengelola Storage. URL lama dari bucket `media` mengikuti konfigurasi lamanya.
- Jika situs memakai domain yang sama dan data perangkat masih ada, buka **Menu Lain → Impor data perangkat lama** untuk menyalin agenda, bookmark dan materi terakhir. Progres lama di `progress` dan hasil kuis di `quiz_results` langsung dipakai.
- Ranking populer memakai jumlah akun berbeda yang menyelesaikan materi, dengan ambang minimal tiga akun untuk tiap mapel. Langganan menampilkan informasi paket yang diisi admin. Pencapaian dihitung dari materi selesai dan hasil kuis yang tercatat.

## Pengujian dan batas verifikasi

- Lulus pemeriksaan sintaks JavaScript, file HTML, impor modul, dan referensi aset/rute lokal.
- Lulus simulasi JavaScript dengan respons Supabase tiruan untuk masuk dan role, pendaftaran, pemulihan, materi, bookmark, progres, agenda, navigasi dan pengiriman kuis, riwayat skor, pengelolaan mapel/soal/pengumuman, unggah lampiran serta info langganan.
- CSS dirancang untuk layar mobile dan desktop. Pengujian visual di browser tidak selesai karena browser lokal gagal dijalankan di lingkungan ini.
- SQL ditinjau terhadap struktur yang teramati di ZIP lama. SQL, RLS, reset email, dan Storage privat belum dijalankan di Supabase produksi. Deployment Cloudflare juga belum dilakukan.
Trigger Cloudflare rebuild
