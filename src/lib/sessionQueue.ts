import type { StoredCard } from "./deckDb";
import { isDue, type SRSCard } from "./srs";
import {
  limitsFor,
  orderNewCards,
  type DeckLimitOverride,
  type NewCardOrder,
} from "../store/useAppStore";
import { newCardsLeftToday, type NewIntroducedEntry } from "../store/useReviewStore";

export interface SessionQueueSettings {
  newCards: number;
  maxReview: number;
  dayStartHour?: number;
  newOrder?: NewCardOrder;
}

export interface BuildSessionQueueParams {
  cards: readonly StoredCard[];
  srsCards: Record<string, Record<string, SRSCard> | undefined>;
  newIntroduced: Record<string, NewIntroducedEntry | undefined>;
  settings: SessionQueueSettings;
  deckLimits?: Record<string, DeckLimitOverride>;
  rootDeckId: string;
  now?: Date | number;
}

export interface SelectLearnMoreBatchParams {
  remainingUnlearned: readonly StoredCard[];
  amount: number;
  rootDeckId: string;
  settings: Pick<SessionQueueSettings, "dayStartHour" | "newOrder">;
  now?: Date | number;
}

export interface LearnMoreBatchResult {
  batch: StoredCard[];
  extraByGroup: Record<string, number>;
}

function groupCardsByDeckId(
  cards: readonly StoredCard[],
  rootDeckId: string,
): Map<string, StoredCard[]> {
  const groups = new Map<string, StoredCard[]>();
  for (const card of cards) {
    const groupId = card.deckId || rootDeckId;
    const list = groups.get(groupId);
    if (list) list.push(card);
    else groups.set(groupId, [card]);
  }
  return groups;
}

/**
 * Menyusun antrean sesi belajar secara murni: kartu review jatuh tempo terlebih dulu
 * (maksimum `maxReview` milik rootDeckId, diurutkan `nextReview` terlama), diikuti
 * sisa kuota kartu baru hari ini yang dihitung terpisah per sub-deck (`card.deckId || rootDeckId`).
 */
export function buildSessionQueue({
  cards,
  srsCards,
  newIntroduced,
  settings,
  deckLimits,
  rootDeckId,
  now = Date.now(),
}: BuildSessionQueueParams): StoredCard[] {
  const dayStartHour = settings.dayStartHour;
  const newOrder = settings.newOrder ?? "urutan";
  const getCardSrs = (c: StoredCard): SRSCard | undefined => {
    const targetDeckId = c.deckId || rootDeckId;
    return targetDeckId ? srsCards[targetDeckId]?.[c.id] : undefined;
  };

  const rootLimits = limitsFor(rootDeckId, settings, deckLimits);
  const due = cards
    .filter((c) => {
      const sc = getCardSrs(c);
      return sc !== undefined && isDue(sc, now);
    })
    .sort((a, b) => (getCardSrs(a)?.nextReview ?? 0) - (getCardSrs(b)?.nextReview ?? 0))
    .slice(0, rootLimits.maxReview);

  const unlearned = cards.filter((c) => !getCardSrs(c));
  const groupedUnlearned = groupCardsByDeckId(unlearned, rootDeckId);
  const fresh: StoredCard[] = [];

  for (const [groupId, groupCards] of groupedUnlearned) {
    const groupLimits = limitsFor(groupId, settings, deckLimits);
    const left = newCardsLeftToday(
      newIntroduced[groupId],
      groupLimits.newCards,
      now,
      dayStartHour,
    );
    if (left <= 0) continue;
    const ordered = orderNewCards(
      groupCards,
      groupId,
      newOrder,
      now,
      dayStartHour,
    );
    fresh.push(...ordered.slice(0, left));
  }

  return [...due, ...fresh];
}

/**
 * Mengambil batch tambahan ("Pelajari lebih +N") dari kartu baru yang belum dipelajari
 * dengan urutan identik `buildSessionQueue`, serta mengembalikan rincian jumlah kartu per grup
 * agar penambahan kuota `addExtraNewToday` memakai kunci sub-deck yang sama dengan konsumsi.
 */
export function selectLearnMoreBatch({
  remainingUnlearned,
  amount,
  rootDeckId,
  settings,
  now = Date.now(),
}: SelectLearnMoreBatchParams): LearnMoreBatchResult {
  const safeAmount = Math.max(0, Math.round(amount));
  if (safeAmount <= 0 || remainingUnlearned.length === 0) {
    return { batch: [], extraByGroup: {} };
  }

  const dayStartHour = settings.dayStartHour;
  const newOrder = settings.newOrder ?? "urutan";
  const grouped = groupCardsByDeckId(remainingUnlearned, rootDeckId);
  const orderedAll: StoredCard[] = [];

  for (const [groupId, groupCards] of grouped) {
    orderedAll.push(
      ...orderNewCards(groupCards, groupId, newOrder, now, dayStartHour),
    );
  }

  const batch = orderedAll.slice(0, safeAmount);
  const extraByGroup: Record<string, number> = {};
  for (const card of batch) {
    const groupId = card.deckId || rootDeckId;
    extraByGroup[groupId] = (extraByGroup[groupId] ?? 0) + 1;
  }

  return { batch, extraByGroup };
}
