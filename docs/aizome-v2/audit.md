# Audit Baseline Aizome v2 (Tahap 0)

Dokumen ini mencatat kondisi awal sebelum penyempurnaan komposisi, ruang (*Ma* 間), kedalaman celupan (*indigo dye scale*), motif/tekstur, dan disiplin aksen `--shu` (`#B93C22`).

---

## 1. Tangkapan Layar Baseline (`docs/aizome-v2/before/`)

Diambil melalui `node tools/shots.mjs --out docs/aizome-v2/before --report docs/aizome-v2/before-audit.json` pada 5 lebar layar (`1440`, `1024`, `768`, `390`, `320`) untuk 9 rute:
1. `01-landing` (`/`)
2. `02-beranda` (`/beranda`)
3. `03-deck` (`/deck`)
4. `04-library` (`/library`)
5. `05-mining` (`/mining`)
6. `06-exam` (`/exam`)
7. `07-progress` (`/progress`)
8. `08-settings` (`/settings`)
9. `09-review-complete` (`/deck/:id/review` saat sesi selesai)

Total: **45 tangkapan layar** (`w1440__*`, `w1024__*`, `w768__*`, `w390__*`, `w320__*`). Tidak ditemukan *horizontal overflow* pada kondisi awal.

---

## 2. Audit Jumlah Elemen Aksen `#B93C22` (`--shu`) Sebelum Redesain

Target setelah penyempurnaan Aizome v2: **$\le 3$ elemen terlihat per rute** (1 merek, paling banyak 1 aksi utama, dan paling banyak 1 cap *hanko*).

| Rute | Slug | Hitungan `#B93C22` (1440px) | Elemen Terlihat yang Memakai `#B93C22` |
|---|---|---:|---|
| `/` | `01-landing` | **14** | `span.lnav-seal` (bg), `a.lnav-cta` (bg), `span.jp-hanko` hero (border+text), `a.primary-light` hero CTA (bg), `button.pg-primary` simulator (bg), `span.jp-hanko` section (border+text), `button.pg-primary` modul (bg), `span.step-num` ×4 (bg), `a.primary-light` bawah (bg), `span.brand-mark` footer (bg), `span.jp-hanko` footer (border+text) |
| `/beranda` | `02-beranda` | **15** | `span.brand-mark` sidebar (bg), titik notifikasi sidebar `bg-[var(--shu)]` (bg), `b.nav-collapsed-badge` ×2 (bg), `button.streak` topbar (text), titik `button.icon-bell i` (bg), `button.beranda-seal-cta` (bg), `button.pg-primary` "Buat deck baru" (bg), `span.is-due` ×4 pada baris deck (text), `.week-bars .day.is-today` (`span.bar`, `i` bg, `span` text) |
| `/deck` | `03-deck` | **12** | 6 elemen dari `Layout` (`brand-mark`, titik notifikasi sidebar, `nav-collapsed-badge` ×2, `button.streak`, `icon-bell i`) + `button.pg-primary` "Buat deck baru" (bg), `.pg-stats .hot strong` (text), `button.pg-primary.dk-list-btn` ×4 pada baris tabel deck (bg) |
| `/library` | `04-library` | **8** | 6 elemen dari `Layout` + `button.pg-primary` header "Tambah Novel / Manga" (bg) + `button.pg-primary` duplikat di keadaan kosong (bg) |
| `/mining` | `05-mining` | **7** | 6 elemen dari `Layout` + `button.modal-submit` "Simpan ke Deck" (bg) |
| `/exam` | `06-exam` | **9** | 6 elemen dari `Layout` + 3 tombol `bg-[var(--shu)]` pada kartu paket simulasi JLPT |
| `/progress` | `07-progress` | **8** | 6 elemen dari `Layout` + ikon api streak (text) + batang grafik `.pr-bars i.today` (bg) |
| `/settings` | `08-settings` | **8** | 6 elemen dari `Layout` + `button.pg-primary` "Simpan perubahan" (bg) + `button.outline-button.warn` "Reset progres review" (text) |
| `/deck/:id/review` (selesai) | `09-review-complete` | **7** | 6 elemen dari `Layout` + `button.primary-light` "Ke Beranda" (bg) |

---

## 3. Daftar Pemakaian Pil Hitungan Berwarna (Biru, Merah, Hijau `--ok`)

### A. `src/pages/Decks.tsx` & `src/decks.css`
- **Pil 3-angka Anki (`.anki-stats-group`, `.anki-num-new`, `.anki-num-learn`, `.anki-num-due`):**
  - `src/pages/Decks.tsx` baris 298–320 (baris daftar deck utama) dan baris 634–656 (laci sub-deck di mode grid).
  - `src/pages/Decks.tsx` baris 611–613 & 716–718 (`.anki-hdr-badge`: `anki-hdr-new` biru, `anki-hdr-learn` merah `--shu`, `anki-hdr-due` hijau `--ok`).
  - `src/decks.css` baris 910–970: `.anki-num-new.has-cards` (`--ai`), `.anki-num-learn.has-cards` (`--shu`), `.anki-num-due.has-cards` (`--ok`).
- **Kotak statistik atas (`.pg-stats`):**
  - `src/pages/Decks.tsx` baris 380–385: 4 kotak statistik dengan `.hot strong` berwarna `--shu`.

