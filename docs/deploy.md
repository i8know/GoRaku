# Panduan Deploy GoRaku (語楽)

Dokumen ini menjelaskan konfigurasi build, routing SPA, aset biner Git LFS (OCR Tesseract), variabel lingkungan, serta langkah penyiapan pada **GitHub Pages**, **Vercel**, dan **Netlify**.

---

## 1. Ringkasan Arsitektur Build & Fallback SPA per Host

GoRaku adalah aplikasi statis murni (React 19 + Vite 8 + IndexedDB/Dexie + WebAssembly `sql.js` & `tesseract.js`) tanpa server backend. Karena aplikasi menggunakan `BrowserRouter`, server statis harus mengarahkan permintaan rute dalam (*deep link* seperti `/deck` atau `/library`) ke `index.html`.

| Host | Base Path Bawaan | Mekanisme Fallback SPA | Berkas Konfigurasi |
| :--- | :--- | :--- | :--- |
| **GitHub Pages** (Project Site) | `/<nama-repo>/` (mis. `/GoRaku/`) | Menyalin `dist/index.html` menjadi `dist/404.html` saat build (`APP_BASE_PATH` aktif) dan di workflow CI | `vite.config.ts` (`closeBundle`), `.github/workflows/deploy-pages.yml` |
| **GitHub Pages** (Custom Domain) | `/` | Menyalin `dist/index.html` menjadi `dist/404.html` | `.github/workflows/deploy-pages.yml` (setel `APP_BASE_PATH=/`) |
| **Netlify** | `/` | Aturan rewrite `/*  /index.html  200` yang otomatis disalin Vite ke `dist/_redirects` | `public/_redirects` |
| **Vercel** | `/` | Aturan `rewrites` ke `/index.html` (mengecualikan `/assets/*`, `/tesseract/*`, `favicon.svg`, `robots.txt`) serta `Cache-Control` immutable untuk `/assets/*` dan `/tesseract/*` | `vercel.json` |

> **Catatan Pengujian Lokal:** Jangan gunakan `vite preview` untuk menguji apakah fallback SPA host berfungsi, karena `vite preview` memiliki fallback SPA internal. Gunakan server statis polos tanpa fallback (mis. `python3 -m http.server` di dalam `dist/`) untuk memverifikasi perilaku 404 murni dan emulasi `404.html` / `_redirects`.

---

## 2. Variabel Lingkungan Build

| Variabel | Nilai Bawaan | Fungsi |
| :--- | :--- | :--- |
| `APP_BASE_PATH` | `/` | Mengatur subpath aplikasi (mis. `/GoRaku/`). Dinormalisasi otomatis oleh `normalizeBasePath()` agar selalu diawali dan diakhiri `/` (`import.meta.env.BASE_URL`). Mengatur `basename` pada `BrowserRouter`, URL aset `/tesseract/*`, serta `<link rel="icon">`. Saat `APP_BASE_PATH` disetel, `vite build` juga menyalin `dist/index.html` ke `dist/404.html`. |
| `FIGMA_PUBLIC_URL` | *(kosong)* | Variabel internal lingkungan pratinjau Figma Make. Jika disetel, memiliki prioritas di atas `APP_BASE_PATH`. |
| `ALLOW_INDEX` | *(kosong / nonaktif)* | Secara bawaan (`ALLOW_INDEX` tidak disetel), build menghasilkan `dist/robots.txt` dengan `Disallow: /` dan `<meta name="robots" content="noindex, nofollow">` (aman untuk proyek kampus dan lingkungan pratinjau). Setel `ALLOW_INDEX=1` saat build produksi jika ingin mengizinkan mesin pencari mengindeks situs (`robots.txt` berisi `Allow: /` dan tanpa tag meta `noindex`). |

---

## 3. Penanganan Aset Git LFS (OCR Manga Tesseract)

### Mengapa Opsi A (Tetap Menggunakan Git LFS + Pemeriksaan Ketat) Dipilih

