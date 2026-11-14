# Redesain Aizome GoRaku (Cabang `redesign/aizome`)

Dokumen ini merangkum pelaksanaan redesain **Aizome** di seluruh aplikasi GoRaku pada cabang `redesign/aizome` (tanpa mengubah cabang `main`), mempertahankan seluruh logika aplikasi, rute, penyimpanan IndexedDB/Dexie/Zustand, pengujian unit, serta data statis (`*Data.ts`, `src/data/`).

---

## 1. Ringkasan Tahapan & Commit

- **`9379cac`** — *Tahap 0*: Pengaturan skrip tangkapan layar Playwright (`tools/shots.mjs`), inventaris rute & modal (`docs/redesign/inventory.md`), dan tangkapan layar awal (`docs/redesign/before/`).
- **`77bfd2c`** — *Tahap 1*: Penetapan token Aizome di `src/aizome.css`, skrip codemod warna (`tools/codemod-colors.mjs`), pembaruan font, serta penyelarasan cangkang aplikasi (`src/components/Layout.tsx`).
- **`130ebec`** — *Tahap 2*: Redesain halaman `Landing.tsx`, `LoginPage.tsx`, `App.tsx` (Beranda dengan bokashi), `Decks.tsx`, `DeckDetail.tsx`, dan `ImportDeckModal.tsx`.
- **`cb10f0f`** — *Tahap 3*: Redesain modul `Review.tsx`, `Mining.tsx`, `Library.tsx`, `Reader.tsx`, `MangaReader.tsx`, `ReaderPopup.tsx`, dan `MangaOcrPanel.tsx`.
- **`e73b04c`** — *Perbaikan Tahap 2–3*: Penyesuaian kontras permukaan bokashi serta tampilan furigana/token pada halaman Mining.
- **`0852f29`** — *Tahap 4*: Migrasi modul Ujian JLPT (`Exam.tsx` & `src/components/jlpt/*`), `Progress.tsx`, `Profile`, `Settings`, `LicenseAttribution.tsx`, modal (`CommandPaletteModal.tsx`, `DictionaryManagerModal.tsx`, `MangaManageModal.tsx`), penyempurnaan aksen sidebar gelap `Layout.tsx`, pembaruan `tools/shots.mjs`, dan tangkapan layar akhir `docs/redesign/after/`.

---

## 2. Token Warna & Tipografi (`src/aizome.css`)

| Token | Nilai | Peran |
|---|---|---|
| `--kon` | `#12284A` | Indigo tua (aksen gelap & rail sidebar) |
| `--ai-tua` | `#17406A` | Indigo dalam (hover / aksen sekunder) |
| `--ai` | `#1F5C85` | Indigo utama |
| `--mizu` | `#BCD6E2` | Biru air lembut (highlight terang / aksen halus) |
| `--tsuki` | `#EDF2F5` | Latar kanvas utama (kertas washi sejuk) |
| `--panel` | `#F8FAFB` | Permukaan kartu & panel |
| `--garis` | `#C5D3DB` | Garis pemisah & border kartu |
| `--tinta` | `#14202B` | Teks utama |
| `--tinta-2` | `#44566A` | Teks sekunder / metadata |
| `--shu` | `#B93C22` | Merah shu / vermilion (CTA utama & peringatan) |
| `--ok` | `#2A6F5B` | Hijau penanda sukses |
| `--bokashi` | `linear-gradient(180deg, #12284A 0%, #1F5C85 40%, #BCD6E2 85%, #EDF2F5 100%)` | Gradasi bokashi khas aizome |
| `--font-serif` | `"Shippori Mincho", "Noto Serif JP", serif` | Heading & aksen tipografi Jepang |
| `--font-sans` | `"Zen Kaku Gothic New", system-ui, -apple-system, sans-serif` | Teks antarmuka utama |

---

## 3. Daftar Berkas yang Diubah (Selain Tangkapan Layar)

- **Konfigurasi, Gaya Global & Skrip:** `index.html`, `package.json`, `package-lock.json`, `src/main.tsx`, `src/aizome.css`, `src/index.css`, `src/pages.css`, `src/decks.css`, `tools/codemod-colors.mjs`, `tools/shots.mjs`, `docs/redesign/inventory.md`
- **Halaman (`src/pages/` & `src/App.tsx`):** `src/App.tsx`, `Landing.tsx`, `LoginPage.tsx`, `Decks.tsx`, `DeckDetail.tsx`, `Review.tsx`, `Mining.tsx`, `Library.tsx`, `Reader.tsx`, `MangaReader.tsx`, `Progress.tsx`, `Exam.tsx`, `LicenseAttribution.tsx`
- **Komponen & Modal (`src/components/`):** `Layout.tsx`, `CommandPaletteModal.tsx`, `DictionaryManagerModal.tsx`, `ImportDeckModal.tsx`, `MangaManageModal.tsx`, `MangaOcrPanel.tsx`, `ReaderPopup.tsx`
- **Komponen JLPT (`src/components/jlpt/`):** `AudioCheckModal.tsx`, `ExtraMaterialsModal.tsx`, `ListeningSceneCard.tsx`, `TestDetailsModal.tsx`, `TestReviewView.tsx`, `TestSessionRunner.tsx`