### B. `src/App.tsx` & `src/index.css`
- **Hitungan baris deck di Beranda (`.beranda-deck-counts`):**
  - `src/App.tsx` baris 323–333: `<span className="is-due">{s.reviewDue} ulasan</span>` (`color: var(--shu)` di `src/index.css` baris 1938) dan `<span className="is-new">{s.newToday} baru</span>` (`color: var(--ai)` di `src/index.css` baris 1942).

### C. `src/components/Layout.tsx` & `src/index.css`
- **Lencana jumlah pada item navigasi sidebar (`.nav-badge`, `.nav-collapsed-badge`):**
  - `src/components/Layout.tsx` baris 269–289: `getNavBadge()` mengembalikan lencana merah default (`background: var(--shu)` di `src/index.css` baris 286 & 317), `.badge-muted`, dan `.badge-sage` (`background: rgba(42, 111, 91, 0.35)` hijau `--ok` di `src/index.css` baris 300).
- **Pil status kamus & kuota di sidebar:**
  - `src/components/Layout.tsx` baris 369, 376, 404, 410, 449, 947: memakai `bg-[var(--ok)]/20`, `bg-[#52d1a2]`, dan `bg-[var(--shu)]`.

### D. Halaman Lain (`Landing.tsx`, `Exam.tsx`, `Progress.tsx`, `Mining.tsx`, `Settings.tsx`)
- `src/pages/Landing.tsx` baris 795–830 & 1420–1485: pil `newCount` / `learnCount` / `dueCount` di demo pohon sub-deck dan kartu perbandingan memakai warna merah `--shu` dan hijau `--ok`.
- `src/pages/Exam.tsx` baris 1228–1231: pil status lulus/belum lulus memakai `--ok` / `--shu`.
- `src/pages/Progress.tsx` baris 98–118: grafik batang `.pr-bars i.today` memakai `--shu`.

---

## 4. Daftar Pemakaian `--shu` di `Layout.tsx`, `Decks.tsx`, dan `App.tsx`

### `src/components/Layout.tsx` (dan aturan terkait di `src/index.css`)
1. `.brand-mark` (`src/index.css:202`) — cap merek `語` di kiri atas sidebar (**dipertahankan**).
2. Titik indikator di tombol *Quick Access* sidebar (`src/components/Layout.tsx:376, 410, 566, 730, 864`) — memakai `bg-[var(--shu)]` (**diubah ke skala indigo `--ai` / `--ai-tua`**).
3. `.nav-badge` dan `.nav-collapsed-badge` (`src/index.css:286, 317`) — lencana jumlah item pada navigasi sidebar memakai `background: var(--shu)` (**diubah ke `--ai-tua` dengan teks putih**).
4. `.streak` di topbar (`src/index.css:629`) — memakai `color: var(--shu)` (**diubah ke `--ai`**).
5. `.icon-bell i` di topbar (`src/index.css:658`) — titik notifikasi memakai `background: var(--shu)` (**diubah ke `--ai`**).
6. Tautan "Mulai Ulasan" di dropdown notifikasi (`src/components/Layout.tsx:1191`) — `text-[var(--shu)]` (**diubah ke `--ai`**).

### `src/pages/Decks.tsx` (dan aturan terkait di `src/decks.css` / `src/pages.css`)
1. Tombol header `Button className="pg-primary"` ("Buat deck baru") (`src/pages/Decks.tsx:376`) — akan diganti menjadi tombol garis, sedangkan satu-satunya tombol `--shu` di header adalah `"Belajar N kartu"`.
2. `.pg-stats .hot strong` (`src/pages/Decks.tsx:383`, `src/pages.css:43`) — kotak statistik dihapus dan digabung ke kalimat di bawah judul.
3. `.dk-list-btn.pg-primary` pada setiap baris tabel deck (`src/pages/Decks.tsx:331`) — membuat setiap baris berwarna merah `--shu`; akan diubah menjadi tombol `--kon` / garis.
4. `.anki-num-learn.has-cards` dan `.anki-hdr-learn` (`src/pages/Decks.tsx:307, 612, 643, 717`) — pil merah dihapus, diganti teks `新 習 復` dengan warna `--kon` (dan `--teks-redup` untuk `0`).

### `src/App.tsx` (dan aturan terkait di `src/index.css`)
1. `.beranda-seal-cta` ("Mulai sesi review") (`src/App.tsx:247`, `src/index.css:1872`) — satu-satunya aksi utama `--shu` di Beranda (**dipertahankan**).
2. `Button className="pg-primary"` ("Buat deck baru") (`src/App.tsx:262`) — memakai `--shu`; diubah ke `.outline-button` agar tidak menjadi aksen `--shu` kedua di Beranda.
3. `.beranda-deck-counts .is-due` (`src/App.tsx:326`, `src/index.css:1938`) — memakai `color: var(--shu)`; diubah ke format `新 N` / `復 N` dengan `--kon` dan `--teks-redup`.
4. `.week-bars .day.is-today` (`src/App.tsx:457, 465`) — memakai `var(--shu)`; diganti dengan grafik 7 hari ke depan yang memakai skala celupan (`--celup-4` untuk hari ini).
