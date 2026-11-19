/**
 * Skrip uji asap RLS untuk dijalankan pada proyek Supabase TES (bukan produksi).
 * Menguji 2 pengguna nyata (User A & User B) + klien anonim pada seluruh 7 tabel B1.
 *
 * Cara pakai:
 *   SUPABASE_TEST_URL=https://xxx.supabase.co \
 *   SUPABASE_TEST_PUBLISHABLE_KEY=sb_publishable_xxx \
 *   SUPABASE_TEST_USER_A_EMAIL=a@example.com \
 *   SUPABASE_TEST_USER_A_PASSWORD=PasswordA123! \
 *   SUPABASE_TEST_USER_B_EMAIL=b@example.com \
 *   SUPABASE_TEST_USER_B_PASSWORD=PasswordB123! \
 *   node supabase/tests/rls_smoke_test.mjs
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
    "Setel SUPABASE_TEST_URL, SUPABASE_TEST_PUBLISHABLE_KEY, SUPABASE_TEST_USER_A_EMAIL/PASSWORD, dan SUPABASE_TEST_USER_B_EMAIL/PASSWORD sebelum menjalankan uji RLS ini.",
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

const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
  email: emailA,
  password: passA,
});
assert.ifError(errA);
const uidA = authA.user.id;

const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
  email: emailB,
  password: passB,
});
assert.ifError(errB);
const uidB = authB.user.id;
assert.notEqual(uidA, uidB, "User A dan User B harus berbeda");

const deckId = `rls-smoke-${Date.now()}`;
const cardId = `card-${Date.now()}`;
const reviewedAt = Date.now();

try {
  // 1. User A menulis & membaca di ke-7 tabel
  assert.equal((await clientA.from("profiles").select("user_id").eq("user_id", uidA)).data?.length, 1);
  assert.ifError((await clientA.from("user_settings").upsert({ user_id: uidA, data: { newCards: 15 } })).error);
  assert.ifError((await clientA.from("decks").upsert({ user_id: uidA, id: deckId, title: "Uji RLS A", kanji: "試", category: "Core" })).error);
  assert.ifError((await clientA.from("cards").upsert({ user_id: uidA, deck_id: deckId, id: cardId, data: { word: "試す" } })).error);
  assert.ifError((await clientA.from("srs_cards").upsert({ user_id: uidA, deck_id: deckId, card_id: cardId, data: { interval: 1 }, reps: 1 })).error);
  assert.ifError((await clientA.from("review_logs").insert({
    user_id: uidA,
    device_id: "smoke-dev-a",
    deck_id: deckId,
    card_id: cardId,
    rating: 3,
    state: 2,
    due: reviewedAt + 86400000,
    stability: 2.5,
    difficulty: 5.0,
    elapsed_days: 0,
    scheduled_days: 1,
    reviewed_at: reviewedAt,
  })).error);
  assert.ifError((await clientA.from("daily_counters").upsert({ user_id: uidA, deck_id: deckId, study_day: "2026-11-19", reviewed_count: 1 })).error);

  // 2. Klien anon tidak boleh mendapat baris apa pun
  for (const tbl of ["profiles", "user_settings", "decks", "cards", "srs_cards", "review_logs", "daily_counters"]) {
    const res = await anon.from(tbl).select("*");
    assert.equal(res.data?.length ?? 0, 0, `Anon tidak boleh melihat data pada ${tbl}`);
  }

  // 3. User B tidak boleh melihat, mengubah, atau menghapus data A
  const bReadDeck = await clientB.from("decks").select("*").eq("user_id", uidA).eq("id", deckId);
  assert.equal(bReadDeck.data?.length ?? 0, 0, "User B tidak boleh melihat deck A");

  const bUpdateProfile = await clientB.from("profiles").update({ display_name: "Dibajak" }).eq("user_id", uidA).select();
  assert.equal(bUpdateProfile.data?.length ?? 0, 0, "User B tidak boleh mengubah profil A");

  const bDeleteCard = await clientB.from("cards").delete().eq("user_id", uidA).eq("deck_id", deckId).eq("id", cardId).select();
  assert.equal(bDeleteCard.data?.length ?? 0, 0, "User B tidak boleh menghapus kartu A");

  // 4. User B tidak boleh menyisipkan baris dengan user_id milik A
  const bForge = await clientB.from("decks").insert({ user_id: uidA, id: "forged-deck", title: "Palsu" });
  assert.ok(bForge.error, "Insert lintas user_id wajib ditolak oleh RLS");

  console.log("LULUS: Seluruh uji isolasi RLS lintas 7 tabel untuk User A, User B, dan anon berhasil.");
} finally {
  // Bersihkan baris uji milik User A
  await clientA.from("daily_counters").delete().eq("user_id", uidA).eq("deck_id", deckId);
  await clientA.from("review_logs").delete().eq("user_id", uidA).eq("deck_id", deckId);
  await clientA.from("srs_cards").delete().eq("user_id", uidA).eq("deck_id", deckId);
  await clientA.from("decks").delete().eq("user_id", uidA).eq("id", deckId);
  await clientA.auth.signOut();
  await clientB.auth.signOut();
}
