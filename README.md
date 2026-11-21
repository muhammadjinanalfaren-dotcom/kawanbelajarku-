# KawanBelajarku V2

Mulai dari **[MULAI-DI-SINI.md](MULAI-DI-SINI.md)**. Hasil pengujian dan pemeriksaan yang perlu dijalankan di sekolah tercatat di **[PENGUJIAN.md](PENGUJIAN.md)**.

## Dasar dan kompatibilitas

Sumber pembaruan adalah arsip remake terakhir. Enam gambar rujukan dipakai untuk memeriksa susunan profil biru, grid enam menu, ilustrasi tata surya, halaman bab, avatar bundar, dan tampilan soal. Gambar referensi tidak didistribusikan. Ilustrasi orbit, ikon pelajaran, dan identitas dasar berasal dari aset proyek pengguna. Empat avatar siswa dan enam belas avatar hewan dibuat khusus untuk paket ini. Lisensi dependensi ekspor ada di `assets/vendor/`.

Rute login, reset, dashboard, materi, latihan mandiri, editor, dan kelola tetap tersedia. Materi lama yang belum diberi bab tampil pada bagian **Materi tanpa bab**. Bank lama dipakai untuk kuis mandiri dan dapat dipilih saat membuat sesi. Guru juga dapat menyusun bank sendiri untuk live dan tugas. Hak atas bank guru, tugas, dan hasil sesi diperiksa server. Rekaman kuis mandiri dan rekaman sesi tetap terpisah agar skor historis tidak ditulis ulang.

## Halaman dan fitur

| Halaman | Fungsi |
| --- | --- |
| Beranda | Akun, XP, Gold, progres materi, pencarian, enam menu, pilihan guru, misi, pencapaian, materi terakhir, masuk kuis live |
| Pelajaran | Mapel terakhir atau mapel pertama yang tersedia, katalog semua mapel, bab per semester, latihan, ringkasan, info, penyelesaian, bookmark dan lampiran |
| Pusat Latihan | Kuis mandiri lama dengan penilaian RPC dan riwayat akun |
| Menu Lain | Akun, avatar manusia, kelas, tugas, pencarian, notifikasi, pencapaian, statistik dan agenda |
| Ruang Guru | Bank soal privat, editor enam tipe, bobot, gambar HTTPS, pembahasan, duplikasi, urutan dan pratinjau |
| Kuis Live | Kode unik, identitas, avatar hewan, lobi, siap opsional, penguncian, keluarkan peserta, batal, mulai, jeda, lanjut, selesai, pemulihan koneksi |
| Kelas dan tugas | Kode undangan, daftar anggota untuk pengelola kelas, keluarkan siswa, tugas bertenggat, pengulangan opsional, riwayat percobaan |
| Laporan | Skor, akurasi, benar/salah/kosong, distribusi, analisis kesulitan dan pilihan, rincian peserta, PDF dan workbook Excel empat sheet |
| Admin dan editor | Pengelolaan konten lama, bab, banner terurut, rekomendasi materi, pengumuman, izin guru, lampiran dan informasi langganan |

Hero tata surya membuka aktivitas belajar bawaan. Banner tambahan mengarah ke halaman internal terverifikasi. Langganan menampilkan informasi yang diisi admin. Notifikasi di dalam aplikasi dihitung saat halaman dibuka. Sistem tidak mengirim push atau email baru untuk tugas.

## Aturan permainan

- Kode ruang berupa enam karakter heksadesimal. Lobi menerima peserta selama 24 jam sejak dibuat, sebelum dikunci, dimulai, atau dibatalkan. Nama tampilan maksimal 32 karakter. Kapasitas 1–200 orang.
- Snapshot pertanyaan membekukan isi bank saat ruang dibuat. Database menyimpan kunci, batas waktu, skor, dan jawaban. Unik per ruang, peserta dan nomor soal. Transisi memakai kunci baris database untuk menyerialkan permintaan yang bersamaan.
- Guru dapat mengacak soal dan pilihan, mengaktifkan timer 1–600 detik, dan memilih alur. Pada mode dipandu guru, setiap peserta berada di nomor yang sama. Pada mode mandiri dalam sesi, waktu soal berikut dimulai saat server menerima penyelesaian soal sebelumnya. Peserta yang kehilangan koneksi dapat kembali memakai identitas Auth yang sama. Jika host keluar, sesi tetap tersimpan. Host membukanya lagi dari riwayat.
- Jawaban yang melewati batas waktu dihitung kosong. Timer nonaktif selalu memakai akurasi. Jeda menangguhkan pengiriman dan menggeser acuan waktu saat dilanjutkan. Polling lima detik memulihkan tampilan bila sinyal Realtime terlewat.
- Benar menghasilkan 100 × bobot. Dalam mode kecepatan dengan timer, bonus per bobot adalah pembulatan ke bawah dari 50 × proporsi waktu tersisa. Salah atau kosong bernilai nol. Pilihan jamak dinilai sebagai himpunan. Pasangan dan urutan dinilai sesuai posisi. Isian singkat mengabaikan kapitalisasi dan spasi di ujung. Setiap soal dinilai penuh atau nol.
- Akurasi memakai jumlah benar dibagi seluruh soal, termasuk yang kosong. Peringkat memakai skor, lalu jumlah benar. Hasil seri mendapat peringkat sama. Durasi peserta memakai waktu server dari mulai sesi sampai peserta selesai atau sesi ditutup. Laporan menunjukkan persentase benar semua peserta per soal. Jika ada persentase yang sama, ringkasan menunjukkan salah satu soal yang setara.
- Peringkat peserta mengikuti pengaturan guru. Saat pembahasan ditunda hingga akhir, siswa menunggu akhir sesi untuk melihat peringkat. Setelah sesi ditutup siswa dapat meninjau jawaban sendiri. Guru pemilik dan admin dapat membaca laporan kelas.
- PR memakai snapshot bank guru, tenggat server dan riwayat percobaan individual. Percobaan aktif dapat dilanjutkan selama tenggat berlaku. Pengulangan membuat riwayat baru bila guru mengizinkannya. Tampilan waktu tenggat memakai zona waktu perangkat.

## XP, Gold, dan misi

Setiap materi aktif yang ditandai selesai menyumbang 20 XP dan 2 Gold. Satu hari UTC dengan minimal satu kuis mandiri terkirim menyumbang 10 XP dan 1 Gold. Mengulang kuis pada hari yang sama tidak menambah hadiah misi lagi. Level = 1 + bagian bulat dari XP / 100. XP dan Gold dihitung dari rekaman akun saat ditampilkan. Jika materi diarsipkan atau status selesai dibatalkan, total mengikuti data terkini. Gold adalah poin internal. Lencana berasal dari syarat yang tertera di halaman Pencapaian.

## Batas operasional

Migrasi dan koneksi ke database produksi belum dijalankan. Keadaan server sekolah, trigger kustom, kebijakan lama dan perilaku email perlu diperiksa dari akun pengelola. Kapasitas di formulir merupakan batas konfigurasi. Kapasitas kelas yang telah teruji dengan latensi sekolah belum diketahui. Dashboard kelas menampilkan anggota, jumlah percobaan selesai per tugas dan akses laporan masing-masing. Laporan per sesi live menggabungkan seluruh peserta ruang tersebut.
