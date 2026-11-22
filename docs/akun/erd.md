# Entity Relationship Diagram (ERD) — GoRaku Fase B1

Diagram di bawah memodelkan seluruh tabel PostgreSQL pada schema `public` (dengan `ENABLE` + `FORCE ROW LEVEL SECURITY`) beserta relasinya terhadap `auth.users` milik Supabase Auth. Tabel `decks`, `cards`, `srs_cards`, `review_logs`, dan `daily_counters` disiapkan sekarang agar skema ditinjau satu kali sebelum sinkronisasi studi diaktifkan pada **Fase B2**.

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
    timestamptz created_at
    timestamptz updated_at
  }

  CARDS {
    uuid user_id PK,FK
    text deck_id PK,FK
    text id PK
    jsonb data
    timestamptz deleted_at
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
    timestamptz created_at
    timestamptz updated_at
  }
```
