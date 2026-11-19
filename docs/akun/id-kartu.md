# Skema ID Kartu & Deck — Audit Persiapan Sinkronisasi Multi-Perangkat (Tahap B2)

Dokumen ini mencatat seluruh jalur pembuatan `id` kartu dan `id` deck yang ada pada Tahap B1 serta evaluasi determinisme, risiko tabrakan antar-perangkat, dan penyesuaian yang diperlukan pada Tahap B2. **Sesuai ruang lingkup B1, tidak ada skema ID yang diubah di tahap ini.**

## Ringkasan jalur pembuatan ID saat ini

| Jalur | Lokasi Kode | Format ID yang Dihasilkan | Deterministik? | Risiko Tabrakan Multi-Perangkat |
| :--- | :--- | :--- | :--- | :--- |
| Deck bawaan (`seedStarterDecks`) | `src/lib/deckCards.ts` (`seedStarterDecks`) | Deck: `"1"`, `"2"`, `"3"`, `"ps-root"`, `"ps-bi"`, `"ps-ankidrone"`, `"ps-kotoba"`, `"ps-n1"`..`"ps-n5"`. Kartu: `` `s${deckId}-${String(i + 1).padStart(2, "0")}` `` | Ya, 100% deterministik untuk seed yang sama | Aman per pengguna karena PK di Postgres adalah `(user_id, deck_id, id)`. Perlu catatan: progres SRS awal hanya di-seed bila belum ada di server saat akun baru pertama kali masuk di B2. |
| Deck manual (`useAppStore.addDeck`) | `src/store/useAppStore.ts` (`addDeck`) | `Date.now().toString()` (epok milidetik, e.g. `"179506..."`) | Tidak | **Tinggi bila dibuat pada milidetik yang sama** di dua perangkat (atau saat bulk action), dan tidak terhubung antar perangkat jika deck dibuat offline di kedua perangkat. |
| Deck impor (`.apkg` / CSV / JSON / preset) | `src/components/ImportDeckModal.tsx` (`commit`) | `deckId = \`deck-${Date.now()}\`` (dan subdeck `${deckId}-c-${idx+1}-...` / `${deckId}-sd-${idx+1}-...`) | Tidak | Jika pengguna mengimpor file `.apkg` yang sama di Perangkat A dan Perangkat B tanpa sinkronisasi deck lebih dulu, kedua perangkat akan membuat dua `deckId` berbeda. |
| Tambah kartu manual (`addCards`) & mining kalimat (`addMinedCardToDeck`) | `src/lib/deckCards.ts` (`newId`, `addCards`, `addMinedCardToDeck`) | `newId()` = `` `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` `` ditambah 2 karakter acak basis-36 dari `Math.random()` (`cardId`, dan nama gambar manga `manga-bubble-${cardId}.${ext}`) | Tidak | **Rendah–sedang**: mengandalkan `Math.random()` (bukan CSPRNG) dengan ~30 bit entropi per milidetik. Memadai untuk satu perangkat, namun untuk loop cepat atau banyak perangkat offline sebaiknya diganti UUIDv4/UUIDv7 di B2. |
| Antrean mining (`useAppStore.addMinedCard`) | `src/store/useAppStore.ts` (`addMinedCard`) | `Date.now().toString()` | Tidak | **Tinggi bila memanggil >1x dalam 1 ms atau antar perangkat**; kartu di `minedQueue` memakai ID timestamp polos tanpa komponen acak. |
| Impor `.apkg` / `.colpkg` (`parseApkgBuffer`) | `src/lib/apkg.ts` (`parseApkgBuffer`, `noteToCard`) | Menggunakan `String(notes.id)` langsung dari basis data SQLite Anki (`id: nid` -> `noteToCard` mempertahankan `id: note.id`) | **Ya**, untuk arsip `.apkg` yang sama (`notes.id` tetap) | Aman pada deck target yang sama (`(user_id, deck_id, id)`). Namun jika pengguna menumpuk dua berkas `.apkg` berbeda ke satu `existingDeckId` yang sama dan kebetulan memakai `notes.id` SQLite yang bertabrakan, `duplicateMode: "update"` akan menimpanya; selain itu subdeck/deck baru tetap bergantung pada `deck-${Date.now()}`. |
| Impor CSV / TSV (`parseDelimitedText`) | `src/lib/apkg.ts` (`parseDelimitedText`) | `` `csv-${idx + 1}` `` (berdasarkan nomor urut baris) | Hanya jika urutan baris tidak berubah | **Sangat tinggi saat impor ke `existingDeckId`**: impor dua berkas CSV berbeda ke deck yang sama akan menghasilkan `csv-1`, `csv-2`, dst. yang saling menimpa / terdeteksi sebagai duplikat! |
| Impor JSON (`parseJsonDeckText`) | `src/lib/apkg.ts` (`parseJsonDeckText`) | `` `json-${i + 1}` `` (berdasarkan indeks array) | Hanya jika urutan elemen tidak berubah | **Sangat tinggi saat impor ke `existingDeckId`**: sama dengan CSV, dua impor JSON berturut-turut ke satu deck saling bertabrakan di `json-1`..`json-N`. |
| Impor Preset (`presetToParsed`) | `src/lib/apkg.ts` (`presetToParsed`) | `` `preset-${preset.id}-${i + 1}` `` | Ya, per preset & indeks | Aman lintas perangkat bila preset tidak berubah urutannya; tabrakan tidak terjadi antar-preset karena menyertakan `preset.id`. |

## Rekomendasi perubahan untuk Tahap B2 (Multi-Device Sync)

1. **ID deck & kartu baru memakai `crypto.randomUUID()`**:
   - Ubah `addDeck`, `ImportDeckModal` (pembuatan `deckId` baru), `newId()`, dan `addMinedCard` agar menghasilkan UUID acak kriptografis (atau UUIDv7 untuk keterurutan kronologis), alih-alih `Date.now()` + `Math.random()`.
   - Kartu/deck lama tetap kompatibel 100% karena kolom `id` / `deck_id` di Postgres bertipe `text` (bukan `uuid`).
2. **Perbaiki ID impor CSV & JSON agar tidak bertabrakan berdasarkan indeks baris**:
   - Pada `parseDelimitedText` dan `parseJsonDeckText`, alih-alih `csv-${idx + 1}` / `json-${i + 1}`, gunakan hash konten deterministik (mis. SHA-256 pendek dari kata + bacaan) atau UUID unik per baris impor agar impor kedua ke deck yang sama tidak menimpa `csv-1` lama.
3. **Deduplikasi impor `.apkg` lintas perangkat**:
   - Dorong pengguna memilih menyinkronkan akun terlebih dahulu sebelum mengimpor ulang `.apkg` besar di perangkat kedua; untuk deteksi deck kembar di B2, simpan `source_hash` atau metadata sumber di `decks.meta` (sudah tersedia kolom `meta jsonb` di skema B1).
4. **Kompatibilitas `review_logs`**:
   - Skema B1 sudah memiliki constraint `unique (user_id, device_id, card_id, reviewed_at)` dan kita kini menyediakan `goraku-device-id::<userId>` per akun di setiap perangkat, sehingga log review dengan kartu ber-ID apa pun tetap terlindung dari duplikasi sinkronisasi.
