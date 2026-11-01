// Simple SRS (Spaced Repetition System) based on SM-2 algorithm
// Quality: 0 (total blackout) to 5 (perfect recall)

export interface SRSCard {
  id: string;
  easeFactor: number; // 1.3 to 2.5+
  interval: number; // days
  repetitions: number;
  nextReview: number; // Unix timestamp (ms)
}

export function initCard(id: string): SRSCard {
  return {
    id,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: Date.now(),
  };
}

export function reviewCard(card: SRSCard, quality: number): SRSCard {
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

  const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;

  return {
    ...card,
    easeFactor: newEase,
    interval: newInterval,
    repetitions: newReps,
    nextReview,
  };
}

export function isDue(card: SRSCard): boolean {
  return card.nextReview <= Date.now();
}

export function getDueCards(cards: SRSCard[]): SRSCard[] {
  return cards.filter(isDue).sort((a, b) => a.nextReview - b.nextReview);
}
