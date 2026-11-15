import type { BookRecord } from "./lexiconDb";
import { isMangaBook } from "./bookUtils";
import type { DeckActivity } from "../store/useReviewStore";

interface MinimalMinedItem {
  id: string;
}

/**
 * Menghitung kartu hasil mining pengguna dari buku/manga maupun studio teks.
 * Mengecualikan dua item sampel bawaan ("m1", "m2") di minedQueue awal.
 */
export function countUserMinedCards(
  books: BookRecord[],
  minedQueue: MinimalMinedItem[],
): number {
  const fromBooks = books.reduce((sum, book) => sum + (book.minedCount ?? 0), 0);
  const fromQueue = minedQueue.filter((m) => m.id !== "m1" && m.id !== "m2").length;
  return fromBooks + fromQueue;
}

/**
 * Menghitung review SRS nyata yang dilakukan pengguna (log Dexie atau aktivitas sesi).
 */
export function countCompletedReviews(
  reviewLogCount: number,
  activity: Record<string, DeckActivity | undefined>,
): number {
  const fromActivity = Object.values(activity).reduce(
    (sum, entry) => sum + (entry && entry.count > 0 ? entry.count : 0),
    0,
  );
  return Math.max(reviewLogCount, fromActivity);
}

/**
 * Mengembalikan rute pembacaan buku pertama atau "/library" jika rak masih kosong.
 */
export function getMiningActionPath(books: BookRecord[]): string {
  if (books.length === 0) return "/library";
  const first = books[0];
  return isMangaBook(first) ? `/manga/${first.id}` : `/library/${first.id}`;
}
