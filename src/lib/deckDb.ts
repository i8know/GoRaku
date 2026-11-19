// IndexedDB storage for imported deck content and FSRS review logs.
// Deck metadata lives in zustand/localStorage, but card bodies, media blobs, and reviewLogs
// live in IndexedDB (managed via Dexie schema versions).
// Note: IndexedDB is available both on the main thread and inside Web Workers.

import Dexie, { type Table } from "dexie";
import type { ReviewLogEntry } from "./fsrsScheduler";
import { getDeckDbName } from "./userStorageScope";

export type { ReviewLogEntry };

export interface StoredCard {
  /** Anki note id (stable across re-imports of the same deck). */
  id: string;
  deckId: string;
  /** Plain text, furigana brackets removed. */
  word: string;
  /** Plain kana reading. */
  reading: string;
  /** Sanitized inline HTML (b/i/u/br/ruby only). */
  meaning: string;
  /** Sanitized inline HTML, may still contain Anki bracket furigana `漢字[かんじ]`. */
  sentence: string;
  translation: string;
  audio?: string;
  sentenceAudio?: string;
  image?: string;
  subdeck: string;
  tags: string[];
}

export const CARD_BATCH_SIZE = 500;

const DB_NAME = "ma-immersion-decks";
const CARDS = "cards";
const MEDIA = "media";

export interface KVRecord {
  key: string;
  value: string;
  updatedAt: number;
}

export class DeckDatabase extends Dexie {
  reviewLogs!: Table<ReviewLogEntry, number>;
  kv!: Table<KVRecord, string>;

  constructor(dbName = DB_NAME) {
    super(dbName);

    // v0.1 corresponds to native IndexedDB version 1 used by the legacy openDb()
    this.version(0.1).stores({
      cards: "",
      media: "",
    });

    this.version(1).stores({
      cards: "",
      media: "",
    });

    this.version(2)
      .stores({
        cards: "",
        media: "",
        reviewLogs: "++id, deckId, cardId, reviewedAt, [deckId+cardId]",
      })
      .upgrade(() => {
        // Safe upgrade: existing cards and media stores remain intact while adding reviewLogs.
      });

    this.version(3)
      .stores({
        cards: "",
        media: "",
        reviewLogs: "++id, deckId, cardId, reviewedAt, [deckId+cardId]",
        kv: "key",
      })
      .upgrade(() => {
        // Safe upgrade: existing cards, media, and reviewLogs remain intact while adding kv store.
      });
  }
}

export let deckDexie = new DeckDatabase(getDeckDbName());

/**
 * Mengganti instance Dexie deck agar mengarah ke basis data terisolasi milik pengguna aktif.
 * Menunggu antrean log review selesai sebelum menutup koneksi lama.
 */
export async function switchDeckDatabaseScope(userId: string | null): Promise<void> {
  await flushReviewLogs();
  const targetName = getDeckDbName(userId);
  if (deckDexie.name === targetName) return;
  try {
    deckDexie.close();
  } catch {
    // Abaikan galat saat menutup instance lama
  }
  deckDexie = new DeckDatabase(targetName);
}

export async function ensureDeckDbOpen(): Promise<void> {
  // Selalu panggil deckDexie.open() agar pemanggil serentak tetap menunggu dbReadyPromise
  // hingga upgrade versi selesai (isOpen() bisa bernilai true saat onupgradeneeded masih berjalan).
  await deckDexie.open();
}

export async function getKvValue(keyName: string): Promise<string | undefined> {
  await ensureDeckDbOpen();
  const row = await deckDexie.kv.get(keyName);
  return row?.value;
}

export async function putKvValue(keyName: string, value: string): Promise<void> {
  await ensureDeckDbOpen();
  await deckDexie.kv.put({
    key: keyName,
    value,
    updatedAt: Date.now(),
  });
}

export async function deleteKvValue(keyName: string): Promise<void> {
  await ensureDeckDbOpen();
  await deckDexie.kv.delete(keyName);
}

