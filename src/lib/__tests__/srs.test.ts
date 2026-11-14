import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDueCards, initCard, isDue, reviewCard } from "../srs";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("Tahap 0 — Dokumentasi perilaku SM-2 saat ini (srs.ts)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initCard menginisialisasi kartu baru dengan easeFactor 2.5, interval 1, repetitions 0, dan jatuh tempo sekarang", () => {
    const now = Date.now();
    const card = initCard("c-1");
    expect(card).toEqual({
      id: "c-1",
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: now,
    });
    expect(isDue(card)).toBe(true);
  });

  it("menghitung interval SM-2 berturut-turut (1 -> 6 -> round(interval * ease)) untuk jawaban Baik (q=4)", () => {
    let card = initCard("c-good");

    // Review 1 (q = 4): ease tetap 2.5, reps = 1, interval = 1
    card = reviewCard(card, 4);
    expect(card.repetitions).toBe(1);
    expect(card.interval).toBe(1);
    expect(card.easeFactor).toBeCloseTo(2.5, 5);
    expect(card.nextReview).toBe(Date.now() + 1 * DAY_MS);

    // Review 2 (q = 4): reps = 2, interval = 6
    vi.advanceTimersByTime(1 * DAY_MS);
    card = reviewCard(card, 4);
    expect(card.repetitions).toBe(2);
    expect(card.interval).toBe(6);
    expect(card.easeFactor).toBeCloseTo(2.5, 5);
    expect(card.nextReview).toBe(Date.now() + 6 * DAY_MS);

    // Review 3 (q = 4): reps = 3, interval = round(6 * 2.5) = 15
    vi.advanceTimersByTime(6 * DAY_MS);
    card = reviewCard(card, 4);
    expect(card.repetitions).toBe(3);
    expect(card.interval).toBe(15);
    expect(card.easeFactor).toBeCloseTo(2.5, 5);

    // Review 4 (q = 5 Mudah): ease naik +0.1 -> 2.6, interval = round(15 * 2.6) = 39
    vi.advanceTimersByTime(15 * DAY_MS);
    card = reviewCard(card, 5);
    expect(card.repetitions).toBe(4);
    expect(card.easeFactor).toBeCloseTo(2.6, 5);
    expect(card.interval).toBe(39);
  });

  it("Lupa (q=0) dan Sulit pada SM-2 (q=2 < 3) mereset repetitions ke 0 dan interval ke 1", () => {
    let card = initCard("c-lapse");
    card = reviewCard(card, 4); // reps 1, ivl 1
    card = reviewCard(card, 4); // reps 2, ivl 6
    card = reviewCard(card, 4); // reps 3, ivl 15

    const afterHard = reviewCard(card, 2);
    expect(afterHard.repetitions).toBe(0);
    expect(afterHard.interval).toBe(1);

    const afterAgain = reviewCard(card, 0);
    expect(afterAgain.repetitions).toBe(0);
    expect(afterAgain.interval).toBe(1);
  });

  it("menjaga batas bawah easeFactor >= 1.3 meskipun dinilai Lupa (q=0) berulang kali", () => {
    let card = initCard("c-floor");
    for (let i = 0; i < 10; i++) {
      card = reviewCard(card, 0);
      expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
    }
    expect(card.easeFactor).toBe(1.3);
  });

  it("getDueCards menyaring kartu yang jatuh tempo dan mengurutkannya dari nextReview paling awal", () => {
    const now = Date.now();
    const cOverdue2 = { ...initCard("c1"), nextReview: now - 5000 };
    const cOverdue1 = { ...initCard("c2"), nextReview: now - 1000 };
    const cFuture = { ...initCard("c3"), nextReview: now + DAY_MS };

    const due = getDueCards([cOverdue1, cFuture, cOverdue2]);
    expect(due.map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});
