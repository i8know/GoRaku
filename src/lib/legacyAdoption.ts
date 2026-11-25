import {
  deleteDictionaryCascade,
  lexiconDb,
  switchLexiconDatabaseScope,
  type BookFileRecord,
  type BookRecord,
  type DictionaryRecord,
  type MangaPageRecord,
  type OcrCacheRecord,
  type TagRecord,
  type TermMetaRecord,
  type TermRecord,
} from "./lexiconDb";
import {
  ensureDeckDbOpen,
  flushReviewLogs,
  deckDexie,
  switchDeckDatabaseScope,
  type ReviewLogEntry,
} from "./deckDb";
import { resetDeckCardsSeedState } from "./deckCards";
import {
  questionPackDb,
  switchQuestionPackDatabaseScope,
} from "./questionPackStorage";
import type { QuestionPack } from "./questionPack";
import {
  flushReviewStorageWrites,
  resetReviewStorageForScopeChange,
  REVIEW_MIGRATION_DONE_KEY,
  REVIEW_STORAGE_KEY,
} from "./reviewStorage";
import {
  ALL_USER_SCOPED_BASE_KEYS,
  DEVICE_ID_KEY_PREFIX,
  getScopedKey,
  LEGACY_APP_STORAGE_KEY,
  LEGACY_DECK_DB_NAME,
  LEGACY_EXAM_SESSIONS_KEY,
  LEGACY_LEXICON_DB_NAME,
  LEGACY_QUESTION_PACK_DB_NAME,
  LEGACY_REVIEW_STORAGE_KEY,
  LEGACY_SEED_FLAG,
  normalizeScopeUserId,
} from "./userStorageScope";
import { useAppStore } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";

export const LEGACY_ADOPTED_BY_KEY = "goraku-legacy-adopted-by";
export const LEGACY_DECLINED_KEY_PREFIX = "goraku-legacy-declined";

const deferredLegacyUsersInSession = new Set<string>();

export interface LegacyDataSummary {
  hasData: boolean;
  hasAppStorage: boolean;
  hasReviewStorage: boolean;
  customDeckCount: number;
  cardCount: number;
  mediaCount: number;
  reviewLogCount: number;
  bookCount: number;
  dictionaryCount: number;
  questionPackCount: number;
}

export interface AdoptLegacyOptions {
  /** Hook pengujian untuk menyimulasikan galat di tengah proses adopsi sebelum penanda selesai ditulis. */
  onBeforeMarkAdopted?: () => void | Promise<void>;
}

export interface AdoptLegacyResult {
  summary: LegacyDataSummary;
  copiedLocalKeys: string[];
  copiedCards: number;
  copiedMedia: number;
  copiedReviewLogs: number;
  copiedBooks: number;
  copiedDictionaries: number;
  copiedQuestionPacks: number;
}

function safeLocalGet(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
      return localStorage.getItem(key);
    }
  } catch {
    // Abaikan galat akses penyimpanan
  }
  return null;
}

function safeLocalSet(key: string, value: string): void {
  if (typeof localStorage === "undefined" || typeof localStorage.setItem !== "function") {
    throw new Error("localStorage tidak tersedia di lingkungan ini.");
  }
  localStorage.setItem(key, value);
}

export function getLegacyAdoptedBy(): string | null {
  return normalizeScopeUserId(safeLocalGet(LEGACY_ADOPTED_BY_KEY));
}

export function hasLegacyDeclinedForUser(userId: string): boolean {
  const uid = normalizeScopeUserId(userId);
  if (!uid) return false;
  return safeLocalGet(`${LEGACY_DECLINED_KEY_PREFIX}::${uid}`) === "1";
}

export function isLegacyDeferredInSession(userId: string): boolean {
  const uid = normalizeScopeUserId(userId);
  return uid ? deferredLegacyUsersInSession.has(uid) : false;
}

export function markLegacyDeclinedForUser(userId: string): void {
  const uid = normalizeScopeUserId(userId);
  if (!uid) return;
  try {
    safeLocalSet(`${LEGACY_DECLINED_KEY_PREFIX}::${uid}`, "1");
  } catch {
    // Tetap tandai di sesi memori jika localStorage diblokir
  }
  deferredLegacyUsersInSession.add(uid);
}

