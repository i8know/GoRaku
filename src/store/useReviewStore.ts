import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { SRSCard, initCard, isDue, getDueCards } from "../lib/srs";
import {
  DEFAULT_DESIRED_RETENTION,
  qualityToRating,
  scheduleReview,
} from "../lib/fsrsScheduler";
import {
  appendReviewLog,
  removeCardReviewLogs,
  removeDeckReviewLogs,
  removeLatestReviewLog,
} from "../lib/deckDb";
import {
  DEFAULT_DAY_START_HOUR,
  normalizeStudyDayKey,
  studyDayKey,
} from "../lib/studyDay";
import { useAppStore } from "./useAppStore";

const fallbackMemoryStorage = new Map<string, string>();

const safeStateStorage: StateStorage = {
  getItem: (name) => {
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
        return localStorage.getItem(name);
      }
    } catch {
      /* fallback to memory */
    }
    return fallbackMemoryStorage.get(name) ?? null;
  },
  setItem: (name, value) => {
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
        localStorage.setItem(name, value);
        return;
      }
    } catch {
      /* fallback to memory */
    }
    fallbackMemoryStorage.set(name, value);
  },
  removeItem: (name) => {
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.removeItem === "function") {
        localStorage.removeItem(name);
        return;
      }
    } catch {
      /* fallback to memory */
    }
    fallbackMemoryStorage.delete(name);
  },
};

function resolveDayStartHour(dayStartHour?: number): number {
  if (dayStartHour !== undefined) return dayStartHour;
  try {
    return useAppStore.getState()?.settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  } catch {
    return DEFAULT_DAY_START_HOUR;
  }
}

function resolveDesiredRetention(desiredRetention?: number): number {
  if (desiredRetention !== undefined) return desiredRetention;
  try {
    return useAppStore.getState()?.settings?.desiredRetention ?? DEFAULT_DESIRED_RETENTION;
  } catch {
    return DEFAULT_DESIRED_RETENTION;
  }
}

const currentStudyDay = (now: Date | number = Date.now(), dayStartHour?: number) =>
  studyDayKey(now, resolveDayStartHour(dayStartHour));

export interface ReviewActionOptions {
  /** Jika true, pengulangan dalam sesi ("drill"): tidak mengubah status FSRS, tidak menulis log, tidak menambah activity. */
  drill?: boolean;
  now?: Date | number;
  desiredRetention?: number;
  fuzz?: boolean;
  dayStartHour?: number;
}

export interface RestoreCardOptions {
  /** Jika true, Undo berasal dari penilaian drill dalam sesi sehingga state store & reviewLogs tidak disentuh. */
  drill?: boolean;
  now?: Date | number;
  dayStartHour?: number;
}

export interface NewIntroducedEntry {
  date: string;
  count: number;
  extraNew?: number;
}

interface ReviewStore {
  srsCards: Record<string, Record<string, SRSCard>>; // deckId -> cardId -> SRSCard
  /** New cards introduced per deck today (enforces the daily new-card limit + optional extraNew bonus). */
  newIntroduced: Record<string, NewIntroducedEntry>;
  /** Per-deck study activity: last review timestamp and how many cards were graded today. */
  activity: Record<string, DeckActivity>;
  addCardToDeck: (deckId: string, cardId: string) => void;
  reviewCardAction: (
    deckId: string,
    cardId: string,
    quality: number,
    opts?: ReviewActionOptions,
  ) => SRSCard;
  /** Tambah kuota kartu baru ekstra untuk hari belajar ini ("Pelajari lebih"). Reset otomatis di hari berikutnya. */
  addExtraNewToday: (
    deckId: string,
    amount: number,
    now?: Date | number,
    dayStartHour?: number,
  ) => void;
  getDueCards: (deckId: string) => SRSCard[];
  getDeckStats: (deckId: string) => { total: number; due: number; learned: number };
  importSchedule: (deckId: string, cards: SRSCard[]) => void;
  /** Drop SRS state for specific cards (they become "new" again, or vanish if the card was deleted). */
  forgetCards: (deckId: string, cardIds: string[]) => void;
  /** Restore a single card's previous SRS state (for Undo during review session). */
  restoreCardState: (
    deckId: string,
    cardId: string,
    prevCard: SRSCard | undefined,
    wasNew: boolean,
    opts?: RestoreCardOptions,
  ) => void;
  removeDeck: (deckId: string) => void;
}

