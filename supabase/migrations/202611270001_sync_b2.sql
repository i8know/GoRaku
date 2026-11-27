-- GoRaku Phase B2: Kolom sinkronisasi, indeks keyset, dan RPC merge atomik per baris
-- Idempoten: aman dijalankan ulang di Supabase SQL Editor maupun `supabase db push`.
-- Seluruh RPC bersifat SECURITY INVOKER + fixed search_path sehingga RLS B1 tetap berlaku penuh.

-- ============================================================================
-- 1. Penambahan Kolom Sinkronisasi (Idempoten)
-- ============================================================================

alter table public.user_settings
  add column if not exists client_updated_at bigint not null default 0;

alter table public.decks
  add column if not exists client_updated_at bigint not null default 0;

alter table public.cards
  add column if not exists client_updated_at bigint not null default 0;

alter table public.srs_cards
  add column if not exists deleted_at bigint null;

alter table public.daily_counters
  add column if not exists reset_at bigint not null default 0;

-- Constraint rentang non-negatif untuk kolom timestamp klien baru
do $$
declare
  c record;
begin
  for c in
    select *
    from (values
      ('user_settings',  'user_settings_client_updated_nonneg_chk', 'client_updated_at >= 0'),
      ('decks',          'decks_client_updated_nonneg_chk',         'client_updated_at >= 0'),
      ('cards',          'cards_client_updated_nonneg_chk',         'client_updated_at >= 0'),
      ('srs_cards',      'srs_cards_deleted_at_nonneg_chk',         'deleted_at is null or deleted_at >= 0'),
      ('srs_cards',      'srs_cards_last_review_nonneg_chk',        'last_review is null or last_review >= 0'),
      ('daily_counters', 'daily_counters_reset_at_nonneg_chk',      'reset_at >= 0')
    ) as t(tbl, conname, expr)
  loop
    if not exists (
      select 1
      from pg_constraint pc
      join pg_class cl on cl.oid = pc.conrelid
      join pg_namespace ns on ns.oid = cl.relnamespace
      where ns.nspname = 'public'
        and cl.relname = c.tbl
        and pc.conname = c.conname
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%s);',
        c.tbl,
        c.conname,
        c.expr
      );
    end if;
  end loop;
end;
$$;

-- ============================================================================
-- 2. Indeks Keyset Pagination untuk Pull Inkremental (user_id, updated_at, pk)
-- ============================================================================

create index if not exists decks_user_updated_at_id_idx
  on public.decks (user_id, updated_at asc, id asc);

create index if not exists cards_user_updated_at_pk_idx
  on public.cards (user_id, updated_at asc, deck_id asc, id asc);

create index if not exists srs_cards_user_updated_at_pk_idx
  on public.srs_cards (user_id, updated_at asc, deck_id asc, card_id asc);

create index if not exists daily_counters_user_updated_at_pk_idx
  on public.daily_counters (user_id, updated_at asc, deck_id asc, study_day asc);

create index if not exists review_logs_user_id_seq_idx
  on public.review_logs (user_id, id asc);

-- ============================================================================
-- 3. Helper Internal Parse Timestamp Tombstone (Epoch ms atau ISO timestamptz)
-- ============================================================================

create or replace function public._sync_parse_timestamptz(p_val jsonb)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_type text;
  v_text text;
