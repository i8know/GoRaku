import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import { newCardsLeftToday, reviewedToday, useReviewStore } from "../useReviewStore";
import { forecast, liveDeckStats } from "../../lib/deckStats";
import type { DeckItem } from "../useAppStore";

const DAY_MS = 24 * 60 * 60 * 1000;

function makeDeck(overrides: Partial<DeckItem> = {}): DeckItem {
  return {
    id: "deck-test",
    title: "Deck Uji",
    level: "N5 • Core",
    kind: "Core",
    due: 0,
    total: 20,
    progress: 0,
    kanji: "試",
    color: "indigo",
    updated: "Hari ini",
    source: "manual",
    ...overrides,
  };
}

describe("Tahap 0 — Dokumentasi perilaku useReviewStore & deckStats saat ini", () => {
  const memStore = new Map<string, string>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 10, 10, 0, 0, 0)); // 10 Mei 2026 10:00 waktu lokal
    memStore.clear();
    useReviewStore.persist.setOptions({
      storage: createJSONStorage(() => ({
        getItem: (name) => memStore.get(name) ?? null,
        setItem: (name, value) => {
          memStore.set(name, value);
        },
        removeItem: (name) => {
          memStore.delete(name);
        },
      })),
    });
    useReviewStore.setState({
      srsCards: {},
      newIntroduced: {},
      activity: {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("newCardsLeftToday berkurang saat kartu baru dinilai dan reset di hari berikutnya", () => {
    const deckId = "deck-1";
    const limit = 5;

    expect(newCardsLeftToday(useReviewStore.getState().newIntroduced[deckId], limit)).toBe(5);

    // Nilai 2 kartu baru
    useReviewStore.getState().reviewCardAction(deckId, "c1", 4);
    useReviewStore.getState().reviewCardAction(deckId, "c2", 4);

    expect(newCardsLeftToday(useReviewStore.getState().newIntroduced[deckId], limit)).toBe(3);
    expect(reviewedToday(useReviewStore.getState().activity[deckId])).toBe(2);

    // Menilai ulang kartu yang sudah ada di srsCards tidak mengurangi jatah kartu baru
    useReviewStore.getState().reviewCardAction(deckId, "c1", 4);
    expect(newCardsLeftToday(useReviewStore.getState().newIntroduced[deckId], limit)).toBe(3);
    expect(reviewedToday(useReviewStore.getState().activity[deckId])).toBe(3);

    // Pindah ke hari berikutnya
    vi.setSystemTime(new Date(2026, 4, 11, 9, 0, 0, 0));
    expect(newCardsLeftToday(useReviewStore.getState().newIntroduced[deckId], limit)).toBe(5);
    expect(reviewedToday(useReviewStore.getState().activity[deckId])).toBe(0);
  });

  it("reviewCardAction + restoreCardState (Undo) mengembalikan kartu baru maupun kartu lama beserta newIntroduced dan activity", () => {
    const deckId = "deck-undo";

    // 1. Kartu baru dinilai -> lalu di-Undo
    useReviewStore.getState().reviewCardAction(deckId, "c-new", 4);
    expect(useReviewStore.getState().srsCards[deckId]?.["c-new"]).toBeDefined();
    expect(useReviewStore.getState().newIntroduced[deckId]?.count).toBe(1);
    expect(useReviewStore.getState().activity[deckId]?.count).toBe(1);

    useReviewStore.getState().restoreCardState(deckId, "c-new", undefined, true);
    expect(useReviewStore.getState().srsCards[deckId]?.["c-new"]).toBeUndefined();
    expect(useReviewStore.getState().newIntroduced[deckId]?.count).toBe(0);
    expect(useReviewStore.getState().activity[deckId]?.count).toBe(0);

    // 2. Kartu sudah ada dinilai -> lalu di-Undo
    const firstPass = useReviewStore.getState().reviewCardAction(deckId, "c-existing", 4);
    const snapshotBeforeSecond = { ...firstPass };

    useReviewStore.getState().reviewCardAction(deckId, "c-existing", 5);
    expect(useReviewStore.getState().srsCards[deckId]?.["c-existing"]?.repetitions).toBe(2);
    expect(useReviewStore.getState().newIntroduced[deckId]?.count).toBe(1);
    expect(useReviewStore.getState().activity[deckId]?.count).toBe(2);

    useReviewStore.getState().restoreCardState(deckId, "c-existing", snapshotBeforeSecond, false);
    expect(useReviewStore.getState().srsCards[deckId]?.["c-existing"]).toEqual(snapshotBeforeSecond);
    expect(useReviewStore.getState().newIntroduced[deckId]?.count).toBe(1);
    expect(useReviewStore.getState().activity[deckId]?.count).toBe(1);
  });

  it("liveDeckStats dan forecast menghitung kartu jatuh tempo, kuota baru hari ini, kartu dikuasai, dan jadwal 7 hari", () => {
    const deck = makeDeck({ id: "d-stats", total: 10 });
    const now = Date.now();

    useReviewStore.getState().importSchedule("d-stats", [
      // Jatuh tempo hari ini & sudah dewasa (repetitions >= 3)
      { id: "c1", easeFactor: 2.5, interval: 21, repetitions: 3, nextReview: now - 1000 },
      // Jatuh tempo besok (+1 hari), masih belajar
      { id: "c2", easeFactor: 2.5, interval: 1, repetitions: 1, nextReview: now + 1 * DAY_MS },
      // Jatuh tempo +3 hari, sudah dewasa (interval >= 21)
      { id: "c3", easeFactor: 2.5, interval: 25, repetitions: 2, nextReview: now + 3 * DAY_MS },
    ]);

    // 1 kartu baru sudah dipelajari hari ini dari batas 5 -> sisa 4 kartu baru hari ini
    const todayStr = new Date().toDateString();
    useReviewStore.setState((s) => ({
      ...s,
      newIntroduced: { "d-stats": { date: todayStr, count: 1 } },
    }));

    const st = liveDeckStats(
      deck,
      useReviewStore.getState().srsCards["d-stats"],
      useReviewStore.getState().newIntroduced["d-stats"],
      { newCards: 5, maxReview: 100 },
    );

    expect(st.reviewDue).toBe(1); // c1
    expect(st.newTotal).toBe(7); // 10 total - 3 di srsCards
    expect(st.newToday).toBe(4); // limit 5 - 1 used
    expect(st.due).toBe(5); // 1 reviewDue + 4 newToday
    expect(st.learned).toBe(2); // c1 & c3
    expect(st.learning).toBe(1); // c2
    expect(st.progress).toBe(20); // 2 / 10 = 20%

    const fc = forecast([useReviewStore.getState().srsCards["d-stats"]], 7);
    expect(fc).toEqual([1, 1, 0, 1, 0, 0, 0]);
  });

  it("memigrasikan data lama tanpa version ke version 1 tanpa kehilangan state", async () => {
    const legacyPayload = {
      state: {
        srsCards: {
          "deck-legacy": {
            "card-1": {
              id: "card-1",
              easeFactor: 2.5,
              interval: 6,
              repetitions: 2,
              nextReview: 1778400000000,
            },
          },
        },
        newIntroduced: {
          "deck-legacy": { date: "Sun May 10 2026", count: 4 },
        },
        activity: {
          "deck-legacy": { last: 1778390000000, date: "Sun May 10 2026", count: 9 },
        },
      },
      // Tidak ada field `version` (data sebelum Tahap 0)
    };

    memStore.set("japanese-review-storage", JSON.stringify(legacyPayload));
    await useReviewStore.persist.rehydrate();

    const state = useReviewStore.getState();
    expect( useReviewStore.persist.getOptions().version ).toBe(1);
    expect(state.srsCards["deck-legacy"]?.["card-1"]).toEqual({
      id: "card-1",
      easeFactor: 2.5,
      interval: 6,
      repetitions: 2,
      nextReview: 1778400000000,
    });
    expect(state.newIntroduced["deck-legacy"]).toEqual({
      date: "Sun May 10 2026",
      count: 4,
    });
    expect(state.activity["deck-legacy"]).toEqual({
      last: 1778390000000,
      date: "Sun May 10 2026",
      count: 9,
    });
  });
});
