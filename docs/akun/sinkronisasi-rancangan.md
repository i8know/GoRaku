# Rancangan Preflight Sinkronisasi Multi-Perangkat (Tahap B2)

Dokumen ini merupakan hasil audit *read-only* **Task 0** pada basis kode `main` (`a78fcfd`) sebelum implementasi kode Tahap B2 dimulai. Seluruh jalur penulisan data, editabilitas data *seed*, perilaku *reset* terhadap `reviewLogs`, pemetaan skema `DeckItem` dan `StoredCard`, serta keputusan cakupan data diverifikasi langsung terhadap kode sumber.

---

## Ringkasan Temuan yang Bertentangan dengan Asumsi Prompt (Stop & Report)

Sesuai gerbang Task 0 (*stop and report if any answer below contradicts the design in this prompt*), ditemukan **4 ketidaksesuaian substantif** antara asumsi awal prompt B2 dan kondisi aktual kode pada `main` (`a78fcfd`), ditambah **3 bug pra-eksisting kecil pada sub-deck** yang berdampak langsung ke keakuratan sinkronisasi:

| # | Asumsi Prompt B2 | Fakta Aktual di `main` (`a78fcfd`) | Dampak & Rekomendasi Solusi |
| :--- | :--- | :--- | :--- |
| **K1** | `moveCard`/`moveCards` sudah ada di `deckDb.ts`, `deckCards.ts`, `useReviewStore.ts`, dan terdapat operasi *merge decks* (Task 0 #1 & Task 6). | **Tidak ada** fungsi `moveCard`, `moveCards`, maupun *merge* antar dua deck lokal di seluruh `src/`. Yang ada hanya: (a) ganti nama/identitas deck (`DeckDetail.tsx:710-713` via `updateDeck`), dan (b) impor berkas `.apkg`/CSV/JSON ke deck yang sudah ada (`ImportDeckModal.tsx:842`). | **Rekomendasi:** Jangan membuat UI baru *move card* / *merge decks* (di luar cakupan). Tetap dukung aturan sinkronisasi *delete + create* bila kunci `deck_id` berubah di lapisan engine/tes, atau konfirmasi apakah pemilik ingin helper internal `moveCards` ditambahkan. |
| **K2** | Deck & kartu *seed* diasumsikan tidak dapat diedit pengguna sehingga body kartu *seed* tidak perlu diunggah (Task 0 #2). | **Deck dan kartu *seed* 100% dapat diedit, ditambah kartunya, maupun dihapus oleh pengguna** (`DeckDetail.tsx:266-290, 710-728`; `Mining.tsx` bahkan menargetkan deck *seed* `"1"` secara bawaan). Selain itu: (a) `public.cards` memiliki `FOREIGN KEY (user_id, deck_id) REFERENCES public.decks(user_id, id)` — menambah/mengedit kartu di deck *seed* akan **gagal FK** bila deck *seed* tidak ada di `public.decks`; (b) `seedStarterDecks()` (`deckCards.ts:319-335`) mengisi jadwal SRS demo memakai `lastReview: Date.now() - 86400_000`, sehingga perangkat baru yang login dapat **mengalahkan progres nyata atau membangkitkan ulang reset** perangkat lama; (c) `seedStarterDecks()` mengecek `existing.length > 0` tanpa mengecek `SEED_FLAG`, sehingga mengosongkan seluruh kartu deck *seed* akan menanam ulang kartu saat reload. | **Rekomendasi (Opsi A — hemat baris & sesuai default prompt):** Tetap jangan unggah body kartu *seed* yang belum disentuh, **kecuali** kartu *seed* diedit/dihapus atau ada kartu baru ditambahkan ke deck *seed* (unggah baris deck *seed* terkait ke `public.decks` terlebih dahulu demi FK dengan `client_updated_at = 0` bila identitasnya tidak diubah). Ubah demo SRS di `seedStarterDecks()` agar memakai konstanta `lastReview = 1` (bukan `Date.now()`) dan tunda *seeding* sampai *pull* awal selesai / hormati `SEED_FLAG`. *(Alternatif Opsi B: unggah semua 12 deck + 80 kartu seed ~15 KB dengan `client_updated_at = 0` agar tidak perlu jalur khusus sama sekali.)* |
| **K3** | `sync_upsert_counters` memakai `GREATEST(...)` pada seluruh penghitung (Task 2 #2), sementara Task 6 mewajibkan *Reset progres review* mereset penghitung dan **tidak dibangkitkan ulang oleh pull berikutnya**. | Kedua aturan ini **saling bertentangan** tanpa penanda epoch reset: jika Perangkat A mereset progres hari ini (`new_introduced = 0, reviewed_count = 0`) sementara server menyimpan `new_introduced = 5, reviewed_count = 10`, maka `GREATEST(5, 0) = 5` dan pull berikutnya langsung mengembalikan angka lama ke Perangkat A serta tidak mereset Perangkat B. Selain itu, `Settings.tsx:252` dan `DeckDetail.tsx:288,719` menghapus `reviewLogs` lokal saat reset, padahal `public.review_logs` bersifat *append-only*. | **Rekomendasi:** Tambah kolom `reset_at bigint not null default 0` pada `public.daily_counters` di migrasi Task 2. Dalam `sync_upsert_counters`: jika `incoming.reset_at > existing.reset_at`, nilai counter diganti milik `incoming` (mis. `0`) dan `reset_at` diperbarui; jika `reset_at` sama, baru pakai `GREATEST(...)`; jika `incoming.reset_at < existing.reset_at`, baris ditolak/diabaikan. Untuk `review_logs`, pertahankan sifat *append-only* di server (riwayat historis) dan sinkronkan perilaku lokalnya secara konsisten (lihat Jawaban 3). |
| **K4** | Penangkapan perubahan kartu diasumsikan lewat Dexie hooks `creating/updating/deleting` (Task 3 #2). | Di `src/lib/deckDb.ts:284-291, 415-440`, store `cards` **tidak** terdaftar sebagai Dexie `Table` dan ditulis lewat transaksi native `deckDexie.backendDB().transaction("cards", "readwrite")`. Lebih penting lagi, impor `.apkg`/CSV/JSON menulis `putCards(batch)` di dalam **Web Worker** (`src/workers/apkgImport.worker.ts:419`). Dexie hooks di *main thread* **tidak akan terpanggil sama sekali** untuk penulisan kartu native maupun Web Worker. | **Rekomendasi:** Tangkap perubahan kartu & log langsung di dalam fungsi pembungkus `deckDb.ts` (`putCards`, `deleteCards`, `deleteDeckData`, `appendReviewLog`, `removeLatestReviewLog`, `replaceAllReviewLogs`) yang menulis entri *batch* ke `syncOutbox` dalam DB IndexedDB `goraku-<userId>-decks` yang sama. Cara ini bekerja identik di *main thread* dan Web Worker, langsung mengelompokkan batch 500 kartu tanpa 5.000 panggilan hook, dan menghormati flag *suppression*. |

### Bug Pra-Eksisting Sub-deck yang Ditemukan Saat Audit
1. **Hapus deck induk tidak menghapus data IndexedDB/SRS anak sub-deck** (`src/pages/DeckDetail.tsx:722-728`): `useAppStore.removeDeck(deck.id)` menghapus seluruh turunan secara rekursif, tetapi `DeckDetail.tsx` hanya memanggil `resetSrs(deck.id)` dan `deleteDeckData(deck.id)` pada induk saja. Di B2, penghapusan deck induk harus menghasilkan *tombstone* dan pembersihan lokal untuk induk **serta seluruh `allDescendants`**.
2. **Hapus/reset kartu dari tampilan deck induk memakai `deck.id` induk alih-alih `card.deckId`** (`src/pages/DeckDetail.tsx:281, 288, 669`): saat melihat daftar kartu gabungan di deck induk, `removeCards(deck.id, [card.id])` dan `forgetCards(deck.id, [card.id])` salah kunci jika kartu berasal dari sub-deck (`card.deckId !== deck.id`). Harus menggunakan `card.deckId || deck.id`.
3. **Pemuatan media saat review sub-deck** (`src/pages/Review.tsx:117`): memanggil `getMedia(deck.id, name)` alih-alih `getMedia(card.deckId || deck.id, name)`. Jika media disimpan di sub-deck anak, pencarian dari induk tidak menemukannya (`getMedia` hanya menelusuri *ancestor* ke atas).

---

## 1. Inventaris Lengkap Operasi Penulis Data (Writers)

Seluruh jalur yang mengubah data belajar pada `main` (`a78fcfd`) telah ditelusuri dengan `git grep`:

### A. Metadata Deck, Pengaturan & Batas Harian (`useAppStore` — `localStorage`)

| Operasi | Lokasi Definisi | Pemanggil Aktual | Entitas Server | Catatan Tangkapan B2 |
| :--- | :--- | :--- | :--- | :--- |
| `addDeck` | `src/store/useAppStore.ts:345` | `src/components/DeckFormModal.tsx:37` | `decks` (`upsert`) | Task 1: ganti ID dari `Date.now()` ke UUID. |
| `importDeck` | `src/store/useAppStore.ts:362` | `ImportDeckModal.tsx:261`, `deckCards.ts:368` (`recoverOrphanedDecks`) | `decks` (`upsert`) | Task 1: `deck-${uuid}`. |
| `importDecksBatch` | `src/store/useAppStore.ts:366` | `ImportDeckModal.tsx:252`, `deckCards.ts:298` (`seedStarterDecks`) | `decks` (`upsert` batch) | Untuk `seedStarterDecks`, gunakan penanda seed (`client_updated_at = 0`) agar tidak mengalahkan edit/tombstone server. |
| `updateDeck` | `src/store/useAppStore.ts:381` | `DeckDetail.tsx:711` (ubah identitas/rename), `ImportDeckModal.tsx:288` (update `total`), `deckCards.ts:454,467,574` (`syncTotal`, `updateCard`) | `decks` (`upsert`) | **Penting:** `syncTotal` dan `updateCard` memanggil `updateDeck(id, { total })` / `updateDeck(id, {})`. Diff outbox **hanya** boleh mengantrekan upsert `decks` bila kolom non-turunan (`title`, `kanji`, `kind`, `level`, `color`, `parentId`, `subdeckName`, `subdeckIds`, `source`, `meta`) benar-benar berubah — bukan sekadar perubahan `total`/`updatedAt` akibat tambah kartu! |
| `removeDeck` *(disebut `deleteDeck` di prompt)* | `src/store/useAppStore.ts:385` | `DeckDetail.tsx:723` | `decks` (`delete` tombstone) | Menghapus `id` dan seluruh turunan rekursif; semua ID yang hilang dari snapshot harus mendapat tombstone `decks` + pembersihan SRS/kartu lokal. |
| `updateSettings` | `src/store/useAppStore.ts:453` | `Settings.tsx:89`, `Review.tsx:413,426` (toggle furigana & audio cepat) | `user_settings` (`upsert`) | Simpan seluruh objek `settings` + `deckLimits` dalam `user_settings.data` dengan `client_updated_at`. |
| `setDeckLimits` *(disebut `setDeckLimit` di prompt)* | `src/store/useAppStore.ts:429` | `DeckDetail.tsx:807,827,839` | `user_settings` (`upsert`) | Digabung dalam payload `user_settings.data` (`{ settings, deckLimits }`). |
| `addMinedCard` / `removeMinedCard` / `clearMinedQueue` | `src/store/useAppStore.ts:411-419` | `Mining.tsx:131,146,198,531`, `ReaderPopup.tsx:227` | *(Tidak disinkronkan di B2)* | Lihat Jawaban 6. Task 1 tetap perbaiki `addMinedCard` agar tidak pakai `Date.now()` mentah. |
| `toggleLibraryItem` | `src/store/useAppStore.ts:421` | Tidak ada pemanggil UI aktif | *(Tidak disinkronkan di B2)* | Lihat Jawaban 6. |

### B. Isi Kartu (`deckDb.ts` & `deckCards.ts` — IndexedDB `goraku-<userId>-decks`)

| Operasi | Lokasi Definisi | Pemanggil Aktual | Entitas Server | Catatan Tangkapan B2 |
| :--- | :--- | :--- | :--- | :--- |
| `putCards` | `src/lib/deckDb.ts:284` | `deckCards.ts:316` (seed), `486` (`addCards`), `552` (`addMinedCardToDeck`), `573` (`updateCard`), `apkgImport.worker.ts:419` (impor `.apkg`/CSV/JSON/preset) | `cards` (`upsert` batch) | **Jalur utama** di main thread & Web Worker. Saat `seedStarterDecks` atau pull sync berjalan, tulis dengan capture dimatikan (`suppressSyncCapture`). |
| `deleteCards` | `src/lib/deckDb.ts:415` | `deckCards.ts:579` (`removeCards` dari `DeckDetail.tsx:281` & `CardEditorModal`), `ImportDeckModal.tsx:363` (batal impor), `apkgImport.worker.ts:557` (rollback impor) | `cards` (`delete` tombstone) | Rollback/batal impor sebaiknya membersihkan outbox yang belum terkirim alih-alih mengirim tombstone untuk kartu yang tidak jadi disimpan. |
| `deleteDeckData` | `src/lib/deckDb.ts:433` | `DeckDetail.tsx:725`, `ImportDeckModal.tsx:360`, `apkgImport.worker.ts:550,553` | *(Tertutup oleh tombstone `decks`)* | Tombstone `decks` sudah cukup di server; lokal menghapus `cards`, `media`, `reviewLogs` deck tersebut. |
| `addCards` | `src/lib/deckCards.ts:474` | `DeckDetail.tsx:273` (`CardEditorModal` mode tambah), `Mining.tsx:185` ("Simpan semua ke deck") | `cards` (`upsert`) | Melalui `putCards`. Task 1: ganti `newId()` dari `Math.random()` ke UUID (`m<uuid>`). |
| `addMinedCardToDeck` | `src/lib/deckCards.ts:523` | `ReaderPopup.tsx:214`, `Mining.tsx:162` | `cards` (`upsert`) | Melalui `putCards`; `imageBlob` disimpan ke `media` lokal saja (tidak disinkronkan di B2). |
| `updateCard` | `src/lib/deckCards.ts:561` | `DeckDetail.tsx:268` (`CardEditorModal` mode edit) | `cards` (`upsert`) | Melalui `putCards`; mempertahankan field media (`audio`, `sentenceAudio`, `image`) yang tidak disentuh editor. |
| `removeCards` | `src/lib/deckCards.ts:578` | `DeckDetail.tsx:281` (baris kartu & `CardEditorModal` tombol Hapus) | `cards` (`delete`) + `srs_cards` (`delete`) | Memanggil `deleteCards` lalu `useReviewStore.forgetCards`. |
| `moveCard` / `moveCards` / *merge decks* | **Tidak ada di basis kode** | — | — | Lihat Temuan K1. |

### C. Jadwal FSRS, Counter Harian & Log Ulasan (`useReviewStore`, `deckDb.ts`, `scheduleBackup.ts`)

| Operasi | Lokasi Definisi | Pemanggil Aktual | Entitas Server | Catatan Tangkapan B2 |
| :--- | :--- | :--- | :--- | :--- |
| `reviewCardAction` | `src/store/useReviewStore.ts:152` | `Review.tsx:202` | `srs_cards`, `daily_counters`, `review_logs` | Jalur `opts.drill === true` **tidak** mengubah store atau menulis log — nol efek ke outbox. |
| `restoreCardState` (Undo) | `src/store/useReviewStore.ts:272` | `Review.tsx:219` | `srs_cards` + `daily_counters` + (hapus entri outbox `review_logs` bila belum ter-push) | Jalur `opts.drill === true` no-op. Jika log & SRS dari penilaian yang di-undo belum sempat di-push (masih dalam debounce), outbox langsung dikoreksi/dibatalkan. |
| `addExtraNewToday` ("Pelajari lebih") | `src/store/useReviewStore.ts:214` | `Review.tsx:311` | `daily_counters` (`upsert`) | Menaikkan `extra_new` untuk `(deckId, studyDay)`. |
| `forgetCards` (per-card "Reset progres" & hapus kartu) | `src/store/useReviewStore.ts:260` | `DeckDetail.tsx:288` (`resetCard`), `deckCards.ts:580` (`removeCards`) | `srs_cards` (`delete` tombstone dengan `deleted_at = now`) | Menghapus entri `srsCards[deckId][cardId]` dan menaruh tombstone `srs_cards`. |
| `useReviewStore.removeDeck` (per-deck "Reset progres" & hapus deck) | `src/store/useReviewStore.ts:315` | `DeckDetail.tsx:719` (Reset deck), `DeckDetail.tsx:724` (Hapus deck) | `srs_cards` (`delete` tombstone semua kartu deck tsb) + `daily_counters` (reset hari aktif dengan `reset_at = now`) | Saat hanya Reset deck (bukan hapus deck), deck & kartunya tetap ada, seluruh SRS deck di-tombstone dan counter hari ini direset. |
| Global "Reset progres review" | `src/pages/Settings.tsx:249-255` | `Settings.tsx` tombol "Konfirmasi Reset Progres" | `srs_cards` (`delete` tombstone semua kartu SRS yang ada) + `daily_counters` (reset dengan `reset_at = now`) | Sebelum `useReviewStore.setState({ srsCards: {}, ... })`, catat seluruh `(deckId, cardId)` dan counter aktif untuk di-tombstone dengan `now`. |
| `importSchedule` | `src/store/useReviewStore.ts:250` | `ImportDeckModal.tsx:257,284,293` (`.apkg` mode `estimate`), `deckCards.ts:333` (seed demo) | `srs_cards` (`upsert`) | Dari impor `.apkg` mode `estimate` diantrekan normal; dari `seedStarterDecks` tidak diantrekan dengan timestamp sekarang (pakai `lastReview = 1`). |
| `importScheduleBackup` | `src/lib/scheduleBackup.ts:152` | `Settings.tsx:68` | `srs_cards`, `daily_counters`, `review_logs` | Saat ini menimpa penuh `useReviewStore` dan `reviewLogs`. Di B2 (Task 6), ubah menjadi **merge konservatif** memakai aturan merge yang sama (`last_review`/reps untuk SRS, `GREATEST` untuk counter, union/dedup untuk log) dan beri tahu pengguna hasilnya. |
| `adoptLegacyDataForUser` | `src/lib/legacyAdoption.ts:455` | `LegacyAdoptionModal.tsx` | Semua tabel studi | Menyalin `localStorage` + DB lama ke ruang `userId` lalu rehydrate. Setelah adopsi selesai, cukup picu sinkronisasi awal penuh sehingga seluruh data hasil adopsi otomatis ikut terunggah & tergabung. |
| `seedStarterDecks` | `src/lib/deckCards.ts:154` | `ensureSeeded()` dari `App.tsx:95`, `Decks.tsx:132`, `loadDeckCards` | Lihat Jawaban 2 | Tidak boleh mengalahkan data server pada perangkat kedua. |

---

## 2. Editabilitas Deck & Kartu Seed (`seedStarterDecks`)

### Fakta terverifikasi di kode
- Terdapat **12 deck *seed*** (`"1"`, `"2"`, `"3"`, `"ps-root"`, `"ps-bi"`, `"ps-ankidrone"`, `"ps-kotoba"`, `"ps-n1"`, `"ps-n2"`, `"ps-n3"`, `"ps-n4"`, `"ps-n5"`) dan **80 kartu *seed*** (`s<deckId>-01` s.d. `-12`), didefinisikan di `src/store/useAppStore.ts:164-306` dan `src/lib/deckCards.ts:51-339`.
- **Apakah dapat diedit pengguna? YA.** Tidak ada pembatasan *read-only* di UI maupun store:
  - Pengguna dapat mengedit/menghapus kartu *seed* (`DeckDetail.tsx:266-285`), menambah kartu baru atau melakukan *Sentence Mining* ke dalam deck *seed* (`Mining.tsx` memilih deck pertama secara bawaan), mengimpor CSV/APKG ke deck *seed*, mengganti judul/warna/level deck *seed* (`DeckDetail.tsx:711`), maupun menghapus deck *seed* (`DeckDetail.tsx:723`).
- **Kendala skema Postgres:** Tabel `public.cards` memiliki `FOREIGN KEY (user_id, deck_id) REFERENCES public.decks(user_id, id) ON DELETE CASCADE` (`202611190001_init_accounts_b1.sql:61`). Jika pengguna menambah atau mengedit 1 kartu di deck *seed* `"1"`, server akan menolak upsert kartu tersebut bila baris `(user_id, '1')` belum ada di `public.decks`.
- **Bug *timestamp* seed demo SRS:** `deckCards.ts:319-335` mengisi jadwal SRS demo untuk 5 sub-deck (`ps-n5`, `ps-n4`, `ps-n3`, `ps-n2`, `ps-ankidrone`) memakai `lastReview: Date.now() - 86400 * 1000`. Di lingkungan multi-perangkat, perangkat baru akan menghasilkan `lastReview` lebih baru daripada ulasan nyata 3 hari lalu atau reset 2 hari lalu di perangkat pertama.

### Rancangan yang diusulkan (memerlukan konfirmasi bila memilih Opsi B)
- **Opsi A (Direkomendasikan — selaras dengan default prompt):**
  1. **Tidak mengunggah body 80 kartu *seed* bawaan yang belum diubah** maupun 12 deck *seed* yang belum disentuh (menghemat baris dan permintaan pada akun baru).
  2. **Unggah secara *lazy* (delta-from-seed)** hanya ketika pengguna: (a) mengedit/menghapus deck *seed*, (b) mengedit/menghapus kartu *seed*, atau (c) menambah kartu baru ke dalam deck *seed*. Setiap kali ada entri outbox `cards` pada deck *seed* yang belum tercatat ada di server, otomatis ikut sertakan upsert baris deck *seed* induk (beserta rantai `parentId`-nya) dengan `client_updated_at = 0` (atau waktu edit jika deck ikut diubah) agar FK selalu terpenuhi.
  3. **Perbaiki `seedStarterDecks()`:** gunakan konstanta deterministik `lastReview = 1` dan `nextReview = 1` untuk demo SRS awal agar ulasan nyata (`lastReview > 1`) maupun tombstone reset (`deleted_at > 1`) selalu menang; serta hormati `SEED_FLAG` agar deck/kartu *seed* yang sudah dihapus atau disinkronkan dari server tidak ditanam ulang.
- **Opsi B (Alternatif lebih sederhana, 0 percabangan khusus):** Unggah seluruh 12 deck *seed* + 80 kartu *seed* (~15 KB total, 1 batch RPC) dengan `client_updated_at = 0` pada sinkronisasi awal ketika server masih kosong; tetap ubah demo SRS `lastReview = 1`.

---

## 3. Perilaku "Reset progres review" terhadap `reviewLogs` & Pembaca Statistik

### Kondisi saat ini di `main` (`a78fcfd`)
1. **Reset Global (`src/pages/Settings.tsx:249-255`):**
   - Menjalankan `useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} })`, `flushReviewStorageWrites()`, dan **`clearAllReviewLogs()`** (menghapus seluruh isi tabel `reviewLogs` di Dexie).
2. **Reset Per-Deck (`src/pages/DeckDetail.tsx:718-721`):**
   - Memanggil `useReviewStore.removeDeck(deck.id)` yang menghapus `srsCards[deckId]`, `newIntroduced[deckId]`, `activity[deckId]`, dan memanggil **`removeDeckReviewLogs(deckId)`**.
3. **Reset Per-Kartu (`src/pages/DeckDetail.tsx:287-290`):**
   - Memanggil `useReviewStore.forgetCards(deck.id, [card.id])` yang menghapus `srsCards[deckId][cardId]` dan memanggil **`removeCardReviewLogs(deckId, [cardId])`**.
4. **Undo (`src/store/useReviewStore.ts:272-314`):**
   - Memanggil **`removeLatestReviewLog(deckId, cardId)`** dan mengurangi `newIntroduced.count` / `activity.count` hari ini sebanyak 1.

### Layar statistik & seluruh pembaca `reviewLogs` lokal
Hasil `git grep` atas seluruh basis kode:
- `src/pages/Progress.tsx`: **TIDAK membaca `reviewLogs` sama sekali.** Grafik/KPI/heatmap di `Progress.tsx` masih data contoh statis, sedangkan pita *"Status Koleksi & SRS Aktif"* hanya membaca `useAppStore.decks` dan `useReviewStore.srsCards`.
- `src/pages/DeckDetail.tsx`, `src/pages/Decks.tsx`, `src/pages/Profile.tsx`: **TIDAK membaca `reviewLogs` sama sekali** (hanya membaca `srsCards`, `newIntroduced`, dan `activity`).
- `src/App.tsx:99` & `src/pages/Library.tsx:249`: hanya memanggil `deckDexie.reviewLogs.count()` untuk komponen `FirstRunChecklist` (`countCompletedReviews` di `src/lib/onboardingStats.ts:25-34`).
- `src/lib/scheduleBackup.ts:109` & `src/lib/accountData.ts:102`: membaca seluruh `reviewLogs` untuk ekspor JSON cadangan/akun.

### Dampak desain sinkronisasi B2
- Karena `public.review_logs` bersifat **append-only** (tanpa `deleted_at`, unik pada `(user_id, device_id, card_id, reviewed_at)`), riwayat log yang sudah terunggah ke server tetap menjadi log audit/sejarah permanen hingga akun dihapus.
- Reset global/per-deck/per-kartu dipropagasikan lewat:
  1. **Tombstone `srs_cards`** (`deleted_at = now` dalam epoch ms; kartu hidup hanya bila `deleted_at IS NULL OR COALESCE(last_review, 0) > deleted_at`).
  2. **Reset `daily_counters`** dengan menambahkan kolom **`reset_at bigint not null default 0`** pada migrasi Task 2 (lihat Temuan K3), sehingga counter hari ini direset ke `0` di server dan seluruh perangkat tanpa bisa dibangkitkan ulang oleh `GREATEST` maupun *pull* berikutnya.
- Untuk **Undo**: jika entri `review_logs` dari penilaian yang baru di-undo masih berada di `syncOutbox` (belum terkirim ke server karena *debounce*), entri tersebut dihapus dari `syncOutbox`; jika sudah terlanjur terkirim, status `srs_cards` dan `daily_counters` tetap dikoreksi dengan timestamp/state hasil Undo (catatan: karena counter `GREATEST` untuk hari yang sama tidak bisa turun bila sudah terkirim, penurunan `count - 1` dari Undo pasca-push tidak menurunkan angka server, sedangkan Undo dalam jendela debounce sebelum push langsung mengoreksi outbox secara eksak).

---

## 4. Pemetaan Field `DeckItem` → `public.decks` & `user_settings`

### A. Pemetaan `DeckItem` (`src/store/useAppStore.ts:74-96`) → `public.decks`

| Field `DeckItem` Lokal | Tujuan di `public.decks` | Tipe & Batas CHECK | Disinkronkan? | Keterangan |
| :--- | :--- | :--- | :---: | :--- |
| `id` | `decks.id` (PK) | `text`, 1–128 kar. | **Ya** | UUID (`deck-<uuid>` untuk impor, `<uuid>` untuk manual) bagi deck baru; ID lama dipertahankan. |
| `parentId` | `decks.parent_id` | `text null`, ≤128 kar. | **Ya** | Hierarki sub-deck. |
| `title` | `decks.title` | `text`, ≤200 kar. | **Ya** | Dipotong aman ≤200 kar. bila perlu sebelum push. |
| `kanji` | `decks.kanji` | `text`, ≤16 kar. | **Ya** | Ikon kanji sampul deck. |
| `kind` | `decks.category` | `text`, ≤64 kar. | **Ya** | Mis. `"Core"`, `"Anime"`, `"Novel"`, `"Manga"`, `"YouTube"`. |
| `level` | `decks.meta.level` | `jsonb` (`decks.meta` ≤32 KB) | **Ya** | Mis. `"N4 • Core"`. |
| `color` | `decks.meta.color` | `jsonb` | **Ya** | Mis. `"coral"`, `"indigo"`, `"sage"`, dst. |
| `source` | `decks.meta.source` | `jsonb` | **Ya** | `"manual"` \| `"apkg"`. |
| `subdeckName` | `decks.meta.subdeckName` | `jsonb` | **Ya** | Label daun sub-deck tanpa prefix induk. |
| `subdeckIds` | `decks.meta.subdeckIds` | `jsonb` | **Ya** | Menjaga urutan tampilan sub-deck; juga direkonsiliasi dari `parentId` saat pull. |
| `meta` (`DeckImportMeta`) | `decks.meta.importMeta` | `jsonb` (total `decks.meta` ≤32 KB) | **Ya** | Metadata impor (`fileName`, `fileSize`, `format`, `importedAt`, `noteTypes`, `subdecks`, `mediaCount`, `skipped`, dst.). Jika daftar `subdecks`/`noteTypes` terlalu panjang hingga mendekati 32 KB, dipangkas aman. |
| `updatedAt` | `decks.client_updated_at` | `bigint not null default 0` | **Ya** | Waktu edit klien (epoch ms) untuk LWW; tidak memakai `decks.updated_at` (waktu server). |
| `due` | — | — | **Tidak** | Turunan murni; selalu dihitung langsung oleh `liveDeckStats` / `aggregateParentStats`. |
| `progress` | — | — | **Tidak** | Turunan murni; selalu dihitung langsung oleh `liveDeckStats` / `aggregateParentStats`. |
| `updated` | — | — | **Tidak** | Label relatif lama (`"Hari ini"`, `"Baru saja"`); `deckUpdatedLabel()` sudah mengutamakan `updatedAt`. |
| `total` | — | — | **Tidak** | Turunan dari jumlah kartu di IndexedDB (`syncTotal()`). Setelah *pull* decks/cards diterapkan lokal, `total` dihitung ulang secara deterministik dari `getCardCount(deckId)` + jumlah total anak sub-deck. |

### B. Pemetaan Pengaturan & Batas Per-Deck → `public.user_settings`

- `public.user_settings.data` (`jsonb`, batas ≤64 KB) menyimpan `{ settings: AppState["settings"], deckLimits: Record<string, DeckLimitOverride> }`, dengan kolom baru `client_updated_at bigint not null default 0` untuk LWW.
- `profiles` (`display_name`, `jlpt_level`, `consented_at`, `consent_version`) tetap dikelola langsung melalui `useAuthStore.updateProfile` seperti pada B1.

---

## 5. Referensi Media pada `StoredCard` & Tampilan Saat Blob Tidak Tersedia

### Field media pada `StoredCard` (`src/lib/deckDb.ts:12-30`)
Hanya **3 field opsional** yang merujuk ke berkas biner di store IndexedDB `media`:
1. `audio?: string` — nama berkas audio kata (mis. `"vocab_001.mp3"`).
2. `sentenceAudio?: string` — nama berkas audio kalimat contoh.
3. `image?: string` — nama berkas gambar kartu atau potongan gelembung manga (`"manga-bubble-<cardId>.webp"`).

Field teks `meaning`, `sentence`, dan `translation` telah disanitasi oleh `sanitizeInline` (hanya tag inline teks `b/i/u/br/ruby/rt/rp/span`, tanpa `<img>` atau `<audio>`). Ketiga string nama berkas di atas **tetap disimpan** di `public.cards.data` agar metadata media tidak hilang bila kartu disunting di Perangkat B atau diekspor, sementara **blob biner tidak disinkronkan di B2** (ruang lingkup B3).

### Perilaku saat ini vs Rancangan UX di B2 saat blob tidak ada di perangkat
- **`src/pages/Review.tsx:107-168, 455-475`:**
  - Saat ini: `getMedia` mengembalikan `undefined` → gambar tidak dirender (tidak crash, tidak ada `<img>` rusak), audio otomatis jatuh ke Web Speech API (`speakJapanese`), namun pengguna tidak tahu mengapa gambar tidak muncul atau mengapa suara memakai TTS sistem.
  - **Rancangan B2:** Lacak status `missingMedia: { audio?: boolean; sentenceAudio?: boolean; image?: boolean }` setelah lookup `getMedia(card.deckId || deck.id, name)` selesai.
    - Jika `card.image` ada tetapi blob lokal kosong (saat jawaban dibuka): tampilkan keterangan kecil bernuansa netral Aizome (`Gambar hanya tersimpan di perangkat sumber — media belum disinkronkan`), tanpa merender elemen `<img>` rusak.
    - Jika `card.audio` / `card.sentenceAudio` ada tetapi blob lokal kosong: tombol audio tetap bekerja memakai TTS sistem (`speakJapanese`), disertai keterangan kecil/tooltip netral (`Audio asli hanya di perangkat sumber · memakai suara sistem`).
- **`src/pages/DeckDetail.tsx:121-139, 648-662`:**
  - Saat ini: tombol putar audio di baris kartu gagal diam-diam (`if (!blob) return;`).
  - **Rancangan B2:** Saat diklik dan blob tidak ditemukan secara lokal, berikan notifikasi tenang (`Audio asli belum tersedia di perangkat ini`) dan/atau putar pengucapan TTS cadangan agar tombol selalu memberi respons jelas; ikon gambar diberi `title` informatif.

---

## 6. Keputusan untuk `minedQueue` dan `libraryItems`

| Field di `useAppStore` | Keputusan B2 | Alasan |
| :--- | :---: | :--- |
| `minedQueue` (`MinedCard[]`) | **Tidak disinkronkan di B2** *(Keputusan Terbuka)* | Merupakan antrean draf sementara dari sesi membaca/mining lokal sebelum pengguna menekan *"Simpan semua ke deck"*. Buku/manga tempat sumber mining juga belum disinkronkan (B3). Begitu kartu disimpan ke deck (`addCards` / `addMinedCardToDeck`), kartu langsung masuk tabel `cards` dan tersinkron otomatis. Tidak ada tabel khusus `mined_queue` di skema server, dan memasukkannya ke `user_settings.data` berisiko melebihi batas 64 KB atau saling menimpa secara LWW antar perangkat. |
| `libraryItems` (`string[]`) | **Tidak disinkronkan di B2** *(Keputusan Terbuka)* | Field warisan (*legacy*) yang sudah tidak ditulis oleh komponen UI mana pun (`toggleLibraryItem` tidak memiliki pemanggil aktif); daftar pustaka sebenarnya berada di `lexiconDb.books` yang termasuk cakupan B3. |

---

## Ringkasan Persetujuan yang Dibutuhkan Sebelum Task 1

Mohon konfirmasi (atau ubah) 4 poin berikut sebelum penulisan kode Task 1–8 dimulai:
1. **K1 (`moveCard` / *merge decks*):** Karena belum ada di basis kode, lanjutkan tanpa menambah fitur UI baru untuk pindah kartu/gabung deck (tetapi tetap sediakan dukungan aturan *delete + create* di mesin sync & uji simulasi)?
2. **K2 (Deck & kartu *seed*):** Pakai **Opsi A** (unggah kartu *seed* hanya jika diedit/dihapus/ditambah + lazy upsert deck *seed* untuk FK + `lastReview = 1` pada demo SRS) atau **Opsi B** (unggah semua 12 deck + 80 kartu *seed* dengan `client_updated_at = 0`)?
3. **K3 (`daily_counters` pada Reset):** Setuju menambahkan kolom `reset_at bigint not null default 0` pada `public.daily_counters` di migrasi Task 2 agar *Reset progres review* (global & per-deck) dapat menyebar ke perangkat lain tanpa dibangkitkan ulang oleh `GREATEST`?
4. **K4 (Penangkapan outbox kartu):** Setuju menangkap mutasi kartu & log langsung di wrapper `deckDb.ts` (sehingga mencakup native IDB & Web Worker `apkgImport.worker.ts` sekaligus secara batch) alih-alih Dexie hooks di *main thread*?
