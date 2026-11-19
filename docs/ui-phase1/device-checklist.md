# Checklist Pengujian Perangkat Seluler Nyata (iOS Safari & Android Chrome)

Dokumen ini digunakan untuk verifikasi manual UI GoRaku (語楽) pada perangkat seluler fisik — khususnya **iOS Safari** (iPhone dengan Dynamic Island / Home Indicator) dan **Android Chrome** (termasuk keyboard virtual dan gesture navigation) — untuk aspek-aspek yang tidak dapat diverifikasi secara penuh oleh Playwright headless.

> Catatan perangkat uji yang disarankan:
> - **iOS Safari:** iPhone (iOS 17/18+), orientasi portrait & landscape, mode web biasa serta "Add to Home Screen" (PWA standalone).
> - **Android Chrome:** Ponsel Android layar 360–412px (Chrome terkini), baik navigasi gestur maupun 3-tombol, dengan Gboard aktif.

---

## 1. Render Tekstur Kertas *Washi* & Kelancaran Gulir (*Scroll Smoothness*)

Konteks kode: `src/aizome.css` (`--washi-uri` dimatikan di bawah `720px` melalui `@media (min-width: 720px)` pada `.washi`, `.app-shell`, `.landing-v2`).

- [ ] **iOS Safari (< 720px portrait):** Gulir cepat ke atas dan ke bawah pada `/`, `/beranda`, `/deck`, `/library`, dan `/progress`. Pastikan gulir momentum 60fps terasa mulus tanpa *jank*, kedip (*flicker*), atau artefak raster SVG `feTurbulence`.
- [ ] **iOS Safari / iPadOS (>= 720px / landscape):** Pastikan tekstur *washi* (`--washi-uri`) tampil halus tanpa memicu *re-raster* berat saat gulir atau *pinch-zoom*.
- [ ] **Android Chrome (< 720px & tablet >= 720px):** Uji gulir panjang pada daftar deck dengan sub-deck terbuka dan halaman `/`; pastikan tidak ada lag komposit (*compositing lag*) atau *checkerboarding*.
- [ ] **Reduced Motion:** Aktifkan *Reduce Motion* di pengaturan OS (`Settings > Accessibility > Motion` di iOS, atau *Remove animations* di Android) lalu muat ulang `/` dan `/beranda` untuk memastikan tidak ada animasi yang mengganggu.

---

## 2. Teks Vertikal `writing-mode: vertical-rl` (*Tategaki*)

Konteks kode: `.landing-tategaki-lead`, `.beranda-hero-v2__tategaki`, `.jp-tategaki-tag`, `.lb-cover span`, serta pembaca novel (`src/pages/Reader.tsx` mode `vertical-rl`) dan pratinjau pembaca di `src/pages/Landing.tsx`.

- [ ] **Landing & Beranda (`<= 639px`):** Pastikan `.landing-tategaki-lead` dan `.beranda-hero-v2__tategaki` berpindah rapi menjadi horizontal (`writing-mode: horizontal-tb`) pada ponsel sempit tanpa memotong karakter atau menyebabkan *overflow* horizontal.
- [ ] **Landing & Beranda (`>= 640px` / tablet & desktop):** Pastikan `writing-mode: vertical-rl` dengan `text-orientation: upright` menampilkan karakter kanji, kana, dan titik tengah (`・`) tegak lurus dengan spasi konsisten.
- [ ] **Reader Novel (`/library/:bookId`) mode `Vertikal`:** Buka novel contoh (`吾輩は猫である`) dan aktifkan mode **Vertikal** (`vertical-rl`). Pastikan:
  - [ ] Furigana (`<ruby><rt>`) menempel di sisi kanan kanji utama (tidak melompat atau bertumpuk).
  - [ ] Tanda baca Jepang (`。`, `、`, `「」`) berorientasi benar di kedua browser (WebKit Safari dan Blink Chrome).
  - [ ] Ketuk kata pada mode vertikal tetap memicu popup kamus `ReaderPopup` pada posisi kata yang tepat.

---

## 3. *Safe-Area Insets* & Bilah Tab Bawah (`.mobile-nav`)

Konteks kode: `src/index.css` (`.mobile-nav` memakai `height: calc(64px + env(safe-area-inset-bottom))`, `padding-bottom: env(safe-area-inset-bottom)`; `.content` memakai `padding-bottom: calc(96px + env(safe-area-inset-bottom))`; `.topbar` memakai `env(safe-area-inset-top)`).

- [ ] **iOS Safari (Home Indicator & Notch/Dynamic Island):**
  - [ ] Pastikan `viewport-fit=cover` pada `index.html` bekerja sehingga bilah `.mobile-nav` menutup area bawah dengan rapi tanpa menabrak garis *Home Indicator*.
  - [ ] Pastikan ikon dan label 6 tab (`Beranda`, `Deck`, `Mining`, `Pustaka`, `Ujian JLPT`, `Progres`) tetap terbaca jelas dan memiliki area sentuh memadai (`>= 44px`).
  - [ ] Gulir hingga bagian paling bawah pada `/beranda`, `/deck`, `/library`, `/exam`, `/progress`, dan `/settings`; pastikan konten terakhir tidak tertutup `.mobile-nav`.
