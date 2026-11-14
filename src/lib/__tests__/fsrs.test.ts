import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { Rating, State } from "ts-fsrs";
import { initCard, isDue, type SRSCard } from "../srs";
import {
  legacyToFsrs,
  previewIntervals,
  qualityToRating,
  scheduleReview,
} from "../fsrsScheduler";
import {
  forecast,
  forecastNew,
  isMature,
  limitsFor,
  liveDeckStats,
  orderNewCards,
} from "../deckStats";
import { aggregateParentStats } from "../deckSubdecks";
import {
  clearAllReviewLogs,
  flushReviewLogs,
  getAllReviewLogs,
  getCardReviewLogs,
} from "../deckDb";
import {
  exportScheduleBackup,
  exportScheduleBackupJson,
  importScheduleBackup,
} from "../scheduleBackup";
import { useAppStore, type DeckItem } from "../../store/useAppStore";
import { newCardsLeftToday, useReviewStore } from "../../store/useReviewStore";

describe("FSRS scheduler & lazy SM-2 migration (Tahap 2)", () => {
  beforeEach(async () => {
    useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} });
    useAppStore.getState().updateSettings({
      newCards: 10,
      maxReview: 100,
      dayStartHour: 4,
      desiredRetention: 0.9,
    });
    await clearAllReviewLogs();
    await flushReviewLogs();
  });

  it("orders new card intervals monotonically: Again <= Hard <= Good <= Easy", () => {
    const now = new Date(2026, 4, 10, 12, 0, 0, 0);
    const fresh = initCard("c-new", now);

    const again = scheduleReview(fresh, Rating.Again, now, { fuzz: false }).card;
    const hard = scheduleReview(fresh, Rating.Hard, now, { fuzz: false }).card;
    const good = scheduleReview(fresh, Rating.Good, now, { fuzz: false }).card;
    const easy = scheduleReview(fresh, Rating.Easy, now, { fuzz: false }).card;

    expect(again.interval).toBeGreaterThanOrEqual(1);
    expect(again.interval).toBeLessThanOrEqual(hard.interval);
    expect(hard.interval).toBeLessThanOrEqual(good.interval);
    expect(good.interval).toBeLessThanOrEqual(easy.interval);

    const previews = previewIntervals(fresh, now, { desiredRetention: 0.9 });
    expect(previews).toEqual({
      [Rating.Again]: again.interval,
      [Rating.Hard]: hard.interval,
      [Rating.Good]: good.interval,
      [Rating.Easy]: easy.interval,
    });
  });

  it("decreases stability and increments lapses when a reviewed card is graded Lupa (Again)", () => {
    const day0 = new Date(2026, 4, 1, 10, 0, 0, 0);
    let card = scheduleReview(initCard("c-lapse", day0), Rating.Good, day0, {
      fuzz: false,
    }).card;

    const day1 = new Date(card.nextReview + 6 * 3600_000);
    card = scheduleReview(card, Rating.Good, day1, { fuzz: false }).card;

    const stabilityBeforeLapse = card.stability ?? 0;
    const lapsesBefore = card.lapses ?? 0;
    expect(stabilityBeforeLapse).toBeGreaterThan(1);

    const day2 = new Date(card.nextReview + 6 * 3600_000);
    const afterLapse = scheduleReview(card, Rating.Again, day2, {
      fuzz: false,
    }).card;

    expect(afterLapse.lapses).toBe(lapsesBefore + 1);
    expect(afterLapse.stability ?? 0).toBeLessThan(stabilityBeforeLapse);
    expect(afterLapse.interval).toBeGreaterThanOrEqual(1);
  });

  it("produces shorter intervals at desiredRetention 0.97 than at 0.80", () => {
    const day0 = new Date(2026, 4, 1, 9, 0, 0, 0);
    const seed = scheduleReview(initCard("c-ret", day0), Rating.Good, day0, {
      fuzz: false,
      desiredRetention: 0.9,
    }).card;
    const reviewTime = new Date(seed.nextReview + 4 * 3600_000);

    const highRetention = scheduleReview(seed, Rating.Good, reviewTime, {
      fuzz: false,
      desiredRetention: 0.97,
    }).card;
    const lowRetention = scheduleReview(seed, Rating.Good, reviewTime, {
      fuzz: false,
      desiredRetention: 0.8,
    }).card;

    expect(highRetention.interval).toBeLessThan(lowRetention.interval);
  });

  it("converts legacy SM-2 cards monotonically with difficulty in [1, 10]", () => {
    const now = new Date(2026, 4, 10, 12, 0, 0, 0);
    const eases = [1.3, 1.6, 2.0, 2.5, 2.8, 3.2];
    const difficulties = eases.map((easeFactor) => {
      const legacy: SRSCard = {
        id: `legacy-${easeFactor}`,
        easeFactor,
        interval: 12,
        repetitions: 3,
        nextReview: now.getTime(),
      };
      const converted = legacyToFsrs(legacy, now);
      expect(converted.difficulty).toBeGreaterThanOrEqual(1);
      expect(converted.difficulty).toBeLessThanOrEqual(10);
      expect(converted.stability).toBe(12);
      expect(converted.state).toBe(State.Review);
      return converted.difficulty;
    });

    for (let i = 1; i < difficulties.length; i++) {
      expect(difficulties[i]).toBeLessThanOrEqual(difficulties[i - 1]);
    }

    // Never-passed card is treated as State.New
    const unlearnedLegacy: SRSCard = {
      id: "legacy-new",
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: now.getTime(),
    };
    const convertedNew = legacyToFsrs(unlearnedLegacy, now);
    expect(convertedNew.state).toBe(State.New);
    expect(convertedNew.stability).toBe(0);
  });

  it("survives JSON.parse(JSON.stringify(card)) round-trip and can be scheduled again", () => {
    const t0 = new Date(2026, 4, 10, 15, 0, 0, 0);
    const first = scheduleReview(initCard("c-json", t0), Rating.Good, t0, {
      fuzz: false,
    }).card;

    const deserialized: SRSCard = JSON.parse(JSON.stringify(first));
    expect(typeof deserialized.nextReview).toBe("number");
    expect(typeof deserialized.lastReview).toBe("number");
    expect(deserialized.scheduler).toBe("fsrs");

    const t1 = new Date(deserialized.nextReview + 2 * 3600_000);
    expect(isDue(deserialized, t1)).toBe(true);

    const second = scheduleReview(deserialized, Rating.Good, t1, {
      fuzz: false,
    }).card;
    expect(second.reps).toBe(2);
    expect(second.repetitions).toBe(2);
    expect(second.interval).toBeGreaterThanOrEqual(first.interval);
  });

  it("grades imported .apkg legacy cards (without FSRS fields) and updates isMature correctly", () => {
    const now = new Date(2026, 4, 10, 10, 0, 0, 0);
    const apkgImportedCard: SRSCard = {
      id: "apkg-1",
      easeFactor: 2.5,
      interval: 15,
      repetitions: 2,
      nextReview: now.getTime() - 3600_000,
    };

    expect(apkgImportedCard.scheduler).toBeUndefined();
    expect(isMature(apkgImportedCard)).toBe(false);

    const { card: upgraded } = scheduleReview(
      apkgImportedCard,
      Rating.Good,
      now,
      {
        fuzz: false,
      },
    );
    expect(upgraded.scheduler).toBe("fsrs");
    expect(upgraded.stability).toBeGreaterThan(21);
    expect(isMature(upgraded)).toBe(true);
  });

  it("supports in-session drill (no FSRS state change, no lapses/activity/log) and Undo for both normal & drill", async () => {
    const deckId = "deck-drill";
    const cardId = "card-1";

    // 1. First grading (Lupa / Again) -> schedules card, increments newIntroduced & activity, writes 1 log
    const afterAgain = useReviewStore
      .getState()
      .reviewCardAction(deckId, cardId, 0);
    await flushReviewLogs();

    expect(afterAgain.scheduler).toBe("fsrs");
    expect(useReviewStore.getState().newIntroduced[deckId]?.count).toBe(1);
    const logsAfterFirst = await getCardReviewLogs(cardId, deckId);
    expect(logsAfterFirst).toHaveLength(1);
    expect(logsAfterFirst[0].rating).toBe(qualityToRating(0));

    expect(useReviewStore.getState().activity[deckId]?.count).toBe(1);

    // 2. Second grading in same session with drill: true -> does NOT alter FSRS state, lapses, activity, or logs
    const snapshotBeforeDrill = {
      ...useReviewStore.getState().srsCards[deckId][cardId],
    };
    const afterDrill = useReviewStore
      .getState()
      .reviewCardAction(deckId, cardId, 4, { drill: true });
    await flushReviewLogs();

    expect(afterDrill).toEqual(snapshotBeforeDrill);
    expect(useReviewStore.getState().srsCards[deckId][cardId]).toEqual(
      snapshotBeforeDrill,
    );
    expect(useReviewStore.getState().activity[deckId]?.count).toBe(1);
    expect(await getCardReviewLogs(cardId, deckId)).toHaveLength(1);

    // 3. Undo the drill grading -> keeps card state and reviewLogs intact
    useReviewStore
      .getState()
      .restoreCardState(deckId, cardId, snapshotBeforeDrill, false, {
        drill: true,
      });
    await flushReviewLogs();
    expect(useReviewStore.getState().srsCards[deckId][cardId]).toEqual(
      snapshotBeforeDrill,
    );
    expect(useReviewStore.getState().activity[deckId]?.count).toBe(1);
    expect(await getCardReviewLogs(cardId, deckId)).toHaveLength(1);

    // 4. Undo the initial normal grading -> removes card, decrements newIntroduced & activity, deletes log
    useReviewStore.getState().restoreCardState(deckId, cardId, undefined, true);
    await flushReviewLogs();
    expect(useReviewStore.getState().srsCards[deckId]?.[cardId]).toBeUndefined();
    expect(useReviewStore.getState().newIntroduced[deckId]?.count).toBe(0);
    expect(useReviewStore.getState().activity[deckId]?.count ?? 0).toBe(0);
    expect(await getCardReviewLogs(cardId, deckId)).toHaveLength(0);

    // 5. forgetCards and removeDeck clean up reviewLogs
    useReviewStore.getState().reviewCardAction(deckId, cardId, 4);
    useReviewStore.getState().reviewCardAction(deckId, "card-2", 5);
    await flushReviewLogs();
    expect(await getAllReviewLogs()).toHaveLength(2);

    useReviewStore.getState().forgetCards(deckId, [cardId]);
    await flushReviewLogs();
    expect(await getCardReviewLogs(cardId, deckId)).toHaveLength(0);
    expect(await getAllReviewLogs()).toHaveLength(1);

    useReviewStore.getState().removeDeck(deckId);
    await flushReviewLogs();
    expect(await getAllReviewLogs()).toHaveLength(0);
  });

  it("Tahap 3: applies per-deck limits override in limitsFor, liveDeckStats, and aggregateParentStats, and falls back to global", () => {
    const globalSettings = { newCards: 15, maxReview: 120, dayStartHour: 4 };
    useAppStore.getState().updateSettings(globalSettings);
    useAppStore.getState().setDeckLimits("deck-custom", null);

    const deckA: DeckItem = {
      id: "deck-custom",
      title: "Custom Deck",
      sub: "Sub",
      level: "N3",
      kind: "Kosakata",
      total: 40,
      due: 0,
      newToday: 15,
      color: "#335",
      kanji: "語",
      progress: 0,
    };
    const deckB: DeckItem = {
      ...deckA,
      id: "deck-default",
      title: "Default Deck",
    };

    // Fallback to global when no override exists
    expect(limitsFor("deck-custom", globalSettings)).toEqual({
      newCards: 15,
      maxReview: 120,
    });

    // Apply per-deck override
    useAppStore
      .getState()
      .setDeckLimits("deck-custom", { newCards: 7, maxReview: 45 });
    expect(limitsFor("deck-custom", globalSettings)).toEqual({
      newCards: 7,
      maxReview: 45,
    });
    expect(limitsFor("deck-default", globalSettings)).toEqual({
      newCards: 15,
      maxReview: 120,
    });

    // liveDeckStats respects per-deck override
    const statsCustom = liveDeckStats(deckA, {}, undefined, globalSettings);
    const statsDefault = liveDeckStats(deckB, {}, undefined, globalSettings);
    expect(statsCustom.newToday).toBe(7);
    expect(statsDefault.newToday).toBe(15);

    // aggregateParentStats sums leaf decks using each leaf's limitsFor
    const parentDeck: DeckItem = {
      ...deckA,
      id: "deck-parent",
      title: "Parent",
      total: 80,
    };
    const agg = aggregateParentStats(
      parentDeck,
      [deckA, deckB],
      {},
      {},
      globalSettings,
    );
    expect(agg.newToday).toBe(7 + 15);

    // Resetting override falls back to global
    useAppStore.getState().setDeckLimits("deck-custom", null);
    expect(limitsFor("deck-custom", globalSettings)).toEqual({
      newCards: 15,
      maxReview: 120,
    });
  });

  it("Tahap 3: orders new cards deterministically per studyDayKey + deckId when newOrder is 'acak'", () => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      id: `card-${i + 1}`,
    }));

    const morningSameDay = new Date(2026, 4, 10, 9, 0, 0, 0);
    const lateNightSameStudyDay = new Date(2026, 4, 11, 2, 30, 0, 0); // 02:30 before dayStartHour=4 is still May 10 study day
    const nextStudyDay = new Date(2026, 4, 11, 8, 0, 0, 0);

    // "urutan" preserves original deck order
    const sequential = orderNewCards(
      cards,
      "deck-1",
      "urutan",
      morningSameDay,
      4,
    );
    expect(sequential.map((c) => c.id)).toEqual(cards.map((c) => c.id));

    // "acak" is identical within the same study day & deck, but differs from sequential
    const random1 = orderNewCards(cards, "deck-1", "acak", morningSameDay, 4);
    const random2 = orderNewCards(
      cards,
      "deck-1",
      "acak",
      lateNightSameStudyDay,
      4,
    );
    expect(random1.map((c) => c.id)).toEqual(random2.map((c) => c.id));
    expect(random1.map((c) => c.id)).not.toEqual(cards.map((c) => c.id));

    // Next study day produces a different permutation
    const randomNextDay = orderNewCards(
      cards,
      "deck-1",
      "acak",
      nextStudyDay,
      4,
    );
    expect(randomNextDay.map((c) => c.id)).not.toEqual(
      random1.map((c) => c.id),
    );

    // Different deck on the same day also produces a different permutation
    const randomOtherDeck = orderNewCards(
      cards,
      "deck-2",
      "acak",
      morningSameDay,
      4,
    );
    expect(randomOtherDeck.map((c) => c.id)).not.toEqual(
      random1.map((c) => c.id),
    );
  });

  it("Tahap 4: addExtraNewToday ('Pelajari lebih') increases today's quota and resets on the next study day, and forecastNew projects new cards", () => {
    const deckId = "deck-extra";
    const day1 = new Date(2026, 4, 10, 10, 0, 0, 0);
    const day2 = new Date(2026, 4, 11, 5, 0, 0, 0); // past 04:00 -> next study day
    const limit = 5;

    for (let i = 1; i <= 5; i++) {
      useReviewStore
        .getState()
        .reviewCardAction(deckId, `c-${i}`, 4, { now: day1, dayStartHour: 4 });
    }
    expect(
      newCardsLeftToday(
        useReviewStore.getState().newIntroduced[deckId],
        limit,
        day1,
        4,
      ),
    ).toBe(0);

    // Click "Pelajari lebih +10"
    useReviewStore.getState().addExtraNewToday(deckId, 10, day1, 4);
    expect(
      newCardsLeftToday(
        useReviewStore.getState().newIntroduced[deckId],
        limit,
        day1,
        4,
      ),
    ).toBe(10);

    // Grade 2 more new cards on day 1 -> 8 left today
    useReviewStore
      .getState()
      .reviewCardAction(deckId, "c-6", 4, { now: day1, dayStartHour: 4 });
    useReviewStore
      .getState()
      .reviewCardAction(deckId, "c-7", 4, { now: day1, dayStartHour: 4 });
    expect(
      newCardsLeftToday(
        useReviewStore.getState().newIntroduced[deckId],
        limit,
        day1,
        4,
      ),
    ).toBe(8);

    // Next study day (after 04:00) -> extraNew resets, quota returns to base limit (5)
    expect(
      newCardsLeftToday(
        useReviewStore.getState().newIntroduced[deckId],
        limit,
        day2,
        4,
      ),
    ).toBe(limit);

    // forecastNew projects daily new cards across leaf decks without changing forecast()
    const parentDeck: DeckItem = {
      id: "parent-1",
      title: "Parent",
      sub: "",
      level: "N3",
      kind: "Kosakata",
      total: 19,
      due: 0,
      newToday: 0,
      color: "#335",
      kanji: "語",
      progress: 0,
    };
    const leafDeck: DeckItem = {
      ...parentDeck,
      id: deckId,
      title: "Parent::Child",
      parentId: "parent-1",
      total: 19, // 7 already seen on day1 -> 12 unlearned left
    };

    const settings = { newCards: 5, maxReview: 100, dayStartHour: 4 };
    const projectedNew = forecastNew(
      [parentDeck, leafDeck],
      useReviewStore.getState().srsCards,
      useReviewStore.getState().newIntroduced,
      settings,
      5,
      day1,
    );
    // Today has 8 left (from +10 extra minus 2 used), leaving 12 - 8 = 4 for tomorrow, then 0
    expect(projectedNew).toEqual([8, 4, 0, 0, 0]);

    // forecast() return value remains a number[] of scheduled reviews
    const reviewProjection = forecast(
      [useReviewStore.getState().srsCards[deckId]],
      5,
      day1,
      4,
    );
    expect(Array.isArray(reviewProjection)).toBe(true);
    expect(reviewProjection).toHaveLength(5);
  });

  it("Tahap 5: exports schedule backup JSON, rejects corrupt payloads without mutating data, and imports with or without reviewLogs", async () => {
    const deckId = "deck-backup";
    const now = new Date(2026, 4, 10, 14, 0, 0, 0);

    useReviewStore
      .getState()
      .reviewCardAction(deckId, "card-a", 4, { now, fuzz: false });
    useReviewStore
      .getState()
      .reviewCardAction(deckId, "card-b", 5, { now, fuzz: false });
    await flushReviewLogs();

    const snapshotCards = JSON.parse(
      JSON.stringify(useReviewStore.getState().srsCards),
    );
    const snapshotLogs = await getAllReviewLogs();
    expect(snapshotLogs).toHaveLength(2);

    const exportedJson = await exportScheduleBackupJson();

    // 1. Corrupt JSON string is rejected and does NOT mutate existing store or logs
    await expect(importScheduleBackup("{corrupt-json")).rejects.toThrow();
    expect(useReviewStore.getState().srsCards).toEqual(snapshotCards);
    expect(await getAllReviewLogs()).toHaveLength(2);

    // 2. Malformed card structure is rejected without mutating existing store or logs
    await expect(
      importScheduleBackup({
        reviewStorage: {
          srsCards: {
            [deckId]: {
              "card-bad": { id: "card-bad", easeFactor: "not-a-number" },
            },
          },
        },
      }),
    ).rejects.toThrow();
    expect(useReviewStore.getState().srsCards).toEqual(snapshotCards);
    expect(await getAllReviewLogs()).toHaveLength(2);

    // 3. Clear state & logs, then restore from valid exported JSON
    useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} });
    await clearAllReviewLogs();
    await flushReviewLogs();
    expect(await getAllReviewLogs()).toHaveLength(0);

    const imported = await importScheduleBackup(exportedJson);
    expect(imported).toEqual({ cardsCount: 2, logsCount: 2 });
    expect(useReviewStore.getState().srsCards).toEqual(snapshotCards);
    expect(await getAllReviewLogs()).toHaveLength(2);

    // 4. Backup without reviewLogs field still succeeds
    const backupObj = await exportScheduleBackup();
    delete backupObj.reviewLogs;
    useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} });
    const importedNoLogs = await importScheduleBackup(backupObj);
    expect(importedNoLogs.cardsCount).toBe(2);
    expect(importedNoLogs.logsCount).toBe(0);
    expect(useReviewStore.getState().srsCards).toEqual(snapshotCards);
  });

  it("Verifikasi akhir: multi-day clock simulation (Day 1 quota -> Day 2 due at 04:00 + Day 2 quota) with Undo across new/Hard/Again/drill", async () => {
    const deckId = "deck-e2e";
    const deck: DeckItem = {
      id: deckId,
      title: "E2E Deck",
      sub: "Sub",
      level: "N3",
      kind: "Kosakata",
      total: 10,
      due: 0,
      newToday: 3,
      color: "#335",
      kanji: "語",
      progress: 0,
    };
    const settings = {
      newCards: 3,
      maxReview: 50,
      dayStartHour: 4,
      desiredRetention: 0.9,
    };
    useAppStore.getState().updateSettings(settings);
    useAppStore.getState().setDeckLimits(deckId, null);

    // Day 1 at 22:30 local
    const day1Night = new Date(2026, 4, 10, 22, 30, 0, 0);
    const statsStart = liveDeckStats(
      deck,
      useReviewStore.getState().srsCards[deckId],
      useReviewStore.getState().newIntroduced[deckId],
      settings,
      day1Night,
    );
    expect(statsStart.newToday).toBe(3);
    expect(statsStart.reviewDue).toBe(0);
    expect(statsStart.due).toBe(3);

    // Grade 3 new cards: c-1 Again (0), c-2 Hard (2), c-3 Good (4)
    const c1AfterAgain = useReviewStore
      .getState()
      .reviewCardAction(deckId, "c-1", 0, {
        now: day1Night,
        fuzz: false,
        dayStartHour: 4,
      });
    useReviewStore.getState().reviewCardAction(deckId, "c-2", 2, {
      now: day1Night,
      fuzz: false,
      dayStartHour: 4,
    });
    useReviewStore.getState().reviewCardAction(deckId, "c-3", 4, {
      now: day1Night,
      fuzz: false,
      dayStartHour: 4,
    });
    await flushReviewLogs();

    // In-session drill on c-1 (re-queued after Lupa) -> does not change state or logs, and Undo of drill is a no-op
    useReviewStore.getState().reviewCardAction(deckId, "c-1", 4, {
      now: day1Night,
      fuzz: false,
      dayStartHour: 4,
      drill: true,
    });
    useReviewStore
      .getState()
      .restoreCardState(deckId, "c-1", c1AfterAgain, false, {
        now: day1Night,
        dayStartHour: 4,
        drill: true,
      });
    await flushReviewLogs();
    expect(useReviewStore.getState().srsCards[deckId]["c-1"]).toEqual(
      c1AfterAgain,
    );
    expect(await getAllReviewLogs()).toHaveLength(3);

    // Undo normal new card c-3 -> frees 1 new quota today, then re-grade c-3
    useReviewStore
      .getState()
      .restoreCardState(deckId, "c-3", undefined, true, {
        now: day1Night,
        dayStartHour: 4,
      });
    await flushReviewLogs();
    expect(await getAllReviewLogs()).toHaveLength(2);
    expect(
      liveDeckStats(
        deck,
        useReviewStore.getState().srsCards[deckId],
        useReviewStore.getState().newIntroduced[deckId],
        settings,
        day1Night,
      ).newToday,
    ).toBe(1);

    useReviewStore.getState().reviewCardAction(deckId, "c-3", 4, {
      now: day1Night,
      fuzz: false,
      dayStartHour: 4,
    });
    await flushReviewLogs();
    expect(await getAllReviewLogs()).toHaveLength(3);

    // Still Day 1 at 02:30 AM next calendar day (before 04:00 dayStartHour) -> 0 due, 0 newToday
    const beforeRollover = new Date(2026, 4, 11, 2, 30, 0, 0);
    const statsBeforeRollover = liveDeckStats(
      deck,
      useReviewStore.getState().srsCards[deckId],
      useReviewStore.getState().newIntroduced[deckId],
      settings,
      beforeRollover,
    );
    expect(statsBeforeRollover.newToday).toBe(0);
    expect(statsBeforeRollover.reviewDue).toBe(0);

    // Day 2 at 04:00 AM (study day rollover!) -> 1-day interval cards are due right at 04:00, and newToday resets to 3
    const day2Rollover = new Date(2026, 4, 11, 4, 0, 0, 0);
    const statsDay2 = liveDeckStats(
      deck,
      useReviewStore.getState().srsCards[deckId],
      useReviewStore.getState().newIntroduced[deckId],
      settings,
      day2Rollover,
    );
    expect(statsDay2.newToday).toBe(3);
    expect(statsDay2.reviewDue).toBeGreaterThanOrEqual(1);
    expect(statsDay2.due).toBe(statsDay2.newToday + statsDay2.reviewDue);
  });
});
