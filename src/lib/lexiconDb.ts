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

/**
 * Metadata novel di Perpustakaan (Tahap 3 & 4).
 */
export interface BookRecord {
  id: string;
  title: string;
  author: string;
  format: "epub" | "txt";
  encoding?: string;
  coverBlob?: Blob;
  fileSize: number;
  totalChars?: number;
  progress: number; // 0..100
  lastLocation?: string; // EPUB CFI atau offset karakter TXT
  addedAt: string;
  lastReadAt?: string;
  minedCount: number;
}

/**
 * Blob berkas buku disimpan di tabel terpisah agar query daftar buku
 * di halaman Perpustakaan tidak memuat puluhan MB berkas ke memori.
 */
export interface BookFileRecord {
  bookId: string;
  blob: Blob;
}

export class LexiconDatabase extends Dexie {
  dictionaries!: Table<DictionaryRecord, number>;
  terms!: Table<TermRecord, number>;
  tags!: Table<TagRecord, number>;
  termMeta!: Table<TermMetaRecord, number>;
  books!: Table<BookRecord, string>;
  bookFiles!: Table<BookFileRecord, string>;

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