export interface DeckActivity {
  last: number;
  date: string;
  count: number;
}

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set, get) => ({
      srsCards: {},
      newIntroduced: {},
      activity: {},
      addCardToDeck: (deckId, cardId) => {
        set((state) => {
          const deckCards = state.srsCards[deckId] || {};
          if (deckCards[cardId]) return state;
          return {
            srsCards: {
              ...state.srsCards,
              [deckId]: { ...deckCards, [cardId]: initCard(cardId) },
            },
          };
        });
      },
      reviewCardAction: (deckId, cardId, quality, opts) => {
        const now = opts?.now !== undefined
          ? typeof opts.now === "number"
            ? opts.now
            : opts.now.getTime()
          : Date.now();
        const state = get();
        const deckCards = state.srsCards[deckId] || {};
        const existing = deckCards[cardId];

        // Jalur drill (pengulangan kartu gagal di sesi yang sama): tidak mengubah jadwal FSRS,
        // tidak menulis reviewLogs, dan tidak menambah activity/newIntroduced.
        if (opts?.drill) {
          return existing ?? initCard(cardId, now);
        }

        const dayStartHour = resolveDayStartHour(opts?.dayStartHour);
        const desiredRetention = resolveDesiredRetention(opts?.desiredRetention);
        const dayKey = currentStudyDay(now, dayStartHour);
        const isNew = !existing;
        const card = existing || initCard(cardId, now);
        const rating = qualityToRating(quality);
        const { card: updated, log } = scheduleReview(card, rating, now, {
          desiredRetention,
          fuzz: opts?.fuzz,
          dayStartHour,
          deckId,
        });

        set((state) => {
          const prev = state.newIntroduced[deckId];
          const sameDay = normalizeStudyDayKey(prev?.date) === dayKey;
          const count = sameDay ? prev.count : 0;
          const extraNew = sameDay ? prev?.extraNew : undefined;
          const act = state.activity[deckId];
          const actCount = normalizeStudyDayKey(act?.date) === dayKey ? act.count : 0;
          return {
            srsCards: {
              ...state.srsCards,
              [deckId]: { ...(state.srsCards[deckId] || {}), [cardId]: updated },
            },
            newIntroduced: isNew
              ? {
                  ...state.newIntroduced,
                  [deckId]: {
                    date: dayKey,
                    count: count + 1,
                    ...(extraNew ? { extraNew } : {}),
                  },
                }
              : state.newIntroduced,
            activity: {
              ...state.activity,
              [deckId]: { last: now, date: dayKey, count: actCount + 1 },
            },
          };
        });

        void appendReviewLog(log);
        return updated;
      },
      addExtraNewToday: (deckId, amount, now = Date.now(), dayStartHour) => {
        const extraDelta = Math.max(0, Math.round(amount));
        if (extraDelta <= 0) return;
        const dayKey = currentStudyDay(now, dayStartHour);
        set((state) => {
          const prev = state.newIntroduced[deckId];
          const sameDay = normalizeStudyDayKey(prev?.date) === dayKey;
          const count = sameDay ? prev.count : 0;
          const prevExtra = sameDay ? (prev?.extraNew ?? 0) : 0;
          return {
            newIntroduced: {
              ...state.newIntroduced,
              [deckId]: {
                date: dayKey,
                count,
                extraNew: prevExtra + extraDelta,
              },
            },
          };
        });
      },
      getDueCards: (deckId) => {
        const deckCards = get().srsCards[deckId] || {};
        return getDueCards(Object.values(deckCards));
      },
      getDeckStats: (deckId) => {
        const deckCards = get().srsCards[deckId] || {};
        const cards = Object.values(deckCards);
        const due = cards.filter(isDue).length;
        const learned = cards.filter((c) =>
          c.scheduler === "fsrs"
            ? (c.stability ?? 0) >= 21
            : c.repetitions >= 3 || c.interval >= 21,
        ).length;
        return { total: cards.length, due, learned };
      },
      importSchedule: (deckId, cards) =>
        set((state) => ({
          srsCards: {
            ...state.srsCards,
            [deckId]: {
              ...(state.srsCards[deckId] || {}),
              ...Object.fromEntries(cards.map((c) => [c.id, c])),
            },
          },
        })),
      forgetCards: (deckId, cardIds) => {
        if (cardIds.length > 0) {
          void removeCardReviewLogs(deckId, cardIds);
        }
        set((state) => {
          const deckCards = state.srsCards[deckId];
          if (!deckCards || cardIds.length === 0) return state;
          const next = { ...deckCards };
          for (const id of cardIds) delete next[id];
          return { srsCards: { ...state.srsCards, [deckId]: next } };
        });
      },
      restoreCardState: (deckId, cardId, prevCard, wasNew, opts) => {
        if (opts?.drill) return;
        void removeLatestReviewLog(deckId, cardId);
        set((state) => {
          const dayKey = currentStudyDay(opts?.now, opts?.dayStartHour);
          const deckCards = { ...(state.srsCards[deckId] || {}) };
          if (prevCard) {
            deckCards[cardId] = prevCard;
          } else {
            delete deckCards[cardId];
          }
          const prevIntro = state.newIntroduced[deckId];
          const nextIntroCount =
            wasNew && normalizeStudyDayKey(prevIntro?.date) === dayKey
              ? Math.max(0, prevIntro.count - 1)
              : prevIntro?.count ?? 0;
          const prevAct = state.activity[deckId];
          const nextActCount =
            normalizeStudyDayKey(prevAct?.date) === dayKey
              ? Math.max(0, prevAct.count - 1)
              : prevAct?.count ?? 0;

          return {
            srsCards: { ...state.srsCards, [deckId]: deckCards },
            newIntroduced: prevIntro
              ? {
                  ...state.newIntroduced,
                  [deckId]: {
                    ...prevIntro,
                    date: prevIntro.date,
                    count: nextIntroCount,
                  },
                }
              : state.newIntroduced,
            activity: prevAct
              ? {
                  ...state.activity,
                  [deckId]: { ...prevAct, count: nextActCount },
                }
              : state.activity,
          };
        });
      },
      removeDeck: (deckId) => {
        void removeDeckReviewLogs(deckId);
        set((state) => {
          const { [deckId]: _cards, ...srsCards } = state.srsCards;
          const { [deckId]: _intro, ...newIntroduced } = state.newIntroduced;
          const { [deckId]: _act, ...activity } = state.activity;
          return { srsCards, newIntroduced, activity };
        });
      },
    }),
    {
      name: "japanese-review-storage",
      version: 1,
      storage: createJSONStorage(() => safeStateStorage),
      migrate: (persistedState) => migrateReviewState(persistedState) as ReviewStore,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...migrateReviewState(persistedState),
      }),
    },
  ),
);