function mutateKvSyncIfOpen(
  op: "put" | "delete",
  keyName: string,
  value?: string,
  onError?: (err: unknown) => void,
): boolean {
  if (!deckDexie.isOpen()) return false;
  try {
    const db = deckDexie.backendDB();
    if (!db) return false;
    const tx = db.transaction("kv", "readwrite");
    if (onError) {
      tx.onabort = () => onError(tx.error ?? new Error("Transaksi sinkron kv dibatalkan"));
      tx.onerror = () => onError(tx.error ?? new Error("Transaksi sinkron kv gagal"));
    }
    const store = tx.objectStore("kv");
    if (op === "put" && value !== undefined) {
      store.put({ key: keyName, value, updatedAt: Date.now() });
    } else {
      store.delete(keyName);
    }
    const maybeCommit = (tx as IDBTransaction & { commit?: () => void }).commit;
    if (typeof maybeCommit === "function") maybeCommit.call(tx);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mengirim transaksi `put` IndexedDB secara sinkron bila koneksi Dexie sudah terbuka penuh.
 * Dipakai pada `pagehide`/`visibilitychange` agar antrean tulis yang masih menunggu debounce
 * sempat terkirim sebelum dokumen ditutup/dimuat ulang.
 */
export function putKvSyncIfOpen(
  keyName: string,
  value: string,
  onError?: (err: unknown) => void,
): boolean {
  return mutateKvSyncIfOpen("put", keyName, value, onError);
}

export function deleteKvSyncIfOpen(
  keyName: string,
  onError?: (err: unknown) => void,
): boolean {
  return mutateKvSyncIfOpen("delete", keyName, undefined, onError);
}

async function openDb(): Promise<IDBDatabase> {
  await ensureDeckDbOpen();
  return deckDexie.backendDB();
}

// Serialized promise queue for reviewLogs so synchronous store actions (review + Undo)
// execute their IndexedDB writes/deletes strictly in order.
let reviewLogQueue: Promise<unknown> = Promise.resolve();

function enqueueLogOp<T>(fn: () => Promise<T>): Promise<T> {
  const next = reviewLogQueue.then(fn, fn);
  reviewLogQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function flushReviewLogs(): Promise<void> {
  return reviewLogQueue.then(() => undefined);
}

export function appendReviewLog(entry: Omit<ReviewLogEntry, "id">): Promise<number> {
  return enqueueLogOp(async () => {
    return deckDexie.reviewLogs.add({ ...entry });
  });
}

export function removeLatestReviewLog(deckId: string, cardId: string): Promise<void> {
  return enqueueLogOp(async () => {
    const matches = await deckDexie.reviewLogs
      .where("[deckId+cardId]")
      .equals([deckId, cardId])
      .toArray();
    if (matches.length === 0) return;
    matches.sort((a, b) => (a.reviewedAt - b.reviewedAt) || ((a.id ?? 0) - (b.id ?? 0)));
    const latest = matches[matches.length - 1];
    if (latest?.id !== undefined) {
      await deckDexie.reviewLogs.delete(latest.id);
    }
  });
}

export function removeCardReviewLogs(deckId: string, cardIds: string[]): Promise<void> {
  if (cardIds.length === 0) return Promise.resolve();
  return enqueueLogOp(async () => {
    const pairs = cardIds.map((cardId) => [deckId, cardId] as [string, string]);
    await deckDexie.reviewLogs.where("[deckId+cardId]").anyOf(pairs).delete();
  });
}

export function removeDeckReviewLogs(deckId: string): Promise<void> {
  return enqueueLogOp(async () => {
    await deckDexie.reviewLogs.where("deckId").equals(deckId).delete();
  });
}

export async function getAllReviewLogs(): Promise<ReviewLogEntry[]> {
  await flushReviewLogs();
  return deckDexie.reviewLogs.orderBy("reviewedAt").toArray();
}

export async function getCardReviewLogs(cardId: string): Promise<ReviewLogEntry[]> {
  await flushReviewLogs();
  const rows = await deckDexie.reviewLogs.where("cardId").equals(cardId).toArray();
  return rows.sort((a, b) => (a.reviewedAt - b.reviewedAt) || ((a.id ?? 0) - (b.id ?? 0)));
}

export function clearAllReviewLogs(): Promise<void> {
  return enqueueLogOp(async () => {
    await deckDexie.reviewLogs.clear();
  });
}

export function replaceAllReviewLogs(entries: ReviewLogEntry[]): Promise<void> {
  return enqueueLogOp(async () => {
    await deckDexie.transaction("rw", deckDexie.reviewLogs, async () => {
      await deckDexie.reviewLogs.clear();
      if (entries.length > 0) {
        const sanitized = entries.map(({ id: _id, ...rest }) => rest);
        await deckDexie.reviewLogs.bulkAdd(sanitized);
      }
    });
  });
}

/** All keys are prefixed with the deck id so a whole deck can be fetched/deleted with one key range. */
const key = (deckId: string, id: string) => `${deckId}::${id}`;
const deckRange = (deckId: string) => IDBKeyRange.bound(`${deckId}::`, `${deckId}::\uffff`);

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Transaksi IndexedDB gagal"));
    tx.onabort = () => reject(tx.error ?? new Error("Transaksi IndexedDB dibatalkan"));
  });
}

