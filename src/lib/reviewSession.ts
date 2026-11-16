import type { SRSCard } from "./srs";

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
