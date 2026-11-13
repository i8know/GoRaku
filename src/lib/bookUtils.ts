import type { BookRecord } from "./lexiconDb";

/**
 * Mengidentifikasi apakah koleksi bacaan berjenis manga/komik berdasarkan tipe atau format arsip.
 */
export function isMangaBook(book: BookRecord): boolean {
  return (
    book.type === "manga" ||
    book.format === "cbz" ||
    book.format === "zip" ||
    book.format === "images"
  );
}

