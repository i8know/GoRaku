# Panduan Setup Supabase & Deploy Produksi GoRaku (Tahap B1)

Dokumen ini menjelaskan langkah konfigurasi proyek Supabase, environment lokal, GitHub Actions, serta pemeriksaan keamanan sebelum merilis Tahap B1 ke produksi.

## 1. Environment Variables & Keamanan Kunci

Klien GoRaku hanya membutuhkan dua variabel publik pada waktu build Vite:

- `VITE_SUPABASE_URL` — URL proyek Supabase Anda (mis. `https://<project-ref>.supabase.co`).
- `VITE_SUPABASE_PUBLISHABLE_KEY` — menerima **Publishable key** (`sb_publishable_...`) atau kunci legacy **`anon`**.

> **Penting:** Kunci rahasia (`sb_secret_...` atau JWT `service_role`) **dilarang keras** berada di `.env.local`, variabel `VITE_*`, repositori Git, maupun kode klien mana pun. Klien (`src/lib/supabase.ts`) dan workflow deploy produksi akan menolak memulai/membangun jika mendeteksi kunci rahasia tersebut.

Template tanpa nilai tersedia di `.env.example`.

## 2. Pengaturan Dashboard Supabase

1. **Skema SQL & RLS:**
   - Ikuti petunjuk di `supabase/README.md` untuk menerapkan migrasi `supabase/migrations/202611190001_init_accounts_b1.sql`.
   - Verifikasi isolasi antar-pengguna menggunakan skrip di `supabase/tests/`.
2. **Authentication → URL Configuration:**
   - **Site URL:** arahkan ke URL utama produksi Anda (mis. `https://<username>.github.io/GoRaku/`).
   - **Redirect URLs:** tambahkan semua rute pengalihan yang dipakai autentikasi dan reset kata sandi, dengan mempertimbangkan subpath (`APP_BASE_PATH`):
     - `http://localhost:8443/**`
     - `http://localhost:5173/**`
     - `https://<username>.github.io/GoRaku/**`
     - `https://<username>.github.io/GoRaku/atur-ulang-sandi`
3. **Authentication → Providers:**
   - Pastikan provider **Email** aktif (konfirmasi email aktif agar alur "Cek email kamu" & kirim ulang verifikasi berfungsi).
   - Untuk **Masuk dengan Google**, aktifkan provider **Google**, masukkan Client ID & Client Secret Google Cloud Anda, dan daftarkan Authorized Redirect URI milik proyek Supabase Anda pada Google Cloud Console.
4. **Edge Function `delete-account`:**
   - Deploy `supabase/functions/delete-account` ke Supabase Edge Functions:
     ```bash
     supabase functions deploy delete-account
     ```
   - Supabase secara otomatis menyuntikkan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` ke lingkungan server Deno Edge Function tersebut. Fungsi memverifikasi JWT pemanggil via `auth.getUser()` terlebih dahulu dan hanya menghapus akun pemilik JWT itu sendiri.

## 3. GitHub Pages & Content-Security-Policy (CSP)

Workflow `.github/workflows/deploy-pages.yml` menjalankan dua tahap:

1. **Verifikasi dasar (`npm run verify`)** tanpa memerlukan rahasia Supabase (memastikan aplikasi tetap terbuild dan semua tes lolos ketika variabel Supabase kosong).
2. **Build produksi subpath (`/GoRaku/`)** menyuntikkan:
   - `APP_BASE_PATH=/GoRaku/`
   - `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dari GitHub **Repository Variables** atau **Secrets** (disarankan menyimpannya di Repository Variables karena sifatnya memang publik, namun workflow mendukung `vars.*` maupun `secrets.*`).
   - Build produksi akan gagal secara eksplisit jika salah satu variabel kosong atau memakai kunci `sb_secret_` / `service_role`.
   - Plugin Vite (`goraku-supabase-csp` di `vite.config.ts`) otomatis menyuntikkan **origin persis** (`new URL(VITE_SUPABASE_URL).origin`) ke direktif `connect-src` pada `<meta http-equiv="Content-Security-Policy">` saat build/dev tanpa wildcard (`*.supabase.co`) maupun protokol tambahan yang tidak perlu.

## 4. Daftar Periksa Sebelum Rilis Publik

- [ ] Ganti semua placeholder **`[ISI OLEH PEMILIK]`** di `src/pages/PrivacyPolicy.tsx` (`/privasi`) dan `src/pages/TermsOfService.tsx` (`/syarat`), lalu tinjau ulang isi draf legal sesuai hukum setempat.
- [ ] Uji manual pendaftaran email baru, konfirmasi email, lupa kata sandi (`/atur-ulang-sandi`), login Google OAuth, ganti nama/level profil, dan hapus akun pada proyek Supabase uji coba Anda.
