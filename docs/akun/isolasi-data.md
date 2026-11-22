# Isolasi Data Lokal Per Pengguna (Tahap B1)

Dokumen ini menjelaskan mekanisme pemisahan seluruh data lokal GoRaku agar penggunaan beberapa akun di peramban yang sama tidak saling mencampur atau membocorkan data belajar.

## Ruang lingkup & pemilihan mekanisme per penyimpanan

| Penyimpanan / Store | Isi Data | Mekanisme Isolasi B1 | Nama Tanpa Akun (Warisan) | Nama Terisolasi Per Akun | Alasan Pemilihan Mekanisme |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `useAppStore` (Zustand `persist`, `localStorage`) | Daftar deck, antrean mining, item perpustakaan, pengaturan belajar, batas per deck | Sufiks `::userId` pada kunci `localStorage` | `japanese-learning-storage` | `japanese-learning-storage::<userId>` | Paling minim risiko: struktur JSON `v6` tidak berubah, rehidrasi cepat via `persist.rehydrate()`, dan kunci warisan lama dibiarkan utuh untuk adopsi eksplisit (Tahap B1 Tugas 4). |
| `useReviewStore` (Zustand `persist`, IndexedDB `kv` / fallback `localStorage`) | Jadwal FSRS (`srsCards`), kuota baru harian (`newIntroduced`), aktivitas (`activity`) | Kombinasi DB Dexie per user (`kv`) + sufiks `::userId` pada kunci (`japanese-review-storage::<userId>` & penanda migrasi) | `japanese-review-storage` + DB `ma-immersion-decks` | `japanese-review-storage::<userId>` di DB `goraku-<userId>-decks` | Mencegah kunci `kv` atau fallback `localStorage` warisan tanpa akun terbaca/terbawa ke pengguna B saat migrasi satu kali berjalan. |
| `deckDexie` (`src/lib/deckDb.ts`) | Tabel `cards`, `media`, `reviewLogs`, `kv` | Basis data Dexie terpisah per akun | `ma-immersion-decks` | `goraku-<userId>-decks` | Skema tabel & indeks Dexie (`[deckId+cardId]`, `reviewedAt`, `key`) tidak perlu dimigrasi atau diubah, pembersihan saat hapus akun cukup memanggil `indexedDB.deleteDatabase(...)`, dan nol risiko kueri lintas pengguna. |
| `lexiconDb` (`src/lib/lexiconDb.ts`) | Tabel `dictionaries`, `terms`, `tags`, `termMeta`, `books`, `bookFiles`, `mangaPages`, `ocrCache` | Basis data Dexie terpisah per akun | `ma-immersion-lexicon` | `goraku-<userId>-lexicon` | Data kamus Yomitan dan berkas EPUB/manga berukuran besar tetap terpisah bersih tanpa mengubah indeks Dexie (`dictionaries`, `terms`, `books`, dll.). |
| `questionPackDb` (`src/lib/questionPackStorage.ts`) | Tabel `packs` (paket soal JLPT kustom & seed) | Basis data Dexie terpisah per akun | `ma-immersion-question-packs` | `goraku-<userId>-question-packs` | Memisahkan paket soal impor milik pengguna sambil tetap mempertahankan skema tabel tunggal `packs`. |
| Preferensi & cache UI di `localStorage` | Status seed (`ma-seed-v2-philia`), checklist awal (`goraku.firstRun.*`), deck popup terakhir (`ma-mining-last-deck-id`), sesi ujian (`jlpt_mock_sessions_v1`), reader (`ma-reader-*`), sidebar (`goraku_sidebar_collapsed`) | Helper terpusat `getScopedStorageItem` / `setScopedStorageItem` dengan sufiks `::userId` | `<baseKey>` | `<baseKey>::<userId>` | Mencegah kebocoran riwayat ujian, deck terakhir, atau penutupan checklist antar pengguna di komputer bersama. |
| `device_id` per perangkat (`getOrCreateDeviceId`) | Pengenal unik perangkat untuk `review_logs` pada sinkronisasi B2 | Kunci `localStorage` per pengguna, dibuat dengan `crypto.randomUUID()` | *(tidak dibuat tanpa user)* | `goraku-device-id::<userId>` | Menjamin dua akun pada peramban yang sama tetap memiliki `device_id` berbeda agar tidak saling mengaitkan identitas perangkat lokal. |

## Siklus hidup perpindahan akun & pencegahan kebocoran memori

Pengalihan ruang diorkestrasi secara berurutan oleh `switchUserStorageScope` (`src/lib/userScopeCoordinator.ts`) sebelum `useAuthStore` mempublikasikan status masuk/keluar:

1. **Saat masuk (`userId` aktif):**
   - Menunggu antrean tulis `reviewStorage` dan `reviewLogs` selesai (`flushReviewStorageWrites()`, `flushReviewLogs()`).
   - Membuka kunci ruang, menyetel `activeUserId = userId`, dan mengganti instance `deckDexie`, `lexiconDb`, serta `questionPackDb` ke `goraku-<userId>-*`.
   - Mengosongkan state RAM (`resetUserData()`, `resetReviewState()`, `resetDeckCardsSeedState()`) di dalam `withPersistWriteSuppressed(...)` agar state akun lama tidak sempat ditulis ke penyimpanan baru sebelum rehidrasi selesai.
   - Memastikan `goraku-device-id::<userId>` tersedia, lalu menjalankan `useAppStore.persist.rehydrate()` dan `useReviewStore.persist.rehydrate()`.
2. **Saat keluar (`userId = null`):**
   - Membilas seluruh penulisan tertunda milik pengguna yang baru keluar agar data terakhir tidak hilang.
   - Mengosongkan seluruh state RAM (`resetUserData()`, `resetReviewState()`) di dalam `withPersistWriteSuppressed(...)` dan mengembalikan instance DB dari pengguna sebelumnya sehingga tidak ada sisa kartu/deck/progres di RAM.
   - Saat konfigurasi Supabase aktif (`unauthenticatedScopeLocked = true`), akses baca/tulis ke kunci tanpa ruang (`legacy unscoped`) diblokir selama tidak ada sesi aktif, sehingga pengguna kedua tidak pernah mewarisi data lokal sebelum akun secara diam-diam.
3. **Web Worker (`apkgImport.worker.ts` dan `yomitanImport.worker.ts`):**
   - Thread Web Worker tidak berbagi variabel modul dengan thread utama; oleh karena itu `ImportDeckModal` dan `DictionaryManagerModal` meneruskan `userId` aktif pada pesan worker agar worker memanggil `switchDeckDatabaseScope(userId)` / `switchLexiconDatabaseScope(userId)` terlebih dahulu sebelum membaca atau menulis ke IndexedDB.
