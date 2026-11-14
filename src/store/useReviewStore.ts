import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { SRSCard, initCard, reviewCard, isDue, getDueCards } from "../lib/srs";
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

const currentStudyDay = (now: Date | number = Date.now(), dayStartHour?: number) =>
  studyDayKey(now, resolveDayStartHour(dayStartHour));

interface ReviewStore {
  srsCards: Record<string, Record<string, SRSCard>>; // deckId -> cardId -> SRSCard
  /** New cards introduced per deck today (enforces the daily new-card limit). */
  newIntroduced: Record<string, { date: string; count: number }>;
  /** Per-deck study activity: last review timestamp and how many cards were graded today. */
  activity: Record<string, DeckActivity>;
  addCardToDeck: (deckId: string, cardId: string) => void;
  reviewCardAction: (deckId: string, cardId: string, quality: number) => SRSCard;
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
      reviewCardAction: (deckId, cardId, quality) => {
        const now = Date.now();
        const dayStartHour = resolveDayStartHour();
        const dayKey = currentStudyDay(now, dayStartHour);
        const state = get();
        const deckCards = state.srsCards[deckId] || {};
        const isNew = !deckCards[cardId];
        const card = deckCards[cardId] || initCard(cardId, now);
        const updated = reviewCard(card, quality, now, dayStartHour);
        set((state) => {
          const prev = state.newIntroduced[deckId];
          const count = normalizeStudyDayKey(prev?.date) === dayKey ? prev.count : 0;
          const act = state.activity[deckId];
          const actCount = normalizeStudyDayKey(act?.date) === dayKey ? act.count : 0;
          return {
            srsCards: {
              ...state.srsCards,
              [deckId]: { ...(state.srsCards[deckId] || {}), [cardId]: updated },
            },
            newIntroduced: isNew
              ? { ...state.newIntroduced, [deckId]: { date: dayKey, count: count + 1 } }
              : state.newIntroduced,
            activity: {
              ...state.activity,
              [deckId]: { last: now, date: dayKey, count: actCount + 1 },
            },
          };
        });
        return updated;
      },
      getDueCards: (deckId) => {
        const deckCards = get().srsCards[deckId] || {};
        return getDueCards(Object.values(deckCards));
      },
      getDeckStats: (deckId) => {
        const deckCards = get().srsCards[deckId] || {};
        const cards = Object.values(deckCards);
        const due = cards.filter(isDue).length;
        const learned = cards.filter((c) => c.repetitions >= 3).length;
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
      forgetCards: (deckId, cardIds) =>
        set((state) => {
          const deckCards = state.srsCards[deckId];
          if (!deckCards || cardIds.length === 0) return state;
          const next = { ...deckCards };
          for (const id of cardIds) delete next[id];
          return { srsCards: { ...state.srsCards, [deckId]: next } };
        }),
      restoreCardState: (deckId, cardId, prevCard, wasNew) =>
        set((state) => {
          const dayKey = currentStudyDay();
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
                  [deckId]: { date: prevIntro.date, count: nextIntroCount },
                }
              : state.newIntroduced,
            activity: prevAct
              ? {
                  ...state.activity,
                  [deckId]: { ...prevAct, count: nextActCount },
                }
              : state.activity,
          };
        }),
      removeDeck: (deckId) =>
        set((state) => {
          const { [deckId]: _cards, ...srsCards } = state.srsCards;
          const { [deckId]: _intro, ...newIntroduced } = state.newIntroduced;
          const { [deckId]: _act, ...activity } = state.activity;
          return { srsCards, newIntroduced, activity };
        }),
    }),
    {
      name: "japanese-review-storage",
      version: 1,
      storage: createJSONStorage(() => safeStateStorage),
      migrate: (persistedState) => migrateReviewState(persistedState),
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

/** New cards still allowed today for a deck. */
export function newCardsLeftToday(
  intro: ReviewStore["newIntroduced"][string] | undefined,
  limit: number,
  now: Date | number = Date.now(),
  dayStartHour?: number,
) {
  const dayKey = currentStudyDay(now, dayStartHour);
  const used = normalizeStudyDayKey(intro?.date) === dayKey ? intro!.count : 0;
  return Math.max(0, limit - used);
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
