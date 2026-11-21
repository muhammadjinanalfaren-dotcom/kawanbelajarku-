# Hasil uji revisi

Pengujian berlangsung pada salinan lokal dengan akun dan kelas fiktif. Basis pengujian menggunakan PostgreSQL tertanam (PGlite), skema dasar yang merepresentasikan tabel lama, role `anon` dan `authenticated`, serta tabel metadata Storage. Migrasi V2 dan migrasi revisi dijalankan pada basis tersebut. Chromium memakai penghubung lokal ke fungsi database untuk alur pengguna. Kondisi yang memerlukan layanan Supabase asli ditandai di bawah.

| Skenario | Hasil lokal |
| --- | --- |
| Pemasangan SQL | Skrip 02, 05, 06, 07, 10 dan 11 berhasil pada basis uji. Delapan hasil pemeriksaan di 12 sesuai harapan. |
| Beranda | Lebar 360, 390, dan 430 px. Enam menu berada dalam tiga kolom, logo dan kartu progres terlihat, dan halaman tidak melebar horizontal. Pencarian “fungsi” menemukan materi kelas uji. |
| Navigasi | Saat permintaan akun ditahan, kerangka dan empat tautan navigasi sudah tampil. Kegagalan terkontrol pada data hasil kuis memunculkan Coba lagi. Setelah dicoba ulang, misi harian kembali tampil. Tautan langsung, refresh, serta kembali dari Pelajaran ke Beranda diuji. |
| Pelajaran | Banner Matematika, empat tab, daftar bab dan materi terbuka. Tampilan desktop diperiksa pada lebar 1080 px. |
| Bahasa | Ketiga unit dimainkan melalui browser dengan empat tipe soal, termasuk melanjutkan sesi setelah refresh. Hasil benar 4/4 dan progres unit dibaca kembali dari database. Kapitalisasi, spasi dan tanda baca diuji. Pemanggilan replay dua kali diuji dengan suara pengganti per bahasa. Ketiadaan suara memunculkan petunjuk teks. |
| Room siswa | Siswa pertama membuat soal melalui editor, menjadi host sekaligus peserta, membagikan kode, dan memulai sesi. Siswa kedua memilih identitas, bergabung, menjawab, dan kembali setelah refresh. Hasil 100% dan 0% tampil untuk jawaban masing-masing. Host membuka analisis per soal. |
| Timer dan hak akses | Database menjalankan mode dipandu dengan timer mati dan mode mandiri dengan timer aktif. Jawaban lewat waktu menghasilkan nol poin dan jawaban kosong. Pengiriman ulang tidak mengubah hasil pertama. Peserta lain gagal mengambil isi bank pribadi dan laporan host. Papan peringkat dapat disembunyikan. |
| Tata Surya | Pada 390 × 844 dan 844 × 390, daftar fokus membuka Matahari, Bumi, Bulan, Jupiter, dan Neptunus. Drag, zoom roda, jeda, reset, dan pemilihan Matahari dengan klik kanvas diuji. |
| Streak | Sebelum aktivitas pertama, akun uji memiliki nol hari. Beberapa aktivitas dan pengiriman ulang pada tanggal sama menghasilkan satu hari. Notifikasi pertama hanya bisa diklaim sekali. Dengan jam uji, rangkaian 28 Januari–4 Februari menggunakan tiga perlindungan Januari dan tiga Februari tanpa menaikkan hitungan hari belajar. Hari berikut yang terlewat setelah kuota habis memutus rangkaian. Kuota Maret kembali tiga. |
| Guru dan kelas | Editor mengunggah lampiran teks menggunakan transport lokal. Percobaan pertama sengaja digagalkan, percobaan ulang berhasil. Guru menyimpan draf, menerbitkan dan mengatur label serta urutan pintasan. RLS menyembunyikan lampiran draf dari siswa. Anggota dapat membaca tugas terbit, akun luar kelas ditolak, dan siswa gagal menyimpan perubahan. |
| Login dan pemulihan | SDK yang disertakan di ZIP dimuat oleh Chromium. Form login, tombol mata, penanganan kredensial salah, dan permintaan email pemulihan dengan URL kembali yang benar diuji terhadap respons Auth lokal. |
| Isi paket | Semua file arsip V2 tersedia, konfigurasi Supabase dan SQL lama identik dengan arsip, modul aplikasi lolos pemeriksaan sintaks, dan tautan aset lokal dari HTML tervalidasi. |

## Verifikasi di preview sebelum pemasangan produksi

- Login sukses dengan akun lama dan selesaikan pemulihan melalui email nyata. Cocokkan materi, nilai, progres, role, dan konfigurasi tambahan sekolah dengan sumber aktif.
- Jalankan dua perangkat pada room yang sama untuk menguji koneksi Realtime Supabase, kehilangan jaringan dan kembalinya sesi. Uji tamu bila fitur itu digunakan sekolah.
- Di Android, dengarkan suara Indonesia, Inggris dan Jepang yang benar-benar terpasang. Uji pinch, geser dua jari, rotasi perangkat, fullscreen, dan performa pada perangkat siswa.
- Unggah gambar dan video kelas ke Supabase Storage asli. Periksa preview media, progres unggah jaringan, tautan unduhan, pembatasan ukuran, serta hak akses dengan akun lain. Uji apakah kebijakan kustom di proyek sekolah memengaruhi alur tersebut.
- Periksa halaman preview Cloudflare, header, dan URL lama. Deployment produksi dan migrasi pada proyek sekolah merupakan langkah pemasangan terpisah.
