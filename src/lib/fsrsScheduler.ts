import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
} from "ts-fsrs";
import type { SRSCard } from "./srs";
import { DEFAULT_DAY_START_HOUR, scheduleNextStudyDay } from "./studyDay";

export { Rating, State };

export type FsrsGrade = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;

export const DEFAULT_DESIRED_RETENTION = 0.9;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewLogEntry {
  id?: number;
  deckId: string;
  cardId: string;
  rating: number;
  /** FSRS state sebelum review (0=New, 1=Learning, 2=Review, 3=Relearning). */
  state: number;
  /** Timestamp jatuh tempo sebelum review (ms). */
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  /** Timestamp saat penilaian dilakukan (ms). */
  reviewedAt: number;
}

export interface CreateSchedulerOptions {
  desiredRetention?: number;
  fuzz?: boolean;
}

export interface ScheduleReviewOptions extends CreateSchedulerOptions {
  dayStartHour?: number;
  deckId?: string;
}

function toMs(now: Date | number = Date.now()): number {
  return typeof now === "number" ? now : now.getTime();
}

function defaultFuzz(): boolean {
  try {
    const env = (import.meta as { env?: { VITEST?: unknown; MODE?: string } }).env;
    if (env?.VITEST || env?.MODE === "test") return false;
  } catch {
    /* ignore */
  }
  if (typeof process !== "undefined" && process.env?.VITEST) return false;
  return true;
}

export function clampDesiredRetention(retention: number = DEFAULT_DESIRED_RETENTION): number {
  if (typeof retention !== "number" || !Number.isFinite(retention)) {
    return DEFAULT_DESIRED_RETENTION;
  }
  return Math.max(0.8, Math.min(0.97, Number(retention.toFixed(2))));
}

/**
 * Pemetaan nilai kualitas tombol GoRaku (0 / 2 / 4 / 5) ke Rating FSRS:
 * - 0 (Lupa)  -> Rating.Again (1)
 * - 2 (Sulit) -> Rating.Hard  (2)
 * - 4 (Baik)  -> Rating.Good  (3)
 * - 5 (Mudah) -> Rating.Easy  (4)
 */
export function qualityToRating(quality: number): FsrsGrade {
  if (quality <= 0) return Rating.Again;
  if (quality <= 2) return Rating.Hard;
  if (quality <= 4) return Rating.Good;
  return Rating.Easy;
}

/**
 * Konversi monoton `easeFactor` SM-2 (rentang 1.3 .. 3.3+) ke `difficulty` FSRS (rentang 1 .. 10).
 *
 * Rumus:
 *   D = clamp(10 - 4.5 * (easeFactor - 1.3), 1, 10)
 *
 * Contoh titik:
 * - easeFactor = 1.3 (paling sulit di SM-2) -> D = 10.0
 * - easeFactor = 2.5 (bawaan SM-2)          -> D = 4.6
 * - easeFactor >= 3.3 (sangat mudah)        -> D = 1.0
 */
export function easeToDifficulty(easeFactor: number): number {
  const ef = Number.isFinite(easeFactor) ? easeFactor : 2.5;
  const raw = 10 - 4.5 * (ef - 1.3);
  return Math.max(1, Math.min(10, Number(raw.toFixed(4))));
}

/**
 * Konversi balik `difficulty` FSRS (1 .. 10) ke `easeFactor` (1.3 .. 3.3)
 * agar kode lama yang membaca `card.easeFactor` tetap konsisten.
 */
export function difficultyToEase(difficulty: number): number {
  const d = Number.isFinite(difficulty) ? Math.max(1, Math.min(10, difficulty)) : 4.6;
  const ef = 1.3 + ((10 - d) / 4.5);
  return Math.max(1.3, Number(ef.toFixed(4)));
}

/**
 * Mengonversi kartu SM-2 lama (tanpa `scheduler: "fsrs"`) menjadi `SRSCard` berformat FSRS:
 * - Kartu yang belum pernah lulus (`repetitions <= 0`) diperlakukan sebagai kartu baru
 *   (`state = State.New`, `stability = 0`, `reps = 0`), namun `difficulty` tetap dihitung
 *   secara monoton dari `easeFactor` dalam rentang [1, 10].
 * - Kartu yang sudah pernah lulus (`repetitions > 0`) mendapat:
 *   - `state = State.Review`
 *   - `stability = max(0.5, interval)` (dalam hari)
 *   - `difficulty = clamp(10 - 4.5 * (easeFactor - 1.3), 1, 10)`
 */
export function legacyToFsrs(card: SRSCard, now: Date | number = Date.now()): SRSCard {
  if (card.scheduler === "fsrs") {
    return {
      ...card,
      stability: card.stability !== undefined ? Math.max(0.5, card.stability) : Math.max(0.5, card.interval || 0.5),
      difficulty: Math.max(1, Math.min(10, card.difficulty ?? easeToDifficulty(card.easeFactor))),
      state: card.state ?? (card.repetitions > 0 ? State.Review : State.New),
      lapses: card.lapses ?? 0,
      reps: card.reps ?? card.repetitions ?? 0,
      scheduler: "fsrs",
    };
  }

  const nowMs = toMs(now);
  const difficulty = easeToDifficulty(card.easeFactor ?? 2.5);
  const reps = Math.max(0, card.repetitions ?? 0);
  const lapses = Math.max(0, card.lapses ?? 0);

  if (reps <= 0) {
    return {
      ...card,
      stability: 0,
      difficulty,
      state: State.New,
      lapses,
      reps: 0,
      scheduler: "fsrs",
    };
  }

  const intervalDays = Math.max(0.5, card.interval || 0.5);
  const estimatedLastReview =
    card.lastReview ??
    Math.min(nowMs - DAY_MS, (card.nextReview || nowMs) - Math.max(1, Math.round(intervalDays)) * DAY_MS);

  return {
    ...card,
    stability: intervalDays,
    difficulty,
    state: State.Review,
    lapses,
    reps,
    lastReview: estimatedLastReview,
    scheduler: "fsrs",
  };
}

