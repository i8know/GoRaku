import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  addCards,
  moveCardsBetweenDecks,
  removeCards,
} from "../../deckCards";
import {
  clearAllReviewLogs,
  deleteDeckData,
  getAllReviewLogs,
  getCardCount,
  getCards,
  getPendingOutboxCount,
  putCards,
  type StoredCard,
} from "../../deckDb";
import { adoptLegacyDataForUser } from "../../legacyAdoption";
import { exportScheduleBackup, importScheduleBackup } from "../../scheduleBackup";
import { LEGACY_APP_STORAGE_KEY } from "../../userStorageScope";
import { useAppStore } from "../../../store/useAppStore";
import { useReviewStore } from "../../../store/useReviewStore";
import { MockSyncServer } from "./mockSyncServer";
import { MultiDeviceHarness } from "./twoDeviceHarness";

describe("Task 6 — Operasi Khusus di Bawah Sinkronisasi (Reset, Pindah Kartu, Impor Cadangan, Hapus, Undo/Drill, Adopsi Lama)", () => {
  let harness: MultiDeviceHarness | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
      harness = null;
    }
  });

  it("1) Reset progres global, reset per-deck, dan reset per-kartu menyebar ke perangkat B tanpa pernah bangkit kembali, lalu bisa hidup lagi saat direview baru", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t6-reset");
    const devA = harness.createDevice("A");
    const devB = harness.createDevice("B");

    const { deck1, deck2, c1, c2, c3 } = await harness.onDevice(devA, async () => {
      const d1 = useAppStore.getState().addDeck({
        title: "Deck Reset 1",
        level: "N5 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "初",
        color: "indigo",
      });
      const d2 = useAppStore.getState().addDeck({
        title: "Deck Reset 2",
        level: "N4 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "二",
        color: "sage",
      });
      const [card1, card2] = await addCards(d1, [
        { word: "山", reading: "やま", meaning: "gunung", sentence: "", translation: "", tags: [] },
        { word: "川", reading: "かわ", meaning: "sungai", sentence: "", translation: "", tags: [] },
      ]);
      const [card3] = await addCards(d2, [
        { word: "海", reading: "うみ", meaning: "laut", sentence: "", translation: "", tags: [] },
      ]);
      const t0 = Date.now() - 60_000;
      useReviewStore.getState().reviewCardAction(d1, card1.id, 3, { now: t0 });
      useReviewStore.getState().reviewCardAction(d1, card2.id, 3, { now: t0 + 1000 });
      useReviewStore.getState().reviewCardAction(d2, card3.id, 3, { now: t0 + 2000 });
      return { deck1: d1, deck2: d2, c1: card1.id, c2: card2.id, c3: card3.id };
    });

    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);

    // 1a. Reset per-kartu (c1 di deck1) pada A -> B ikut kosong pada c1, c2 tetap ada
    await harness.onDevice(devA, () => {
      useReviewStore.getState().forgetCards(deck1, [c1]);
    });
    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);
    await harness.onDevice(devB, () => {
      expect(useReviewStore.getState().srsCards[deck1]?.[c1]).toBeUndefined();
      expect(useReviewStore.getState().srsCards[deck1]?.[c2]).toBeDefined();
    });

    // 1b. Review baru pada c1 di B setelah reset -> bangkit kembali pada kedua perangkat
    const reviveTs = Date.now() + 2000;
    await harness.onDevice(devB, () => {
      useReviewStore.getState().reviewCardAction(deck1, c1, 3, { now: reviveTs });
    });
    expect((await harness.sync(devB)).ok).toBe(true);
    expect((await harness.sync(devA)).ok).toBe(true);
    await harness.onDevice(devA, () => {
      expect(useReviewStore.getState().srsCards[deck1]?.[c1]?.lastReview).toBe(reviveTs);
    });

    // 1c. Reset per-deck pada deck1 di A -> c1, c2, dan counter deck1 hilang di B (deck2 tetap utuh)
    await new Promise((r) => setTimeout(r, 10));
    await harness.onDevice(devA, () => {
      useReviewStore.getState().removeDeck(deck1);
    });
    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);
    // Tarik ulang berkali-kali -> TIDAK PERNAH membangkitkan SRS maupun counter deck1
    expect((await harness.sync(devB)).ok).toBe(true);
    expect((await harness.sync(devA)).ok).toBe(true);
    await harness.onDevice(devB, () => {
      expect(useReviewStore.getState().srsCards[deck1]).toBeUndefined();
      expect(useReviewStore.getState().activity[deck1]).toBeUndefined();
      expect(useReviewStore.getState().newIntroduced[deck1]).toBeUndefined();
      expect(useReviewStore.getState().srsCards[deck2]?.[c3]).toBeDefined();
    });

    // 1d. Reset progres global (Settings.tsx) di A -> seluruh SRS & counter hilang di B
    await new Promise((r) => setTimeout(r, 10));
    await harness.onDevice(devA, async () => {
      useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} });
      await clearAllReviewLogs();
    });
    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);
    await harness.onDevice(devB, () => {
      expect(Object.keys(useReviewStore.getState().srsCards)).toHaveLength(0);
      expect(Object.keys(useReviewStore.getState().activity)).toHaveLength(0);
      expect(Object.keys(useReviewStore.getState().newIntroduced)).toHaveLength(0);
    });
  });

  it("2) Pindah kartu antar-deck (perubahan kunci deck_id) menghapus kunci lama, membuat kunci baru, dan membawa jadwal FSRS ke perangkat B", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t6-move");
    const devA = harness.createDevice("A");
    const devB = harness.createDevice("B");

    const { fromDeck, toDeck, movedCardId } = await harness.onDevice(devA, async () => {
      const dFrom = useAppStore.getState().addDeck({
        title: "Deck Asal",
        level: "N5 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "元",
        color: "slate",
      });
      const dTo = useAppStore.getState().addDeck({
        title: "Deck Tujuan",
        level: "N4 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "先",
        color: "indigo",
      });
      const [c1, c2] = await addCards(dFrom, [
        { word: "移動", reading: "いどう", meaning: "perpindahan", sentence: "", translation: "", tags: ["move"] },
        { word: "残留", reading: "ざんりゅう", meaning: "tinggal", sentence: "", translation: "", tags: [] },
      ]);
      useReviewStore.getState().reviewCardAction(dFrom, c1.id, 3, { now: Date.now() - 5000 });
      return { fromDeck: dFrom, toDeck: dTo, movedCardId: c1.id, stayCardId: c2.id };
    });

    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);

    // Pindahkan c1 dari fromDeck ke toDeck di perangkat A
    await harness.onDevice(devA, async () => {
      const moved = await moveCardsBetweenDecks(fromDeck, toDeck, [movedCardId]);
      expect(moved).toHaveLength(1);
    });

    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);

    await harness.onDevice(devB, async () => {
      const cardsFrom = await getCards(fromDeck);
      const cardsTo = await getCards(toDeck);
      expect(cardsFrom.some((c) => c.id === movedCardId)).toBe(false);
      expect(cardsFrom).toHaveLength(1);
      expect(cardsTo.some((c) => c.id === movedCardId && c.word === "移動")).toBe(true);
      expect(cardsTo).toHaveLength(1);
      expect(useAppStore.getState().decks.find((d) => d.id === fromDeck)?.total).toBe(1);
      expect(useAppStore.getState().decks.find((d) => d.id === toDeck)?.total).toBe(1);
      // Jadwal FSRS berpindah utuh tanpa hilang atau duplikat di deck lama
      expect(useReviewStore.getState().srsCards[fromDeck]?.[movedCardId]).toBeUndefined();
      expect(useReviewStore.getState().srsCards[toDeck]?.[movedCardId]?.reps).toBeGreaterThanOrEqual(1);
    });
  });

  it("3) Impor cadangan jadwal (scheduleBackup) menggabungkan secara konservatif tanpa menimpa progres lebih baru dan menyinkronkan ke B", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t6-backup");
    const devA = harness.createDevice("A");
    const devB = harness.createDevice("B");

    const { deckId, cOld, cNew, backupData } = await harness.onDevice(devA, async () => {
      const id = useAppStore.getState().addDeck({
        title: "Deck Cadangan",
        level: "N3 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "備",
        color: "ochre",
      });
      const [cardOld, cardNew] = await addCards(id, [
        { word: "古い", reading: "ふるい", meaning: "lama", sentence: "", translation: "", tags: [] },
        { word: "新しい", reading: "あたらしい", meaning: "baru", sentence: "", translation: "", tags: [] },
      ]);
      // Ekspor cadangan saat cOld sudah direview di t=100_000 dan cNew di t=100_000
      useReviewStore.getState().reviewCardAction(id, cardOld.id, 3, { now: 100_000 });
      useReviewStore.getState().reviewCardAction(id, cardNew.id, 2, { now: 100_000 });
      const backup = await exportScheduleBackup();
      return { deckId: id, cOld: cardOld.id, cNew: cardNew.id, backupData: backup };
    });

    // Sekarang di perangkat A, cNew punya progres LEBIH BARU (t=500_000), sementara cOld hilang dari state lokal
    await harness.onDevice(devA, () => {
      useReviewStore.getState().reviewCardAction(deckId, cNew, 3, { now: 500_000 });
      useReviewStore.getState().forgetCards(deckId, [cOld]);
    });

    // Impor cadangan lama -> cOld pulih dari cadangan, cNew TETAP mempertahankan t=500_000 (tidak tertimpa!)
    await harness.onDevice(devA, async () => {
      const res = await importScheduleBackup(backupData);
      expect(res.cardsCount).toBe(2);
      expect(useReviewStore.getState().srsCards[deckId]?.[cOld]?.lastReview).toBe(100_000);
      expect(useReviewStore.getState().srsCards[deckId]?.[cNew]?.lastReview).toBe(500_000);
    });

    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);
    await harness.onDevice(devB, async () => {
      expect(useReviewStore.getState().srsCards[deckId]?.[cOld]?.lastReview).toBe(100_000);
      expect(useReviewStore.getState().srsCards[deckId]?.[cNew]?.lastReview).toBe(500_000);
      const logs = await getAllReviewLogs();
      expect(logs.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("4) Hapus deck induk + sub-deck, hapus kartu, serta Undo & Drill tidak membocorkan baris palsu", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t6-del-undo");
    const devA = harness.createDevice("A");
    const devB = harness.createDevice("B");

    const { parentId, childId, keepDeck, cStay, cDel, cUndo } = await harness.onDevice(devA, async () => {
      const pId = useAppStore.getState().addDeck({
        title: "Induk",
        level: "N5 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "親",
        color: "indigo",
      });
      const chId = "sub-child-1";
      useAppStore.getState().importDecksBatch([
        {
          id: chId,
          parentId: pId,
          title: "Anak",
          subdeckName: "Anak",
          level: "N5 • Core",
          kind: "Core",
          total: 1,
          kanji: "子",
          color: "slate",
          source: "manual",
        },
      ]);
      await addCards(chId, [
        { word: "子", reading: "こ", meaning: "anak", sentence: "", translation: "", tags: [] },
      ]);
      const kDeck = useAppStore.getState().addDeck({
        title: "Deck Tetap",
        level: "N5 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "保",
        color: "sage",
      });
      const [cs, cd, cu] = await addCards(kDeck, [
        { word: "残る", reading: "のこる", meaning: "tersisa", sentence: "", translation: "", tags: [] },
        { word: "消す", reading: "けす", meaning: "hapus", sentence: "", translation: "", tags: [] },
        { word: "戻す", reading: "もどす", meaning: "undo", sentence: "", translation: "", tags: [] },
      ]);
      return { parentId: pId, childId: chId, keepDeck: kDeck, cStay: cs.id, cDel: cd.id, cUndo: cu.id };
    });

    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);

    // Drill review -> 0 entri outbox baru!
    await harness.onDevice(devA, async () => {
      expect(await getPendingOutboxCount()).toBe(0);
      useReviewStore.getState().reviewCardAction(keepDeck, cStay, 3, { drill: true });
      expect(await getPendingOutboxCount()).toBe(0);
    });

    // Review lalu Undo sebelum push -> review_log dibatalkan dari outbox, SRS tidak bocor ke server
    const logsBeforeUndo = server.logs.length;
    await harness.onDevice(devA, () => {
      useReviewStore.getState().reviewCardAction(keepDeck, cUndo, 3, { now: Date.now() });
      useReviewStore.getState().restoreCardState(keepDeck, cUndo, undefined, true);
    });

    // Hapus kartu cDel dan hapus deck induk (beserta sub-deck)
    await harness.onDevice(devA, async () => {
      await removeCards(keepDeck, [cDel]);
      useAppStore.getState().removeDeck(parentId);
      useReviewStore.getState().removeDeck(parentId);
      useReviewStore.getState().removeDeck(childId);
      await deleteDeckData(parentId);
      await deleteDeckData(childId);
    });

    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);

    expect(server.logs.length).toBe(logsBeforeUndo);
    await harness.onDevice(devB, async () => {
      expect(useAppStore.getState().decks.some((d) => d.id === parentId || d.id === childId)).toBe(false);
      expect(await getCardCount(childId)).toBe(0);
      const keepCards = await getCards(keepDeck);
      expect(keepCards.some((c) => c.id === cDel)).toBe(false);
      expect(keepCards.some((c) => c.id === cStay)).toBe(true);
      expect(useReviewStore.getState().srsCards[keepDeck]?.[cUndo]).toBeUndefined();
    });
  });

  it("5) Data hasil adopsi lokal lama (B1 adoptLegacyDataForUser) ikut tersinkronisasi penuh ke server & perangkat B", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t6-adopt");
    const devA = harness.createDevice("A");
    const devB = harness.createDevice("B");

    // Perangkat A sudah sinkron kosong lebih dulu (sehingga initialLocalEnqueued sudah true!)
    expect((await harness.sync(devA)).ok).toBe(true);

    // Tanamkan data warisan pra-akun (unscoped localStorage + ma-immersion-decks IDB) di perangkat A
    await harness.onDevice(devA, async () => {
      const legacyDeckId = "legacy-deck-1";
      localStorage.setItem(
        LEGACY_APP_STORAGE_KEY,
        JSON.stringify({
          state: {
            decks: [
              {
                id: legacyDeckId,
                title: "Deck Warisan B0",
                level: "N4 • Core",
                kind: "Core",
                due: 0,
                total: 1,
                progress: 0,
                kanji: "古",
                color: "ochre",
                updated: "Kemarin",
                source: "manual",
                updatedAt: Date.now() - 10_000,
              },
            ],
            settings: {
              ...useAppStore.getState().settings,
              newCards: 17,
            },
            deckLimits: {},
          },
          version: 0,
        }),
      );

      // Tulis kartu warisan langsung ke DB legacy `ma-immersion-decks`
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("ma-immersion-decks", 2);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("cards")) db.createObjectStore("cards");
          if (!db.objectStoreNames.contains("media")) db.createObjectStore("media");
          if (!db.objectStoreNames.contains("reviewLogs")) {
            db.createObjectStore("reviewLogs", { keyPath: "id", autoIncrement: true });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("cards", "readwrite");
          const card: StoredCard = {
            id: "leg-card-1",
            deckId: legacyDeckId,
            word: "継承",
            reading: "けいしょう",
            meaning: "warisan",
            sentence: "",
            translation: "",
            subdeck: "",
            tags: ["legacy"],
          };
          tx.objectStore("cards").put(card, `${legacyDeckId}::${card.id}`);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });

      const res = await adoptLegacyDataForUser("u-t6-adopt");
      expect(res.copiedCards).toBe(1);
    });

    // Siklus sync sesudah adopsi wajib otomatis mengunggah deck & kartu warisan ke server & B!
    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);

    await harness.onDevice(devB, async () => {
      const adoptedDeck = useAppStore.getState().decks.find((d) => d.id === "legacy-deck-1");
      expect(adoptedDeck?.title).toBe("Deck Warisan B0");
      expect(adoptedDeck?.total).toBe(1);
      const cards = await getCards("legacy-deck-1");
      expect(cards).toHaveLength(1);
      expect(cards[0].word).toBe("継承");
    });
  });
});
