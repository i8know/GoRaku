/**
 * Skrip uji integrasi sinkronisasi B2 dua perangkat terhadap proyek Supabase TES (bukan produksi).
 * Menggunakan dua klien ber-device_id berbeda pada Akun A untuk menguji skenario Task 5 & Task 6,
 * serta Akun B untuk memastikan isolasi RLS tetap 100% kedap.
 *
 * Cara pakai:
 *   SUPABASE_TEST_URL=https://xxx.supabase.co \
 *   SUPABASE_TEST_PUBLISHABLE_KEY=sb_publishable_xxx \
 *   SUPABASE_TEST_USER_A_EMAIL=a@example.com \
 *   SUPABASE_TEST_USER_A_PASSWORD=PasswordA123! \
 *   SUPABASE_TEST_USER_B_EMAIL=b@example.com \
 *   SUPABASE_TEST_USER_B_PASSWORD=PasswordB123! \
 *   node supabase/tests/sync_two_devices.mjs
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
    "Setel SUPABASE_TEST_URL, SUPABASE_TEST_PUBLISHABLE_KEY, SUPABASE_TEST_USER_A_EMAIL/PASSWORD, dan SUPABASE_TEST_USER_B_EMAIL/PASSWORD sebelum menjalankan uji dua perangkat ini.",
  );
  process.exit(1);
}

if (key.startsWith("sb_secret_")) {
  console.error("TOLAK: jangan pernah gunakan sb_secret_ key pada skrip uji klien!");
  process.exit(1);
}

const makeClient = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const devA = makeClient();
const devB = makeClient();
const userBClient = makeClient();

const { data: authA1, error: errA1 } = await devA.auth.signInWithPassword({
  email: emailA,
  password: passA,
});
assert.ifError(errA1);
const uidA = authA1.user.id;

const { data: authA2, error: errA2 } = await devB.auth.signInWithPassword({
  email: emailA,
  password: passA,
});
assert.ifError(errA2);
assert.equal(authA2.user.id, uidA);

const { data: authB, error: errB } = await userBClient.auth.signInWithPassword({
  email: emailB,
  password: passB,
});
assert.ifError(errB);
assert.notEqual(authB.user.id, uidA, "Akun A dan Akun B harus berbeda");

const runTag = `b2e2e-${Date.now()}`;
const parentDeckId = `${runTag}-parent`;
const destDeckId = `${runTag}-dest`;
const cardId1 = `${runTag}-c1`;
const cardId2 = `${runTag}-c2`;
const devIdA = `${runTag}-dev-a`;
const devIdB = `${runTag}-dev-b`;
const studyDay = "2026-11-27";
const baseTs = Date.now();

try {
  // 1. Perangkat A unggah deck + 2 kartu + SRS + counter + review_log (First sync)
  const upDecks = await devA.rpc("sync_upsert_decks", {
    p_rows: [
      {
        id: parentDeckId,
        parent_id: null,
        title: "Deck Uji B2 A",
        kanji: "同",
        category: "N4 • Core",
        meta: { kind: "Core", color: "indigo", source: "manual" },
        deleted_at: null,
        client_updated_at: baseTs,
      },
      {
        id: destDeckId,
        parent_id: null,
        title: "Deck Tujuan Pindah",
        kanji: "移",
        category: "N4 • Core",
        meta: { kind: "Core", color: "sage", source: "manual" },
        deleted_at: null,
        client_updated_at: baseTs,
      },
    ],
  });
  assert.ifError(upDecks.error);
  assert.equal(upDecks.data.applied, 2);

  const upCards = await devA.rpc("sync_upsert_cards", {
    p_rows: [
      {
        deck_id: parentDeckId,
        id: cardId1,
        data: { word: "同期", reading: "どうき", meaning: "sinkronisasi", sentence: "", translation: "" },
        deleted_at: null,
        client_updated_at: baseTs,
      },
      {
        deck_id: parentDeckId,
        id: cardId2,
        data: { word: "移動", reading: "いどう", meaning: "pindah", sentence: "", translation: "" },
        deleted_at: null,
        client_updated_at: baseTs,
      },
      // Baris FK hilang -> dikarantina tanpa menggagalkan 2 baris valid di atas
      {
        deck_id: `${runTag}-missing-deck`,
        id: "orphan-card",
        data: { word: "孤立" },
        deleted_at: null,
        client_updated_at: baseTs,
      },
    ],
  });
  assert.ifError(upCards.error);
  assert.equal(upCards.data.applied, 2);
  assert.equal(upCards.data.rejected.length, 1);
  assert.equal(upCards.data.rejected[0].code, "23503");

  // 2. Perangkat B menarik deck & kartu A, lalu keduanya mengulas offline pada timestamp identik
  const pullB = await devB.from("cards").select("deck_id, id, data").eq("deck_id", parentDeckId);
  assert.ifError(pullB.error);
  assert.equal(pullB.data.length, 2);

  const sharedReviewTs = baseTs + 1000;
  const logA = await devA.rpc("sync_insert_review_logs", {
    p_rows: [
      {
        device_id: devIdA,
        deck_id: parentDeckId,
        card_id: cardId1,
        rating: 3,
        state: 2,
        due: sharedReviewTs + 86_400_000,
        stability: 2.5,
        difficulty: 5.0,
        elapsed_days: 0,
        scheduled_days: 1,
        reviewed_at: sharedReviewTs,
      },
    ],
  });
  const logB = await devB.rpc("sync_insert_review_logs", {
    p_rows: [
      {
        device_id: devIdB,
        deck_id: parentDeckId,
        card_id: cardId1,
        rating: 2,
        state: 2,
        due: sharedReviewTs + 43_200_000,
        stability: 1.8,
        difficulty: 5.4,
        elapsed_days: 0,
        scheduled_days: 1,
        reviewed_at: sharedReviewTs,
      },
    ],
  });
  assert.ifError(logA.error);
  assert.ifError(logB.error);
  assert.equal(logA.data.applied, 1);
  assert.equal(logB.data.applied, 1);

  // 3. Konflik edit kartu LWW: B menyunting lebih baru (+2000), A mengirim edit lama (+500) -> B menang
  assert.equal(
    (
      await devB.rpc("sync_upsert_cards", {
        p_rows: [
          {
            deck_id: parentDeckId,
            id: cardId1,
            data: { word: "同期", reading: "どうき", meaning: "sinkronisasi (baru B)" },
            deleted_at: null,
            client_updated_at: baseTs + 2000,
          },
        ],
      })
    ).data.applied,
    1,
  );
  assert.equal(
    (
      await devA.rpc("sync_upsert_cards", {
        p_rows: [
          {
            deck_id: parentDeckId,
            id: cardId1,
            data: { word: "同期", reading: "どうき", meaning: "edit usang A" },
            deleted_at: null,
            client_updated_at: baseTs + 500,
          },
        ],
      })
    ).data.skipped,
    1,
  );

  // 4. SRS + Reset progres + Revive setelah reset + Counter reset_at
  await devA.rpc("sync_upsert_srs", {
    p_rows: [
      {
        deck_id: parentDeckId,
        card_id: cardId1,
        data: { id: cardId1, interval: 3, easeFactor: 2.5, repetitions: 1, nextReview: baseTs + 90_000 },
        last_review: baseTs + 1000,
        reps: 1,
        deleted_at: null,
      },
    ],
  });
  await devA.rpc("sync_upsert_srs", {
    p_rows: [
      {
        deck_id: parentDeckId,
        card_id: cardId1,
        data: {},
        last_review: 0,
        reps: 0,
        deleted_at: baseTs + 3000,
      },
    ],
  });
  // Review lama sebelum reset tidak boleh membangkitkan
  const staleRes = await devB.rpc("sync_upsert_srs", {
    p_rows: [
      {
        deck_id: parentDeckId,
        card_id: cardId1,
        data: { id: cardId1, interval: 4 },
        last_review: baseTs + 2000,
        reps: 2,
        deleted_at: null,
      },
    ],
  });
  assert.equal(staleRes.data.skipped, 1);

  // Review baru setelah reset membangkitkan kembali
  const reviveRes = await devB.rpc("sync_upsert_srs", {
    p_rows: [
      {
        deck_id: parentDeckId,
        card_id: cardId1,
        data: { id: cardId1, interval: 1, easeFactor: 2.5, repetitions: 1, nextReview: baseTs + 200_000 },
        last_review: baseTs + 5000,
        reps: 1,
        deleted_at: null,
      },
    ],
  });
  assert.equal(reviveRes.data.applied, 1);

  // Counter GREATEST + reset_at
  await devA.rpc("sync_upsert_counters", {
    p_rows: [{ deck_id: parentDeckId, study_day: studyDay, new_introduced: 5, extra_new: 0, reviewed_count: 10, last_activity: baseTs + 1000, reset_at: 0 }],
  });
  await devB.rpc("sync_upsert_counters", {
    p_rows: [{ deck_id: parentDeckId, study_day: studyDay, new_introduced: 2, extra_new: 3, reviewed_count: 14, last_activity: baseTs + 2000, reset_at: 0 }],
  });
  await devA.rpc("sync_upsert_counters", {
    p_rows: [{ deck_id: parentDeckId, study_day: studyDay, new_introduced: 0, extra_new: 0, reviewed_count: 0, last_activity: null, reset_at: baseTs + 4000 }],
  });
  const ctrRow = await devB
    .from("daily_counters")
    .select("new_introduced, extra_new, reviewed_count, reset_at")
    .eq("deck_id", parentDeckId)
    .eq("study_day", studyDay)
    .single();
  assert.ifError(ctrRow.error);
  assert.equal(ctrRow.data.reviewed_count, 0);
  assert.equal(Number(ctrRow.data.reset_at), baseTs + 4000);

  // 5. Pindah kartu cardId2 dari parentDeckId ke destDeckId (tombstone lama + upsert baru)
  const moveRes = await devA.rpc("sync_upsert_cards", {
    p_rows: [
      {
        deck_id: parentDeckId,
        id: cardId2,
        data: {},
        deleted_at: new Date(baseTs + 6000).toISOString(),
        client_updated_at: baseTs + 6000,
      },
      {
        deck_id: destDeckId,
        id: cardId2,
        data: { word: "移動", reading: "いどう", meaning: "pindah" },
        deleted_at: null,
        client_updated_at: baseTs + 6000,
      },
    ],
  });
  assert.ifError(moveRes.error);
  assert.equal(moveRes.data.applied, 2);

  // 6. Isolasi RLS: Akun B tidak melihat 1 baris pun milik Akun A
  const bDecks = await userBClient.from("decks").select("id").in("id", [parentDeckId, destDeckId]);
  assert.equal(bDecks.data?.length ?? 0, 0);
  const bLogs = await userBClient.from("review_logs").select("id").eq("deck_id", parentDeckId);
  assert.equal(bLogs.data?.length ?? 0, 0);

  console.log("OK — seluruh skenario sinkronisasi dua perangkat B2 lulus terhadap proyek tes.");
} finally {
  // Bersihkan seluruh baris uji milik Akun A agar proyek tes tetap bersih
  await devA.from("review_logs").delete().in("deck_id", [parentDeckId, destDeckId]);
  await devA.from("daily_counters").delete().in("deck_id", [parentDeckId, destDeckId]);
  await devA.from("srs_cards").delete().in("deck_id", [parentDeckId, destDeckId]);
  await devA.from("cards").delete().in("deck_id", [parentDeckId, destDeckId]);
  await devA.from("decks").delete().in("id", [parentDeckId, destDeckId]);
  await devA.auth.signOut();
  await devB.auth.signOut();
  await userBClient.auth.signOut();
}
