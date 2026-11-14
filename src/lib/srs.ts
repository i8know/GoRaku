// Simple SRS (Spaced Repetition System) based on SM-2 algorithm
// Quality: 0 (total blackout) to 5 (perfect recall)

import { DEFAULT_DAY_START_HOUR, scheduleNextStudyDay } from "./studyDay";

export interface SRSCard {
  id: string;
  easeFactor: number; // 1.3 to 2.5+
  interval: number; // days
  repetitions: number;
  nextReview: number; // Unix timestamp (ms)
  /** FSRS memory stability in days (optional; present when scheduler === "fsrs"). */
  stability?: number;
  /** FSRS difficulty in [1, 10] (optional; present when scheduler === "fsrs"). */
  difficulty?: number;
  /** FSRS card state: 0=New, 1=Learning, 2=Review, 3=Relearning. */
  state?: number;
  /** Total number of times the card was forgotten (Rating.Again). */
  lapses?: number;
  /** Total number of reviews conducted on the card. */
  reps?: number;
  /** Epoch timestamp (ms) of the most recent review. */
  lastReview?: number;
  /** Identifies cards scheduled by FSRS; cards without this field are legacy SM-2 cards. */
  scheduler?: "fsrs";
}

function toMs(now: Date | number = Date.now()): number {
  return typeof now === "number" ? now : now.getTime();
}

export function initCard(id: string, now: Date | number = Date.now()): SRSCard {
  return {
    id,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: toMs(now),
  };
}

export function reviewCard(
  card: SRSCard,
  quality: number,
  now: Date | number = Date.now(),
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): SRSCard {
  // Clamp quality to 0-5
  const q = Math.max(0, Math.min(5, quality));

  // Update ease factor
  let newEase = card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEase < 1.3) newEase = 1.3;

  let newInterval: number;
  let newReps: number;

  if (q < 3) {
    // Failed: reset
    newReps = 0;
    newInterval = 1;
  } else {
    // Passed
    newReps = card.repetitions + 1;
    if (newReps === 1) {
      newInterval = 1;
    } else if (newReps === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(card.interval * newEase);
    }
  }

  const nextReview = scheduleNextStudyDay(now, newInterval, dayStartHour);

  return {
    ...card,
    easeFactor: newEase,
    interval: newInterval,
    repetitions: newReps,
    nextReview,
  };
}

export function isDue(card: SRSCard, now?: Date | number, _filterArr?: unknown): boolean {
  const nowMs =
    now === undefined || Array.isArray(_filterArr)
      ? Date.now()
      : toMs(now);
  return card.nextReview <= nowMs;
}

export function getDueCards(cards: SRSCard[], now: Date | number = Date.now()): SRSCard[] {
  const nowMs = toMs(now);
  return cards.filter((c) => isDue(c, nowMs)).sort((a, b) => a.nextReview - b.nextReview);
}