export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name ?? "";
  const message = (err as { message?: string }).message ?? "";
  return name === "QuotaExceededError" || /quota/i.test(name) || /quota/i.test(message);
}

/** Write a batch of cards in a single IndexedDB readwrite transaction without awaiting per row. */
export async function putCards(cards: StoredCard[]): Promise<void> {
  if (cards.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(CARDS, "readwrite");
  const store = tx.objectStore(CARDS);
  for (const c of cards) store.put(c, key(c.deckId, c.id));
  await done(tx);
}

/** Fetch existing card IDs (note IDs) for a deck using getAllKeys without loading full card payloads. */
export async function getExistingCardIds(deckId: string): Promise<Set<string>> {
  const db = await openDb();
  const tx = db.transaction(CARDS, "readonly");
  const req = tx.objectStore(CARDS).getAllKeys(deckRange(deckId));
  const prefixLen = `${deckId}::`.length;
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      const keys = (req.result as IDBValidKey[]) ?? [];
      const out = new Set<string>();
      for (const k of keys) {
        if (typeof k === "string" && k.length > prefixLen) {
          out.add(k.slice(prefixLen));
        }
      }
      resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getCards(deckId: string): Promise<StoredCard[]> {
  const db = await openDb();
  const tx = db.transaction(CARDS, "readonly");
  const req = tx.objectStore(CARDS).getAll(deckRange(deckId));
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as StoredCard[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getCardCount(deckId: string): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(CARDS, "readonly");
  const req = tx.objectStore(CARDS).count(deckRange(deckId));
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDeckMediaCount(deckId: string): Promise<number> {
  const db = await openDb();
  const tx = db.transaction(MEDIA, "readonly");
  const req = tx.objectStore(MEDIA).count(deckRange(deckId));
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Fast O(decks) scan using a jumping key cursor to list all deckIds stored in IndexedDB. */
export async function listStoredDeckIds(): Promise<string[]> {
  const db = await openDb();
  const tx = db.transaction(CARDS, "readonly");
  const store = tx.objectStore(CARDS);
  const deckIds: string[] = [];
  return new Promise((resolve, reject) => {
    const req = store.openKeyCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(deckIds);
        return;
      }
      const k = String(cursor.key);
      const sep = k.indexOf("::");
      if (sep > 0) {
        const deckId = k.slice(0, sep);
        deckIds.push(deckId);
        cursor.continue(`${deckId}::\uffff\uffff`);
      } else {
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function putMedia(deckId: string, entries: [name: string, blob: Blob][]): Promise<void> {
  if (entries.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(MEDIA, "readwrite");
  const store = tx.objectStore(MEDIA);
  for (const [name, blob] of entries) store.put(blob, key(deckId, name));
  await done(tx);
}

export async function getMedia(deckId: string, name: string): Promise<Blob | undefined> {
  const db = await openDb();
  const tx = db.transaction(MEDIA, "readonly");
  const req = tx.objectStore(MEDIA).get(key(deckId, name));
  const directResult = await new Promise<Blob | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
  if (directResult) return directResult;

  // Fallback: check ancestor decks if deckId is a subdeck
  try {
    const { useAppStore } = await import("../store/useAppStore");
    const allDecks = useAppStore.getState().decks;
    let currentParentId = allDecks.find((d) => d.id === deckId)?.parentId;
    const visited = new Set<string>();
    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const tx2 = db.transaction(MEDIA, "readonly");
      const req2 = tx2.objectStore(MEDIA).get(key(currentParentId, name));
      const res = await new Promise<Blob | undefined>((resolve, reject) => {
        req2.onsuccess = () => resolve(req2.result as Blob | undefined);
        req2.onerror = () => reject(req2.error);
      });
      if (res) return res;
      currentParentId = allDecks.find((d) => d.id === currentParentId)?.parentId;
    }
  } catch {
    /* ignore fallback lookup errors */
  }

  return undefined;
}

export async function deleteCards(deckId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(CARDS, "readwrite");
  const store = tx.objectStore(CARDS);
  for (const id of ids) store.delete(key(deckId, id));
  await done(tx);
}

export async function deleteMedia(deckId: string, names: string[]): Promise<void> {
  if (names.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(MEDIA, "readwrite");
  const store = tx.objectStore(MEDIA);
  for (const name of names) store.delete(key(deckId, name));
  await done(tx);
}

export async function deleteDeckData(deckId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([CARDS, MEDIA], "readwrite");
  tx.objectStore(CARDS).delete(deckRange(deckId));
  tx.objectStore(MEDIA).delete(deckRange(deckId));
  await done(tx);
  await removeDeckReviewLogs(deckId);
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
