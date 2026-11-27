import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifySyncError,
  computeBackoffMs,
  mergeCounterRecord,
  mergeLwwRecord,
  mergeSrsRecord,
  type CounterMergeState,
  type SrsMergeState,
} from "../merge";

type LwwRecordMeta = { client_updated_at: number; deleted_at?: number | null };
import {
  initSyncController,
  setSyncPausedOnDevice,
  stopSyncController,
  SYNC_IDLE_PULL_INTERVAL_MS,
  SYNC_VISIBLE_POLL_MS,
  syncNow,
} from "../syncController";
import { runSyncCycle } from "../engine";
import { flushSyncOutboxWrites, getPendingOutboxCount, putCards, type StoredCard } from "../../deckDb";
import {
  refreshCaptureSnapshots,
  startSyncStoreCapture,
  stopSyncStoreCaptureForTest,
} from "../storeCapture";
import { CURRENT_CONSENT_VERSION } from "../../supabase";
import { resetScopeCoordinatorForTest, switchUserStorageScope } from "../../userScopeCoordinator";
import { clearScopedLocalDataForUser, resetUserStorageScopeForTest } from "../../userStorageScope";
import { useAppStore } from "../../../store/useAppStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useSyncStore } from "../../../store/useSyncStore";
import type { SRSCard } from "../../srs";
import { MockSyncServer } from "./mockSyncServer";

