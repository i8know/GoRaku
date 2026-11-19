-- GoRaku Phase B1: Skema Database Akun, Profil, Data Belajar & RLS Ketat
-- Kompatibel dijalankan ulang secara idempoten melalui Supabase SQL Editor maupun `supabase db push`.

-- 1. Fungsi pemicu untuk memperbarui kolom `updated_at` secara otomatis
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2. Tabel Profil Pengguna
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  display_name text not null default '',
  jlpt_level text not null default 'N3' check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  consented_at timestamptz null,
  consent_version text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabel Pengaturan Pengguna
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Tabel Decks (Metadata Dek & Hierarki Sub-dek)
create table if not exists public.decks (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  parent_id text null,
  title text not null,
  kanji text not null default '',
  category text not null default '',
  meta jsonb null,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 5. Tabel Cards (Tanpa blob media biner; sinkronisasi B2/B3)
create table if not exists public.cards (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  deck_id text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  deleted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, deck_id, id),
  foreign key (user_id, deck_id) references public.decks(user_id, id) on delete cascade
);

-- 6. Tabel Status SRS Kartu (FSRS)
create table if not exists public.srs_cards (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  deck_id text not null,
  card_id text not null,
  data jsonb not null default '{}'::jsonb,
  last_review bigint null,
  reps integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, deck_id, card_id)
);

-- 7. Tabel Log Ulasan (Review Logs dengan deduplikasi per perangkat)
create table if not exists public.review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  device_id text not null,
  deck_id text not null,
  card_id text not null,
  rating integer not null,
  state integer not null,
  due bigint not null,
  stability real not null,
  difficulty real not null,
  elapsed_days real not null,
  scheduled_days integer not null,
  reviewed_at bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_logs_unique_event unique (user_id, device_id, card_id, reviewed_at)
);

-- 8. Tabel Counter Harian per Dek
create table if not exists public.daily_counters (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  deck_id text not null,
  study_day text not null,
  new_introduced integer not null default 0,
  extra_new integer not null default 0,
  reviewed_count integer not null default 0,
  last_activity bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, deck_id, study_day)
);

-- 9. Trigger `updated_at` untuk semua tabel
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_decks_updated_at on public.decks;
create trigger set_decks_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

drop trigger if exists set_cards_updated_at on public.cards;
create trigger set_cards_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

drop trigger if exists set_srs_cards_updated_at on public.srs_cards;
create trigger set_srs_cards_updated_at
  before update on public.srs_cards
  for each row execute function public.set_updated_at();

drop trigger if exists set_review_logs_updated_at on public.review_logs;
create trigger set_review_logs_updated_at
  before update on public.review_logs
  for each row execute function public.set_updated_at();

drop trigger if exists set_daily_counters_updated_at on public.daily_counters;
create trigger set_daily_counters_updated_at
  before update on public.daily_counters
  for each row execute function public.set_updated_at();

-- 10. Indeks Query yang Direncanakan
create index if not exists profiles_user_updated_at_idx
  on public.profiles (user_id, updated_at desc);

create index if not exists user_settings_user_updated_at_idx
  on public.user_settings (user_id, updated_at desc);

create index if not exists decks_user_updated_at_idx
  on public.decks (user_id, updated_at desc);

create index if not exists cards_user_updated_at_idx
  on public.cards (user_id, updated_at desc);

create index if not exists cards_user_deck_id_idx
  on public.cards (user_id, deck_id);

create index if not exists srs_cards_user_updated_at_idx
  on public.srs_cards (user_id, updated_at desc);

create index if not exists srs_cards_user_deck_id_idx
  on public.srs_cards (user_id, deck_id);

create index if not exists review_logs_user_updated_at_idx
  on public.review_logs (user_id, updated_at desc);

create index if not exists review_logs_user_deck_id_idx
  on public.review_logs (user_id, deck_id);

create index if not exists review_logs_user_reviewed_at_idx
  on public.review_logs (user_id, reviewed_at desc);

create index if not exists daily_counters_user_updated_at_idx
  on public.daily_counters (user_id, updated_at desc);

create index if not exists daily_counters_user_deck_id_idx
  on public.daily_counters (user_id, deck_id);

-- 11. Hak Akses Minimal & Row Level Security (RLS) Paksa pada Setiap Tabel
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'user_settings',
    'decks',
    'cards',
    'srs_cards',
    'review_logs',
    'daily_counters'
  ]
  loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format('alter table public.%I force row level security;', tbl);

    -- Cabut hak akses bawaan dari PUBLIC dan anon
    execute format('revoke all on table public.%I from public, anon;', tbl);
    execute format('grant select, insert, update, delete on table public.%I to authenticated;', tbl);

    -- Kebijakan eksplisit per operasi untuk peran `authenticated` saja
    execute format('drop policy if exists %I on public.%I;', tbl || '_select_own', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()));',
      tbl || '_select_own',
      tbl
    );

    execute format('drop policy if exists %I on public.%I;', tbl || '_insert_own', tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()));',
      tbl || '_insert_own',
      tbl
    );

    execute format('drop policy if exists %I on public.%I;', tbl || '_update_own', tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));',
      tbl || '_update_own',
      tbl
    );

    execute format('drop policy if exists %I on public.%I;', tbl || '_delete_own', tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()));',
      tbl || '_delete_own',
      tbl
    );
  end loop;
end;
$$;

-- Hak penggunaan sequence untuk identity `review_logs.id` bagi `authenticated`
grant usage, select on sequence public.review_logs_id_seq to authenticated;
revoke all on sequence public.review_logs_id_seq from public, anon;

-- 12. Pemicu Pembuatan Profil Otomatis Saat User Baru Terdaftar di `auth.users`
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_raw_level text;
  v_jlpt_level text;
  v_consented_at timestamptz;
  v_consent_version text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'user_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Pelajar'
  );

  v_raw_level := upper(trim(coalesce(new.raw_user_meta_data ->> 'jlpt_level', '')));
  v_jlpt_level := case
    when v_raw_level in ('N5', 'N4', 'N3', 'N2', 'N1') then v_raw_level
    else 'N3'
  end;

  v_consent_version := nullif(trim(coalesce(new.raw_user_meta_data ->> 'consent_version', '')), '');
  begin
    if coalesce(new.raw_user_meta_data ->> 'consented_at', '') <> '' then
      v_consented_at := (new.raw_user_meta_data ->> 'consented_at')::timestamptz;
    end if;
  exception when others then
    v_consented_at := null;
  end;

  insert into public.profiles (
    user_id,
    display_name,
    jlpt_level,
    consented_at,
    consent_version
  )
  values (
    new.id,
    v_display_name,
    v_jlpt_level,
    v_consented_at,
    v_consent_version
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Fungsi trigger `SECURITY DEFINER` tidak boleh dipanggil langsung melalui PostgREST RPC
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
