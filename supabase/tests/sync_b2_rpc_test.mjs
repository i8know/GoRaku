/**
 * Skrip uji RPC merge atomik Fase B2 untuk dijalankan pada proyek Supabase TES (bukan produksi).
 * Menggunakan variabel lingkungan yang sama dengan `supabase/tests/rls_smoke_test.mjs`.
 */

import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const emailA = process.env.SUPABASE_TEST_USER_A_EMAIL;
const passA = process.env.SUPABASE_TEST_USER_A_PASSWORD;
const emailB = process.env.SUPABASE_TEST_USER_B_EMAIL;
const passB = process.env.SUPABASE_TEST_USER_B_PASSWORD;

if (!url || !key || !emailA || !passA || !emailB || !passB) {
  console.error(
    "Setel SUPABASE_TEST_URL, SUPABASE_TEST_PUBLISHABLE_KEY, SUPABASE_TEST_USER_A_EMAIL/PASSWORD, dan SUPABASE_TEST_USER_B_EMAIL/PASSWORD sebelum menjalankan uji RPC B2.",
  );
  process.exit(1);
}

if (key.startsWith("sb_secret_")) {
  console.error("TOLAK: jangan pernah gunakan sb_secret_ key pada skrip uji klien!");
  process.exit(1);
}

const makeClient = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const anon = makeClient();
const clientA = makeClient();
const clientB = makeClient();

const { data: authA, error: errA } = await clientA.auth.signInWithPassword({ email: emailA, password: passA });
assert.ifError(errA);
const uidA = authA.user.id;

const { data: authB, error: errB } = await clientB.auth.signInWithPassword({ email: emailB, password: passB });
assert.ifError(errB);
const uidB = authB.user.id;
assert.notEqual(uidA, uidB, "User A dan User B harus berbeda");

const suffix = `${Date.now()}`;
const deckId = `b2-rpc-deck-${suffix}`;
const cardId = `b2-rpc-card-${suffix}`;
const studyDay = "2026-11-27";

try {
  // 1. Anon wajib ditolak pada seluruh RPC
  for (const fn of [
    "sync_upsert_settings",
    "sync_upsert_decks",
    "sync_upsert_cards",
    "sync_upsert_srs",
    "sync_upsert_counters",
    "sync_insert_review_logs",
  ]) {
    const res = await anon.rpc(fn, { p_rows: [] });
    assert.ok(res.error, `Anon wajib ditolak saat memanggil ${fn}`);
  }

  // 2. User A: LWW + penolakan parsial baris tidak valid tanpa gagal batch
  const d1 = await clientA.rpc("sync_upsert_decks", {
    p_rows: [
      { id: deckId, title: "Deck RPC A", kanji: "試", category: "Core", client_updated_at: 1000 },
      { id: `${deckId}-bad`, title: "x".repeat(250), kanji: "悪", category: "Core", client_updated_at: 1000 },
    ],
  });
  assert.ifError(d1.error);
  assert.equal(d1.data.applied, 1);
  assert.equal(d1.data.rejected.length, 1);

  // Idempotensi & tie
  const dTie = await clientA.rpc("sync_upsert_decks", {
    p_rows: [{ id: deckId, title: "Seri Harus Kalah", kanji: "試", category: "Core", client_updated_at: 1000 }],
  });
  assert.ifError(dTie.error);
  assert.equal(dTie.data.applied, 0);
  assert.equal(dTie.data.skipped, 1);

  // Cards: valid + deck tidak ada (FK) + payload > 64KB
  const c1 = await clientA.rpc("sync_upsert_cards", {
    p_rows: [
      { deck_id: deckId, id: cardId, data: { word: "猫", reading: "ねこ", meaning: "kucing" }, client_updated_at: 1000 },
      { deck_id: "missing-deck-fk", id: "orphan", data: { word: "迷" }, client_updated_at: 1000 },
      { deck_id: deckId, id: "too-big", data: { word: "あ".repeat(25000) }, client_updated_at: 1000 },
    ],
  });
  assert.ifError(c1.error);
  assert.equal(c1.data.applied, 1);
  assert.equal(c1.data.rejected.length, 2);

  // SRS: review -> reset tombstone -> revive
  assert.ifError((await clientA.rpc("sync_upsert_srs", {
    p_rows: [{ deck_id: deckId, card_id: cardId, data: { interval: 2 }, last_review: 1000, reps: 1 }],
  })).error);
  assert.ifError((await clientA.rpc("sync_upsert_srs", {
    p_rows: [{ deck_id: deckId, card_id: cardId, data: {}, last_review: 0, reps: 0, deleted_at: 2000 }],
  })).error);
  assert.ifError((await clientA.rpc("sync_upsert_srs", {
    p_rows: [{ deck_id: deckId, card_id: cardId, data: { interval: 1 }, last_review: 3000, reps: 1 }],
  })).error);

  // Counters: GREATEST + reset_at
  assert.ifError((await clientA.rpc("sync_upsert_counters", {
    p_rows: [
      { deck_id: deckId, study_day: studyDay, new_introduced: 5, extra_new: 0, reviewed_count: 10, last_activity: 1000, reset_at: 0 },
      { deck_id: deckId, study_day: studyDay, new_introduced: 3, extra_new: 4, reviewed_count: 12, last_activity: 900, reset_at: 0 },
    ],
  })).error);
  const ctrCheck = await clientA.from("daily_counters").select("*").eq("deck_id", deckId).eq("study_day", studyDay).single();
  assert.equal(ctrCheck.data.new_introduced, 5);
  assert.equal(ctrCheck.data.extra_new, 4);
  assert.equal(ctrCheck.data.reviewed_count, 12);

  // 3. User B tidak boleh menyentuh baris A meski memalsukan user_id & key A
  const bAttempt = await clientB.rpc("sync_upsert_decks", {
    p_rows: [{ user_id: uidA, id: deckId, title: "Dibajak B", kanji: "盗", category: "Core", client_updated_at: 999999999 }],
  });
  assert.ifError(bAttempt.error);

  const aDeck = await clientA.from("decks").select("title").eq("id", deckId).single();
  assert.equal(aDeck.data.title, "Deck RPC A", "Data User A tidak boleh berubah oleh panggilan RPC User B");

  console.log("LULUS: Seluruh uji RPC merge atomik B2 (isolasi, anon, LWW, SRS, counter, karantina parsial, idempotensi) berhasil.");
} finally {
  await clientA.from("daily_counters").delete().eq("user_id", uidA).eq("deck_id", deckId);
  await clientA.from("review_logs").delete().eq("user_id", uidA).eq("deck_id", deckId);
  await clientA.from("srs_cards").delete().eq("user_id", uidA).eq("deck_id", deckId);
  await clientA.from("decks").delete().eq("user_id", uidA).eq("id", deckId);
  await clientB.from("decks").delete().eq("user_id", uidB).eq("id", deckId);
  await clientA.auth.signOut();
  await clientB.auth.signOut();
}
