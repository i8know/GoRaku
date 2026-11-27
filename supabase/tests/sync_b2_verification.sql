-- Skrip Verifikasi SQL Transaksional Fase B2 (Rollback di akhir — aman untuk proyek tes)
-- Menguji seluruh RPC merge atomik: isolasi lintas pengguna, penolakan anon,
-- aturan LWW + seri + tombstone, aturan hidup/revive SRS, GREATEST + reset_at counter,
-- penolakan parsial baris tidak valid tanpa menggagalkan batch, serta idempotensi.

begin;

do $$
declare
  v_user_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  v_user_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values
  (
    v_user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'sync-b2-a@example.test', '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdum',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sync A","jlpt_level":"N4"}'::jsonb,
    now(), now()
  ),
  (
    v_user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'sync-b2-b@example.test', '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdum',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sync B","jlpt_level":"N3"}'::jsonb,
    now(), now()
  )
  on conflict (id) do nothing;
end;
$$;

-- ============================================================================
-- 1. Pengujian User A: LWW, seri, tombstone, FK parsial, CHECK parsial, SRS, counter, idempotensi
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', true);

do $$
declare
  v_res jsonb;
  v_title text;
  v_deleted timestamptz;
  v_srs record;
  v_ctr record;
  v_settings jsonb;
