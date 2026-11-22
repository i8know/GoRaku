import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DeckDatabase,
  flushReviewLogs,
  getCards,
  putCards,
  putKvValue,
  putMedia,
  switchDeckDatabaseScope,
  deckDexie,
} from "../deckDb";
import {
  LexiconDatabase,
  lexiconDb,
  switchLexiconDatabaseScope,
} from "../lexiconDb";
import {
  questionPackDb,
  switchQuestionPackDatabaseScope,
} from "../questionPackStorage";
import {
  flushReviewStorageWrites,
  resetReviewStorageForScopeChange,
  REVIEW_STORAGE_KEY,
} from "../reviewStorage";
import {
  adoptLegacyDataForUser,
  deferLegacyForSession,
  detectLegacyDataSummary,
  getLegacyAdoptedBy,
  LEGACY_ADOPTED_BY_KEY,
  markLegacyDeclinedForUser,
  resetLegacyAdoptionSessionForTest,
  shouldPromptLegacyAdoption,
} from "../legacyAdoption";
import {
  initUserStorageScopeSync,
  resetScopeCoordinatorForTest,
  switchUserStorageScope,
} from "../userScopeCoordinator";
import {
  clearScopedLocalDataForUser,
  getScopedKey,
  LEGACY_APP_STORAGE_KEY,
  LEGACY_DECK_DB_NAME,
  LEGACY_EXAM_SESSIONS_KEY,
  LEGACY_LEXICON_DB_NAME,
  LEGACY_QUESTION_PACK_DB_NAME,
  LEGACY_REVIEW_STORAGE_KEY,
  resetUserStorageScopeForTest,
} from "../userStorageScope";
import { useAppStore } from "../../store/useAppStore";
import { useReviewStore } from "../../store/useReviewStore";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    key: (idx) => Array.from(map.keys())[idx] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, val) => {
      map.set(key, String(val));
    },
  };
}