begin
  if p_val is null or p_val = 'null'::jsonb then
    return null;
  end if;
  v_type := jsonb_typeof(p_val);
  if v_type = 'number' then
    return to_timestamp((p_val #>> '{}')::double precision / 1000.0);
  end if;
  if v_type = 'string' then
    v_text := trim(p_val #>> '{}');
    if v_text = '' then
      return null;
    end if;
    if v_text ~ '^[0-9]+(\.[0-9]+)?$' then
      return to_timestamp(v_text::double precision / 1000.0);
    end if;
    return v_text::timestamptz;
  end if;
  raise exception 'Format deleted_at tidak valid' using errcode = '22P02';
end;
$$;

revoke all on function public._sync_parse_timestamptz(jsonb) from public, anon;
grant execute on function public._sync_parse_timestamptz(jsonb) to authenticated;

-- ============================================================================
-- 4. RPC: sync_upsert_settings (LWW ketat pada client_updated_at)
-- ============================================================================

create or replace function public.sync_upsert_settings(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row jsonb;
  v_data jsonb;
  v_client_ts bigint;
  v_rc integer;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_rejected jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Autentikasi diperlukan untuk sinkronisasi.' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Parameter p_rows harus berupa array JSON.' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    begin
      if jsonb_typeof(v_row) <> 'object' then
        raise exception 'Baris pengaturan harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_data := coalesce(v_row -> 'data', '{}'::jsonb);
      if jsonb_typeof(v_data) <> 'object' then
        raise exception 'Field data pengaturan harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_client_ts := coalesce((v_row ->> 'client_updated_at')::bigint, 0);

      insert into public.user_settings (user_id, data, client_updated_at)
      values (v_uid, v_data, v_client_ts)
      on conflict (user_id) do update
        set data = excluded.data,
            client_updated_at = excluded.client_updated_at
        where excluded.client_updated_at > public.user_settings.client_updated_at;

      get diagnostics v_rc = row_count;
      if v_rc > 0 then
        v_applied := v_applied + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    exception
      when check_violation
        or not_null_violation
        or invalid_text_representation
        or numeric_value_out_of_range
        or string_data_right_truncation
        or invalid_parameter_value
        or data_exception then
        v_rejected := v_rejected || jsonb_build_array(
          jsonb_build_object(
            'key', 'settings',
            'code', sqlstate,
            'reason', sqlerrm
          )
        );
    end;
  end loop;

  return jsonb_build_object(
    'applied', v_applied,
    'skipped', v_skipped,
    'rejected', v_rejected
  );
end;
$$;

revoke all on function public.sync_upsert_settings(jsonb) from public, anon;
grant execute on function public.sync_upsert_settings(jsonb) to authenticated;

-- ============================================================================
-- 5. RPC: sync_upsert_decks (LWW ketat termasuk tombstone deleted_at)
-- ============================================================================

create or replace function public.sync_upsert_decks(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row jsonb;
  v_id text;
  v_parent_id text;
  v_title text;
  v_kanji text;
  v_category text;
  v_meta jsonb;
  v_deleted_at timestamptz;
  v_client_ts bigint;
  v_rc integer;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_rejected jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Autentikasi diperlukan untuk sinkronisasi.' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Parameter p_rows harus berupa array JSON.' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_id := coalesce(v_row ->> 'id', '');
    begin
      if jsonb_typeof(v_row) <> 'object' then
        raise exception 'Baris deck harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_parent_id := nullif(v_row ->> 'parent_id', '');
      v_title := coalesce(v_row ->> 'title', '');
      v_kanji := coalesce(v_row ->> 'kanji', '');
      v_category := coalesce(v_row ->> 'category', '');
      v_meta := case
        when v_row ? 'meta' and v_row -> 'meta' <> 'null'::jsonb then v_row -> 'meta'
        else null
      end;
      v_deleted_at := public._sync_parse_timestamptz(v_row -> 'deleted_at');
      v_client_ts := coalesce((v_row ->> 'client_updated_at')::bigint, 0);

      insert into public.decks (
        user_id, id, parent_id, title, kanji, category, meta, deleted_at, client_updated_at
      )
      values (
        v_uid, v_id, v_parent_id, v_title, v_kanji, v_category, v_meta, v_deleted_at, v_client_ts
      )
      on conflict (user_id, id) do update
        set parent_id = excluded.parent_id,
            title = excluded.title,
            kanji = excluded.kanji,
            category = excluded.category,
            meta = excluded.meta,
            deleted_at = excluded.deleted_at,
            client_updated_at = excluded.client_updated_at
        where excluded.client_updated_at > public.decks.client_updated_at;

      get diagnostics v_rc = row_count;
      if v_rc > 0 then
        v_applied := v_applied + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    exception
      when check_violation
        or not_null_violation
        or foreign_key_violation
        or invalid_text_representation
        or numeric_value_out_of_range
        or string_data_right_truncation
        or invalid_parameter_value
        or data_exception then
        v_rejected := v_rejected || jsonb_build_array(
          jsonb_build_object(
            'key', v_id,
            'code', sqlstate,
            'reason', sqlerrm
          )
        );
    end;
  end loop;

  return jsonb_build_object(
    'applied', v_applied,
    'skipped', v_skipped,
    'rejected', v_rejected
  );
end;
$$;

revoke all on function public.sync_upsert_decks(jsonb) from public, anon;
grant execute on function public.sync_upsert_decks(jsonb) to authenticated;

-- ============================================================================
-- 6. RPC: sync_upsert_cards (LWW ketat; pelanggaran FK/CHECK hanya menolak baris terkait)
-- ============================================================================

create or replace function public.sync_upsert_cards(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row jsonb;
  v_deck_id text;
  v_id text;
  v_data jsonb;
  v_deleted_at timestamptz;
  v_client_ts bigint;
  v_rc integer;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_rejected jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Autentikasi diperlukan untuk sinkronisasi.' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Parameter p_rows harus berupa array JSON.' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_deck_id := coalesce(v_row ->> 'deck_id', '');
    v_id := coalesce(v_row ->> 'id', '');
    begin
      if jsonb_typeof(v_row) <> 'object' then
        raise exception 'Baris kartu harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_data := coalesce(v_row -> 'data', '{}'::jsonb);
      if jsonb_typeof(v_data) <> 'object' then
        raise exception 'Field data kartu harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_deleted_at := public._sync_parse_timestamptz(v_row -> 'deleted_at');
      v_client_ts := coalesce((v_row ->> 'client_updated_at')::bigint, 0);

      insert into public.cards (
        user_id, deck_id, id, data, deleted_at, client_updated_at
      )
      values (
        v_uid, v_deck_id, v_id, v_data, v_deleted_at, v_client_ts
      )
      on conflict (user_id, deck_id, id) do update
        set data = excluded.data,
            deleted_at = excluded.deleted_at,
            client_updated_at = excluded.client_updated_at
        where excluded.client_updated_at > public.cards.client_updated_at;

      get diagnostics v_rc = row_count;
      if v_rc > 0 then
        v_applied := v_applied + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    exception
      when check_violation
        or not_null_violation
        or foreign_key_violation
        or invalid_text_representation
        or numeric_value_out_of_range
        or string_data_right_truncation
        or invalid_parameter_value
        or data_exception then
        v_rejected := v_rejected || jsonb_build_array(
          jsonb_build_object(
            'key', v_deck_id || '::' || v_id,
            'code', sqlstate,
            'reason', sqlerrm
          )
        );
    end;
  end loop;

  return jsonb_build_object(
    'applied', v_applied,
    'skipped', v_skipped,
    'rejected', v_rejected
  );
end;
$$;

revoke all on function public.sync_upsert_cards(jsonb) from public, anon;
grant execute on function public.sync_upsert_cards(jsonb) to authenticated;

-- ============================================================================
-- 7. RPC: sync_upsert_srs
-- Aturan:
-- - Kartu hidup hanya bila deleted_at IS NULL atau COALESCE(last_review, 0) > deleted_at.
-- - Status review menang jika last_review lebih besar, atau sama dengan reps lebih besar.
-- - Tombstone deleted_at selalu menyimpan nilai terbesar (maksimum), namun ulasan baru
--   dengan last_review > deleted_at otomatis menghidupkan kembali kartu tersebut.
-- ============================================================================

create or replace function public.sync_upsert_srs(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row jsonb;
  v_deck_id text;
  v_card_id text;
  v_data jsonb;
  v_last_review bigint;
  v_reps integer;
  v_deleted_at bigint;
  v_rc integer;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_rejected jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Autentikasi diperlukan untuk sinkronisasi.' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Parameter p_rows harus berupa array JSON.' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_deck_id := coalesce(v_row ->> 'deck_id', '');
    v_card_id := coalesce(v_row ->> 'card_id', '');
    begin
      if jsonb_typeof(v_row) <> 'object' then
        raise exception 'Baris SRS harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_data := coalesce(v_row -> 'data', '{}'::jsonb);
      if jsonb_typeof(v_data) <> 'object' then
        raise exception 'Field data SRS harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_last_review := case
        when v_row ? 'last_review' and v_row -> 'last_review' <> 'null'::jsonb
          then (v_row ->> 'last_review')::bigint
        else null
      end;
      v_reps := coalesce((v_row ->> 'reps')::integer, 0);
      v_deleted_at := case
        when v_row ? 'deleted_at' and v_row -> 'deleted_at' <> 'null'::jsonb
          then (v_row ->> 'deleted_at')::bigint
        else null
      end;

      -- Jika baris masuk sendiri sudah mati oleh tombstone-nya, simpan data kosong
      if v_deleted_at is not null and coalesce(v_last_review, 0) <= v_deleted_at then
        v_data := '{}'::jsonb;
      end if;

      insert into public.srs_cards (
        user_id, deck_id, card_id, data, last_review, reps, deleted_at
      )
      values (
        v_uid, v_deck_id, v_card_id, v_data, v_last_review, v_reps, v_deleted_at
      )
      on conflict (user_id, deck_id, card_id) do update
        set
          deleted_at = case
            when public.srs_cards.deleted_at is null then excluded.deleted_at
            when excluded.deleted_at is null then public.srs_cards.deleted_at
            else greatest(public.srs_cards.deleted_at, excluded.deleted_at)
          end,
          last_review = case
            when coalesce(excluded.last_review, 0) > coalesce(public.srs_cards.last_review, 0)
              or (
                coalesce(excluded.last_review, 0) = coalesce(public.srs_cards.last_review, 0)
                and excluded.reps > public.srs_cards.reps
              )
              then excluded.last_review
            else public.srs_cards.last_review
          end,
          reps = case
            when coalesce(excluded.last_review, 0) > coalesce(public.srs_cards.last_review, 0)
              or (
                coalesce(excluded.last_review, 0) = coalesce(public.srs_cards.last_review, 0)
                and excluded.reps > public.srs_cards.reps
              )
              then excluded.reps
            else public.srs_cards.reps
          end,
          data = case
            when (
              case
                when public.srs_cards.deleted_at is null then excluded.deleted_at
                when excluded.deleted_at is null then public.srs_cards.deleted_at
                else greatest(public.srs_cards.deleted_at, excluded.deleted_at)
              end
            ) is not null
            and coalesce(
              case
                when coalesce(excluded.last_review, 0) > coalesce(public.srs_cards.last_review, 0)
                  or (
                    coalesce(excluded.last_review, 0) = coalesce(public.srs_cards.last_review, 0)
                    and excluded.reps > public.srs_cards.reps
                  )
                  then excluded.last_review
                else public.srs_cards.last_review
              end,
              0
            ) <= (
              case
                when public.srs_cards.deleted_at is null then excluded.deleted_at
                when excluded.deleted_at is null then public.srs_cards.deleted_at
                else greatest(public.srs_cards.deleted_at, excluded.deleted_at)
              end
            )
              then '{}'::jsonb
            when coalesce(excluded.last_review, 0) > coalesce(public.srs_cards.last_review, 0)
              or (
                coalesce(excluded.last_review, 0) = coalesce(public.srs_cards.last_review, 0)
                and excluded.reps > public.srs_cards.reps
              )
              then excluded.data
            else public.srs_cards.data
          end
        where
          coalesce(excluded.last_review, 0) > coalesce(public.srs_cards.last_review, 0)
          or (
            coalesce(excluded.last_review, 0) = coalesce(public.srs_cards.last_review, 0)
            and excluded.reps > public.srs_cards.reps
          )
          or (
            excluded.deleted_at is not null
            and (
              public.srs_cards.deleted_at is null
              or excluded.deleted_at > public.srs_cards.deleted_at
            )
          );

      get diagnostics v_rc = row_count;
      if v_rc > 0 then
        v_applied := v_applied + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    exception
      when check_violation
        or not_null_violation
        or invalid_text_representation
        or numeric_value_out_of_range
        or string_data_right_truncation
        or invalid_parameter_value
        or data_exception then
        v_rejected := v_rejected || jsonb_build_array(
          jsonb_build_object(
            'key', v_deck_id || '::' || v_card_id,
            'code', sqlstate,
            'reason', sqlerrm
          )
        );
    end;
  end loop;

  return jsonb_build_object(
    'applied', v_applied,
    'skipped', v_skipped,
    'rejected', v_rejected
  );
end;
$$;

revoke all on function public.sync_upsert_srs(jsonb) from public, anon;
grant execute on function public.sync_upsert_srs(jsonb) to authenticated;

-- ============================================================================
-- 8. RPC: sync_upsert_counters
-- Aturan:
-- - Jika excluded.reset_at > existing.reset_at -> ganti counter ke epoch reset baru.
-- - Jika reset_at sama -> ambil GREATEST untuk new_introduced, extra_new, reviewed_count, last_activity.
-- - Jika excluded.reset_at < existing.reset_at -> abaikan (jangan bangkitkan counter sebelum reset).
-- ============================================================================

create or replace function public.sync_upsert_counters(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row jsonb;
  v_deck_id text;
  v_study_day text;
  v_new_introduced integer;
  v_extra_new integer;
  v_reviewed_count integer;
  v_last_activity bigint;
  v_reset_at bigint;
  v_rc integer;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_rejected jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Autentikasi diperlukan untuk sinkronisasi.' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Parameter p_rows harus berupa array JSON.' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_deck_id := coalesce(v_row ->> 'deck_id', '');
    v_study_day := coalesce(v_row ->> 'study_day', '');
    begin
      if jsonb_typeof(v_row) <> 'object' then
        raise exception 'Baris counter harian harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_new_introduced := coalesce((v_row ->> 'new_introduced')::integer, 0);
      v_extra_new := coalesce((v_row ->> 'extra_new')::integer, 0);
      v_reviewed_count := coalesce((v_row ->> 'reviewed_count')::integer, 0);
      v_last_activity := case
        when v_row ? 'last_activity' and v_row -> 'last_activity' <> 'null'::jsonb
          then (v_row ->> 'last_activity')::bigint
        else null
      end;
      v_reset_at := coalesce((v_row ->> 'reset_at')::bigint, 0);

      insert into public.daily_counters (
        user_id, deck_id, study_day, new_introduced, extra_new, reviewed_count, last_activity, reset_at
      )
      values (
        v_uid, v_deck_id, v_study_day, v_new_introduced, v_extra_new, v_reviewed_count, v_last_activity, v_reset_at
      )
      on conflict (user_id, deck_id, study_day) do update
        set
          new_introduced = case
            when excluded.reset_at > public.daily_counters.reset_at then excluded.new_introduced
            else greatest(public.daily_counters.new_introduced, excluded.new_introduced)
          end,
          extra_new = case
            when excluded.reset_at > public.daily_counters.reset_at then excluded.extra_new
            else greatest(public.daily_counters.extra_new, excluded.extra_new)
          end,
          reviewed_count = case
            when excluded.reset_at > public.daily_counters.reset_at then excluded.reviewed_count
            else greatest(public.daily_counters.reviewed_count, excluded.reviewed_count)
          end,
          last_activity = case
            when excluded.reset_at > public.daily_counters.reset_at then excluded.last_activity
            when public.daily_counters.last_activity is null then excluded.last_activity
            when excluded.last_activity is null then public.daily_counters.last_activity
            else greatest(public.daily_counters.last_activity, excluded.last_activity)
          end,
          reset_at = greatest(public.daily_counters.reset_at, excluded.reset_at)
        where
          excluded.reset_at > public.daily_counters.reset_at
          or (
            excluded.reset_at = public.daily_counters.reset_at
            and (
              excluded.new_introduced > public.daily_counters.new_introduced
              or excluded.extra_new > public.daily_counters.extra_new
              or excluded.reviewed_count > public.daily_counters.reviewed_count
              or (
                excluded.last_activity is not null
                and (
                  public.daily_counters.last_activity is null
                  or excluded.last_activity > public.daily_counters.last_activity
                )
              )
            )
          );

      get diagnostics v_rc = row_count;
      if v_rc > 0 then
        v_applied := v_applied + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    exception
      when check_violation
        or not_null_violation
        or invalid_text_representation
        or numeric_value_out_of_range
        or string_data_right_truncation
        or invalid_parameter_value
        or data_exception then
        v_rejected := v_rejected || jsonb_build_array(
          jsonb_build_object(
            'key', v_deck_id || '::' || v_study_day,
            'code', sqlstate,
            'reason', sqlerrm
          )
        );
    end;
  end loop;

  return jsonb_build_object(
    'applied', v_applied,
    'skipped', v_skipped,
    'rejected', v_rejected
  );
end;
$$;

revoke all on function public.sync_upsert_counters(jsonb) from public, anon;
grant execute on function public.sync_upsert_counters(jsonb) to authenticated;

-- ============================================================================
-- 9. RPC: sync_insert_review_logs (append-only dedup per baris + karantina parsial)
-- ============================================================================

create or replace function public.sync_insert_review_logs(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row jsonb;
  v_device_id text;
  v_deck_id text;
  v_card_id text;
  v_rating integer;
  v_state integer;
  v_due bigint;
  v_stability real;
  v_difficulty real;
  v_elapsed_days real;
  v_scheduled_days integer;
  v_reviewed_at bigint;
  v_rc integer;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_rejected jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Autentikasi diperlukan untuk sinkronisasi.' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Parameter p_rows harus berupa array JSON.' using errcode = '22023';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_device_id := coalesce(v_row ->> 'device_id', '');
    v_deck_id := coalesce(v_row ->> 'deck_id', '');
    v_card_id := coalesce(v_row ->> 'card_id', '');
    begin
      if jsonb_typeof(v_row) <> 'object' then
        raise exception 'Baris review_log harus berupa objek JSON.' using errcode = '22023';
      end if;

      v_rating := (v_row ->> 'rating')::integer;
      v_state := (v_row ->> 'state')::integer;
      v_due := (v_row ->> 'due')::bigint;
      v_stability := (v_row ->> 'stability')::real;
      v_difficulty := (v_row ->> 'difficulty')::real;
      v_elapsed_days := (v_row ->> 'elapsed_days')::real;
      v_scheduled_days := (v_row ->> 'scheduled_days')::integer;
      v_reviewed_at := (v_row ->> 'reviewed_at')::bigint;

      insert into public.review_logs (
        user_id, device_id, deck_id, card_id, rating, state, due,
        stability, difficulty, elapsed_days, scheduled_days, reviewed_at
      )
      values (
        v_uid, v_device_id, v_deck_id, v_card_id, v_rating, v_state, v_due,
        v_stability, v_difficulty, v_elapsed_days, v_scheduled_days, v_reviewed_at
      )
      on conflict (user_id, device_id, card_id, reviewed_at) do nothing;

      get diagnostics v_rc = row_count;
      if v_rc > 0 then
        v_applied := v_applied + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    exception
      when check_violation
        or not_null_violation
        or invalid_text_representation
        or numeric_value_out_of_range
        or string_data_right_truncation
        or invalid_parameter_value
        or data_exception then
        v_rejected := v_rejected || jsonb_build_array(
          jsonb_build_object(
            'key', v_device_id || '::' || v_card_id || '::' || coalesce(v_row ->> 'reviewed_at', ''),
            'code', sqlstate,
            'reason', sqlerrm
          )
        );
    end;
  end loop;

  return jsonb_build_object(
    'applied', v_applied,
    'skipped', v_skipped,
    'rejected', v_rejected
  );
end;
$$;

revoke all on function public.sync_insert_review_logs(jsonb) from public, anon;
grant execute on function public.sync_insert_review_logs(jsonb) to authenticated;
