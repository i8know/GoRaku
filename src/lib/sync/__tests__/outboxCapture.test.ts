import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendReviewLog,
  CARD_BATCH_SIZE,
  DeckDatabase,
  deckDexie,
  deleteCards,
  flushReviewLogs,
  flushSyncOutboxWrites,
  getAllReviewLogs,
  getCards,
  getPendingOutboxByEntity,
  getPendingOutboxCount,
  getSyncMeta,
  putCards,
  setSyncMeta,
  SYNC_ENTITY_ORDER,
  type StoredCard,
} from "../../deckDb";
import { withSyncCaptureSuppressed } from "../captureControl";
import {
  queuePreB2ReviewLogsOnce,
  refreshCaptureSnapshots,
  startSyncStoreCapture,
  stopSyncStoreCaptureForTest,
} from "../storeCapture";
import { switchUserStorageScope, resetScopeCoordinatorForTest } from "../../userScopeCoordinator";
import { clearScopedLocalDataForUser, resetUserStorageScopeForTest } from "../../userStorageScope";
import { useAppStore } from "../../../store/useAppStore";
import { useReviewStore } from "../../../store/useReviewStore";

describe("Task 3 — Dexie v4 & Outbox Capture", () => {
  const userA = "user-outbox-a";

  beforeEach(async () => {
    stopSyncStoreCaptureForTest();
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    await clearScopedLocalDataForUser(userA);
    await switchUserStorageScope(userA);
    startSyncStoreCapture();
    refreshCaptureSnapshots();
  });

  afterEach(async () => {
    stopSyncStoreCaptureForTest();
    await switchUserStorageScope(null);
    await clearScopedLocalDataForUser(userA);
  });

  it("upgrade aman dari Dexie v3 ke v4 mempertahankan cards, media, reviewLogs, dan kv", async () => {
    const legacyDbName = `upgrade-v3-v4-${Date.now()}`;
    const v3 = new Dexie(legacyDbName);
    v3.version(3).stores({
      cards: "",
      media: "",
      reviewLogs: "++id, deckId, cardId, reviewedAt, [deckId+cardId]",
      kv: "key",
    });
    await v3.open();
    await v3.table("kv").put({ key: "k1", value: "v1", updatedAt: 100 });
    await v3.table("reviewLogs").add({
      deckId: "d1",
      cardId: "c1",
      rating: 3,
      state: 2,
      due: 200,
      stability: 2,
      difficulty: 4,
      elapsedDays: 0,
      scheduledDays: 1,
      reviewedAt: 100,
    });
    const raw = v3.backendDB();
    await new Promise<void>((resolve, reject) => {
      const tx = raw.transaction("cards", "readwrite");
      tx.objectStore("cards").put({ id: "c1", deckId: "d1", word: "猫" }, "d1::c1");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    v3.close();

    // Buka ulang dengan DeckDatabase (v4)
    const v4 = new DeckDatabase(legacyDbName);
    await v4.open();
    expect(v4.verno).toBe(4);
    expect((await v4.kv.get("k1"))?.value).toBe("v1");
    expect(await v4.reviewLogs.count()).toBe(1);
    const cardCount = await new Promise<number>((resolve, reject) => {
      const tx = v4.backendDB().transaction("cards", "readonly");
      const req = tx.objectStore("cards").count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    expect(cardCount).toBe(1);
    await v4.syncMeta.put({ key: "schema", value: 4, updatedAt: Date.now() });
    expect((await v4.syncMeta.get("schema"))?.value).toBe(4);
    v4.close();
    await Dexie.delete(legacyDbName);
  });

  it("menggabungkan (coalesce) banyak suntingan ke kunci sama menjadi 1 baris outbox dan menolak echo saat suppress aktif", async () => {
    const deckId = useAppStore.getState().addDeck({
      title: "Deck Coalesce",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "試",
      color: "indigo",
    });

    // Sunting kartu yang sama 10x -> harus menyatu menjadi tepat 1 baris outbox
    for (let i = 0; i < 10; i++) {
      await putCards([
        {
          id: "c-same",
          deckId,
          word: `猫${i}`,
          reading: "ねこ",
          meaning: `kucing ${i}`,
          sentence: "",
          translation: "",
          subdeck: "",
          tags: [],
        },
      ]);
    }
    await flushSyncOutboxWrites();

    const cardRows = await getPendingOutboxByEntity("cards", 100);
    expect(cardRows).toHaveLength(1);
    expect(cardRows[0].key).toBe(`${deckId}::c-same`);
    expect((cardRows[0].payload.data as { word: string }).word).toBe("猫9");

    // Hapus kartu -> menyatu menimpa baris upsert menjadi 1 baris delete tombstone
    await deleteCards(deckId, ["c-same"]);
    const afterDelete = await getPendingOutboxByEntity("cards", 100);
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].op).toBe("delete");

    // Perubahan field turunan `total` pada deck tidak boleh menghasilkan entri deck baru
    const deckCountBefore = (await getPendingOutboxByEntity("decks", 100)).length;
    expect(deckCountBefore).toBe(1);
    await deckDexie.syncOutbox.where("entity").equals("decks").delete();
    useAppStore.getState().updateDeck(deckId, { total: 42 });
    await flushSyncOutboxWrites();
    expect(await getPendingOutboxByEntity("decks", 100)).toHaveLength(0);

    // Echo suppression: menulis kartu & store di dalam withSyncCaptureSuppressed tidak menambah outbox
    const beforeSuppressed = await getPendingOutboxCount();
    await withSyncCaptureSuppressed(async () => {
      await putCards([
        {
          id: "c-pulled",
          deckId,
          word: "犬",
          reading: "いぬ",
          meaning: "anjing",
          sentence: "",
          translation: "",
          subdeck: "",
          tags: [],
        },
      ]);
      useAppStore.getState().updateSettings({ newCards: 25 });
      useReviewStore.getState().reviewCardAction(deckId, "c-pulled", 4);
      await flushReviewLogs();
    });
    await flushSyncOutboxWrites();
    expect(await getPendingOutboxCount()).toBe(beforeSuppressed);
    expect((await getCards(deckId)).some((c) => c.id === "c-pulled")).toBe(true);
  });

  it("impor 5.000 kartu berjalan dalam batch (bukan 5.000 tulis satuan) dan outbox bertahan lintas sign-out/sign-in", async () => {
    const deckId = "deck-bulk-5k";
    const cards: StoredCard[] = Array.from({ length: 5000 }, (_, i) => ({
      id: `bulk-${i}`,
      deckId,
      word: `語${i}`,
      reading: `ご${i}`,
      meaning: `arti ${i}`,
      sentence: "",
      translation: "",
      subdeck: "",
      tags: [],
    }));

    // Tulis dalam batch 500 kartu persis seperti apkgImport.worker.ts
    for (let i = 0; i < cards.length; i += CARD_BATCH_SIZE) {
      await putCards(cards.slice(i, i + CARD_BATCH_SIZE));
    }
    await flushSyncOutboxWrites();
    expect(await getPendingOutboxCount()).toBe(5000);

    // Simpan meta lalu keluar & masuk lagi sebagai akun yang sama -> outbox & meta tetap utuh
    await setSyncMeta("lastSyncAt", 123456);
    await switchUserStorageScope(null);
    await switchUserStorageScope(userA);
    expect(await getPendingOutboxCount()).toBe(5000);
    expect(await getSyncMeta<number>("lastSyncAt")).toBe(123456);
    expect(SYNC_ENTITY_ORDER).toEqual([
      "settings",
      "decks",
      "cards",
      "srs_cards",
      "daily_counters",
      "review_logs",
    ]);
  });

  it("reviewLogs membawa device_id, Undo menghapus log unpushed dari outbox, dan log pra-B2 diantrekan sekali", async () => {
    const deckId = useAppStore.getState().addDeck({
      title: "Deck Logs",
      level: "N4 • Core",
      kind: "Core",
      due: 0,
      total: 1,
      kanji: "記",
      color: "sage",
    });

    // 1. Review normal -> antrekan SRS, counter, dan review_log ber-device_id
    useReviewStore.getState().reviewCardAction(deckId, "card-1", 4, { now: 1700000001000 });
    await flushReviewLogs();
    await flushSyncOutboxWrites();

    const logsBeforeUndo = await getPendingOutboxByEntity("review_logs", 50);
    expect(logsBeforeUndo).toHaveLength(1);
    expect(typeof logsBeforeUndo[0].payload.device_id).toBe("string");
    expect((logsBeforeUndo[0].payload.device_id as string).length).toBeGreaterThan(0);

    // 2. Undo sebelum push -> baris review_logs unpushed dihapus dari outbox
    useReviewStore.getState().restoreCardState(deckId, "card-1", undefined, true, {
      now: 1700000002000,
    });
    await flushReviewLogs();
    await flushSyncOutboxWrites();
    expect(await getPendingOutboxByEntity("review_logs", 50)).toHaveLength(0);

    // 3. Log pra-B2 (ditulis tanpa capture) diantrekan tepat satu kali oleh queuePreB2ReviewLogsOnce
    await appendReviewLog(
      {
        deckId,
        cardId: "legacy-card",
        rating: 3,
        state: 0,
        due: 1700000000000,
        stability: 2.1,
        difficulty: 4.5,
        elapsedDays: 0,
        scheduledDays: 1,
        reviewedAt: 1699999999000,
      },
      { suppressSync: true },
    );
    await flushReviewLogs();
    expect(await getAllReviewLogs()).toHaveLength(1);
    expect(await getPendingOutboxByEntity("review_logs", 50)).toHaveLength(0);

    const firstQueue = await queuePreB2ReviewLogsOnce("dev-test-1");
    expect(firstQueue).toBe(1);
    const secondQueue = await queuePreB2ReviewLogsOnce("dev-test-1");
    expect(secondQueue).toBe(0);
    expect(await getPendingOutboxByEntity("review_logs", 50)).toHaveLength(1);
  });
});