---

## 4. Pengecualian Nilai Warna (Hex) yang Sengaja Dipertahankan

Beberapa warna hex non-token dipertahankan secara sadar demi kejelasan semantik domain dan kenyamanan baca:

1. **Penghitung Klasik Anki (`src/pages/Decks.tsx`, `src/pages/DeckDetail.tsx`, `src/App.tsx`):** Warna biru/merah/hijau standar Anki (`#2563eb`, `#dc2626`, `#16a34a`, dst.) untuk membedakan kartu *Baru / Belajar / Ulas*.
2. **Tema Pembaca Novel & Demo (`src/pages/Reader.tsx`, `src/pages/Landing.tsx`):** Warna tema Sepia dan Gelap (*Dark mode*) untuk kenyamanan membaca teks panjang.
3. **Krom Gelap Pembaca Manga (`src/pages/MangaReader.tsx`, `src/components/MangaOcrPanel.tsx`):** Latar gelap `#0d0d0f` / `#151518` / `#1b1b20` dan sorotan `#fbbf24` agar halaman komik tetap kontras.
4. **Penanda Bendera Ujian JLPT (`#D49B27`):** Warna kuning penanda ragu-ragu pada sesi simulasi JLPT.
5. **Tingkat Luminans & Status Khusus:** Variasi tonal aizome (seperti `#DCE6F2`, `#B4C9DB`, `#26487A`, `#10213A`, `#0D1B30` pada heatmap/sidebar) serta highlight teks terang pada sidebar gelap (`#fff`, `#FCE2DC`, `#9FE6C8`, `#b7e4d6`).

---

## 5. Verifikasi Terakhir

- **Unit Test & Build:**
  - `npm test`: `14` berkas tes lolos, `131` pengujian lolos (dijalankan ulang setelah penulisan dokumen ini).
  - `npm run build`: kompilasi produksi Vite + TypeScript berhasil tanpa galat.
- **Tangkapan Layar & Overflow 1440×900 / 390×844 (`tools/shots.mjs --out docs/redesign/after`):**
  - 30 tangkapan layar (15 desktop + 15 iPhone 14) diambil dari build dengan data tersimpan (`deck=ps-root`, `novel`, `manga`), bebas horizontal overflow.
- **Alur Fungsional Playwright & Overflow 320px:**
  - Login menuju `/beranda`, buka detail deck (`/deck/ps-root`), balik & nilai kartu di `/deck/ps-root/review` (mengurangi hitungan jatuh tempo 80 → 79), klik token di `/mining` (`.mn-tok`), muat & buka novel contoh ke `/library/:bookId`, serta mulai sesi simulasi di `/exam` — semuanya berjalan tanpa `pageerror` maupun `console.error`.
  - Cek lebar `320px` pada `/progress`, `/exam`, `/profile`, `/settings`, dan `/license`: seluruhnya melaporkan `scrollW === 320`, `clientW === 320`, `overflow: false`.

---

## 6. Checklist Uji Manual Perangkat iOS Safari Nyata

Karena pengujian otomatis dijalankan di Chromium headless, lakukan pemeriksaan cepat di iPhone/iPad Safari nyata sebelum merge ke `main`:

- [ ] **Drawer Sidebar & Bilah Navigasi Bawah (`position: fixed`):** Buka/tutup drawer sidebar dan pastikan `.mobile-bottom-nav` tetap menempel rapi saat scroll cepat maupun saat address bar Safari menyusut/melebar.
- [ ] **Safe Area (`env(safe-area-inset-*)`):** Cek jarak aman di bagian atas (notch/Dynamic Island) dan bawah (Home Indicator) pada mode portrait dan landscape.
- [ ] **Tinggi Layar Dinamis (`100dvh`):** Pastikan layar review kartu, sesi ujian JLPT, dan pembaca tidak terpotong di bawah bilah Safari.
- [ ] **Bottom Sheet `ReaderPopup`:** Ketuk kata pada Reader/MangaReader dan uji scroll isi definisi serta geser/tutup panel kamus dengan sentuhan.

---

## 7. Instruksi Rollback

Seluruh perubahan berada di cabang terpisah `redesign/aizome`; cabang `main` tidak tersentuh.

- Kembali ke kondisi sebelum redesain:
  ```bash
  git checkout main
  ```
- Membatalkan satu commit tertentu pada `redesign/aizome`:
  ```bash
  git revert <commit-hash>
  ```
- Jika siap digabungkan setelah review & uji iOS selesai:
  ```bash
  git checkout main
  git merge --no-ff redesign/aizome
  ```
