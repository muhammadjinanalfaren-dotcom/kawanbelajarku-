**Paket revisi UI dan fitur** — Mulai dari [PASANG-REVISI.md](PASANG-REVISI.md). Dokumen di bawah mencatat versi dasar V2.

# Pemeriksaan KawanBelajarku V2

## Dilakukan pada paket pengembangan

| Pemeriksaan | Hasil |
| --- | --- |
| Beranda, detail mapel, soal live, ruang guru, kelas, profil | Dibuka dengan data uji terisolasi di Chrome. Keenam halaman lolos pemeriksaan lebar dokumen pada viewport 360, 390, 768, 1024, dan 1440 px |
| Interaksi soal live | Memilih jawaban dan mengirim melalui antarmuka menampilkan status tersimpan dengan RPC tiruan |
| Editor guru | Membuat draft dan menambah soal kedua melalui antarmuka berhasil dengan data uji |
| Analitik | Fixture dua peserta dan dua soal mencakup benar, salah, kehabisan waktu, dan soal tanpa kiriman. Akurasi kelas 25%, ringkasan individu dan detail empat baris sesuai |
| Excel | File hasil generator dibuka ulang dengan openpyxl. Empat sheet terbaca dan nama yang diawali tanda sama dengan tersimpan sebagai teks |
| PDF | File hasil generator dibuka ulang dengan PyMuPDF. Isi sesi dan bagian analisis soal terbaca |
| Kode dan aset | Sintaks JS, impor lokal, referensi HTML, aset avatar dan integritas arsip diperiksa |

Fixture, akun uji, dan skrip mock berada di luar paket situs. Penyesuaian kecil pada avatar header, menu akun, dan perilaku peringkat dilakukan setelah uji viewport. Tes antarmuka di atas tidak memverifikasi database atau WebSocket produksi.

## Pemeriksaan yang memerlukan pemasangan di lingkungan sekolah

Gunakan dua akun siswa, satu guru pemilik, satu guru berbeda, dan satu admin. Untuk pengujian konkurensi gunakan perangkat atau profil browser terpisah. Catat PASS/FAIL, akun yang dipakai, waktu, dan versi deployment.

- [ ] Preflight cocok, backup dapat dipulihkan. Langkah 03 dan 08 memberi hasil yang diharapkan. Jalankan skrip 09 pada salinan uji.
- [ ] Daftar, konfirmasi email, masuk, logout, tampil/sembunyikan kata sandi, reset dari email nyata, pemulihan sesi dan tujuan login sesuai role.
- [ ] Siswa lama melihat materi, lampiran, nilai lama, bookmark dan progres miliknya. Pengelolaan konten admin masih berfungsi. Avatar yang dipilih tampil lagi di perangkat kedua.
- [ ] Guru membuat dan menyunting keenam tipe soal, menggandakan, mengurutkan, menambah gambar, mengatur kunci dan pembahasan. Input tidak lengkap ditolak.
- [ ] Guru membuat ruang. Dua siswa bergabung, memilih avatar berbeda dan saling melihat di lobi. Periksa kode salah, ruang penuh, terkunci, kedaluwarsa, tombol siap, keluarkan peserta, buka kembali dan batal.
- [ ] Uji sinkronisasi dua perangkat di kedua mode, dengan timer mati dan menyala. Kirim tepat sebelum dan sesudah batas waktu. Periksa jeda/lanjut, dua permintaan mulai dan dua kiriman untuk satu soal. Hanya satu jawaban diterima per nomor.
- [ ] Putuskan koneksi peserta setelah mengirim, lalu masuk kembali. Matikan jaringan host lalu buka riwayatnya. Pastikan server mempertahankan posisi dan skor. Catat latensi di kelas nyata.
- [ ] Uji nama sama, peringkat seri, peserta tanpa jawaban dan jawaban terlambat. Cocokkan nilai di layar siswa, analisis guru, PDF dan empat sheet Excel dari sesi tersebut.
- [ ] Periksa otorisasi menggunakan akun sesuai role. Siswa hanya menerima soal yang sedang disajikan tanpa kunci. Siswa tidak dapat memulai sesi, mengubah skor/role, atau membaca laporan guru. Guru lain tidak dapat membaca bank privat dan laporan guru pemilik. Admin dapat mengelola izin.
- [ ] Bila mengaktifkan tamu, pastikan hanya ruang yang mengizinkan tamu bisa diikuti. Periksa akses tabel, Storage dan RPC kustom dengan akun anonim sebelum membuka pendaftaran tamu.
- [ ] Buat kelas, bagikan undangan, berikan tugas, uji tenggat serta pengulangan. Keluarkan peserta dan verifikasi pembatasan tugas. Notifikasi tenggat dan hasil tercatat di akun yang tepat.
- [ ] Verifikasi navigasi keyboard, pembaca layar, reduced motion, kontras, konten sangat panjang, Android nyata, scroll tabel laporan dan unduhan PDF/Excel dari HP.
- [ ] Setelah pengujian layanan, siapkan deployment production di GitHub/Cloudflare Pages dan periksa ulang email redirect.