export function createScheduler(opts: CreateSchedulerOptions = {}) {
  const desiredRetention = clampDesiredRetention(opts.desiredRetention ?? DEFAULT_DESIRED_RETENTION);
  const fuzz = opts.fuzz ?? defaultFuzz();
  return fsrs(
    generatorParameters({
      request_retention: desiredRetention,
      enable_fuzz: fuzz,
      enable_short_term: false,
    }),
  );
}

function toTsFsrsCard(card: SRSCard, nowMs: number) {
  const normalized = card.scheduler === "fsrs" ? card : legacyToFsrs(card, nowMs);
  const state = (normalized.state ?? State.New) as State;
  const reps = normalized.reps ?? normalized.repetitions ?? 0;

  if (state === State.New || reps <= 0) {
    const empty = createEmptyCard(new Date(nowMs));
    return {
      ...empty,
      lapses: normalized.lapses ?? 0,
    };
  }

  const stability = Math.max(0.5, normalized.stability ?? normalized.interval ?? 0.5);
  const difficulty = Math.max(1, Math.min(10, normalized.difficulty ?? easeToDifficulty(normalized.easeFactor)));
  const scheduledDays = Math.max(1, Math.round(normalized.interval || stability));
  const lastReviewMs =
    normalized.lastReview ??
    Math.min(nowMs - DAY_MS, (normalized.nextReview || nowMs) - scheduledDays * DAY_MS);
  const elapsedDays = Math.max(0, Math.round((nowMs - lastReviewMs) / DAY_MS));

  return {
    due: new Date(normalized.nextReview || nowMs),
    stability,
    difficulty,
    elapsed_days: elapsedDays,
    scheduled_days: scheduledDays,
    learning_steps: 0,
    reps,
    lapses: normalized.lapses ?? 0,
    state,
    last_review: new Date(lastReviewMs),
  };
}

/**
 * Menjadwalkan satu kartu menggunakan FSRS (`enable_short_term: false`).
 * Mengembalikan `{ card, log }` di mana seluruh waktu berupa angka timestamp (ms)
 * dan `nextReview` disetel ke awal hari belajar pada hari ke-`scheduled_days`.
 */
export function scheduleReview(
  card: SRSCard,
  rating: Rating | FsrsGrade,
  now: Date | number = Date.now(),
  opts: ScheduleReviewOptions = {},
): { card: SRSCard; log: ReviewLogEntry } {
  const nowMs = toMs(now);
  const nowDate = new Date(nowMs);
  const grade: FsrsGrade =
    rating === Rating.Manual ? Rating.Good : (rating as FsrsGrade);

  const fsrsInput = toTsFsrsCard(card, nowMs);
  const scheduler = createScheduler({
    desiredRetention: opts.desiredRetention,
    fuzz: opts.fuzz,
  });

  const result = scheduler.next(fsrsInput, nowDate, grade);
  const scheduledDays = Math.max(1, Math.round(result.card.scheduled_days || 1));
  const dayStartHour = opts.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  const nextReview = scheduleNextStudyDay(nowMs, scheduledDays, dayStartHour);

  const nextCard: SRSCard = {
    ...card,
    easeFactor: difficultyToEase(result.card.difficulty),
    interval: scheduledDays,
    repetitions: result.card.reps,
    nextReview,
    stability: Number(result.card.stability.toFixed(6)),
    difficulty: Number(result.card.difficulty.toFixed(6)),
    state: result.card.state,
    lapses: result.card.lapses,
    reps: result.card.reps,
    lastReview: result.log.review.getTime(),
    scheduler: "fsrs",
  };

  const log: ReviewLogEntry = {
    deckId: opts.deckId ?? "",
    cardId: card.id,
    rating: result.log.rating,
    state: result.log.state,
    due: result.log.due.getTime(),
    stability: Number(result.log.stability.toFixed(6)),
    difficulty: Number(result.log.difficulty.toFixed(6)),
    elapsedDays: result.log.elapsed_days,
    scheduledDays,
    reviewedAt: result.log.review.getTime(),
  };

  return { card: nextCard, log };
}

/**
 * Menghitung pratinjau interval (dalam hari) untuk keempat tombol penilaian (Again, Hard, Good, Easy)
 * menggunakan `repeat()` dari FSRS tanpa fuzz agar label tombol stabil.
 */
export function previewIntervals(
  card: SRSCard,
  now: Date | number = Date.now(),
  opts: CreateSchedulerOptions = {},
): Record<FsrsGrade, number> {
  const nowMs = toMs(now);
  const fsrsInput = toTsFsrsCard(card, nowMs);
  const scheduler = createScheduler({
    desiredRetention: opts.desiredRetention,
    fuzz: false,
  });
  const preview = scheduler.repeat(fsrsInput, new Date(nowMs));
  return {
    [Rating.Again]: Math.max(1, Math.round(preview[Rating.Again].card.scheduled_days || 1)),
    [Rating.Hard]: Math.max(1, Math.round(preview[Rating.Hard].card.scheduled_days || 1)),
    [Rating.Good]: Math.max(1, Math.round(preview[Rating.Good].card.scheduled_days || 1)),
    [Rating.Easy]: Math.max(1, Math.round(preview[Rating.Easy].card.scheduled_days || 1)),
  };
}