export function deferLegacyForSession(userId: string): void {
  const uid = normalizeScopeUserId(userId);
  if (!uid) return;
  deferredLegacyUsersInSession.add(uid);
}

export function resetLegacyAdoptionSessionForTest(): void {
  deferredLegacyUsersInSession.clear();
}

/**
 * Menghapus seluruh data lokal warisan pra-B1 (`localStorage` tanpa namespace + 3 DB IndexedDB lama)
 * beserta penanda adopsi/penolakan dari peramban ini agar tidak tertinggal atau bocor ke akun lain.
 */
export async function clearLegacyLocalData(): Promise<void> {
  deferredLegacyUsersInSession.clear();

  try {
    if (typeof localStorage !== "undefined") {
      for (const baseKey of ALL_USER_SCOPED_BASE_KEYS) {
        localStorage.removeItem(baseKey);
      }
      localStorage.removeItem(LEGACY_ADOPTED_BY_KEY);
      if (typeof localStorage.length === "number" && typeof localStorage.key === "function") {
        const declinedKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`${LEGACY_DECLINED_KEY_PREFIX}::`)) {
            declinedKeys.push(k);
          }
        }
        for (const k of declinedKeys) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {
    // Abaikan galat akses localStorage
  }

  // Tutup koneksi Dexie bila kebetulan masih menunjuk ke DB warisan
  try {
    if (deckDexie.name === LEGACY_DECK_DB_NAME) deckDexie.close();
  } catch {
    // Abaikan
  }
  try {
    if (lexiconDb.name === LEGACY_LEXICON_DB_NAME) lexiconDb.close();
  } catch {
    // Abaikan
  }
  try {
    if (questionPackDb.name === LEGACY_QUESTION_PACK_DB_NAME) questionPackDb.close();
  } catch {
    // Abaikan
  }

  if (typeof indexedDB !== "undefined" && typeof indexedDB.deleteDatabase === "function") {
    const legacyDbs = [
      LEGACY_DECK_DB_NAME,
      LEGACY_LEXICON_DB_NAME,
      LEGACY_QUESTION_PACK_DB_NAME,
    ];
    await Promise.all(
      legacyDbs.map(
        (name) =>
          new Promise<void>((resolve) => {
            try {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            } catch {
              resolve();
            }
          }),
      ),
    );
  }
}

async function doesIndexedDbExist(dbName: string): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;

  if (typeof indexedDB.databases === "function") {
    try {
      const list = await indexedDB.databases();
      if (Array.isArray(list)) {
        return list.some((d) => d.name === dbName && (d.version ?? 1) > 0);
      }
    } catch {
      // Lanjut ke probe aman di bawah bila databases() gagal
    }
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (exists: boolean) => {
      if (settled) return;
      settled = true;
      resolve(exists);
    };

    try {
      const req = indexedDB.open(dbName);
      req.onupgradeneeded = () => {
        // DB belum ada -> batalkan transaksi upgrade agar tidak pernah membuat DB kosong baru.
        try {
          req.transaction?.abort();
        } catch {
          // Abaikan galat abort
        }
        finish(false);
      };
      req.onsuccess = () => {
        try {
          req.result.close();
        } catch {
          // Abaikan
        }
        finish(true);
      };
      req.onerror = () => finish(false);
    } catch {
      finish(false);
    }
  });
}

async function openExistingNativeIdb(dbName: string): Promise<IDBDatabase | null> {
  if (!(await doesIndexedDbExist(dbName))) return null;
  return new Promise<IDBDatabase | null>((resolve, reject) => {
    try {
      const req = indexedDB.open(dbName);
      req.onupgradeneeded = () => {
        try {
          req.transaction?.abort();
        } catch {
          // Abaikan
        }
        resolve(null);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error(`Gagal membuka DB lama ${dbName}`));
    } catch (err) {
      reject(err);
    }
  });
}

function idbCountStore(db: IDBDatabase, storeName: string): Promise<number> {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve(0);
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).count();
    req.onsuccess = () => resolve(Number(req.result ?? 0));
    req.onerror = () => reject(req.error ?? new Error(`Gagal menghitung ${storeName}`));
  });
}

function idbReadAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve([]);
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error(`Gagal membaca ${storeName}`));
  });
}

function idbReadKeyValuePairs<V>(
  db: IDBDatabase,
  storeName: string,
): Promise<Array<{ key: IDBValidKey; value: V }>> {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const out: Array<{ key: IDBValidKey; value: V }> = [];
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(out);
        return;
      }
      out.push({ key: cursor.key, value: cursor.value as V });
      cursor.continue();
    };
    req.onerror = () => reject(req.error ?? new Error(`Gagal memindai ${storeName}`));
  });
}

function idbDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Transaksi IndexedDB gagal"));
    tx.onabort = () => reject(tx.error ?? new Error("Transaksi IndexedDB dibatalkan"));
  });
}

function countAppStorageCustomDecks(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as { state?: { decks?: Array<{ id?: string }> } };
    const decks = parsed?.state?.decks;
    if (!Array.isArray(decks)) return 0;
    return decks.length;
  } catch {
    return 0;
  }
}

function reviewLogSig(log: Omit<ReviewLogEntry, "id">): string {
  return `${log.deckId}::${log.cardId}::${log.reviewedAt}::${log.rating}::${log.state}`;
}

function ocrCacheSig(row: Pick<OcrCacheRecord, "bookId" | "pageIndex" | "bbox">): string {
  return `${row.bookId}::${row.pageIndex}::${row.bbox?.x ?? 0},${row.bbox?.y ?? 0},${row.bbox?.w ?? 0},${row.bbox?.h ?? 0}`;
}

/**
 * Memeriksa apakah terdapat data lokal lama (sebelum sistem akun B1) di peramban ini.
 * Tidak membuat atau mengubah DB baru/lama sama sekali.
 */
export async function detectLegacyDataSummary(): Promise<LegacyDataSummary> {
  const legacyAppRaw = safeLocalGet(LEGACY_APP_STORAGE_KEY);
  const legacyReviewRaw = safeLocalGet(LEGACY_REVIEW_STORAGE_KEY);
  const hasExamSessions = Boolean(safeLocalGet(LEGACY_EXAM_SESSIONS_KEY));
  const customDeckCount = countAppStorageCustomDecks(legacyAppRaw);

  let cardCount = 0;
  let mediaCount = 0;
  let reviewLogCount = 0;
  let hasReviewInKv = false;
  let bookCount = 0;
  let dictionaryCount = 0;
  let questionPackCount = 0;

  const legacyDeckDb = await openExistingNativeIdb(LEGACY_DECK_DB_NAME);
  if (legacyDeckDb) {
    try {
      cardCount = await idbCountStore(legacyDeckDb, "cards");
      mediaCount = await idbCountStore(legacyDeckDb, "media");
      reviewLogCount = await idbCountStore(legacyDeckDb, "reviewLogs");
      if (legacyDeckDb.objectStoreNames.contains("kv")) {
        const kvRows = await idbReadAll<{ key: string; value: string }>(legacyDeckDb, "kv");
        hasReviewInKv = kvRows.some(
          (r) => r.key === REVIEW_STORAGE_KEY && typeof r.value === "string" && r.value.length > 0,
        );
      }
    } finally {
      legacyDeckDb.close();
    }
  }

  const legacyLexDb = await openExistingNativeIdb(LEGACY_LEXICON_DB_NAME);
  if (legacyLexDb) {
    try {
      bookCount = await idbCountStore(legacyLexDb, "books");
      dictionaryCount = await idbCountStore(legacyLexDb, "dictionaries");
    } finally {
      legacyLexDb.close();
    }
  }

  const legacyPackDb = await openExistingNativeIdb(LEGACY_QUESTION_PACK_DB_NAME);
  if (legacyPackDb) {
    try {
      questionPackCount = await idbCountStore(legacyPackDb, "packs");
    } finally {
      legacyPackDb.close();
    }
  }

  const hasAppStorage = Boolean(legacyAppRaw);
  const hasReviewStorage = Boolean(legacyReviewRaw) || hasReviewInKv;
  const hasData =
    hasAppStorage ||
    hasReviewStorage ||
    hasExamSessions ||
    cardCount > 0 ||
    mediaCount > 0 ||
    reviewLogCount > 0 ||
    bookCount > 0 ||
    dictionaryCount > 0 ||
    questionPackCount > 0;

  return {
    hasData,
    hasAppStorage,
    hasReviewStorage,
    customDeckCount,
    cardCount,
    mediaCount,
    reviewLogCount,
    bookCount,
    dictionaryCount,
    questionPackCount,
  };
}

