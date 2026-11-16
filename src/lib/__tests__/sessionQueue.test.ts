import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buildSessionQueue, selectLearnMoreBatch } from "../sessionQueue";
import { aggregateParentStats } from "../deckSubdecks";
import type { StoredCard } from "../deckDb";
import { clearAllReviewLogs } from "../deckDb";
import { useAppStore, limitsFor, orderNewCards, type DeckItem, type NewCardOrder } from "../../store/useAppStore";
import { newCardsLeftToday, useReviewStore } from "../../store/useReviewStore";
import { isDue, type SRSCard } from "../srs";

function makeCard(id: string, deckId: string): StoredCard {
  return {
    id,
    deckId,
    word: `語-${id}`,
    reading: `ご-${id}`,
    meaning: `arti ${id}`,
    sentence: "",
    translation: "",
    subdeck: deckId,
    tags: [],
  };
}

function makeDeck(overrides: Partial<DeckItem> & { id: string }): DeckItem {
  return {
    title: overrides.id,
    level: "N5 • Core",
    kind: "Core",
    due: 0,
    total: 0,
    progress: 0,
    kanji: "札",
    color: "indigo",
    updated: "Hari ini",
    source: "manual",
    ...overrides,
  };
}

describe("Bug 1 — buildSessionQueue & selectLearnMoreBatch per sub-deck", () => {
  const day1 = new Date(2026, 4, 10, 12, 0, 0, 0).getTime();
  const day2BeforeRollover = new Date(2026, 4, 11, 3, 30, 0, 0).getTime();
  const day2AfterRollover = new Date(2026, 4, 11, 4, 5, 0, 0).getTime();

  beforeEach(async () => {
    useAppStore.getState().updateSettings({
      newCards: 10,
      maxReview: 120,
      dayStartHour: 4,
      desiredRetention: 0.9,
      newOrder: "urutan",
    });
    useAppStore.setState({ deckLimits: {} });
    useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} });
    await clearAllReviewLogs();
  });

  it("melayani limitA + limitB kartu baru pada parent deck dengan dua sub-deck berbatas berbeda", () => {
    const cardsA = Array.from({ length: 10 }, (_, i) => makeCard(`a-${i + 1}`, "sub-a"));
    const cardsB = Array.from({ length: 10 }, (_, i) => makeCard(`b-${i + 1}`, "sub-b"));
    const allCards = [...cardsA, ...cardsB];

    const settings = {
      newCards: 5,
      maxReview: 120,
      dayStartHour: 4,
      newOrder: "urutan" as NewCardOrder,
    };
    const deckLimits = {
      "sub-a": { newCards: 2 },
      "sub-b": { newCards: 4 },
    };

    const queue = buildSessionQueue({
      cards: allCards,
      srsCards: {},
      newIntroduced: {},
      settings,
      deckLimits,
      rootDeckId: "parent",
      now: day1,
    });

    expect(queue).toHaveLength(6); // 2 dari sub-a + 4 dari sub-b, bukan batas tunggal parent (5)
    expect(queue.filter((c) => c.deckId === "sub-a").map((c) => c.id)).toEqual(["a-1", "a-2"]);
    expect(queue.filter((c) => c.deckId === "sub-b").map((c) => c.id)).toEqual([
      "b-1",
      "b-2",
      "b-3",
      "b-4",
    ]);
  });

  it("menolak serving kartu baru lagi di hari belajar yang sama setelah dinilai, lalu reset di hari belajar berikutnya", () => {
    const cardsA = Array.from({ length: 8 }, (_, i) => makeCard(`a-${i + 1}`, "sub-a"));
    const cardsB = Array.from({ length: 8 }, (_, i) => makeCard(`b-${i + 1}`, "sub-b"));
    const allCards = [...cardsA, ...cardsB];

    const settings = {
      newCards: 5,
      maxReview: 120,
      dayStartHour: 4,
      newOrder: "urutan" as NewCardOrder,
    };
    const deckLimits = {
      "sub-a": { newCards: 2 },
      "sub-b": { newCards: 3 },
    };

    const firstQueue = buildSessionQueue({
      cards: allCards,
      srsCards: useReviewStore.getState().srsCards,
      newIntroduced: useReviewStore.getState().newIntroduced,
      settings,
      deckLimits,
      rootDeckId: "parent",
      now: day1,
    });
    expect(firstQueue).toHaveLength(5);

    for (const c of firstQueue) {
      useReviewStore.getState().reviewCardAction(c.deckId || "parent", c.id, 4, {
        now: day1,
        fuzz: false,
        dayStartHour: 4,
      });
    }

    // Masuk ulang di hari belajar yang sama -> 0 kartu baru
    const sameDayRebuild = buildSessionQueue({
      cards: allCards,
      srsCards: useReviewStore.getState().srsCards,
      newIntroduced: useReviewStore.getState().newIntroduced,
      settings,
      deckLimits,
      rootDeckId: "parent",
      now: day2BeforeRollover,
    });
    expect(sameDayRebuild).toHaveLength(0);

    // Setelah melewati dayStartHour (04:00) ke hari belajar berikutnya -> kuota penuh 2 + 3 lagi
    const nextDayQueue = buildSessionQueue({
      cards: allCards,
      srsCards: useReviewStore.getState().srsCards,
      newIntroduced: useReviewStore.getState().newIntroduced,
      settings,
      deckLimits,
      rootDeckId: "parent",
      now: day2AfterRollover,
    });
    const nextNewCards = nextDayQueue.filter(
      (c) => !useReviewStore.getState().srsCards[c.deckId]?.[c.id],
    );
    expect(nextNewCards).toHaveLength(5);
    expect(nextNewCards.filter((c) => c.deckId === "sub-a")).toHaveLength(2);
    expect(nextNewCards.filter((c) => c.deckId === "sub-b")).toHaveLength(3);
  });

  it("Pelajari lebih +5 menambah kuota per sub-deck sumber dan tidak disajikan ulang setelah dinilai", () => {
    const cardsA = Array.from({ length: 4 }, (_, i) => makeCard(`a-${i + 1}`, "sub-a"));
    const cardsB = Array.from({ length: 6 }, (_, i) => makeCard(`b-${i + 1}`, "sub-b"));
    const allCards = [...cardsA, ...cardsB];

    const settings = {
      newCards: 2,
      maxReview: 120,
      dayStartHour: 4,
      newOrder: "urutan" as NewCardOrder,
    };

    // Awal hari: 2 dari sub-a (a-1, a-2) + 2 dari sub-b (b-1, b-2)
    const initialQueue = buildSessionQueue({
      cards: allCards,
      srsCards: useReviewStore.getState().srsCards,
      newIntroduced: useReviewStore.getState().newIntroduced,
      settings,
      deckLimits: {},
      rootDeckId: "parent",
      now: day1,
    });
    expect(initialQueue).toHaveLength(4);

    for (const c of initialQueue) {
      useReviewStore.getState().reviewCardAction(c.deckId, c.id, 4, {
        now: day1,
        fuzz: false,
        dayStartHour: 4,
      });
    }

    // Sisa unlearned: 2 kartu di sub-a (a-3, a-4) dan 4 kartu di sub-b (b-3..b-6)
    const { srsCards } = useReviewStore.getState();
    const remainingUnlearned = allCards.filter((c) => !srsCards[c.deckId]?.[c.id]);

    // Pelajari lebih +5 -> harus mengambil a-3, a-4 (2 dari sub-a) + b-3, b-4, b-5 (3 dari sub-b)
    const { batch, extraByGroup } = selectLearnMoreBatch({
      remainingUnlearned,
      amount: 5,
      rootDeckId: "parent",
      settings,
      now: day1,
    });
    expect(batch.map((c) => c.id)).toEqual(["a-3", "a-4", "b-3", "b-4", "b-5"]);
    expect(extraByGroup).toEqual({ "sub-a": 2, "sub-b": 3 });

    for (const [groupId, extra] of Object.entries(extraByGroup)) {
      useReviewStore.getState().addExtraNewToday(groupId, extra, day1, 4);
    }

    // Sebelum dinilai, membuka ulang sesi melayani tepat 5 kartu ekstra tadi
    const beforeGradingExtra = buildSessionQueue({
      cards: allCards,
      srsCards: useReviewStore.getState().srsCards,
      newIntroduced: useReviewStore.getState().newIntroduced,
      settings,
      deckLimits: {},
      rootDeckId: "parent",
      now: day1,
    });
    expect(beforeGradingExtra.map((c) => c.id)).toEqual(["a-3", "a-4", "b-3", "b-4", "b-5"]);

    // Setelah ke-5 kartu ekstra dinilai, rebuild kedua menghasilkan 0 kartu baru
    for (const c of batch) {
      useReviewStore.getState().reviewCardAction(c.deckId, c.id, 4, {
        now: day1,
        fuzz: false,
        dayStartHour: 4,
      });
    }
    const afterGradingExtra = buildSessionQueue({
      cards: allCards,
      srsCards: useReviewStore.getState().srsCards,
      newIntroduced: useReviewStore.getState().newIntroduced,
      settings,
      deckLimits: {},
      rootDeckId: "parent",
      now: day1,
    });
    expect(afterGradingExtra).toHaveLength(0);
  });

  it("jumlah kartu baru antrean sesi parent sama persis dengan aggregateParentStats().newToday", () => {
    const cardsA = Array.from({ length: 7 }, (_, i) => makeCard(`a-${i + 1}`, "sub-a"));
    const cardsB = Array.from({ length: 5 }, (_, i) => makeCard(`b-${i + 1}`, "sub-b"));
    const cardsC = Array.from({ length: 4 }, (_, i) => makeCard(`c-${i + 1}`, "sub-c"));
    const allCards = [...cardsA, ...cardsB, ...cardsC];

    const parent = makeDeck({
      id: "parent",
      total: 16,
      subdeckIds: ["mid", "sub-c"],
    });
    const mid = makeDeck({
      id: "mid",
      parentId: "parent",
      total: 12,
      subdeckIds: ["sub-a", "sub-b"],
    });
    const subA = makeDeck({ id: "sub-a", parentId: "mid", total: 7 });
    const subB = makeDeck({ id: "sub-b", parentId: "mid", total: 5 });
    const subC = makeDeck({ id: "sub-c", parentId: "parent", total: 4 });
    const allDecks = [parent, mid, subA, subB, subC];

    const settings = {
      newCards: 4,
      maxReview: 120,
      dayStartHour: 4,
      newOrder: "acak" as NewCardOrder,
    };
    const deckLimits = {
      "sub-a": { newCards: 3 },
      "sub-b": { newCards: 10 }, // > 5 total cards, hanya 5 tersedia (1 sudah dipelajari -> 4 tersisa)
    };
    const srsCards: Record<string, Record<string, SRSCard>> = {
      "sub-b": {
        "b-1": { id: "b-1", easeFactor: 2.5, interval: 5, repetitions: 2, nextReview: day1 + 86_400_000 },
      },
    };
    const newIntroduced = {
      "sub-a": { date: "2026-05-10", count: 1 }, // sisa limit sub-a = 2
    };

    const stats = aggregateParentStats(
      parent,
      [mid, subC],
      srsCards,
      newIntroduced,
      settings,
      allDecks,
      day1,
      deckLimits,
    );

    const queue = buildSessionQueue({
      cards: allCards,
      srsCards,
      newIntroduced,
      settings,
      deckLimits,
      rootDeckId: parent.id,
      now: day1,
    });

    // sub-a: 2 + sub-b: 4 (sisa unlearned 4 < limit 10) + sub-c: 4 = 10
    expect(stats.newToday).toBe(10);
    expect(queue).toHaveLength(stats.newToday);
  });

  it("regresi deck tunggal tanpa sub-deck menghasilkan antrean identik dengan logika lama", () => {
    const deckId = "plain-deck";
    const cards = Array.from({ length: 12 }, (_, i) => makeCard(`p-${i + 1}`, deckId));
    const srsCards: Record<string, Record<string, SRSCard>> = {
      [deckId]: {
        "p-1": { id: "p-1", easeFactor: 2.5, interval: 1, repetitions: 1, nextReview: day1 - 2000 },
        "p-2": { id: "p-2", easeFactor: 2.5, interval: 1, repetitions: 1, nextReview: day1 - 5000 },
        "p-3": { id: "p-3", easeFactor: 2.5, interval: 6, repetitions: 2, nextReview: day1 + 86_400_000 },
      },
    };
    const newIntroduced = {
      [deckId]: { date: "2026-05-10", count: 2 },
    };
    const settings = {
      newCards: 6,
      maxReview: 1,
      dayStartHour: 4,
      newOrder: "acak" as NewCardOrder,
    };
    const deckLimits = { [deckId]: { newCards: 5, maxReview: 1 } };

    // Logika lama (hanya satu deck tunggal)
    const oldLimits = limitsFor(deckId, settings, deckLimits);
    const oldDue = cards
      .filter((c) => {
        const sc = srsCards[deckId]?.[c.id];
        return sc && isDue(sc, day1);
      })
      .sort((a, b) => (srsCards[deckId][a.id]?.nextReview ?? 0) - (srsCards[deckId][b.id]?.nextReview ?? 0))
      .slice(0, oldLimits.maxReview);
    const oldUnlearned = cards.filter((c) => !srsCards[deckId]?.[c.id]);
    const oldOrdered = orderNewCards(oldUnlearned, deckId, settings.newOrder, day1, settings.dayStartHour);
    const oldFresh = oldOrdered.slice(
      0,
      newCardsLeftToday(newIntroduced[deckId], oldLimits.newCards, day1, settings.dayStartHour),
    );
    const expectedOldQueue = [...oldDue, ...oldFresh];

    const newQueue = buildSessionQueue({
      cards,
      srsCards,
      newIntroduced,
      settings,
      deckLimits,
      rootDeckId: deckId,
      now: day1,
    });

    expect(newQueue).toEqual(expectedOldQueue);
    expect(newQueue.map((c) => c.id)).toHaveLength(4); // 1 due (p-2) + 3 fresh (5 - 2 = 3)
    expect(newQueue[0].id).toBe("p-2");
  });
});