1. **Bukti Repositori:** Berkas `.gitattributes` telah melacak `*.wasm` dan `*.gz` menggunakan Git LFS sejak riwayat commit awal di `main` dan branch fitur. Seluruh 9 berkas biner di `public/tesseract/` (`3` berkas `.wasm` dan `6` berkas `.traineddata.gz`, total ~18,8 MiB / ~19,7 MB di disk; ~15,4 MiB / ~16,2 MB objek LFS unik karena `fast/` identik dengan root `lang-data/`) sudah tersimpan sebagai objek LFS di riwayat Git yang telah dipublikasikan.
2. **Risiko Opsi B:** Mencabut pelacakan LFS pada `public/tesseract/**` tanpa menulis ulang riwayat tetap meninggalkan objek LFS lama di riwayat commit sekaligus menambah ~18,8 MiB (~19,7 MB) biner langsung ke objek Git standar; sebaliknya menjalankan `git lfs migrate export --everything` untuk menulis ulang riwayat akan mengubah hash commit dan merusak histori branch yang sudah dipublikasikan.
3. **Mitigasi Berlapis pada Opsi A:**
   - **Pemeriksa Build (`tools/checkLfsAssets.mjs`):** Memeriksa `public/` dan `dist/` setelah build untuk memastikan tidak ada berkas yang diawali pointer Git LFS (`version https://git-lfs.github.com/spec`), seluruh `tesseract/*.wasm` diawali magic bytes WebAssembly (`00 61 73 6d`), dan seluruh `*.gz` diawali magic bytes GZIP (`1f 8b`).
     - `npm run verify` menjalankan `node tools/checkLfsAssets.mjs` (mode peringatan ramah kontributor lokal bila belum menjalankan `git lfs pull`).
     - Workflow deploy menjalankan `node tools/checkLfsAssets.mjs --strict` yang langsung menggagalkan deployment (exit code `1`) apabila ada pointer LFS atau biner rusak.
   - **Pelindung Runtime (`src/lib/ocr/tesseractProvider.ts`):** Fungsi `verifyOcrRuntimeAssets()` memeriksa magic bytes WASM (`00 61 73 6d`) dan GZIP (`1f 8b`) sebelum worker Tesseract dijalankan, ditambah `errorHandler` pada `createWorker`. Jika aset gagal dimuat atau berupa pointer LFS 132-byte, aplikasi menampilkan toast **"Data OCR tidak dapat dimuat. Pastikan aset /tesseract terpasang dengan benar."** dan tidak menggantung secara diam-diam.

### Mengapa `ci.yml` Tidak Menggunakan `lfs: true`
Workflow verifikasi PR (`.github/workflows/ci.yml`) sengaja **tidak** menyetel `lfs: true` karena `tsc`, `vitest`, dan `vite build` tidak memerlukan pengunduhan 15,4 MiB (~16,2 MB) objek LFS agar lulus. Hal ini menghemat kuota bandwidth bulanan Git LFS pemilik repositori pada setiap push PR. Sebaliknya, `.github/workflows/deploy-pages.yml` wajib menyetel `lfs: true` dan memvalidasinya dengan `--strict`.

---

## 4. Langkah Penyiapan per Host

### A. GitHub Pages (Otomatis via GitHub Actions)

1. Buka repositori di GitHub → **Settings** → **Pages**.
2. Pada bagian **Build and deployment** → **Source**, pilih **GitHub Actions** (jangan pilih *Deploy from a branch*).
3. Setiap kali branch `main` menerima push (atau saat workflow dijalankan manual lewat tab **Actions** → **Deploy ke GitHub Pages** → **Run workflow**), workflow `.github/workflows/deploy-pages.yml` akan:
   - Melakukan checkout beserta aset Git LFS (`lfs: true`);
   - Menjalankan `npm ci` dan `npm run verify`;
   - Menjalankan build subpath dengan `APP_BASE_PATH=/${{ github.event.repository.name }}/`;
   - Memverifikasi biner dengan `node tools/checkLfsAssets.mjs --strict` dan menyalin `dist/index.html` ke `dist/404.html`;
   - Mengunggah artefak `./dist` dan men-deploy ke `https://<username>.github.io/<nama-repo>/`.

#### Catatan Kuota Bandwidth Git LFS di GitHub
- Akun GitHub gratis mendapatkan kuota penyimpanan LFS **1 GB** dan bandwidth LFS **1 GB/bulan**.
- Setiap kali workflow `deploy-pages.yml` berjalan, runner GitHub Actions mengunduh sekitar **15,4 MiB (~16,2 MB)** objek LFS unik saat checkout.
- **Pengunjung situs GitHub Pages tidak memakan kuota bandwidth Git LFS**, karena pengunjung mengunduh berkas statis dari CDN GitHub Pages (hasil artefak `dist/`), bukan dari server Git LFS.