/**
 * Menentukan apakah pengguna yang baru masuk perlu ditawari adopsi data lokal lama.
 * Hanya bernilai non-null jika:
 * 1. Belum ada akun mana pun di perangkat ini yang mengadopsi data lama (`goraku-legacy-adopted-by`).
 * 2. Akun ini belum memilih "Mulai kosong" dan belum menunda ("Nanti") pada sesi ini.
 * 3. Memang terdapat data lokal tanpa akun di perangkat.
 */
export async function shouldPromptLegacyAdoption(
  userId: string,
): Promise<LegacyDataSummary | null> {
  const uid = normalizeScopeUserId(userId);
  if (!uid) return null;
  if (getLegacyAdoptedBy() !== null) return null;
  if (hasLegacyDeclinedForUser(uid) || isLegacyDeferredInSession(uid)) {
    return null;
  }

  const summary = await detectLegacyDataSummary();
  return summary.hasData ? summary : null;
}

/**
 * Menyalin seluruh data lokal tanpa akun (`localStorage` + 3 DB Dexie) ke ruang akun `userId`
 * secara idempoten (aman diulang bila terputus di tengah), memverifikasi kelengkapan salinan,
 * dan mempertahankan data lama di tempat semula sebagai cadangan (tidak dihapus pada B1).
 */