async function deleteNativeDb(dbName: string): Promise<void> {
  if (typeof indexedDB === "undefined" || typeof indexedDB.deleteDatabase !== "function") {
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function seedLegacyBrowserData(): Promise<void> {
  // Pastikan scope sementara mengarah ke DB legacy (null) hanya saat menyiapkan fixture
  await switchDeckDatabaseScope(null);
  switchLexiconDatabaseScope(null);
  switchQuestionPackDatabaseScope(null);

  localStorage.setItem(
    LEGACY_APP_STORAGE_KEY,
    JSON.stringify({
      state: {
        decks: [
          {
            id: "deck-old-1",
            title: "Deck Lama Saya",
            level: "N4 • Core",
            kind: "Core",
            due: 1,
            total: 1,
            progress: 0,
            kanji: "古",
            color: "coral",
            updated: "Kemarin",
            source: "apkg",
          },
        ],
        minedQueue: [],
        libraryItems: [],
        settings: {
          newCards: 25,
          maxReview: 120,
          dayStartHour: 4,
          desiredRetention: 0.9,
          newOrder: "urutan",
          furi: true,
          audio: true,
          romaji: false,
          remind: true,
          time: "19:30",
          weekly: true,
          size: "Sedang",
        },
        deckLimits: {},
      },
      version: 6,
    }),
  );

  const reviewPayload = JSON.stringify({
    state: {
      srsCards: {
        "deck-old-1": {
          "card-old-1": {
            id: "card-old-1",
            repetitions: 3,
            interval: 6,
            easeFactor: 2.5,
            nextReview: 1_900_000_000_000,
            lastReview: 1_800_000_000_000,
            lapses: 0,
          },
        },
      },
      newIntroduced: { "deck-old-1": { date: "2026-11-18", count: 1 } },
      activity: { "deck-old-1": { last: 1_800_000_000_000, date: "2026-11-18", count: 2 } },
    },
    version: 1,
  });

  localStorage.setItem(LEGACY_REVIEW_STORAGE_KEY, reviewPayload);
  localStorage.setItem(LEGACY_EXAM_SESSIONS_KEY, JSON.stringify({ s1: { score: 90 } }));

  await putCards([
    {
      id: "card-old-1",
      deckId: "deck-old-1",
      word: "記憶",
      reading: "きおく",
      meaning: "ingatan",
      sentence: "古い記憶をたどる。",
      translation: "Menelusuri ingatan lama.",
      audio: "voice.mp3",
      subdeck: "",
      tags: ["n4"],
    },
  ]);
  await putMedia("deck-old-1", [["voice.mp3", new Blob(["abc"], { type: "audio/mpeg" })]]);
  await putKvValue(REVIEW_STORAGE_KEY, reviewPayload);
  await deckDexie.reviewLogs.bulkAdd([
    {
      deckId: "deck-old-1",
      cardId: "card-old-1",
      reviewedAt: 1_800_000_000_000,
      due: 1_850_000_000_000,
      rating: 3,
      state: 2,
      elapsedDays: 1,
      scheduledDays: 6,
      stability: 6,
      difficulty: 5,
    },
    {
      deckId: "deck-old-1",
      cardId: "card-old-1",
      reviewedAt: 1_800_050_000_000,
      due: 1_900_000_000_000,
      rating: 4,
      state: 2,
      elapsedDays: 1,
      scheduledDays: 10,
      stability: 10,
      difficulty: 4.5,
    },
  ]);

  const dictId = await lexiconDb.dictionaries.add({
    title: "JMdict Lama",
    revision: "2026-01",
    format: 3,
    attribution: "",
    enabled: true,
    priority: 1,
    termCount: 2,
    importedAt: "2026-01-01T00:00:00.000Z",
  });
  await lexiconDb.terms.bulkAdd([
    {
      dictId,
      expression: "記憶",
      reading: "きおく",
      rawReading: "きおく",
      tags: "n",
      rules: "",
      score: 10,
      glossary: ["ingatan"],
      sequence: 1,
      termTags: "",
    },
    {
      dictId,
      expression: "歴史",
      reading: "れきし",
      rawReading: "れきし",
      tags: "n",
      rules: "",
      score: 8,
      glossary: ["sejarah"],
      sequence: 2,
      termTags: "",
    },
  ]);
  await lexiconDb.tags.add({
    dictId,
    name: "n",
    category: "partOfSpeech",
    order: 0,
    notes: "kata benda",
    score: 0,
  });
  await lexiconDb.termMeta.add({
    dictId,
    expression: "記憶",
    mode: "freq",
    data: 1200,
  });
  await lexiconDb.books.put({
    id: "book-old-1",
    type: "novel",
    format: "epub",
    title: "Novel Lama",
    author: "Soseki",
    fileSize: 4096,
    progress: 65,
    addedAt: "2026-01-01T00:00:00.000Z",
    lastReadAt: "2026-11-18T00:00:00.000Z",
    minedCount: 3,
  });
  await lexiconDb.bookFiles.put({
    bookId: "book-old-1",
    blob: new Blob(["epub-bytes"]),
  });
  await lexiconDb.ocrCache.add({
    bookId: "manga-old-1",
    pageIndex: 0,
    bbox: { x: 10, y: 20, w: 100, h: 50 },
    lang: "jpn",
    rawText: "記憶",
    text: "記憶",
    createdAt: "2026-11-18T00:00:00.000Z",
  });

  await questionPackDb.packs.put({
    id: "pack-old-1",
    version: "1.0.0",
    title: "Latihan Lama",
    description: "Soal kustom lama",
    level: "N5",
    language: "ja",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    license: "CC-BY-4.0",
    attribution: { sources: [], disclaimer: "" },
    stats: {
      totalQuestions: 0,
      byType: {
        G1_KANJI_READING: 0,
        G2_KANJI_WRITING: 0,
        G3_PARTICLES: 0,
        G4_CONTEXT_VOCAB: 0,
      },
      approvedCount: 0,
      draftCount: 0,
      rejectedCount: 0,
    },
    questions: [],
  });

  // Tutup koneksi legacy sehingga menyerupai data warisan sebelum user masuk
  deckDexie.close();
  lexiconDb.close();
  questionPackDb.close();
}

describe("Task 4 — Adopsi Data Lokal Lama ke Akun Pertama", () => {
  const USER_A = "aaaa1111-1111-4111-8111-111111111111";
  const USER_B = "bbbb2222-2222-4222-8222-222222222222";

  beforeEach(async () => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    resetLegacyAdoptionSessionForTest();
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    await switchDeckDatabaseScope(null);
    switchLexiconDatabaseScope(null);
    switchQuestionPackDatabaseScope(null);
    await resetReviewStorageForScopeChange();
    await clearScopedLocalDataForUser(USER_A);
    await clearScopedLocalDataForUser(USER_B);
    await deleteNativeDb(LEGACY_DECK_DB_NAME);
    await deleteNativeDb(LEGACY_LEXICON_DB_NAME);
    await deleteNativeDb(LEGACY_QUESTION_PACK_DB_NAME);
  });

  afterEach(async () => {
    await flushReviewStorageWrites();
    await flushReviewLogs();
    await switchUserStorageScope(null);
    await clearScopedLocalDataForUser(USER_A);
    await clearScopedLocalDataForUser(USER_B);
    await deleteNativeDb(LEGACY_DECK_DB_NAME);
    await deleteNativeDb(LEGACY_LEXICON_DB_NAME);
    await deleteNativeDb(LEGACY_QUESTION_PACK_DB_NAME);
    resetLegacyAdoptionSessionForTest();
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    vi.unstubAllGlobals();
  });

  it("tidak menawarkan adopsi pada peramban yang benar-benar bersih tanpa data lama", async () => {
    const summary = await detectLegacyDataSummary();
    expect(summary.hasData).toBe(false);
    expect(await shouldPromptLegacyAdoption(USER_A)).toBeNull();
  });

  it("menyalin seluruh data lama (localStorage, deck, kartu, media, reviewLogs, buku, kamus, paket) ke Akun A, membiarkan cadangan lama utuh, dan tidak menawarkannya ke Akun B", async () => {
    await seedLegacyBrowserData();
    initUserStorageScopeSync({ lockUnauthenticated: true });

    await switchUserStorageScope(USER_A);
    const promptA = await shouldPromptLegacyAdoption(USER_A);
    expect(promptA).not.toBeNull();
    expect(promptA!.customDeckCount).toBe(1);
    expect(promptA!.cardCount).toBe(1);
    expect(promptA!.mediaCount).toBe(1);
    expect(promptA!.reviewLogCount).toBe(2);
    expect(promptA!.bookCount).toBe(1);
    expect(promptA!.dictionaryCount).toBe(1);
    expect(promptA!.questionPackCount).toBe(1);

    const res = await adoptLegacyDataForUser(USER_A);
    expect(res.copiedCards).toBe(1);
    expect(res.copiedMedia).toBe(1);
    expect(res.copiedReviewLogs).toBe(2);
    expect(res.copiedBooks).toBe(1);
    expect(res.copiedDictionaries).toBe(1);
    expect(res.copiedQuestionPacks).toBe(1);
    expect(getLegacyAdoptedBy()).toBe(USER_A);

    // State store aktif milik A terisi penuh
    expect(useAppStore.getState().decks.some((d) => d.id === "deck-old-1")).toBe(true);
    expect(useAppStore.getState().settings.newCards).toBe(25);
    expect(
      useReviewStore.getState().srsCards["deck-old-1"]?.["card-old-1"]?.repetitions,
    ).toBe(3);

    // IndexedDB terisolasi milik A berisi seluruh salinan terverifikasi
    const cardsA = await getCards("deck-old-1");
    expect(cardsA.map((c) => c.word)).toEqual(["記憶"]);
    expect(await deckDexie.reviewLogs.count()).toBe(2);
    expect(await lexiconDb.books.count()).toBe(1);
    expect(await lexiconDb.bookFiles.count()).toBe(1);
    expect(await lexiconDb.dictionaries.count()).toBe(1);
    expect(await lexiconDb.terms.count()).toBe(2);
    expect(await lexiconDb.tags.count()).toBe(1);
    expect(await lexiconDb.termMeta.count()).toBe(1);
    expect(await lexiconDb.ocrCache.count()).toBe(1);
    expect(await questionPackDb.packs.count()).toBe(1);

    // Cadangan data lama di perangkat TIDAK dihapus pada B1
    expect(localStorage.getItem(LEGACY_APP_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(LEGACY_REVIEW_STORAGE_KEY)).toBeTruthy();
    const checkLegacyDeck = new DeckDatabase(LEGACY_DECK_DB_NAME);
    const checkLegacyLex = new LexiconDatabase(LEGACY_LEXICON_DB_NAME);
    expect(await checkLegacyDeck.reviewLogs.count()).toBe(2);
    expect(await checkLegacyLex.books.count()).toBe(1);
    checkLegacyDeck.close();
    checkLegacyLex.close();

    // Saat Akun A masuk lagi atau Akun B masuk -> tidak lagi ditawari adopsi dan B tetap kosong
    expect(await shouldPromptLegacyAdoption(USER_A)).toBeNull();
    expect(await shouldPromptLegacyAdoption(USER_B)).toBeNull();

    await switchUserStorageScope(USER_B);
    expect(useAppStore.getState().decks.some((d) => d.id === "deck-old-1")).toBe(false);
    expect(await getCards("deck-old-1")).toEqual([]);
    expect(await lexiconDb.books.count()).toBe(0);
  });

  it("tahan terhadap galat di tengah proses (resumable retry) tanpa menulis marker palsu ataupun menggandakan reviewLogs/terms/ocrCache", async () => {
    await seedLegacyBrowserData();
    initUserStorageScopeSync({ lockUnauthenticated: true });
    await switchUserStorageScope(USER_A);

    await expect(
      adoptLegacyDataForUser(USER_A, {
        onBeforeMarkAdopted: () => {
          throw new Error("Kegagalan simulasi sebelum penanda");
        },
      }),
    ).rejects.toThrow("Kegagalan simulasi");

    // Marker belum boleh tertulis saat gagal
    expect(getLegacyAdoptedBy()).toBeNull();

    // Ulangi adopsi hingga selesai: tidak boleh ada duplikasi
    const retryRes = await adoptLegacyDataForUser(USER_A);
    expect(retryRes.copiedReviewLogs).toBe(0); // sudah tersalin pada percobaan pertama
    expect(getLegacyAdoptedBy()).toBe(USER_A);
    expect(await deckDexie.reviewLogs.count()).toBe(2);
    expect(await lexiconDb.dictionaries.count()).toBe(1);
    expect(await lexiconDb.terms.count()).toBe(2);
    expect(await lexiconDb.ocrCache.count()).toBe(1);
  });

  it("menghormati opsi Nanti (sementara per sesi) dan Mulai kosong (menolak permanen tanpa bocor ke akun baru)", async () => {
    await seedLegacyBrowserData();
    initUserStorageScopeSync({ lockUnauthenticated: true });
    await switchUserStorageScope(USER_A);

    // Pilih Nanti -> ditunda hanya dalam sesi saat ini
    deferLegacyForSession(USER_A);
    expect(await shouldPromptLegacyAdoption(USER_A)).toBeNull();

    // Sesi baru -> muncul lagi
    resetLegacyAdoptionSessionForTest();
    expect(await shouldPromptLegacyAdoption(USER_A)).not.toBeNull();

    // Pilih Mulai kosong -> ditandai declined untuk A & tidak menyalin data apa pun
    markLegacyDeclinedForUser(USER_A);
    expect(await shouldPromptLegacyAdoption(USER_A)).toBeNull();
    expect(localStorage.getItem(getScopedKey(LEGACY_APP_STORAGE_KEY, USER_A))).toBeNull();
    expect(useAppStore.getState().decks.some((d) => d.id === "deck-old-1")).toBe(false);
    expect(localStorage.getItem(LEGACY_ADOPTED_BY_KEY)).toBeNull();
  });
});
