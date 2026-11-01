import Dexie, { type Table } from "dexie";

/**
 * Metadata kamus berformat Yomitan (dari index.json).
 */
export interface DictionaryRecord {
  id?: number;
  title: string;
  revision: string;
  format: number;
  author?: string;
  url?: string;
  description?: string;
  attribution: string;
  enabled: boolean;
  priority: number;
  termCount: number;
  tagCount?: number;
  metaCount?: number;
  importedAt: string;
}

/**
 * Entri kata kamus dari term_bank_N.json (Yomitan v3).
 * Urutan tuple resmi dictionary-term-bank-v3-schema.json:
 * [expression, reading, definitionTags, rules, score, glossary[], sequence, termTags]
 *
 * Catatan normalisasi:
 * - `reading` selalu dinormalisasi menjadi Hiragana (`toHiragana(rawReading || expression)`)
 *   dan diindeks agar pencarian kata berkana (baik Hiragana maupun Katakana) dapat
 *   dilakukan lewat indeks `reading` tanpa indeks ganda.
 * - `rawReading` menyimpan string bacaan asli dari berkas kamus untuk keperluan tampilan.
 */
export interface TermRecord {
  id?: number;
  dictId: number;
  expression: string;
  reading: string;
  rawReading: string;
  tags: string; // definitionTags (indeks 2 pada term_bank v3)
  rules: string; // rules konjugasi: v1, v5, adj-i, vs, vk, dll. (indeks 3)
  score: number; // skor prioritas entri di dalam kamus (indeks 4)
  glossary: string[]; // daftar arti/definisi (indeks 5)
  sequence: number; // nomor urut grup entri (indeks 6)
  termTags: string; // tag untuk bentuk term (indeks 7)
}

/**
 * Entri tag kamus dari tag_bank_N.json.
 * Urutan tuple: [name, category, order, notes, score]
 */
export interface TagRecord {
  id?: number;
  dictId: number;
  name: string;
  category: string;
  order: number;
  notes: string;
  score: number;
}

/**
 * Entri metadata kata dari term_meta_bank_N.json (frekuensi, pitch accent, IPA).
 * Urutan tuple: [expression, mode, data]
 * Pada Tahap 1 hanya diurai dan disimpan.
 */
export interface TermMetaRecord {
  id?: number;
  dictId: number;
  expression: string;
  mode: string;
  data: unknown;
}

export type MediaItemType = "novel" | "manga";
export type BookFormat = "epub" | "txt" | "cbz" | "zip" | "images";

/**
 * Metadata novel atau manga di Perpustakaan.
 */
export interface BookRecord {
  id: string;
  type?: MediaItemType; // "novel" | "manga" (default "novel" untuk data versi 1)
  title: string;
  author: string;
  volume?: string; // Nomor/nama volume opsional (mis. dari ComicInfo.xml)
  format: BookFormat;
  encoding?: string;
  coverBlob?: Blob;
  fileSize: number;
  totalChars?: number;
  pageCount?: number; // Jumlah halaman untuk manga
  currentPage?: number; // Indeks halaman terakhir dibaca (0-based) untuk manga
  readingDirection?: "rtl" | "ltr"; // Default "rtl" untuk manga
  pageOrder?: string[]; // Urutan nama entri halaman manga (natural sort / manual)
  progress: number; // 0..100
  lastLocation?: string; // EPUB CFI, offset karakter TXT, atau "page:N" untuk manga
  addedAt: string;
  lastReadAt?: string;
  minedCount: number;
}

/**
 * Blob berkas buku/arsip (.epub, .txt, .cbz, .zip) disimpan di tabel terpisah
 * agar query daftar item di halaman Perpustakaan tidak memuat seluruh arsip ke memori.
 */
export interface BookFileRecord {
  bookId: string;
  blob: Blob;
}

/**
 * Menyimpan berkas gambar per halaman untuk manga yang diimpor dari
 * pemilihan beberapa berkas gambar atau satu folder (webkitdirectory).
 * Dengan kunci gabungan `[bookId+pageName]`, setiap halaman dibaca secara
 * malas (lazy) satu per satu saat dibutuhkan tanpa memuat seluruh folder ke RAM.
 */
export interface MangaPageRecord {
  bookId: string;
  pageName: string;
  blob: Blob;
}