- [ ] **iOS Safari Standalone (Add to Home Screen):** Uji apakah `.topbar` dan `.landing-nav` menghormati `env(safe-area-inset-top)` sehingga tidak tertimpa jam/baterai bilah status.
- [ ] **Android Chrome (bilah alamat dinamis & navigation bar):** Gulir ke bawah agar bilah alamat Chrome menyusut, lalu gulir ke atas lagi; pastikan `.mobile-nav` tetap menempel di tepi bawah tanpa celah kosong atau lonjakan tata letak (*layout jump*).

---

## 4. Floating Pill Navbar (`.landing-nav`) Saat Menggulir

Konteks kode: `src/index.css` (`.landing-nav` fixed top pill, `.landing-nav.is-scrolled`, `.lnav-menu-btn`, `.lnav-panel`) dan `src/pages/Landing.tsx`.

- [ ] **Transisi Gulir:** Di `/`, gulir melewati bagian hero; pastikan `.landing-nav` tetap menempel di atas, menyusut mulus (`is-scrolled`), dan tidak bergetar (*jitter*) saat toolbar Safari/Chrome muncul dan menghilang.
- [ ] **Menu Mobile:** Ketuk tombol hamburger (`.lnav-menu-btn`); pastikan panel `.lnav-panel` terbuka rapi di dalam viewport (termasuk di `320px` dan `390px`), semua tautan (`#simulasi`, `#subdeck-jlpt`, `#eksplorer`, `#fitur`, `#faq`) dapat diketuk, dan panel otomatis menutup setelah memilih tautan jangkar.
- [ ] **Scroll Margin Jangkar:** Setelah mengetuk tautan jangkar di menu mobile, pastikan judul bagian tujuan tidak tertutup oleh bilah `.landing-nav` (`scroll-margin-top`).

---

## 5. Popup, Menu Overflow, & *Bottom Sheet*

Konteks kode: `src/components/ReaderPopup.tsx` (memakai `env(safe-area-inset-bottom)`), modal di `Layout.tsx` / `Decks.tsx` / `Exam.tsx`, serta menu overflow dan bottom sheet filter di `/deck`.

- [ ] **ReaderPopup (`/library/:bookId` & `/manga/:bookId`):** Ketuk kata di bagian atas dan bagian bawah layar ponsel; pastikan popup kamus tetap berada di dalam viewport, dapat digulir jika definisi panjang, dan tombol **Tambang ke Deck** tidak terpotong oleh *Home Indicator*.
- [ ] **Menu Overflow & Filter Bottom Sheet (`/deck` `<= 720px`):**
  - [ ] Ketuk tombol menu overflow (`Impor .apkg`, `Buat deck baru`); pastikan menu tidak terpotong tepi layar dan menutup saat mengetuk di luar atau menekan `Escape`.
  - [ ] Ketuk tombol **Filter** untuk membuka bottom sheet (Urutan, Status, Sub-deck, Mode Tampilan); pastikan gulir halaman latar terkunci / tidak ikut tergulir di iOS Safari, dan `env(safe-area-inset-bottom)` memberi ruang nyaman di bawah sheet.
- [ ] **Modal Detail & Cek Audio (`/exam`, `/deck`, `/library`):** Buka modal detail ujian JLPT dan dialog pengelola kamus; pastikan tombol tutup selalu terjangkau dan konten modal bisa digulir mulus.

---

## 6. Tumpang Tindih Keyboard Virtual pada Input (*Keyboard Overlap*)

Konteks kode: kolom pencarian di `/deck` dan `/library`, input form di `DeckFormModal`, `CardEditorModal`, `Mining.tsx`, `LoginPage.tsx`, dan `Settings.tsx`.

- [ ] **Pencarian di `/deck` & `/library`:** Ketuk input `Cari deck...` atau `Cari judul atau penulis...`. Saat keyboard virtual terbuka, pastikan input tetap terlihat di atas keyboard dan hasil daftar langsung terbaca saat keyboard ditutup.
- [ ] **Modal Form (`DeckFormModal`, `CardEditorModal`):** Buka modal di ponsel lalu fokus ke field teks bawah (mis. kalimat contoh atau terjemahan). Pastikan layar/modal otomatis menggulir input aktif ke area terlihat (tidak tertutup keyboard, baik di iOS Safari maupun Android Chrome dengan `interactive-widget` / visual viewport).
- [ ] **Mining & Login (`/mining`, `/login`):** Fokus pada textarea teks Jepang di `/mining` dan input email/nama di `/login`; pastikan tombol submit utama tetap dapat dicapai setelah mengetik.
- [ ] **Zoom Otomatis iOS Safari:** Pastikan input teks memiliki `font-size >= 16px` pada layar kecil (atau tidak memicu *auto-zoom* paksa Safari yang menggeser viewport keluar batas horizontal).
