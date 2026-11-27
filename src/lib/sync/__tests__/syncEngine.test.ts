import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifySyncError,
  computeBackoffMs,
  mergeCounterRecord,
  mergeLwwRecord,
  mergeSrsRecord,
} from "../merge";
import { withSyncTabLock } from "../tabLock";
import { runSyncCycle } from "../engine";
import {
  flushSyncBeforeSignOut,
  stopSyncController,
} from "../syncController";
import {
  flushSyncOutboxWrites,
  getCards,
  getPendingOutboxCount,
  getQuarantinedOutboxRows,
  putCards,
  type StoredCard,
} from "../../deckDb";
import {
  refreshCaptureSnapshots,
  startSyncStoreCapture,
  stopSyncStoreCaptureForTest,
} from "../storeCapture";
import { resetScopeCoordinatorForTest, switchUserStorageScope } from "../../userScopeCoordinator";
import { clearScopedLocalDataForUser, resetUserStorageScopeForTest } from "../../userStorageScope";
import { useAppStore } from "../../../store/useAppStore";
import { useReviewStore } from "../../../store/useReviewStore";
import { useSyncStore } from "../../../store/useSyncStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { createSignOutFlowHandler } from "../../../components/SignOutButton";
import { MockSyncServer } from "./mockSyncServer";

