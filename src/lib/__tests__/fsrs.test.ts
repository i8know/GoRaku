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
import { isMature } from "../deckStats";
import {
  clearAllReviewLogs,
  flushReviewLogs,
  getAllReviewLogs,
  getCardReviewLogs,
} from "../deckDb";
import { useAppStore } from "../../store/useAppStore";
import { useReviewStore } from "../../store/useReviewStore";

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
});
