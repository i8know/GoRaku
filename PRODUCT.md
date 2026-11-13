# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pembelajar otodidak bahasa Jepang berbahasa Indonesia yang menggabungkan belajar berbasis imersi (membaca novel, manga, dan menambang kalimat) dengan persiapan ujian JLPT N5–N1 secara terstruktur.

## Product Purpose

GoRaku (語楽) menyatukan empat alur belajar bahasa Jepang dalam satu ruang kerja terpadu: membaca karya asli (EPUB/TXT dengan furigana dan mode tategaki, serta manga CBZ dengan OCR), mencari arti kata secara instan lewat kamus offline bergaya Yomitan dengan analisis deinflection, menambang kalimat ke dalam dek kartu ulasan SRS berhierarki (kompatibel `.apkg` Anki), serta berlatih simulasi ujian JLPT N5–N1. Keberhasilan berarti pengguna dapat berpindah mulus dari membaca konten autentik ke retensi kosakata dan kesiapan ujian tanpa bergantung pada koneksi internet atau layanan eksternal.

## Positioning

Lingkungan belajar imersi bahasa Jepang 100% lokal di perangkat (IndexedDB melalui Dexie, SQLite WASM via `sql.js`, Zustand persist) dalam antarmuka berbahasa Indonesia — tanpa server wajib, tanpa penguncian akun cloud, dan menjaga privasi data belajar sepenuhnya di perangkat pengguna.

## Operating Context

- **Sesi desktop (fokus mendalam):** membaca novel EPUB/TXT dan manga CBZ berukuran penuh, menjalankan OCR pada balon dialog, menata hierarki sub-dek Anki, mengelola kamus Yomitan, serta mengerjakan simulasi ujian JLPT berdurasi penuh.
- **Sesi mobile web / iOS Safari (harian & ringkas):** melakukan ulasan kartu SRS harian saat bepergian, mengecek progres/streak, serta meninjau kosakata secara cepat dengan kontrol sentuh.
- **Alur lintas modul:** klik kata di pembaca novel/manga atau studio mining → buka popup kamus offline & deinflection → tambang kalimat lengkap (mempertahankan penanda kata target `<b>`) langsung ke sub-dek tujuan.

## Capabilities and Constraints

- **100% lokal / offline-first:** seluruh dek, kartu, kamus, berkas buku/manga, progres belajar, dan paket soal JLPT disimpan dan diproses di browser pengguna (IndexedDB + SQLite WASM + localStorage); fitur akun/login bersifat lokal di perangkat.
- **Format & standar terbuka:** mendukung impor/ekspor dek `.apkg` Anki (dengan partisi sub-dek N5–N1), impor kamus format Yomitan, EPUB/TXT multi-encoding (Foliate-js), CBZ dengan `tesseract.js`, serta paket soal JLPT berbasis data terbuka.
- **Kepatuhan atribusi & penafian JLPT:** materi latihan JLPT adalah soal latihan orisinal berbasis perkiraan leksikal data terbuka (JMdict & KANJIDIC2 CC BY-SA 4.0, Tatoeba CC BY 2.0 FR), bukan soal resmi The Japan Foundation / JEES; halaman `/license` wajib mempertahankan penafian dan atribusi tersebut.
- **Keputusan terbuka:** sinkronisasi lintas perangkat dan backend cloud opsional belum diputuskan dan tidak diasumsikan ada oleh pekerjaan fitur maupun UI saat ini.

## Brand Commitments

- Nama merek **GoRaku (語楽)** dipertahankan.
- Bahasa antarmuka utama adalah **bahasa Indonesia** yang jelas bagi pembelajar lokal, sementara teks bacaan, furigana, bacaan On/Kun, istilah linguistik Jepang, dan butir soal tetap disajikan dalam bahasa Jepang autentik.

## Evidence on Hand

- **Kode aplikasi & rute lengkap (`src/main.tsx`, `src/pages/*`):** `/`, `/login`, `/beranda`, `/deck`, `/deck/:deckId`, `/deck/:deckId/review`, `/mining`, `/library`, `/library/:bookId`, `/manga/:bookId`, `/progress`, `/exam`, `/license`, `/profile`, `/settings`.
- **Demonstrasi & contoh bawaan:** token demo interaktif 4-lapis deinflection (`src/pages/Landing.tsx`), dek contoh & modul pembuatan/paket soal JLPT N5 (`src/lib/`, `tools/generateQuestionPack.ts`), serta contoh novel/manga di perpustakaan lokal.
- **Atribusi sumber terbuka (`src/pages/LicenseAttribution.tsx`):** metadata paket soal aktif, rujukan EDRDG (JMdict/KANJIDIC2) dan Tatoeba Project.
- **Ketiadaan bukti yang tidak boleh dibuat-buat:** tidak ada testimoni pengguna nyata, angka pengguna aktif, skor kepuasan publik, atau klaim sertifikasi resmi JLPT.

## Product Principles

1. **Lokal dan mandiri lebih utama:** setiap alur inti harus tetap bekerja cepat dan penuh di perangkat pengguna tanpa mengasumsikan API server atau login jarak jauh.
2. **Dari membaca langsung ke ingatan:** perpendek jarak antara bertemu kata asing dalam konteks bacaan autentik dan menyimpannya sebagai kartu SRS beserta kalimat utuhnya.
3. **Seimbang antara kedalaman desktop dan kelincahan mobile:** ruang baca, OCR, dan pengelolaan data harus lega di desktop sekaligus nyaman disentuh dan bebas kendala tata letak di mobile web / iOS Safari.
4. **Transparansi data dan sumber belajar:** pisahkan dengan tegas antara latihan orisinal berbasis data terbuka dan ujian resmi JLPT, serta pertahankan kepemilikan pengguna atas berkas `.apkg` dan kamusnya.