begin
  -- Settings LWW + tie + idempotensi
  v_res := public.sync_upsert_settings(jsonb_build_array(
    jsonb_build_object('user_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'data', jsonb_build_object('newCards', 20), 'client_updated_at', 1000)
  ));
  if (v_res ->> 'applied')::int <> 1 then
    raise exception 'GAGAL settings awal: %', v_res;
  end if;

  -- Tie (client_updated_at = 1000) -> pertahankan baris server (skipped = 1)
  v_res := public.sync_upsert_settings(jsonb_build_array(
    jsonb_build_object('data', jsonb_build_object('newCards', 99), 'client_updated_at', 1000)
  ));
  if (v_res ->> 'skipped')::int <> 1 then
    raise exception 'GAGAL settings tie harus skipped: %', v_res;
  end if;
  select data into v_settings from public.user_settings where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  if (v_settings ->> 'newCards')::int <> 20 then
    raise exception 'GAGAL settings tie menimpa server: %', v_settings;
  end if;

  -- Deck LWW + tombstone + tolak baris judul > 200 tanpa gagalkan baris valid
  v_res := public.sync_upsert_decks(jsonb_build_array(
    jsonb_build_object('id', 'd1', 'title', 'Deck Awal', 'kanji', '初', 'category', 'Core', 'client_updated_at', 1000),
    jsonb_build_object('id', 'd-bad', 'title', repeat('x', 205), 'kanji', '悪', 'category', 'Core', 'client_updated_at', 1000)
  ));
  if (v_res ->> 'applied')::int <> 1 or jsonb_array_length(v_res -> 'rejected') <> 1 then
    raise exception 'GAGAL batch deck parsial: %', v_res;
  end if;

  -- Panggilan identik kedua -> idempoten (skipped = 1, applied = 0)
  v_res := public.sync_upsert_decks(jsonb_build_array(
    jsonb_build_object('id', 'd1', 'title', 'Deck Awal', 'kanji', '初', 'category', 'Core', 'client_updated_at', 1000)
  ));
  if (v_res ->> 'applied')::int <> 0 or (v_res ->> 'skipped')::int <> 1 then
    raise exception 'GAGAL deck idempotensi: %', v_res;
  end if;

  -- Tombstone lebih baru (ts = 2000) menghapus d1; edit lebih lama (ts = 1500) tidak membangkitkan
  v_res := public.sync_upsert_decks(jsonb_build_array(
    jsonb_build_object('id', 'd1', 'title', 'Deck Awal', 'kanji', '初', 'category', 'Core', 'deleted_at', 2000, 'client_updated_at', 2000)
  ));
  v_res := public.sync_upsert_decks(jsonb_build_array(
    jsonb_build_object('id', 'd1', 'title', 'Edit Lama', 'kanji', '初', 'category', 'Core', 'deleted_at', null, 'client_updated_at', 1500)
  ));
  select title, deleted_at into v_title, v_deleted from public.decks where id = 'd1';
  if v_deleted is null or v_title <> 'Deck Awal' then
    raise exception 'GAGAL edit lama membangkitkan tombstone deck: title=%, deleted_at=%', v_title, v_deleted;
  end if;

  -- Cards: deck hilang (FK 23503) & payload > 64KB (CHECK 23514) ditolak parsial tanpa gagalkan kartu valid
  perform public.sync_upsert_decks(jsonb_build_array(
    jsonb_build_object('id', 'd-live', 'title', 'Deck Aktif', 'kanji', '活', 'category', 'Core', 'client_updated_at', 1000)
  ));
  v_res := public.sync_upsert_cards(jsonb_build_array(
    jsonb_build_object('deck_id', 'd-live', 'id', 'c1', 'data', jsonb_build_object('word', '猫'), 'client_updated_at', 1000),
    jsonb_build_object('deck_id', 'deck-tidak-ada', 'id', 'c-orphan', 'data', jsonb_build_object('word', '迷'), 'client_updated_at', 1000),
    jsonb_build_object('deck_id', 'd-live', 'id', 'c-big', 'data', jsonb_build_object('word', repeat('あ', 25000)), 'client_updated_at', 1000)
  ));
  if (v_res ->> 'applied')::int <> 1 or jsonb_array_length(v_res -> 'rejected') <> 2 then
    raise exception 'GAGAL batch cards parsial: %', v_res;
  end if;

  -- SRS: last_review lebih besar menang, seri -> reps lebih besar, reset tombstone -> mati, review baru -> hidup kembali
  perform public.sync_upsert_srs(jsonb_build_array(
    jsonb_build_object('deck_id', 'd-live', 'card_id', 'c1', 'data', jsonb_build_object('interval', 2), 'last_review', 1000, 'reps', 1)
  ));
  -- Seri last_review=1000 dengan reps lebih besar (2 > 1) menang
  perform public.sync_upsert_srs(jsonb_build_array(
    jsonb_build_object('deck_id', 'd-live', 'card_id', 'c1', 'data', jsonb_build_object('interval', 4), 'last_review', 1000, 'reps', 2)
  ));
  select * into v_srs from public.srs_cards where deck_id = 'd-live' and card_id = 'c1';
  if v_srs.reps <> 2 or (v_srs.data ->> 'interval')::int <> 4 then
    raise exception 'GAGAL SRS tie-breaker reps: %', v_srs;
  end if;

  -- Reset pada ts=2000 -> mati (deleted_at = 2000 >= last_review = 1000)
  perform public.sync_upsert_srs(jsonb_build_array(
    jsonb_build_object('deck_id', 'd-live', 'card_id', 'c1', 'data', '{}'::jsonb, 'last_review', 0, 'reps', 0, 'deleted_at', 2000)
  ));
  select * into v_srs from public.srs_cards where deck_id = 'd-live' and card_id = 'c1';
  if v_srs.deleted_at <> 2000 or v_srs.data <> '{}'::jsonb then
    raise exception 'GAGAL SRS reset tombstone: %', v_srs;
  end if;

  -- Review baru setelah reset (last_review = 3000 > deleted_at = 2000) -> hidup kembali
  perform public.sync_upsert_srs(jsonb_build_array(
    jsonb_build_object('deck_id', 'd-live', 'card_id', 'c1', 'data', jsonb_build_object('interval', 1), 'last_review', 3000, 'reps', 1)
  ));
  select * into v_srs from public.srs_cards where deck_id = 'd-live' and card_id = 'c1';
  if v_srs.last_review <> 3000 or v_srs.deleted_at <> 2000 or (v_srs.data ->> 'interval')::int <> 1 then
    raise exception 'GAGAL SRS revive pasca-reset: %', v_srs;
  end if;

  -- Daily counters: GREATEST pada epoch sama + reset pada epoch baru
  perform public.sync_upsert_counters(jsonb_build_array(
    jsonb_build_object('deck_id', 'd-live', 'study_day', '2026-11-27', 'new_introduced', 5, 'extra_new', 0, 'reviewed_count', 10, 'last_activity', 1000, 'reset_at', 0),
    jsonb_build_object('deck_id', 'd-live', 'study_day', '2026-11-27', 'new_introduced', 3, 'extra_new', 5, 'reviewed_count', 12, 'last_activity', 900, 'reset_at', 0)
  ));
  select * into v_ctr from public.daily_counters where deck_id = 'd-live' and study_day = '2026-11-27';
  if v_ctr.new_introduced <> 5 or v_ctr.extra_new <> 5 or v_ctr.reviewed_count <> 12 or v_ctr.last_activity <> 1000 then
    raise exception 'GAGAL counter GREATEST: %', v_ctr;
  end if;

  -- Reset counter dengan reset_at = 5000 lalu coba kirim data lama reset_at = 0 -> tetap 0
  perform public.sync_upsert_counters(jsonb_build_array(
    jsonb_build_object('deck_id', 'd-live', 'study_day', '2026-11-27', 'new_introduced', 0, 'extra_new', 0, 'reviewed_count', 0, 'last_activity', null, 'reset_at', 5000)
  ));
  perform public.sync_upsert_counters(jsonb_build_array(
    jsonb_build_object('deck_id', 'd-live', 'study_day', '2026-11-27', 'new_introduced', 9, 'extra_new', 9, 'reviewed_count', 99, 'last_activity', 4000, 'reset_at', 0)
  ));
  select * into v_ctr from public.daily_counters where deck_id = 'd-live' and study_day = '2026-11-27';
  if v_ctr.new_introduced <> 0 or v_ctr.reviewed_count <> 0 or v_ctr.reset_at <> 5000 then
    raise exception 'GAGAL counter reset_at: %', v_ctr;
  end if;

  -- Review logs: valid masuk, rating = 9 ditolak parsial, panggilan kedua skipped (dedup)
  v_res := public.sync_insert_review_logs(jsonb_build_array(
    jsonb_build_object('device_id', 'dev-a', 'deck_id', 'd-live', 'card_id', 'c1', 'rating', 3, 'state', 2, 'due', 4000, 'stability', 2.5, 'difficulty', 4.5, 'elapsed_days', 0, 'scheduled_days', 1, 'reviewed_at', 3000),
    jsonb_build_object('device_id', 'dev-a', 'deck_id', 'd-live', 'card_id', 'c1', 'rating', 9, 'state', 2, 'due', 4000, 'stability', 2.5, 'difficulty', 4.5, 'elapsed_days', 0, 'scheduled_days', 1, 'reviewed_at', 3001)
  ));
  if (v_res ->> 'applied')::int <> 1 or jsonb_array_length(v_res -> 'rejected') <> 1 then
    raise exception 'GAGAL batch review_logs parsial: %', v_res;
  end if;
  v_res := public.sync_insert_review_logs(jsonb_build_array(
    jsonb_build_object('device_id', 'dev-a', 'deck_id', 'd-live', 'card_id', 'c1', 'rating', 3, 'state', 2, 'due', 4000, 'stability', 2.5, 'difficulty', 4.5, 'elapsed_days', 0, 'scheduled_days', 1, 'reviewed_at', 3000)
  ));
  if (v_res ->> 'applied')::int <> 0 or (v_res ->> 'skipped')::int <> 1 then
    raise exception 'GAGAL dedup review_logs: %', v_res;
  end if;
end;
$$;

-- ============================================================================
-- 2. Pengujian User B: tidak bisa menyentuh baris User A meski memalsukan user_id & key A
-- ============================================================================
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', true);

do $$
declare
  v_cnt int;
begin
  perform public.sync_upsert_decks(jsonb_build_array(
    jsonb_build_object('user_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'id', 'd-live', 'title', 'Dibajak B', 'kanji', '盗', 'category', 'Core', 'client_updated_at', 999999999)
  ));
  perform public.sync_upsert_srs(jsonb_build_array(
    jsonb_build_object('user_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'deck_id', 'd-live', 'card_id', 'c1', 'data', '{}'::jsonb, 'last_review', 0, 'reps', 0, 'deleted_at', 999999999)
  ));
  -- B hanya menulis ke ruang B sendiri, tidak menyentuh ruang A
  select count(*) into v_cnt from public.decks where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  if v_cnt <> 0 then
    raise exception 'BOCOR RLS: User B bisa membaca deck A!';
  end if;
end;
$$;

-- Verifikasi kembali sebagai User A bahwa data A utuh tak tersentuh oleh B
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', true);
do $$
declare
  v_title text;
  v_srs_lr bigint;
begin
  select title into v_title from public.decks where id = 'd-live';
  if v_title <> 'Deck Aktif' then
    raise exception 'BOCOR ISOLASI: User B berhasil mengubah deck A menjadi %!', v_title;
  end if;
  select last_review into v_srs_lr from public.srs_cards where deck_id = 'd-live' and card_id = 'c1';
  if v_srs_lr <> 3000 then
    raise exception 'BOCOR ISOLASI: User B berhasil mengubah SRS A!';
  end if;
end;
$$;

-- ============================================================================
-- 3. Pengujian Peran `anon`: seluruh RPC wajib ditolak
-- ============================================================================
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  begin
    perform public.sync_upsert_decks('[]'::jsonb);
    raise exception 'BOCOR: anon bisa memanggil sync_upsert_decks!';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.sync_upsert_cards('[]'::jsonb);
    raise exception 'BOCOR: anon bisa memanggil sync_upsert_cards!';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.sync_upsert_srs('[]'::jsonb);
    raise exception 'BOCOR: anon bisa memanggil sync_upsert_srs!';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.sync_upsert_counters('[]'::jsonb);
    raise exception 'BOCOR: anon bisa memanggil sync_upsert_counters!';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.sync_upsert_settings('[]'::jsonb);
    raise exception 'BOCOR: anon bisa memanggil sync_upsert_settings!';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.sync_insert_review_logs('[]'::jsonb);
    raise exception 'BOCOR: anon bisa memanggil sync_insert_review_logs!';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
