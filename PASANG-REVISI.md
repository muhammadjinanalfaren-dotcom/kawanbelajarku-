# Memasang revisi KawanBelajarku

Dasar revisi adalah arsip **KawanBelajarku-V2.zip**. Konfigurasi di `assets/config.js` tetap mengarah ke proyek Supabase V2. Jika branch Cloudflare sudah menerima perubahan di luar arsip tersebut, bandingkan perubahan branch itu sebelum mengganti file. Semua halaman lama ada pada URL semula. SDK Supabase dan font untuk situs kini disertakan di folder aset.

## Urutan untuk proyek V2 yang sudah berjalan

1. Buat salinan repo dan cadangan database. Gunakan salinan pengujian untuk pemasangan pertama. Periksa keberadaan fungsi dan tabel V2 dengan `sql/08-verifikasi-v2.sql`. Jika proyek masih memakai skema sebelum V2, selesaikan pemasangan V2 menurut `MULAI-DI-SINI.md` lebih dahulu.
2. Jalankan **sql/10-revisi.sql** sekali sebagai satu skrip. Skrip memperbarui bank kuis dan room, menambah unit Bahasa serta kalender aktivitas. Untuk room yang masih berjalan dengan pembahasan langsung, pembahasan beralih ke akhir sesi. Pilih waktu saat kelas selesai bermain.
3. Jalankan **sql/11-konten-kelas.sql** sekali sebagai satu skrip. Ini membuat data tugas dan satu bucket privat `kb-class-content` di Supabase Storage proyek yang sama. Bucket materi lama tetap digunakan untuk konten lama. Tiap migrasi memiliki transaksi sendiri. Jika langkah 11 gagal setelah 10 berhasil, perbaiki kesalahan pada langkah 11 dan lanjutkan dari situ.
4. Jalankan **sql/12-verifikasi-revisi.sql**. Kolom hasil harus sama dengan harapan. Pertahankan `kb_private` sebagai skema internal di luar daftar skema yang diekspos Data API.
5. Ekstrak satu ZIP dan unggah isinya ke branch preview repo Cloudflare Pages. `index.html`, `assets/`, dan `_headers` berada di root. Gunakan konfigurasi Pages statis yang sudah bekerja, tanpa build. Untuk pengujian terpisah, gunakan URL dan publishable key proyek pengujian dalam salinan preview.
6. Coba alur pada bagian verifikasi menggunakan dua akun siswa dan satu guru. Pada domain yang digunakan untuk uji email, periksa izin redirect Supabase Auth untuk login dan `reset-password.html`. Setelah kamu siap, terapkan urutan database dan frontend yang sama di produksi.

## Fitur dan akses

- **Beranda dan Pelajaran** menggunakan logo K, header baru, kartu progres, pencarian dan enam menu. Rekomendasi mengarah ke penjelajah planet. Progres materi dihitung dari materi yang dapat diakses dan penanda selesai siswa. Nilai level, XP, Gold dan Premium muncul bila tersedia lewat kolom profil yang sesuai.
- **Bahasa** mempunyai satu unit awal per bahasa. Siswa memasangkan kata, menyusun kalimat, mendengar dan mengetik, lalu memilih jawaban. Progres unit tersimpan ke akun. Refresh di tengah pelajaran dapat melanjutkan dari awal soal terakhir pada tab yang sama. Soal dengar Jepang menggunakan hiragana. Replay memakai suara sesuai bahasa di perangkat dan menyediakan petunjuk teks jika suara tidak tersedia.
- **Kuis Live** dapat dibuka melalui Menu Lain. Siswa membuat bank kuis pribadi dan menjadi host. Buka pengaturan permainan untuk timer dan pilihan ikut bermain. Host yang ikut bermain dihitung sebagai peserta. Kunci dan laporan diproses di database.
- **Tata Surya** menampilkan model bola tiga dimensi yang dirender di Canvas. Seret untuk memutar, gunakan dua jari untuk zoom dan geser, atau gunakan roda mouse dan Shift–seret di desktop. Daftar fokus juga berfungsi saat konteks gambar tidak tersedia. Data ukuran dan orbit dibulatkan. Acuan pendidikan: [NASA Solar System](https://science.nasa.gov/solar-system/) dan [NASA Planet Sizes](https://science.nasa.gov/solar-system/planets/planet-sizes-and-locations-in-our-solar-system/).
- **Streak** mulai mencatat aktivitas setelah migrasi. Materi yang sama hanya memberi kredit satu kali per siswa. Sesi Bahasa dan percobaan kuis baru dapat memberi kredit pada hari berikutnya. Rekonsiliasi hari terlewat terjadi saat kalender dibaca atau aktivitas berikutnya dicatat. Kalender menampilkan bulan berjalan menurut Asia/Jakarta.
- **Konten kelas** dapat dibuka dari Menu Lain, Ruang Guru atau detail kelas. Guru membuat tugas di kelas yang dikelolanya, memilih lampiran, tenggat, urutan, label dan visibilitas pintasan. Penerbitan mengatur akses tugas. Menyembunyikan pintasan hanya mengubah menu kelas. Draf tetap privat bagi pengelola. Maksimal 12 lampiran per tugas dan 50 MiB per file.

## Hasil pengujian

Lihat **HASIL-UJI-REVISI.md** untuk batas cakupan uji lokal. Simpan paket dan deployment sebelumnya untuk rollback frontend. Pertahankan data aktivitas, tugas, dan room baru jika halaman perlu dikembalikan.