describe("Task 4 — Mesin Sinkronisasi, Merge Murni, Error & Resumabilitas", () => {
  const userId = "user-engine-4";

  beforeEach(async () => {
    stopSyncController();
    stopSyncStoreCaptureForTest();
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    useSyncStore.getState().resetSyncState();
    useAuthStore.getState().resetForTest();
    await clearScopedLocalDataForUser(userId);
    await switchUserStorageScope(userId);
    startSyncStoreCapture();
    refreshCaptureSnapshots();
  });

  afterEach(async () => {
    stopSyncController();
    stopSyncStoreCaptureForTest();
    await switchUserStorageScope(null);
    await clearScopedLocalDataForUser(userId);
    vi.restoreAllMocks();
  });

  it("aturan merge murni: LWW, seri, tombstone, SRS alive/revive, counter GREATEST + reset_at, dan klasifikasi error/backoff", () => {
    // LWW strict greater; tie keeps local; older edit never resurrects tombstone
    expect(
      mergeLwwRecord({ client_updated_at: 100, deleted_at: 100 }, { client_updated_at: 100, deleted_at: null }).winner,
    ).toBe("local");
    expect(
      mergeLwwRecord({ client_updated_at: 100, deleted_at: 100 }, { client_updated_at: 90, deleted_at: null }).winner,
    ).toBe("local");
    expect(
      mergeLwwRecord({ client_updated_at: 100, deleted_at: null }, { client_updated_at: 101, deleted_at: 101 }).winner,
    ).toBe("incoming");

    // SRS: higher lastReview wins; tie -> higher reps; reset kills; review > deletedAt revives
    const c1 = { id: "c1", easeFactor: 2.5, interval: 1, repetitions: 1, nextReview: 5000, lastReview: 1000, reps: 1 };
    const c2 = { id: "c1", easeFactor: 2.5, interval: 3, repetitions: 2, nextReview: 9000, lastReview: 1000, reps: 2 };
    const tieRes = mergeSrsRecord(
      { card: c1, lastReview: 1000, reps: 1, deletedAt: null },
      { card: c2, lastReview: 1000, reps: 2, deletedAt: null },
    );
    expect(tieRes.merged.reps).toBe(2);
    expect(tieRes.alive).toBe(true);

    const resetRes = mergeSrsRecord(tieRes.merged, { card: null, lastReview: 0, reps: 0, deletedAt: 2000 });
    expect(resetRes.alive).toBe(false);
    expect(resetRes.merged.card).toBeNull();

    const revived = mergeSrsRecord(resetRes.merged, {
      card: { ...c1, lastReview: 3000, reps: 1 },
      lastReview: 3000,
      reps: 1,
      deletedAt: null,
    });
    expect(revived.alive).toBe(true);
    expect(revived.merged.lastReview).toBe(3000);
    expect(revived.merged.deletedAt).toBe(2000);

    // Counters: GREATEST on same epoch, reset_at dominates
    const ctr = mergeCounterRecord(
      { newIntroduced: 5, extraNew: 0, reviewedCount: 10, lastActivity: 1000, resetAt: 0 },
      { newIntroduced: 3, extraNew: 4, reviewedCount: 12, lastActivity: 900, resetAt: 0 },
    );
    expect(ctr.merged).toEqual({ newIntroduced: 5, extraNew: 4, reviewedCount: 12, lastActivity: 1000, resetAt: 0 });
    const ctrReset = mergeCounterRecord(ctr.merged, {
      newIntroduced: 0,
      extraNew: 0,
      reviewedCount: 0,
      lastActivity: null,
      resetAt: 5000,
    });
    expect(ctrReset.merged.reviewedCount).toBe(0);
    expect(ctrReset.merged.resetAt).toBe(5000);

    // Error classification & backoff bounds
    expect(classifySyncError({ status: 401, message: "JWT expired" }).kind).toBe("auth");
    expect(classifySyncError({ status: 403, code: "42501", message: "permission denied" }).kind).toBe("rls");
    expect(classifySyncError({ code: "23514", message: "violates check constraint" }).kind).toBe("constraint");
    expect(classifySyncError({ status: 429, message: "Too Many Requests" }).kind).toBe("retryable");
    expect(classifySyncError(new TypeError("Failed to fetch")).kind).toBe("retryable");
    expect(computeBackoffMs(0, { baseMs: 1000, maxMs: 10000, rand: () => 0 })).toBe(500);
    expect(computeBackoffMs(0, { baseMs: 1000, maxMs: 10000, rand: () => 1 })).toBe(1000);
    expect(computeBackoffMs(10, { baseMs: 1000, maxMs: 10000, rand: () => 1 })).toBe(10000);
  });

  it("karantina baris yang ditolak server tanpa menggagalkan baris valid, dan sanitasi HTML berbahaya saat pull", async () => {
    const server = new MockSyncServer();
    const client = server.createClientForUser(userId);

    const deckId = useAppStore.getState().addDeck({
      title: "Deck Sanitasi",
      level: "N4 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "浄",
      color: "indigo",
    });
    const validCard: StoredCard = {
      id: "c-good",
      deckId,
      word: "安全",
      reading: "あんぜん",
      meaning: "aman",
      sentence: "",
      translation: "",
      subdeck: "",
      tags: [],
    };
    const oversizedCard: StoredCard = {
      id: "c-huge",
      deckId,
      word: "大".repeat(70_000),
      reading: "",
      meaning: "terlalu besar",
      sentence: "",
      translation: "",
      subdeck: "",
      tags: [],
    };
    await putCards([validCard, oversizedCard]);
    await flushSyncOutboxWrites();

    const pushRes = await runSyncCycle({ client, userId });
    expect(pushRes.ok).toBe(true);
    expect(pushRes.pendingRemaining).toBe(0);
    expect(pushRes.quarantinedCount).toBe(1);
    const quarantined = await getQuarantinedOutboxRows();
    expect(quarantined[0].key).toBe(`${deckId}::c-huge`);
    expect(quarantined[0].error).toContain("23514");

    // Suntikkan kartu dengan XSS + baris malformed langsung ke server lalu pull
    server.cards.set(`${userId}::${deckId}::c-xss`, {
      user_id: userId,
      deck_id: deckId,
      id: "c-xss",
      data: {
        word: "攻撃",
        reading: "こうげき",
        meaning: '<b>serangan</b><script>alert(1)</script><img src=x onerror=alert(1)>',
        sentence: '<a href="javascript:evil()">テスト</a>',
        translation: "uji",
      },
      deleted_at: null,
      client_updated_at: Date.now() + 1000,
      updated_at: new Date(server.clockMs + 10_000).toISOString(),
    });
    server.cards.set(`${userId}::${deckId}::c-malformed`, {
      user_id: userId,
      deck_id: deckId,
      id: "c-malformed",
      data: { word: "" }, // word kosong -> malformed
      deleted_at: null,
      client_updated_at: Date.now() + 1000,
      updated_at: new Date(server.clockMs + 10_010).toISOString(),
    });

    const pullRes = await runSyncCycle({ client, userId });
    expect(pullRes.ok).toBe(true);
    expect(pullRes.malformedSkipped).toBeGreaterThanOrEqual(1);
    const localCards = await getCards(deckId);
    const xssCard = localCards.find((c) => c.id === "c-xss");
    expect(xssCard).toBeDefined();
    expect(xssCard?.meaning).toBe("<b>serangan</b>");
    expect(xssCard?.meaning).not.toContain("<script");
    expect(xssCard?.meaning).not.toContain("onerror");
    expect(xssCard?.sentence).not.toContain("javascript:");
  });

  it("refresh JWT tepat satu kali saat 401 lalu jeda auth_required; RLS 403 langsung berhenti", async () => {
    const server = new MockSyncServer();
    useAppStore.getState().addDeck({
      title: "Deck Auth",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "鍵",
      color: "slate",
    });
    await flushSyncOutboxWrites();

    // 1. 401 pertama sukses setelah refreshSession()
    let failFirst = true;
    const clientRecover = server.createClientForUser(userId, {
      onRpc: () => {
        if (failFirst) {
          failFirst = false;
          return { error: { status: 401, code: "PGRST301", message: "JWT expired" } };
        }
      },
    });
    const r1 = await runSyncCycle({ client: clientRecover, userId });
    expect(r1.ok).toBe(true);
    expect(server.refreshCalls).toBe(1);

    // 2. 401 berulang setelah refresh -> berhenti dengan kind = "auth"
    useAppStore.getState().updateSettings({ newCards: 22 });
    await flushSyncOutboxWrites();
    const clientAlways401 = server.createClientForUser(userId, {
      onRpc: () => ({ error: { status: 401, code: "PGRST301", message: "JWT expired" } }),
    });
    const r2 = await runSyncCycle({ client: clientAlways401, userId });
    expect(r2.ok).toBe(false);
    expect(r2.error?.kind).toBe("auth");
    expect(server.refreshCalls).toBe(2);

    // 3. RLS 403 -> berhenti dengan kind = "rls" tanpa refresh
    const client403 = server.createClientForUser(userId, {
      onRpc: () => ({ error: { status: 403, code: "42501", message: "permission denied" } }),
    });
    const r3 = await runSyncCycle({ client: client403, userId });
    expect(r3.ok).toBe(false);
    expect(r3.error?.kind).toBe("rls");
    expect(server.refreshCalls).toBe(2);
  });

  it("aman dihentikan di tengah jalan antar batch dan dilanjutkan secara idempoten tanpa kehilangan data", async () => {
    const server = new MockSyncServer();
    const client = server.createClientForUser(userId);
    const deckId = useAppStore.getState().addDeck({
      title: "Deck Resume",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "続",
      color: "sage",
    });

    const batchCards: StoredCard[] = Array.from({ length: 60 }, (_, i) => ({
      id: `res-${i}`,
      deckId,
      word: `語${i}`,
      reading: `ご${i}`,
      meaning: `arti ${i}`,
      sentence: "",
      translation: "",
      subdeck: "",
      tags: [],
    }));
    await putCards(batchCards);
    await flushSyncOutboxWrites();

    // Hentikan paksa setelah 2 batch (pushBatchSize = 20 -> deck + 1 batch 20 kartu)
    let progressHits = 0;
    const abortedRun = await runSyncCycle({
      client,
      userId,
      pushBatchSize: 20,
      onProgress: () => {
        progressHits += 1;
      },
      shouldAbort: () => progressHits >= 2,
    });
    expect(abortedRun.aborted).toBe(true);
    expect(abortedRun.pendingRemaining).toBeGreaterThan(0);

    // Lanjutkan siklus -> seluruh 60 kartu tuntas tanpa duplikasi
    const resumedRun = await runSyncCycle({ client, userId, pushBatchSize: 20 });
    expect(resumedRun.ok).toBe(true);
    expect(resumedRun.pendingRemaining).toBe(0);
    expect([...server.cards.values()].filter((c) => c.deck_id === deckId)).toHaveLength(60);
  });

  it("tab lock mencegah eksekusi serentak lintas-tab (fallback localStorage) dan sign-out memberi peringatan saat pending tersisa", async () => {
    const lsMap = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => lsMap.get(k) ?? null,
      setItem: (k: string, v: string) => {
        lsMap.set(k, v);
      },
      removeItem: (k: string) => {
        lsMap.delete(k);
      },
    });

    let releaseFirst!: () => void;
    const first = withSyncTabLock(userId, () => new Promise<string>((r) => {
      releaseFirst = () => r("first-done");
    }));
    const second = await withSyncTabLock(userId, async () => "second-done");
    expect(second.acquired).toBe(false);
    releaseFirst();
    expect((await first).acquired).toBe(true);

    // Sign-out dengan perubahan tertunda saat offline -> peringatan tampil & data tetap di scope lokal
    useAppStore.getState().addDeck({
      title: "Deck Offline",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "残",
      color: "coral",
    });
    await flushSyncOutboxWrites();
    expect(await getPendingOutboxCount()).toBeGreaterThan(0);

    const notices: string[] = [];
    const signOutTrigger = createSignOutFlowHandler({
      signOut: async () => ({ error: null }),
      notify: (m) => notices.push(m),
      navigateToLogin: () => {},
      onPendingChange: () => {},
      flushBeforeSignOut: () => flushSyncBeforeSignOut(200),
    });
    await signOutTrigger();

    expect(notices.some((m) => m.includes("perubahan belum tersinkron. Datamu tetap aman di perangkat ini."))).toBe(true);
    expect(await getPendingOutboxCount()).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
