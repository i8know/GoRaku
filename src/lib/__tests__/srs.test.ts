import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDueCards, initCard, isDue, reviewCard } from "../srs";
import { scheduleNextStudyDay, startOfStudyDay, studyDayKey } from "../studyDay";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("Tahap 0 & 1 — Penjadwal SM-2 & batas hari belajar ala Anki (srs.ts & studyDay.ts)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 10, 10, 0, 0, 0)); // 10 Mei 2026 10:00 waktu lokal
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

  it("menghitung interval SM-2 berturut-turut (1 -> 6 -> round(interval * ease)) dan menjadwalkan ke awal hari belajar", () => {
    let card = initCard("c-good");

    // Review 1 (q = 4): ease tetap 2.5, reps = 1, interval = 1 -> 11 Mei 2026 04:00
    card = reviewCard(card, 4);
    expect(card.repetitions).toBe(1);
    expect(card.interval).toBe(1);
    expect(card.easeFactor).toBeCloseTo(2.5, 5);
    expect(card.nextReview).toBe(new Date(2026, 4, 11, 4, 0, 0, 0).getTime());

    // Review 2 pada 11 Mei 10:00 (q = 4): reps = 2, interval = 6 -> 17 Mei 2026 04:00
    vi.setSystemTime(new Date(2026, 4, 11, 10, 0, 0, 0));
    card = reviewCard(card, 4);
    expect(card.repetitions).toBe(2);
    expect(card.interval).toBe(6);
    expect(card.easeFactor).toBeCloseTo(2.5, 5);
    expect(card.nextReview).toBe(new Date(2026, 4, 17, 4, 0, 0, 0).getTime());

    // Review 3 pada 17 Mei 10:00 (q = 4): reps = 3, interval = round(6 * 2.5) = 15
    vi.setSystemTime(new Date(2026, 4, 17, 10, 0, 0, 0));
    card = reviewCard(card, 4);
    expect(card.repetitions).toBe(3);
    expect(card.interval).toBe(15);
    expect(card.easeFactor).toBeCloseTo(2.5, 5);
    expect(card.nextReview).toBe(scheduleNextStudyDay(Date.now(), 15, 4));

    // Review 4 (q = 5 Mudah): ease naik +0.1 -> 2.6, interval = round(15 * 2.6) = 39
    vi.setSystemTime(new Date(2026, 5, 1, 10, 0, 0, 0));
    card = reviewCard(card, 5);
    expect(card.repetitions).toBe(4);
    expect(card.easeFactor).toBeCloseTo(2.6, 5);
    expect(card.interval).toBe(39);
  });

  it("Lupa (q=0) dan Sulit pada SM-2 (q=2 < 3) mereset repetitions ke 0 dan interval ke 1", () => {
    let card = initCard("c-lapse");
    card = reviewCard(card, 4);
    card = reviewCard(card, 4);
    card = reviewCard(card, 4);

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

  it("kartu dinilai pukul 23:30 dengan interval 1 hari jatuh tempo pukul 04:00 keesokan harinya", () => {
    const lateNight = new Date(2026, 4, 10, 23, 30, 0, 0); // 10 Mei 2026 23:30
    const card = initCard("c-2330", lateNight);
    const reviewed = reviewCard(card, 4, lateNight, 4);

    expect(reviewed.interval).toBe(1);
    const expectedDue = new Date(2026, 4, 11, 4, 0, 0, 0).getTime(); // 11 Mei 2026 04:00
    expect(reviewed.nextReview).toBe(expectedDue);
    expect(isDue(reviewed, new Date(2026, 4, 11, 3, 59, 59, 0))).toBe(false);
    expect(isDue(reviewed, new Date(2026, 4, 11, 4, 0, 0, 0))).toBe(true);
  });

  it("kartu dinilai pukul 02:00 masih dihitung hari belajar sebelumnya, jadi jatuh tempo pukul 04:00 hari kalender yang sama", () => {
    const afterMidnight = new Date(2026, 4, 11, 2, 0, 0, 0); // 11 Mei 2026 02:00 (masih hari belajar 10 Mei)
    expect(studyDayKey(afterMidnight, 4)).toBe("2026-05-10");
    expect(startOfStudyDay(afterMidnight, 4)).toBe(new Date(2026, 4, 10, 4, 0, 0, 0).getTime());

    const card = initCard("c-0200", afterMidnight);
    const reviewed = reviewCard(card, 4, afterMidnight, 4);

    expect(reviewed.interval).toBe(1);
    // Hari belajar ke-1 dari 10 Mei adalah 11 Mei pukul 04:00 (hari kalender yang sama!)
    const expectedDueSameCalendarDay = new Date(2026, 4, 11, 4, 0, 0, 0).getTime();
    expect(reviewed.nextReview).toBe(expectedDueSameCalendarDay);
    expect(isDue(reviewed, new Date(2026, 4, 11, 3, 59, 59, 0))).toBe(false);
    expect(isDue(reviewed, new Date(2026, 4, 11, 4, 0, 0, 0))).toBe(true);
  });
});