function migrateReviewState(persistedState: unknown): Partial<ReviewStore> {
  const raw = (persistedState ?? {}) as Partial<ReviewStore>;
  const nextIntro: ReviewStore["newIntroduced"] = {};
  if (raw.newIntroduced && typeof raw.newIntroduced === "object") {
    for (const [k, v] of Object.entries(raw.newIntroduced)) {
      if (v && typeof v.date === "string") {
        nextIntro[k] = { ...v, date: normalizeStudyDayKey(v.date) };
      }
    }
  }
  const nextAct: ReviewStore["activity"] = {};
  if (raw.activity && typeof raw.activity === "object") {
    for (const [k, v] of Object.entries(raw.activity)) {
      if (v && typeof v.date === "string") {
        nextAct[k] = { ...v, date: normalizeStudyDayKey(v.date) };
      }
    }
  }
  return {
    ...raw,
    ...(raw.newIntroduced ? { newIntroduced: nextIntro } : {}),
    ...(raw.activity ? { activity: nextAct } : {}),
  };
}

/** New cards still allowed today for a deck (includes any extraNew bonus added today). */
export function newCardsLeftToday(
  intro: ReviewStore["newIntroduced"][string] | undefined,
  limit: number,
  now: Date | number = Date.now(),
  dayStartHour?: number,
) {
  const dayKey = currentStudyDay(now, dayStartHour);
  const sameDay = normalizeStudyDayKey(intro?.date) === dayKey;
  const used = sameDay ? intro!.count : 0;
  const extra = sameDay ? (intro?.extraNew ?? 0) : 0;
  return Math.max(0, limit + extra - used);
}

/** Cards graded today for a deck (0 if the last activity was on an earlier day). */
export function reviewedToday(
  act: DeckActivity | undefined,
  now: Date | number = Date.now(),
  dayStartHour?: number,
) {
  const dayKey = currentStudyDay(now, dayStartHour);
  return normalizeStudyDayKey(act?.date) === dayKey ? act!.count : 0;
}