export async function adoptLegacyDataForUser(
  userId: string,
  options: AdoptLegacyOptions = {},
): Promise<AdoptLegacyResult> {
  const uid = normalizeScopeUserId(userId);
  if (!uid) {
    throw new Error("ID pengguna tidak valid untuk mengadopsi data lokal.");
  }

  const summary = await detectLegacyDataSummary();
  const copiedLocalKeys: string[] = [];

  await Promise.allSettled([flushReviewStorageWrites(), flushReviewLogs()]);

  // 1. Salin seluruh kunci localStorage warisan (kecuali device_id yang selalu unik per akun)
  for (const baseKey of ALL_USER_SCOPED_BASE_KEYS) {
    if (baseKey === DEVICE_ID_KEY_PREFIX) continue;
    const legacyVal = safeLocalGet(baseKey);
    if (legacyVal === null) continue;
    const targetKey = getScopedKey(baseKey, uid);
    safeLocalSet(targetKey, legacyVal);
    if (safeLocalGet(targetKey) !== legacyVal) {
      throw new Error(`Verifikasi penyalinan kunci ${baseKey} gagal.`);
    }
    copiedLocalKeys.push(baseKey);
  }

  // 2. Salin ma-immersion-decks -> goraku-<uid>-decks (cards, media, kv, reviewLogs)
  let copiedCards = 0;
  let copiedMedia = 0;
  let copiedReviewLogs = 0;

  const legacyDeckDb = await openExistingNativeIdb(LEGACY_DECK_DB_NAME);
  if (legacyDeckDb) {
    try {
      await switchDeckDatabaseScope(uid);
      await ensureDeckDbOpen();
      const targetNativeDb = deckDexie.backendDB();

      if (legacyDeckDb.objectStoreNames.contains("cards")) {
        const cardEntries = await idbReadKeyValuePairs<unknown>(legacyDeckDb, "cards");
        if (cardEntries.length > 0) {
          const batchSize = 250;
          for (let i = 0; i < cardEntries.length; i += batchSize) {
            const batch = cardEntries.slice(i, i + batchSize);
            const tx = targetNativeDb.transaction("cards", "readwrite");
            const store = tx.objectStore("cards");
            for (const entry of batch) {
              store.put(entry.value, entry.key);
            }
            await idbDone(tx);
          }
          copiedCards = cardEntries.length;
        }
        const targetCount = await idbCountStore(targetNativeDb, "cards");
        if (targetCount < cardEntries.length) {
          throw new Error(
            `Verifikasi kartu gagal: tersalin ${targetCount} dari ${cardEntries.length}.`,
          );
        }
      }

      if (legacyDeckDb.objectStoreNames.contains("media")) {
        const mediaEntries = await idbReadKeyValuePairs<unknown>(legacyDeckDb, "media");
        if (mediaEntries.length > 0) {
          const batchSize = 50;
          for (let i = 0; i < mediaEntries.length; i += batchSize) {
            const batch = mediaEntries.slice(i, i + batchSize);
            const tx = targetNativeDb.transaction("media", "readwrite");
            const store = tx.objectStore("media");
            for (const entry of batch) {
              store.put(entry.value, entry.key);
            }
            await idbDone(tx);
          }
          copiedMedia = mediaEntries.length;
        }
        const targetMediaCount = await idbCountStore(targetNativeDb, "media");
        if (targetMediaCount < mediaEntries.length) {
          throw new Error(
            `Verifikasi media gagal: tersalin ${targetMediaCount} dari ${mediaEntries.length}.`,
          );
        }
      }

      if (legacyDeckDb.objectStoreNames.contains("kv")) {
        const kvRows = await idbReadAll<{ key: string; value: string; updatedAt?: number }>(
          legacyDeckDb,
          "kv",
        );
        for (const row of kvRows) {
          const mappedKey =
            row.key === REVIEW_STORAGE_KEY || row.key === REVIEW_MIGRATION_DONE_KEY
              ? getScopedKey(row.key, uid)
              : row.key;
          await deckDexie.kv.put({
            key: mappedKey,
            value: row.value,
            updatedAt: row.updatedAt ?? Date.now(),
          });
          const check = await deckDexie.kv.get(mappedKey);
          if (!check || check.value !== row.value) {
            throw new Error(`Verifikasi kv gagal untuk kunci ${mappedKey}.`);
          }
        }
      }

      if (legacyDeckDb.objectStoreNames.contains("reviewLogs")) {
        const legacyLogs = await idbReadAll<ReviewLogEntry>(legacyDeckDb, "reviewLogs");
        if (legacyLogs.length > 0) {
          const existingTargetLogs = await deckDexie.reviewLogs.toArray();
          const seenSigs = new Set(existingTargetLogs.map((l) => reviewLogSig(l)));
          const missingLogs: Array<Omit<ReviewLogEntry, "id">> = [];
          const expectedUniqueSigs = new Set(seenSigs);

          for (const rawLog of legacyLogs) {
            const { id: _oldId, ...rest } = rawLog;
            const sig = reviewLogSig(rest);
            expectedUniqueSigs.add(sig);
            if (!seenSigs.has(sig)) {
              seenSigs.add(sig);
              missingLogs.push(rest);
            }
          }

          if (missingLogs.length > 0) {
            await deckDexie.reviewLogs.bulkAdd(missingLogs);
            copiedReviewLogs = missingLogs.length;
          }

          const finalLogs = await deckDexie.reviewLogs.toArray();
          const finalSigs = new Set(finalLogs.map((l) => reviewLogSig(l)));
          for (const sig of expectedUniqueSigs) {
            if (!finalSigs.has(sig)) {
              throw new Error("Verifikasi riwayat reviewLogs gagal setelah penyalinan.");
            }
          }
        }
      }
    } finally {
      legacyDeckDb.close();
    }
  }

  // 3. Salin ma-immersion-lexicon -> goraku-<uid>-lexicon
  let copiedBooks = 0;
  let copiedDictionaries = 0;

  const legacyLexDb = await openExistingNativeIdb(LEGACY_LEXICON_DB_NAME);
  if (legacyLexDb) {
    try {
      switchLexiconDatabaseScope(uid);
      await lexiconDb.open();

      if (legacyLexDb.objectStoreNames.contains("dictionaries")) {
        const legacyDicts = await idbReadAll<DictionaryRecord>(legacyLexDb, "dictionaries");
        const legacyTerms = await idbReadAll<TermRecord>(legacyLexDb, "terms");
        const legacyTags = await idbReadAll<TagRecord>(legacyLexDb, "tags");
        const legacyMeta = await idbReadAll<TermMetaRecord>(legacyLexDb, "termMeta");

        const termsByDict = new Map<number, TermRecord[]>();
        for (const t of legacyTerms) {
          const arr = termsByDict.get(t.dictId) ?? [];
          arr.push(t);
          termsByDict.set(t.dictId, arr);
        }
        const tagsByDict = new Map<number, TagRecord[]>();
        for (const tg of legacyTags) {
          const arr = tagsByDict.get(tg.dictId) ?? [];
          arr.push(tg);
          tagsByDict.set(tg.dictId, arr);
        }
        const metaByDict = new Map<number, TermMetaRecord[]>();
        for (const m of legacyMeta) {
          const arr = metaByDict.get(m.dictId) ?? [];
          arr.push(m);
          metaByDict.set(m.dictId, arr);
        }

        for (const oldDict of legacyDicts) {
          const oldId = oldDict.id;
          const dictTerms = oldId != null ? termsByDict.get(oldId) ?? [] : [];
          const dictTags = oldId != null ? tagsByDict.get(oldId) ?? [] : [];
          const dictMeta = oldId != null ? metaByDict.get(oldId) ?? [] : [];

          const targetExisting = (await lexiconDb.dictionaries.toArray()).find(
            (d) => d.title === oldDict.title && d.revision === oldDict.revision,
          );

          let targetDictId = targetExisting?.id;
          let needsCopyDictContent = true;

          if (targetDictId != null) {
            const [tCount, tgCount, mCount] = await Promise.all([
              lexiconDb.terms.where("dictId").equals(targetDictId).count(),
              lexiconDb.tags.where("dictId").equals(targetDictId).count(),
              lexiconDb.termMeta.where("dictId").equals(targetDictId).count(),
            ]);
            if (
              tCount >= dictTerms.length &&
              tgCount >= dictTags.length &&
              mCount >= dictMeta.length
            ) {
              needsCopyDictContent = false;
            } else {
              await deleteDictionaryCascade(targetDictId, lexiconDb);
              targetDictId = undefined;
            }
          }

          if (needsCopyDictContent) {
            const { id: _dropId, ...dictRest } = oldDict;
            const newDictId = await lexiconDb.dictionaries.add(dictRest);
            const batchSize = 500;

            for (let i = 0; i < dictTerms.length; i += batchSize) {
              const chunk = dictTerms
                .slice(i, i + batchSize)
                .map(({ id: _id, ...rest }) => ({ ...rest, dictId: newDictId }));
              await lexiconDb.terms.bulkAdd(chunk);
            }
            for (let i = 0; i < dictTags.length; i += batchSize) {
              const chunk = dictTags
                .slice(i, i + batchSize)
                .map(({ id: _id, ...rest }) => ({ ...rest, dictId: newDictId }));
              await lexiconDb.tags.bulkAdd(chunk);
            }
            for (let i = 0; i < dictMeta.length; i += batchSize) {
              const chunk = dictMeta
                .slice(i, i + batchSize)
                .map(({ id: _id, ...rest }) => ({ ...rest, dictId: newDictId }));
              await lexiconDb.termMeta.bulkAdd(chunk);
            }

            const verifyTerms = await lexiconDb.terms.where("dictId").equals(newDictId).count();
            if (verifyTerms < dictTerms.length) {
              throw new Error(
                `Verifikasi istilah kamus "${oldDict.title}" gagal (${verifyTerms}/${dictTerms.length}).`,
              );
            }
            copiedDictionaries += 1;
          }
        }

        const finalDictCount = await lexiconDb.dictionaries.count();
        if (finalDictCount < legacyDicts.length) {
          throw new Error(
            `Verifikasi kamus gagal: tersalin ${finalDictCount} dari ${legacyDicts.length}.`,
          );
        }
      }

      if (legacyLexDb.objectStoreNames.contains("books")) {
        const legacyBooks = await idbReadAll<BookRecord>(legacyLexDb, "books");
        if (legacyBooks.length > 0) {
          await lexiconDb.books.bulkPut(legacyBooks);
          copiedBooks = legacyBooks.length;
        }
        const finalBooks = await lexiconDb.books.count();
        if (finalBooks < legacyBooks.length) {
          throw new Error(`Verifikasi daftar buku gagal: ${finalBooks}/${legacyBooks.length}.`);
        }
      }

      if (legacyLexDb.objectStoreNames.contains("bookFiles")) {
        const legacyFiles = await idbReadAll<BookFileRecord>(legacyLexDb, "bookFiles");
        for (const f of legacyFiles) {
          await lexiconDb.bookFiles.put(f);
        }
        const finalFiles = await lexiconDb.bookFiles.count();
        if (finalFiles < legacyFiles.length) {
          throw new Error(`Verifikasi berkas buku gagal: ${finalFiles}/${legacyFiles.length}.`);
        }
      }

      if (legacyLexDb.objectStoreNames.contains("mangaPages")) {
        const legacyPages = await idbReadAll<MangaPageRecord>(legacyLexDb, "mangaPages");
        for (let i = 0; i < legacyPages.length; i += 25) {
          await lexiconDb.mangaPages.bulkPut(legacyPages.slice(i, i + 25));
        }
        const finalPages = await lexiconDb.mangaPages.count();
        if (finalPages < legacyPages.length) {
          throw new Error(`Verifikasi halaman manga gagal: ${finalPages}/${legacyPages.length}.`);
        }
      }

      if (legacyLexDb.objectStoreNames.contains("ocrCache")) {
        const legacyOcr = await idbReadAll<OcrCacheRecord>(legacyLexDb, "ocrCache");
        if (legacyOcr.length > 0) {
          const existingOcr = await lexiconDb.ocrCache.toArray();
          const seenOcr = new Set(existingOcr.map((r) => ocrCacheSig(r)));
          const missingOcr: Array<Omit<OcrCacheRecord, "id">> = [];
          for (const row of legacyOcr) {
            const { id: _id, ...rest } = row;
            const sig = ocrCacheSig(rest);
            if (!seenOcr.has(sig)) {
              seenOcr.add(sig);
              missingOcr.push(rest);
            }
          }
          if (missingOcr.length > 0) {
            await lexiconDb.ocrCache.bulkAdd(missingOcr);
          }
        }
      }
    } finally {
      legacyLexDb.close();
    }
  }

  // 4. Salin ma-immersion-question-packs -> goraku-<uid>-question-packs
  let copiedQuestionPacks = 0;
  const legacyPackDb = await openExistingNativeIdb(LEGACY_QUESTION_PACK_DB_NAME);
  if (legacyPackDb) {
    try {
      switchQuestionPackDatabaseScope(uid);
      await questionPackDb.open();
      if (legacyPackDb.objectStoreNames.contains("packs")) {
        const legacyPacks = await idbReadAll<QuestionPack>(legacyPackDb, "packs");
        if (legacyPacks.length > 0) {
          await questionPackDb.packs.bulkPut(legacyPacks);
          copiedQuestionPacks = legacyPacks.length;
        }
        const finalPacks = await questionPackDb.packs.count();
        if (finalPacks < legacyPacks.length) {
          throw new Error(`Verifikasi paket soal gagal: ${finalPacks}/${legacyPacks.length}.`);
        }
      }
    } finally {
      legacyPackDb.close();
    }
  }

  // Hook opsional untuk menguji ketahanan ketika terjadi kegagalan sebelum marker ditulis
  await options.onBeforeMarkAdopted?.();

  // Pastikan marker seed terpasang agar seed default tidak menimpa data yang baru diadopsi
  if (summary.cardCount > 0 && !safeLocalGet(getScopedKey(LEGACY_SEED_FLAG, uid))) {
    safeLocalSet(getScopedKey(LEGACY_SEED_FLAG, uid), "1");
  }

  // Hanya tulis penanda adopsi selesai SETELAH semua salinan terverifikasi.
  // Data lama di localStorage/IndexedDB dibiarkan utuh sebagai cadangan pada tahap B1.
  safeLocalSet(LEGACY_ADOPTED_BY_KEY, uid);

  await resetReviewStorageForScopeChange();
  resetDeckCardsSeedState();
  await Promise.all([
    useAppStore.persist.rehydrate(),
    useReviewStore.persist.rehydrate(),
  ]);

  return {
    summary,
    copiedLocalKeys,
    copiedCards,
    copiedMedia,
    copiedReviewLogs,
    copiedBooks,
    copiedDictionaries,
    copiedQuestionPacks,
  };
}