/**
 * Menyimpan cache hasil OCR per (bookId, pageIndex, bbox) agar tidak perlu
 * menjalankan ulang OCR ketika membuka kembali halaman yang sama.
 */
export interface OcrCacheRecord {
  id?: number;
  bookId: string;
  pageIndex: number;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  lang: "jpn" | "jpn_vert";
  rawText: string;
  text: string;
  confidence?: number;
  createdAt: string;
}

export class LexiconDatabase extends Dexie {
  dictionaries!: Table<DictionaryRecord, number>;
  terms!: Table<TermRecord, number>;
  tags!: Table<TagRecord, number>;
  termMeta!: Table<TermMetaRecord, number>;
  books!: Table<BookRecord, string>;
  bookFiles!: Table<BookFileRecord, string>;
  mangaPages!: Table<MangaPageRecord, [string, string]>;
  ocrCache!: Table<OcrCacheRecord, number>;

  constructor(dbName = "ma-immersion-lexicon") {
    super(dbName);

    this.version(1).stores({
      dictionaries: "++id, title, enabled, priority",
      terms: "++id, dictId, expression, reading",
      tags: "++id, dictId, [dictId+name]",
      termMeta: "++id, dictId, expression",
      books: "id, format, addedAt, lastReadAt",
      bookFiles: "bookId",
    });

    this.version(2)
      .stores({
        dictionaries: "++id, title, enabled, priority",
        terms: "++id, dictId, expression, reading",
        tags: "++id, dictId, [dictId+name]",
        termMeta: "++id, dictId, expression",
        books: "id, type, format, addedAt, lastReadAt",
        bookFiles: "bookId",
        mangaPages: "[bookId+pageName], bookId",
        ocrCache: "++id, [bookId+pageIndex], bookId",
      })
      .upgrade((tx) => {
        return tx
          .table("books")
          .toCollection()
          .modify((book: BookRecord) => {
            if (!book.type) {
              book.type =
                book.format === "cbz" ||
                book.format === "zip" ||
                book.format === "images"
                  ? "manga"
                  : "novel";
            }
          });
      });
  }
}

export const lexiconDb = new LexiconDatabase();

/**
 * Mengambil seluruh daftar kamus terurut berdasarkan `priority` (kecil ke besar).
 */
export async function listDictionaries(
  db: LexiconDatabase = lexiconDb,
): Promise<DictionaryRecord[]> {
  const all = await db.dictionaries.toArray();
  return all.sort((a, b) => a.priority - b.priority || (a.id ?? 0) - (b.id ?? 0));
}

/**
 * Mengaktifkan atau menonaktifkan kamus tertentu.
 */
export async function setDictionaryEnabled(
  dictId: number,
  enabled: boolean,
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  await db.dictionaries.update(dictId, { enabled });
}

/**
 * Memperbarui urutan prioritas kamus sesuai urutan ID yang diberikan (1, 2, 3, ...).
 */
export async function updateDictionaryPriorities(
  orderedIds: number[],
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  await db.transaction("rw", db.dictionaries, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.dictionaries.update(orderedIds[i], { priority: i + 1 });
    }
  });
}

/**
 * Menghapus kamus beserta seluruh entri terms, tags, dan termMeta miliknya.
 * Penghapusan dilakukan bertahap per 5.000 kunci agar tidak memblokir transaksi terlalu lama.
 */
export async function deleteDictionaryCascade(
  dictId: number,
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  const BATCH_DELETE = 5000;

  while (true) {
    const keys = await db.terms
      .where("dictId")
      .equals(dictId)
      .limit(BATCH_DELETE)
      .primaryKeys();
    if (keys.length === 0) break;
    await db.terms.bulkDelete(keys);
  }

  while (true) {
    const keys = await db.termMeta
      .where("dictId")
      .equals(dictId)
      .limit(BATCH_DELETE)
      .primaryKeys();
    if (keys.length === 0) break;
    await db.termMeta.bulkDelete(keys);
  }

  await db.tags.where("dictId").equals(dictId).delete();
  await db.dictionaries.delete(dictId);

  // Rapikan kembali nomor prioritas kamus yang tersisa
  const remaining = await listDictionaries(db);
  await updateDictionaryPriorities(
    remaining.map((d) => d.id!).filter((id) => typeof id === "number"),
    db,
  );
}