#### Menggunakan Custom Domain di GitHub Pages
Jika Anda memasang domain kustom (mis. `goraku.example.com`) di **Settings → Pages → Custom domain**:
1. Aplikasi akan disajikan di root domain (`/`), bukan di `/<nama-repo>/`.
2. Ubah variabel `APP_BASE_PATH` pada `.github/workflows/deploy-pages.yml` dari `/${{ github.event.repository.name }}/` menjadi `/`.

#### Mengaktifkan Pengindeksan Mesin Pencari (SEO)
Jika situs sudah siap dipublikasikan ke mesin pencari, tambahkan `ALLOW_INDEX: "1"` pada blok `env:` langkah **Build produksi** di `.github/workflows/deploy-pages.yml` (atau di pengaturan Environment Variables Vercel/Netlify).

---

### B. Vercel

1. Buka proyek di dashboard Vercel → **Settings** → **Git** → aktifkan opsi **Git LFS**.
2. Pastikan konfigurasi build:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build && node tools/checkLfsAssets.mjs --strict`
   - **Output Directory:** `dist`
3. Berkas `vercel.json` di root repositori secara otomatis mengatur rewrite SPA ke `/index.html` dan header `Cache-Control` (`immutable` 1 tahun untuk `/assets/*` dan `/tesseract/*`, serta `no-cache, must-revalidate` untuk `/index.html` dan `/`).
4. *(Alternatif tanpa Git LFS di Vercel)*: Unduh artefak `github-pages` dari GitHub Actions atau jalankan `vercel deploy --prebuilt` dari runner GitHub Actions yang sudah melakukan checkout dengan `lfs: true`.

---

### C. Netlify

1. Aktifkan dukungan Git LFS pada repositori Netlify (tambahkan variabel lingkungan `GIT_LFS_ENABLED=true` di **Site configuration → Environment variables**, atau gunakan Netlify CLI / GitHub Actions `netlify deploy --prod --dir=dist`).
2. Pastikan konfigurasi build:
   - **Build command:** `npm run build && node tools/checkLfsAssets.mjs --strict`
   - **Publish directory:** `dist`
   - Berkas `.gitattributes` melacak `*.wasm` dan `*.gz` menggunakan Git LFS.
   - Pastikan berkas di `public/tesseract/` (total ~30,05 MiB keseluruhan folder `public/tesseract/` termasuk berkas JS, atau ~15,4 MiB objek LFS unik) ikut terunduh saat checkout.
3. Berkas `public/_redirects` (`/*  /index.html  200`) otomatis disalin ke `dist/_redirects` saat build untuk menangani semua deep link SPA.

---

## 5. Daftar Periksa Uji Asap Pasca-Deploy (*Post-Deploy Smoke Checklist*)

Jalankan 5 pemeriksaan berikut secara manual setelah situs ter-deploy:

- [ ] **1. Deep Link & Refresh Halaman:** Buka URL langsung ke `/deck`, `/library`, `/mining`, dan `/exam` (atau `/GoRaku/deck`, `/GoRaku/library` di GitHub Pages), lalu tekan **Refresh (`F5` / `Ctrl+R`)**. Pastikan aplikasi langsung tampil tanpa galat 404.
- [ ] **2. OCR pada Manga Contoh:** Buka **Perpustakaan** (`/library`), buka manga contoh (*Yotsuba&! — Cuplikan Bab 1*), aktifkan mode tarik gelembung OCR, lalu seleksi salah satu gelembung teks Jepang. Pastikan tab Network memuat `/tesseract/worker.min.js`, `/tesseract/tesseract-core-*.wasm`, dan `/tesseract/lang-data/best/jpn_vert.traineddata.gz` dengan status **HTTP 200** dan teks Jepang berhasil dikenali.
- [ ] **3. Pasang / Uji Kamus:** Buka **Pengaturan** atau ikon kamus, pastikan pencarian kata contoh berfungsi atau impor kamus Yomitan `.zip` berjalan di Web Worker tanpa galat.
- [ ] **4. Impor Deck `.apkg` Kecil:** Buka **Deck Saya** (`/deck`), klik **Impor Deck**, lalu unggah berkas `.apkg` kecil. Pastikan `sql-wasm-browser-*.wasm` termuat dengan status HTTP 200 dan kartu berhasil diimpor.
- [ ] **5. Persistensi Progres Setelah Reload:** Mulai satu sesi **Review**, nilai beberapa kartu, lalu muat ulang halaman (`Ctrl+R`). Pastikan progres kartu FSRS, deck yang diimpor, dan riwayat bacaan tetap tersimpan di IndexedDB.
