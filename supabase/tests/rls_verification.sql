-- Skrip Verifikasi RLS Transaksional (Rollback di akhir — aman untuk proyek tes)
-- Menguji isolasi lintas pengguna (User A vs User B), peran anon, dan penolakan pemalsuan user_id
-- pada seluruh 7 tabel B1: profiles, user_settings, decks, cards, srs_cards, review_logs, daily_counters.

begin;

-- Buat 2 pengguna sintetis di auth.users untuk memicu trigger handle_new_user()
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
    'rls-user-a@example.test', '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdum',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"User A","jlpt_level":"N4","consent_version":"2026-11-19-b1"}'::jsonb,
    now(), now()
  ),
  (
    v_user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'rls-user-b@example.test', '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdum',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"User B","jlpt_level":"N3"}'::jsonb,
    now(), now()
  )
  on conflict (id) do nothing;
end;
$$;

-- ============================================================================
-- 1. Pengujian User A: dapat membaca dan menulis datanya sendiri di semua tabel
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', true);

do $$
declare
  v_cnt int;
begin
  -- profiles (dibuat otomatis oleh trigger handle_new_user)
  select count(*) into v_cnt from public.profiles;
  if v_cnt <> 1 then
    raise exception 'GAGAL: User A seharusnya melihat tepat 1 baris profil (didapat %)', v_cnt;
  end if;

  update public.profiles set display_name = 'User A Terbarui' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

  insert into public.user_settings (data) values ('{"newCards":20}'::jsonb);
  insert into public.decks (id, title, kanji, category) values ('d-a', 'Deck A', '漢', 'Core');
  insert into public.cards (deck_id, id, data) values ('d-a', 'c-a1', '{"word":"猫","reading":"ねこ"}'::jsonb);
  insert into public.srs_cards (deck_id, card_id, data, last_review, reps)
    values ('d-a', 'c-a1', '{"id":"c-a1","interval":3}'::jsonb, 1700000000000, 2);
  insert into public.review_logs (device_id, deck_id, card_id, rating, state, due, stability, difficulty, elapsed_days, scheduled_days, reviewed_at)
    values ('dev-a', 'd-a', 'c-a1', 3, 2, 1700100000000, 3.2, 4.1, 1.0, 3, 1700000000000);
  insert into public.daily_counters (deck_id, study_day, new_introduced, extra_new, reviewed_count, last_activity)
    values ('d-a', '2026-11-19', 5, 0, 10, 1700000000000);
end;
$$;

-- ============================================================================
-- 2. Pengujian User B: tidak bisa membaca, mengubah, menghapus, atau memalsukan milik A
-- ============================================================================
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', true);

do $$
declare
  v_cnt int;
  v_affected int;
begin
  -- Select milik A memakai primary key langsung -> harus 0 baris di semua tabel
  select count(*) into v_cnt from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  if v_cnt <> 0 then raise exception 'BOCOR RLS profiles select!'; end if;

  select count(*) into v_cnt from public.user_settings where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  if v_cnt <> 0 then raise exception 'BOCOR RLS user_settings select!'; end if;

  select count(*) into v_cnt from public.decks where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and id = 'd-a';
  if v_cnt <> 0 then raise exception 'BOCOR RLS decks select!'; end if;

  select count(*) into v_cnt from public.cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and deck_id = 'd-a' and id = 'c-a1';
  if v_cnt <> 0 then raise exception 'BOCOR RLS cards select!'; end if;

  select count(*) into v_cnt from public.srs_cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and deck_id = 'd-a' and card_id = 'c-a1';
  if v_cnt <> 0 then raise exception 'BOCOR RLS srs_cards select!'; end if;

  select count(*) into v_cnt from public.review_logs where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  if v_cnt <> 0 then raise exception 'BOCOR RLS review_logs select!'; end if;

  select count(*) into v_cnt from public.daily_counters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  if v_cnt <> 0 then raise exception 'BOCOR RLS daily_counters select!'; end if;

  -- Update & delete lintas akun meskipun menebak primary key -> 0 baris terpengaruh
  update public.decks set title = 'Dibajak' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and id = 'd-a';
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then raise exception 'BOCOR RLS decks update!'; end if;

  delete from public.cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and deck_id = 'd-a' and id = 'c-a1';
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then raise exception 'BOCOR RLS cards delete!'; end if;

  delete from public.srs_cards where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and deck_id = 'd-a' and card_id = 'c-a1';
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then raise exception 'BOCOR RLS srs_cards delete!'; end if;

  delete from public.review_logs where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then raise exception 'BOCOR RLS review_logs delete!'; end if;

  delete from public.daily_counters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then raise exception 'BOCOR RLS daily_counters delete!'; end if;

  update public.profiles set display_name = 'Hacker' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then raise exception 'BOCOR RLS profiles update!'; end if;

  update public.user_settings set data = '{}'::jsonb where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  get diagnostics v_affected = row_count;
  if v_affected <> 0 then raise exception 'BOCOR RLS user_settings update!'; end if;

  -- Insert dengan user_id orang lain -> wajib ditolak RLS (SQLSTATE 42501)
  begin
    insert into public.decks (user_id, id, title) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'forged', 'Palsu');
    raise exception 'BOCOR RLS: insert decks dengan user_id orang lain berhasil!';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.user_settings (user_id, data) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '{}'::jsonb);
    raise exception 'BOCOR RLS: insert user_settings dengan user_id orang lain berhasil!';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.daily_counters (user_id, deck_id, study_day) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'd-a', '2026-11-19');
    raise exception 'BOCOR RLS: insert daily_counters dengan user_id orang lain berhasil!';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- ============================================================================
-- 3. Pengujian Peran `anon`: semua akses baca/tulis wajib ditolak
-- ============================================================================
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  begin
    perform * from public.profiles;
    raise exception 'BOCOR RLS: anon bisa select profiles!';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.decks;
    raise exception 'BOCOR RLS: anon bisa select decks!';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.decks (user_id, id, title) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'anon-deck', 'Anon');
    raise exception 'BOCOR RLS: anon bisa insert decks!';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
