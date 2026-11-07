// IndexedDB storage for imported deck content.
// Deck metadata lives in zustand/localStorage, but card bodies and media blobs
// are far too large for localStorage (an Anki deck with audio easily exceeds 50 MB).
// Note: IndexedDB is available both on the main thread and inside Web Workers.

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
const DB_VERSION = 1;
const CARDS = "cards";
const MEDIA = "media";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CARDS)) db.createObjectStore(CARDS);
      if (!db.objectStoreNames.contains(MEDIA)) db.createObjectStore(MEDIA);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("IndexedDB tidak tersedia"));
    };
  });
  return dbPromise;
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
  return name === "QuotaExceededError" || /quota/i.test( name ) || /quota/i.test(message);
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
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