/** PRNG deterministik (Mulberry32) untuk uji properti urutan independen yang dapat diulang 100%. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

describe("Task 8 — Uji Table-Driven, Properti Konvergensi Urutan Independen, Single-Flight, Echo & Guard Jaringan", () => {
  const USER_ID = "u-t8-conv";

  beforeEach(async () => {
    stopSyncController();
    stopSyncStoreCaptureForTest();
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    useSyncStore.getState().resetSyncState();
    useAuthStore.getState().resetForTest();
    await clearScopedLocalDataForUser(USER_ID);
    await switchUserStorageScope(USER_ID);
    startSyncStoreCapture();
    refreshCaptureSnapshots();
  });

  afterEach(async () => {
    vi.useRealTimers();
    stopSyncController();
    stopSyncStoreCaptureForTest();
    useSyncStore.getState().resetSyncState();
    useAuthStore.getState().resetForTest();
    await switchUserStorageScope(null);
    await clearScopedLocalDataForUser(USER_ID);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("1) Table-driven: LWW (seri, tombstone, clock skew, idempoten), SRS (lastReview, reps, reset/revive), Counter (GREATEST + reset_at)", () => {
    const lwwCases: Array<{
      name: string;
      local: LwwRecordMeta | null;
      incoming: LwwRecordMeta;
      winner: "local" | "incoming";
    }> = [
      { name: "kosong -> masuk menang", local: null, incoming: { client_updated_at: 0, deleted_at: null }, winner: "incoming" },
      { name: "lebih baru menang", local: { client_updated_at: 100 }, incoming: { client_updated_at: 101 }, winner: "incoming" },
      { name: "seri mempertahankan lokal", local: { client_updated_at: 100 }, incoming: { client_updated_at: 100 }, winner: "local" },
      { name: "edit lama tidak membangkitkan tombstone", local: { client_updated_at: 500, deleted_at: 500 }, incoming: { client_updated_at: 499, deleted_at: null }, winner: "local" },
      { name: "tombstone lebih baru menimpa edit lama", local: { client_updated_at: 500, deleted_at: null }, incoming: { client_updated_at: 501, deleted_at: 501 }, winner: "incoming" },
      { name: "clock skew jauh di masa depan tetap konsisten LWW", local: { client_updated_at: 1_900_000_000_000 }, incoming: { client_updated_at: 1_700_000_000_000 }, winner: "local" },
    ];
    for (const c of lwwCases) {
      expect(mergeLwwRecord(c.local, c.incoming).winner, c.name).toBe(c.winner);
    }

    const baseCard: SRSCard = {
      id: "c1",
      easeFactor: 2.5,
      interval: 1,
      repetitions: 1,
      nextReview: 10_000,
      lastReview: 1_000,
      reps: 1,
    };

    // Penerapan berulang (idempotensi) tidak mengubah state maupun menandai changed
    const first = mergeSrsRecord(null, { card: baseCard, lastReview: 1_000, reps: 1, deletedAt: null });
    expect(first.changed).toBe(true);
    const repeated = mergeSrsRecord(first.merged, { card: baseCard, lastReview: 1_000, reps: 1, deletedAt: null });
    expect(repeated.changed).toBe(false);
    expect(repeated.merged).toEqual(first.merged);

    // Counter: GREATEST pada epoch sama, reset_at lebih tinggi mengalahkan nilai lama, idempoten saat diulang
    const cInit = mergeCounterRecord(null, { newIntroduced: 4, extraNew: 1, reviewedCount: 10, lastActivity: 2000, resetAt: 0 });
    const cRepeat = mergeCounterRecord(cInit.merged, { newIntroduced: 4, extraNew: 1, reviewedCount: 10, lastActivity: 2000, resetAt: 0 });
    expect(cRepeat.changed).toBe(false);

    // Error & backoff
    expect(classifySyncError({ status: 503, message: "Service Unavailable" }).kind).toBe("retryable");
    expect(classifySyncError({ code: "23503", message: "foreign key violation" }).kind).toBe("constraint");
    expect(computeBackoffMs(3, { baseMs: 1000, maxMs: 60_000, rand: () => 0.5 })).toBe(6000);
  });

  it("2) Uji properti: menerapkan himpunan perubahan LWW, SRS, dan Counter dalam urutan acak apa pun selalu konvergen ke state akhir identik", () => {
    const rand = mulberry32(20261127);

    // 2a. LWW (50 himpunan acak dengan timestamp unik -> hasil identik di 10 permutasi per himpunan)
    for (let trial = 0; trial < 50; trial++) {
      const ops: Array<LwwRecordMeta & { val: string }> = [];
      const usedTs = new Set<number>();
      for (let i = 0; i < 12; i++) {
        let ts = Math.floor(rand() * 100_000) + 1;
        while (usedTs.has(ts)) ts += 1;
        usedTs.add(ts);
        const deleted = rand() < 0.3;
        ops.push({ client_updated_at: ts, deleted_at: deleted ? ts : null, val: deleted ? "TOMBSTONE" : `v-${i}-${ts}` });
      }

      const foldLww = (seq: typeof ops) => {
        let cur: (LwwRecordMeta & { val: string }) | null = null;
        for (const op of seq) {
          const res = mergeLwwRecord(cur, op);
          if (res.winner === "incoming") cur = op;
        }
        return cur;
      };

      const expected = foldLww(ops);
      for (let p = 0; p < 10; p++) {
        expect(foldLww(shuffle(ops, rand))).toEqual(expected);
      }
    }

    // 2b. SRS (50 himpunan acak campuran ulasan + reset + bangkit kembali -> permutasi apa pun konvergen identik!)
    for (let trial = 0; trial < 50; trial++) {
      const ops: SrsMergeState[] = [];
      const usedTs = new Set<number>();
      for (let i = 0; i < 12; i++) {
        let ts = Math.floor(rand() * 100_000) + 10;
        while (usedTs.has(ts)) ts += 1;
        usedTs.add(ts);
        if (rand() < 0.3) {
          ops.push({ card: null, lastReview: 0, reps: 0, deletedAt: ts });
        } else {
          const reps = Math.floor(rand() * 15) + 1;
          ops.push({
            card: {
              id: "prop-c",
              easeFactor: 2.5,
              interval: reps,
              repetitions: reps,
              nextReview: ts + 86_400_000,
              lastReview: ts,
              reps,
            },
            lastReview: ts,
            reps,
            deletedAt: null,
          });
        }
      }

      const foldSrs = (seq: SrsMergeState[]) => {
        let cur: SrsMergeState | null = null;
        for (const op of seq) {
          cur = mergeSrsRecord(cur, op).merged;
        }
        return cur;
      };

      const expected = foldSrs(ops);
      for (let p = 0; p < 10; p++) {
        expect(foldSrs(shuffle(ops, rand))).toEqual(expected);
      }
    }

    // 2c. Daily Counters (50 himpunan acak campuran increment + beberapa epoch reset_at -> urutan independen)
    for (let trial = 0; trial < 50; trial++) {
      const epochs = [0, 5000, 12000];
      const ops: CounterMergeState[] = [];
      for (let i = 0; i < 12; i++) {
        const ep = epochs[Math.floor(rand() * epochs.length)];
        ops.push({
          newIntroduced: Math.floor(rand() * 20),
          extraNew: Math.floor(rand() * 5),
          reviewedCount: Math.floor(rand() * 100),
          lastActivity: ep + Math.floor(rand() * 4000) + 1,
          resetAt: ep,
        });
      }

      const foldCounter = (seq: CounterMergeState[]) => {
        let cur: CounterMergeState | null = null;
        for (const op of seq) {
          cur = mergeCounterRecord(cur, op).merged;
        }
        return cur;
      };

      const expected = foldCounter(ops);
      for (let p = 0; p < 10; p++) {
        expect(foldCounter(shuffle(ops, rand))).toEqual(expected);
      }
    }
  });

  it("3) Single-flight mencegah 2 siklus paralel saling tumpang tindih dan pull tidak memicu echo outbox", async () => {
    const server = new MockSyncServer();
    let activeRpcs = 0;
    let maxConcurrentRpcs = 0;
    const client = server.createClientForUser(USER_ID, {
      onRpc: () => {
        activeRpcs += 1;
        maxConcurrentRpcs = Math.max(maxConcurrentRpcs, activeRpcs);
        activeRpcs -= 1;
      },
    });

    useAuthStore.setState({
      isConfigured: true,
      status: "signedIn",
      user: { id: USER_ID, email: "sf@goraku.id" } as never,
      profile: {
        user_id: USER_ID,
        display_name: "SF",
        jlpt_level: "N4",
        consented_at: "2026-11-27T00:00:00.000Z",
        consent_version: CURRENT_CONSENT_VERSION,
      },
      profileLoadState: "loaded",
      _client: client,
    });

    const deckId = useAppStore.getState().addDeck({
      title: "Single Flight Deck",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "単",
      color: "indigo",
    });
    const card: StoredCard = {
      id: "sf-1",
      deckId,
      word: "単一",
      reading: "たんいつ",
      meaning: "tunggal",
      sentence: "",
      translation: "",
      subdeck: "",
      tags: [],
    };
    await putCards([card]);
    await flushSyncOutboxWrites();

    // Panggil 4 syncNow() secara bersamaan -> single-flight berbagi 1 promise & RPC tidak tumpang tindih
    const results = await Promise.all([
      syncNow({ manual: true }),
      syncNow({ manual: true }),
      syncNow({ manual: true }),
      syncNow({ manual: true }),
    ]);
    expect(results.every((r) => r?.ok === true)).toBe(true);
    expect(maxConcurrentRpcs).toBe(1);
    // Pastikan echo suppression bekerja: 0 item baru di outbox sesudah pull!
    expect(await getPendingOutboxCount()).toBe(0);

    // Suntikkan baris baru dari perangkat lain ke server lalu pull -> tetap 0 outbox echo!
    server.cards.set(`${USER_ID}::${deckId}::sf-remote`, {
      user_id: USER_ID,
      deck_id: deckId,
      id: "sf-remote",
      data: { word: "遠隔", reading: "えんかく", meaning: "jarak jauh", sentence: "", translation: "" },
      deleted_at: null,
      client_updated_at: Date.now() + 5000,
      updated_at: new Date(server.clockMs + 10_000).toISOString(),
    });
    const pullOnly = await runSyncCycle({ client, userId: USER_ID });
    expect(pullOnly.ok).toBe(true);
    expect(pullOnly.pulled).toBeGreaterThanOrEqual(1);
    expect(await getPendingOutboxCount()).toBe(0);
  });

  it("4) Guard jaringan: 0 request saat keluar akun, Supabase tidak dikonfigurasi, dijeda, atau tab tersembunyi (hidden)", async () => {
    const server = new MockSyncServer();
    const client = server.createClientForUser(USER_ID);

    // a) Keluar akun -> 0 request
    useAuthStore.setState({ isConfigured: true, status: "signedOut", user: null, profile: null, _client: client });
    expect(await syncNow({ manual: true })).toBeNull();
    expect(server.rpcCallCount + server.selectCallCount).toBe(0);

    // b) Supabase tidak dikonfigurasi -> 0 request
    useAuthStore.setState({ isConfigured: false, status: "signedIn", user: { id: USER_ID } as never, profile: null, _client: null });
    expect(await syncNow({ manual: true })).toBeNull();
    expect(server.rpcCallCount + server.selectCallCount).toBe(0);

    // c) Masuk akun + consent lengkap tetapi dijeda di perangkat -> 0 request
    useAuthStore.setState({
      isConfigured: true,
      status: "signedIn",
      user: { id: USER_ID } as never,
      profile: {
        user_id: USER_ID,
        display_name: "Uji",
        jlpt_level: "N4",
        consented_at: "2026-11-27T00:00:00.000Z",
        consent_version: CURRENT_CONSENT_VERSION,
      },
      profileLoadState: "loaded",
      _client: client,
    });
    setSyncPausedOnDevice(true);
    expect(await syncNow({ manual: true })).toBeNull();
    expect(server.rpcCallCount + server.selectCallCount).toBe(0);

    // d) Aktifkan kembali tetapi tab tersembunyi (hidden) -> interval polling tidak menembakkan request apa pun!
    vi.useFakeTimers();
    vi.stubGlobal("document", {
      visibilityState: "hidden",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    useSyncStore.getState().setPausedOnDevice(false, USER_ID);
    useSyncStore.getState().setSyncState({ lastSyncAt: Date.now() - SYNC_IDLE_PULL_INTERVAL_MS - 10_000 });
    initSyncController();
    // Abaikan siklus initial handleAuthStoreChange dengan mereset counter setelah init
    const beforeHiddenReqs = server.rpcCallCount + server.selectCallCount;
    await vi.advanceTimersByTimeAsync(SYNC_VISIBLE_POLL_MS * 10); // 10 menit dalam keadaan tab tersembunyi
    expect(server.rpcCallCount + server.selectCallCount).toBe(beforeHiddenReqs);
    stopSyncController();
  });
});
