import { useAppStore, type DeckItem } from "../store/useAppStore";
import { newCardsLeftToday } from "../store/useReviewStore";
import { isDue, type SRSCard } from "./srs";
import { DEFAULT_DAY_START_HOUR, startOfStudyDay } from "./studyDay";

export interface LiveDeckStats {
  due: number;
  reviewDue: number;
  newToday: number;
  newTotal: number;
  /** Cards seen at least once but not yet mature. */
  learning: number;
  learned: number;
  progress: number;
}

const DAY = 24 * 60 * 60 * 1000;

function resolveDayStartHour(dayStartHour?: number): number {
  if (dayStartHour !== undefined) return dayStartHour;
  try {
    return useAppStore.getState()?.settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR;
  } catch {
    return DEFAULT_DAY_START_HOUR;
  }
}

export const isMature = (c: SRSCard) => c.repetitions >= 3 || c.interval >= 21;

/** Due / progress figures for a deck, computed live from its SRS state. */
export function liveDeckStats(
  deck: DeckItem,
  srsDeck: Record<string, SRSCard> | undefined,
  intro: { date: string; count: number } | undefined,
  settings: { newCards: number; maxReview: number; dayStartHour?: number },
  now: Date | number = Date.now(),
): LiveDeckStats {
  const cards = srsDeck ? Object.values(srsDeck) : [];
  const dayStartHour = resolveDayStartHour(settings.dayStartHour);
  const reviewDue = Math.min(
    settings.maxReview,
    cards.filter((c) => isDue(c, now)).length,
  );
  const newTotal = Math.max(0, deck.total - cards.length);
  const newToday = Math.min(
    newTotal,
    newCardsLeftToday(intro, settings.newCards, now, dayStartHour),
  );
  const learned = cards.filter(isMature).length;
  return {
    due: reviewDue + newToday,
    reviewDue,
    newToday,
    newTotal,
    learning: Math.max(0, cards.length - learned),
    learned,
    progress: deck.total ? Math.min(100, Math.round((learned / deck.total) * 100)) : 0,
  };
}

export type CardStateKey = "new" | "due" | "learn" | "known";

export function cardState(
  c: SRSCard | undefined,
  now: Date | number = Date.now(),
): { key: CardStateKey; label: string } {
  if (!c) return { key: "new", label: "Baru" };
  if (isDue(c, now)) return { key: "due", label: "Jatuh tempo" };
  if (isMature(c)) return { key: "known", label: "Dikuasai" };
  return { key: "learn", label: formatInterval(c.interval) };
}

/** Reviews scheduled for each of the next `days` days (index 0 = today, including overdue). */
export function forecast(
  srsDecks: (Record<string, SRSCard> | undefined)[],
  days = 7,
  now: Date | number = Date.now(),
  dayStartHour?: number,
): number[] {
  const out = new Array<number>(days).fill(0);
  const h = resolveDayStartHour(dayStartHour);
  const today = startOfStudyDay(now, h);
  for (const deck of srsDecks) {
    if (!deck) continue;
    for (const c of Object.values(deck)) {
      const offset = Math.max(0, Math.round((startOfStudyDay(c.nextReview, h) - today) / DAY));
      if (offset < days) out[offset]++;
    }
  }
  return out;
}

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function forecastLabels(
  days = 7,
  now: Date | number = Date.now(),
  dayStartHour?: number,
): string[] {
  const h = resolveDayStartHour(dayStartHour);
  const todayStart = startOfStudyDay(now, h);
  return Array.from({ length: days }, (_, i) => {
    if (i === 0) return "Hari ini";
    if (i === 1) return "Besok";
    return DAY_NAMES[new Date(todayStart + i * DAY).getDay()];
  });
}

export function formatInterval(days: number) {
  if (days < 30) return `${days} hari`;
  if (days < 365) return `${(days / 30).toFixed(days < 60 ? 1 : 0)} bln`;
  return `${(days / 365).toFixed(1)} thn`;
}

/** Human, Indonesian relative time ("Baru saja", "3 jam lalu", "Kemarin", …). */
export function relTime(
  ts: number,
  now: Date | number = Date.now(),
  dayStartHour?: number,
): string {
  const nowMs = typeof now === "number" ? now : now.getTime();
  const h = resolveDayStartHour(dayStartHour);
  const diff = nowMs - ts;
  if (diff < 60_000) return "Baru saja";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`;
  const days = Math.round((startOfStudyDay(nowMs, h) - startOfStudyDay(ts, h)) / DAY);
  if (days === 0) return `${Math.floor(diff / 3_600_000)} jam lalu`;
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export const deckUpdatedLabel = (d: DeckItem) => (d.updatedAt ? relTime(d.updatedAt) : d.updated);

/** Rough session length: ~8s per review, ~20s per new card. */
export const estimateMinutes = (reviews: number, fresh: number) =>
  Math.max(1, Math.round((reviews * 8 + fresh * 20) / 60));

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
