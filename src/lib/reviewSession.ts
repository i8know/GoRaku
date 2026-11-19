import { qualityToRating, type FsrsGrade } from "./fsrsScheduler";
import type { SRSCard } from "./srs";

export const REVIEW_GRADES = [
  { q: 0, label: "Lupa", cls: "again" },
  { q: 2, label: "Sulit", cls: "hard" },
  { q: 4, label: "Baik", cls: "good" },
  { q: 5, label: "Mudah", cls: "easy" },
] as const;

export interface ReviewSessionCard {
  id: string;
  deckId?: string;
  subdeck?: string;
  word: string;
  reading: string;
  /** Inline HTML (sanitized for imported decks). */
  meaning: string;
  sentence: string;
  translation: string;
  audio?: string;
  sentenceAudio?: string;
  image?: string;
  /** True when re-queued inside the same session after "Lupa" (in-session drill). */
  isDrill?: boolean;
  /** Kunci unik salinan ulangan ("drill") agar Undo menghapus item yang tepat. */
  drillKey?: string;
}

export interface ReviewUndoItem {
  pos: number;
  cardId: string;
  deckId?: string;
  prevSrsCard: SRSCard | undefined;
  wasNew: boolean;
  wasRequeued: boolean;
  wasDrill: boolean;
  /** Kunci salinan drill yang ditambahkan saat `wasRequeued` bernilai true. */
  requeuedDrillKey?: string;
}

export type ReviewKeyAction =
  | { type: "none" }
  | { type: "undo" }
  | { type: "reveal" }
  | { type: "grade"; gradeIndex: 0 | 1 | 2 | 3 }
  | { type: "play-word" };

export interface ReviewKeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  hasCard: boolean;
  showAnswer: boolean;
  inEditableTarget?: boolean;
}

export interface SessionProgressSummary {
  totalBase: number;
  currentStep: number;
  progressPct: number;
  remainingDrills: number;
}

/**
 * Menghapus tepat satu salinan ulangan dari antrean berdasarkan `drillKey`.
 * Jika kunci tidak ditemukan atau kosong, antrean dikembalikan tanpa perubahan.
 */
export function removeDrillCardByKey<T extends { drillKey?: string }>(
  queue: readonly T[],
  drillKey: string | undefined,
): T[] {
  if (!drillKey) return [...queue];
  const exists = queue.some((item) => item.drillKey === drillKey);
  if (!exists) return [...queue];
  return queue.filter((item) => item.drillKey !== drillKey);
}

/**
 * Mengklasifikasikan kejadian keyboard pada halaman Review:
 * - Ctrl/Cmd+Z tetap memicu Undo;
 * - Event dengan ctrlKey/metaKey/altKey diabaikan untuk angka 1–4, Spasi/Enter, dan R;
 * - Event repeat (`e.repeat`) diabaikan untuk tombol penilaian 1–4.
 */
export function classifyReviewKeyEvent(e: ReviewKeyInput): ReviewKeyAction {
  if (e.isComposing || e.inEditableTarget) return { type: "none" };
  const lower = e.key.toLowerCase();

  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && lower === "z") {
    return { type: "undo" };
  }

  if (e.ctrlKey || e.metaKey || e.altKey) {
    return { type: "none" };
  }

  if (!e.hasCard) return { type: "none" };

  if (!e.showAnswer && (e.key === " " || e.key === "Enter")) {
    return { type: "reveal" };
  }

  if (
    e.showAnswer &&
    !e.repeat &&
    (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4")
  ) {
    return { type: "grade", gradeIndex: (Number(e.key) - 1) as 0 | 1 | 2 | 3 };
  }

  if (lower === "r") {
    return { type: "play-word" };
  }

  return { type: "none" };
}

export function formatReviewInterval(days: number): string {
  if (days < 30) return `${days} hari`;
  if (days < 365) return `${(days / 30).toFixed(days < 60 ? 1 : 0)} bln`;
  return `${(days / 365).toFixed(1)} thn`;
}

/**
 * Label kecil di bawah tombol nilai. Untuk kartu ulangan (drill), penilaian tidak
 * mengubah jadwal FSRS sehingga menampilkan teks bertema "Ulangi", bukan interval.
 */
export function getGradeButtonHint(
  quality: number,
  isDrill: boolean,
  intervals: Record<FsrsGrade, number>,
): string {
  if (quality === 0) return "Ulangi lagi";
  if (isDrill) return "Ulangi";
  return formatReviewInterval(intervals[qualityToRating(quality)]);
}

/**
 * Menghitung jumlah kartu unik non-drill yang telah dinilai pada sesi ini (aman terhadap Undo).
 */
export function countUniqueReviewedCards(
  history: readonly Pick<ReviewUndoItem, "cardId" | "deckId" | "wasDrill">[],
  fallbackDeckId?: string,
): number {
  const seen = new Set<string>();
  for (const item of history) {
    if (item.wasDrill) continue;
    seen.add(`${item.deckId || fallbackDeckId || ""}::${item.cardId}`);
  }
  return seen.size;
}

/**
 * Menghitung ringkasan progres sesi berbasis jumlah kartu non-ulangan (`!isDrill`)
 * sehingga bilah progres dan penyebut `x / y` tidak mundur saat salinan drill ditambahkan.
 */
export function computeSessionProgress(
  queue: readonly Pick<ReviewSessionCard, "isDrill">[],
  pos: number,
): SessionProgressSummary {
  const totalBase = queue.filter((c) => !c.isDrill).length;
  const safePos = Math.max(0, Math.min(pos, queue.length));
  const completedBase = queue.slice(0, safePos).filter((c) => !c.isDrill).length;
  const currentIsDrill = Boolean(queue[safePos]?.isDrill);
  const remainingDrills = queue.slice(safePos).filter((c) => c.isDrill).length;

  if (totalBase === 0) {
    return { totalBase: 0, currentStep: 0, progressPct: 0, remainingDrills };
  }

  const progressPct = Math.min(100, (completedBase / totalBase) * 100);
  const currentStep = currentIsDrill
    ? Math.max(1, completedBase)
    : Math.min(totalBase, completedBase + 1);

  return { totalBase, currentStep, progressPct, remainingDrills };
}
