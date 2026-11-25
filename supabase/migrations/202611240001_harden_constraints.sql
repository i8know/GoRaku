-- GoRaku Phase B1 Hardening: Batas ukuran kolom text/jsonb dan rentang numerik
-- Idempoten: aman dijalankan ulang di Supabase SQL Editor maupun `supabase db push`.
-- Mencegah penyalahgunaan kuota basis data lewat payload PostgREST berukuran ekstrem.

do $$
declare
  c record;
begin
  for c in
    select *
    from (values
      ('profiles',       'profiles_display_name_len_chk',        'char_length(display_name) <= 80'),
      ('profiles',       'profiles_consent_version_len_chk',     'consent_version is null or char_length(consent_version) <= 64'),
      ('user_settings',  'user_settings_data_size_chk',          'pg_column_size(data) <= 65536'),
      ('decks',          'decks_id_len_chk',                     'char_length(id) between 1 and 128'),
      ('decks',          'decks_parent_id_len_chk',              'parent_id is null or char_length(parent_id) <= 128'),
      ('decks',          'decks_title_len_chk',                  'char_length(title) <= 200'),
      ('decks',          'decks_kanji_len_chk',                  'char_length(kanji) <= 16'),
      ('decks',          'decks_category_len_chk',               'char_length(category) <= 64'),
      ('decks',          'decks_meta_size_chk',                  'meta is null or pg_column_size(meta) <= 32768'),
      ('cards',          'cards_id_len_chk',                     'char_length(id) between 1 and 128'),
      ('cards',          'cards_deck_id_len_chk',                'char_length(deck_id) between 1 and 128'),
      ('cards',          'cards_data_size_chk',                  'pg_column_size(data) <= 65536'),
      ('srs_cards',      'srs_cards_deck_id_len_chk',            'char_length(deck_id) between 1 and 128'),
      ('srs_cards',      'srs_cards_card_id_len_chk',            'char_length(card_id) between 1 and 128'),
      ('srs_cards',      'srs_cards_reps_nonneg_chk',            'reps >= 0'),
      ('srs_cards',      'srs_cards_data_size_chk',              'pg_column_size(data) <= 16384'),
      ('review_logs',    'review_logs_device_id_len_chk',        'char_length(device_id) between 1 and 128'),
      ('review_logs',    'review_logs_deck_id_len_chk',          'char_length(deck_id) between 1 and 128'),
      ('review_logs',    'review_logs_card_id_len_chk',          'char_length(card_id) between 1 and 128'),
      ('review_logs',    'review_logs_rating_range_chk',         'rating between 1 and 4'),
      ('review_logs',    'review_logs_state_range_chk',          'state between 0 and 3'),
      ('review_logs',    'review_logs_elapsed_nonneg_chk',       'elapsed_days >= 0'),
      ('review_logs',    'review_logs_scheduled_nonneg_chk',     'scheduled_days >= 0'),
      ('daily_counters', 'daily_counters_deck_id_len_chk',       'char_length(deck_id) between 1 and 128'),
      ('daily_counters', 'daily_counters_study_day_len_chk',     'char_length(study_day) between 8 and 16'),
      ('daily_counters', 'daily_counters_new_nonneg_chk',        'new_introduced >= 0'),
      ('daily_counters', 'daily_counters_extra_nonneg_chk',      'extra_new >= 0'),
      ('daily_counters', 'daily_counters_reviewed_nonneg_chk',   'reviewed_count >= 0')
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

