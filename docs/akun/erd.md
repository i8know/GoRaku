# Entity Relationship Diagram (ERD) — GoRaku Fase B1 & B2

Diagram di bawah memodelkan seluruh tabel PostgreSQL pada schema `public` (dengan `ENABLE` + `FORCE ROW LEVEL SECURITY`) beserta kolom sinkronisasi Fase B2 (`client_updated_at`, `srs_cards.deleted_at`, `daily_counters.reset_at`) dan relasinya terhadap `auth.users` milik Supabase Auth.

```mermaid
erDiagram
  AUTH_USERS ||--o| PROFILES : "1-to-1 (trigger on insert, cascade)"
  AUTH_USERS ||--o| USER_SETTINGS : "1-to-1 (cascade)"
  AUTH_USERS ||--o{ DECKS : "owns (cascade)"
  AUTH_USERS ||--o{ CARDS : "owns (cascade)"
  AUTH_USERS ||--o{ SRS_CARDS : "owns (cascade)"
  AUTH_USERS ||--o{ REVIEW_LOGS : "owns (cascade)"
  AUTH_USERS ||--o{ DAILY_COUNTERS : "owns (cascade)"
  DECKS ||--o{ CARDS : "(user_id, deck_id) cascade"

  AUTH_USERS {
    uuid id PK
    text email
  }

  PROFILES {
    uuid user_id PK,FK
    text display_name
    text jlpt_level
    timestamptz consented_at
    text consent_version
    timestamptz created_at
    timestamptz updated_at
  }

  USER_SETTINGS {
    uuid user_id PK,FK
    jsonb data
    bigint client_updated_at
    timestamptz created_at
    timestamptz updated_at
  }

  DECKS {
    uuid user_id PK,FK
    text id PK
    text parent_id
    text title
    text kanji
    text category
    jsonb meta
    timestamptz deleted_at
    bigint client_updated_at
    timestamptz created_at
    timestamptz updated_at
  }

  CARDS {
    uuid user_id PK,FK
    text deck_id PK,FK
    text id PK
    jsonb data
    timestamptz deleted_at
    bigint client_updated_at
    timestamptz created_at
    timestamptz updated_at
  }

  SRS_CARDS {
    uuid user_id PK,FK
    text deck_id PK
    text card_id PK
    jsonb data
    bigint last_review
    int reps
    bigint deleted_at
    timestamptz created_at
    timestamptz updated_at
  }

  REVIEW_LOGS {
    bigint id PK
    uuid user_id UK,FK
    text device_id UK
    text deck_id
    text card_id UK
    int rating
    int state
    bigint due
    real stability
    real difficulty
    real elapsed_days
    int scheduled_days
    bigint reviewed_at UK
    timestamptz created_at
    timestamptz updated_at
  }

  DAILY_COUNTERS {
    uuid user_id PK,FK
    text deck_id PK
    text study_day PK
    int new_introduced
    int extra_new
    int reviewed_count
    bigint last_activity
    bigint reset_at
    timestamptz created_at
    timestamptz updated_at
  }
```

## Ringkasan RPC Merge Atomik (Fase B2)

Seluruh fungsi pada migrasi `202611270001_sync_b2.sql` berjalan dengan `SECURITY INVOKER`, `SET search_path = public`, hak eksekusi hanya untuk `authenticated` (dicabut dari `public` dan `anon`), selalu memaksa `user_id = (select auth.uid())`, serta mengembalikan `{ applied, skipped, rejected[] }` agar satu baris tidak valid (CHECK/FK) tidak menggagalkan seluruh batch:

| RPC | Aturan Merge Per Baris | Indeks Keyset Pull |
| :--- | :--- | :--- |
| `sync_upsert_settings(jsonb)` | LWW ketat pada `client_updated_at` (`>` menang; seri pertahankan server) | `(user_id, updated_at desc)` |
| `sync_upsert_decks(jsonb)` | LWW ketat pada `client_updated_at`, termasuk tombstone `deleted_at` | `(user_id, updated_at asc, id asc)` |
| `sync_upsert_cards(jsonb)` | LWW ketat pada `client_updated_at`; pelanggaran FK deck hanya menolak baris terkait | `(user_id, updated_at asc, deck_id asc, id asc)` |
| `sync_upsert_srs(jsonb)` | `last_review` lebih besar menang, seri → `reps` lebih besar; hidup hanya bila `deleted_at IS NULL` atau `last_review > deleted_at` | `(user_id, updated_at asc, deck_id asc, card_id asc)` |
| `sync_upsert_counters(jsonb)` | `reset_at` lebih besar mereset counter ke epoch baru; `reset_at` sama → `GREATEST(...)` | `(user_id, updated_at asc, deck_id asc, study_day asc)` |
| `sync_insert_review_logs(jsonb)` | Append-only `ON CONFLICT (user_id, device_id, card_id, reviewed_at) DO NOTHING` | `(user_id, id asc)` |
