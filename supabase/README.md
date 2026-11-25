# Panduan Migrasi & Edge Function Supabase (GoRaku B1)

Direktori ini berisi skema database PostgreSQL + Row Level Security (`supabase/migrations/`), Edge Function penghapusan akun (`supabase/functions/delete-account/`), dan skrip uji RLS (`supabase/tests/`).

---

## 1. Menerapkan Migrasi Skema & RLS

### Opsi A — Melalui Supabase Dashboard SQL Editor
1. Buka dashboard proyek Supabase → **SQL Editor**.
2. Jalankan migrasi secara berurutan: `supabase/migrations/202611190001_init_accounts_b1.sql` lalu `supabase/migrations/202611240001_harden_constraints.sql`.
3. Skema bersifat idempoten sehingga aman dijalankan ulang jika ada pembaruan.

### Opsi B — Melalui Supabase CLI (Opsional)
> Supabase CLI **tidak** dipasang sebagai dependensi npm proyek. Gunakan instalasi global/sistem atau `npx supabase`.

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

---

## 2. Deploy Edge Function `delete-account`

Fungsi `supabase/functions/delete-account/index.ts` memverifikasi token JWT pemanggil (`auth.getUser()`) terlebih dahulu, lalu menggunakan `SUPABASE_SERVICE_ROLE_KEY` **secara eksklusif di runtime server Edge Function** untuk memanggil `auth.admin.deleteUser(user.id)`. Data di `public.*` ikut terhapus otomatis melalui `ON DELETE CASCADE`.

```bash
npx supabase secrets set ALLOWED_ORIGINS="https://<domain-produksi-anda>"
npx supabase functions deploy delete-account
```

> Variabel `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` disediakan otomatis di lingkungan runtime Edge Functions Supabase. Setel `ALLOWED_ORIGINS` (dipisah koma bila lebih dari satu origin) untuk membatasi CORS ke domain produksi Anda. Jangan pernah memasukkan kunci rahasia ke variabel `.env.local` atau `VITE_*`.

---

## 3. Menjalankan Uji Isolasi RLS

1. **Uji SQL Transaksional** (`supabase/tests/rls_verification.sql`):
   - Cocok untuk PostgreSQL lokal (`supabase start`) di dalam blok `BEGIN ... ROLLBACK`.
   - Menjalankan simulasi 2 akun sintetis (`User A`, `User B`) dan `anon` di ke-7 tabel tanpa meninggalkan sisa data uji.
2. **Uji Asap API REST Supabase** (`supabase/tests/rls_smoke_test.mjs`):
   - Jalankan hanya terhadap **proyek Supabase tes** dengan 2 akun teruji yang sudah terdaftar.
   - Lihat komentar di kepala berkas `supabase/tests/rls_smoke_test.mjs` untuk variabel env yang diperlukan.
