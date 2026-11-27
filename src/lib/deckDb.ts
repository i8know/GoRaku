// IndexedDB storage for imported deck content and FSRS review logs.
// Deck metadata lives in zustand/localStorage, but card bodies, media blobs, and reviewLogs
// live in IndexedDB (managed via Dexie schema versions).
// Note: IndexedDB is available both on the main thread and inside Web Workers.

import Dexie, { type Table } from "dexie";
import type { ReviewLogEntry } from "./fsrsScheduler";
import {
  getDeckDbName,
  getOrCreateDeviceId,
  isBlockedUnauthenticatedStorageAccess,
  isPersistWriteSuppressed,
} from "./userStorageScope";
import { isSyncCaptureSuppressed, notifyOutboxDirty } from "./sync/captureControl";
import { cardToServerPayload, reviewLogToServerPayload } from "./sync/mappers";

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

export type SyncEntity =
  | "settings"
  | "decks"
  | "cards"
  | "srs_cards"
  | "daily_counters"
  | "review_logs";

export const SYNC_ENTITY_ORDER: readonly SyncEntity[] = [
  "settings",
  "decks",
  "cards",
  "srs_cards",
  "daily_counters",
  "review_logs",
];

export type SyncOutboxOp = "upsert" | "delete";
export type SyncOutboxStatus = "pending" | "quarantined";

export interface SyncOutboxRow {
  id?: number;
  entity: SyncEntity;
  key: string;
  op: SyncOutboxOp;
  payload: Record<string, unknown>;
  clientTs: number;
  attempts: number;
  status: SyncOutboxStatus;
  error?: string;
}

export interface NewSyncOutboxItem {
  entity: SyncEntity;
  key: string;
  op: SyncOutboxOp;
  payload: Record<string, unknown>;
  clientTs?: number;
}

export interface SyncMetaRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface CardWriteSyncOptions {
  suppressSync?: boolean;
  clientTs?: number;
}

export interface CardDeleteSyncOptions {
  suppressSync?: boolean;
  /** True untuk rollback/batal impor: hapus outbox yang belum terkirim tanpa mengirim tombstone. */
  rollbackOnly?: boolean;
  clientTs?: number;
}

export interface ReviewLogWriteOptions {
  suppressSync?: boolean;
  deviceId?: string;
}

export class DeckDatabase extends Dexie {
  reviewLogs!: Table<ReviewLogEntry, number>;
  kv!: Table<KVRecord, string>;
  syncOutbox!: Table<SyncOutboxRow, number>;
  syncMeta!: Table<SyncMetaRecord, string>;

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

    this.version(4)
      .stores({
        cards: "",
        media: "",
        reviewLogs: "++id, deckId, cardId, reviewedAt, [deckId+cardId]",
        kv: "key",
        syncOutbox: "++id, [entity+key], entity, status, clientTs",
        syncMeta: "key",
      })
      .upgrade(() => {
        // Safe upgrade: existing cards, media, reviewLogs, and kv stores remain intact
        // while adding per-user syncOutbox and syncMeta tables for Phase B2.
      });
  }
}

export let deckDexie = new DeckDatabase(getDeckDbName());

/**
 * Mengganti instance Dexie deck agar mengarah ke basis data terisolasi milik pengguna aktif.
 * Menunggu antrean log review selesai sebelum menutup koneksi lama.
 */
function shouldCaptureSync(explicitSuppress?: boolean): boolean {
  if (explicitSuppress) return false;
  if (isSyncCaptureSuppressed() || isPersistWriteSuppressed() || isBlockedUnauthenticatedStorageAccess()) {
    return false;
  }
  return true;
}

// Antrean serial outbox agar operasi batch & coalescing antar aksi sinkron/asinkron tetap berurutan.
let outboxWriteQueue: Promise<unknown> = Promise.resolve();

function enqueueOutboxOp<T>(fn: () => Promise<T>): Promise<T> {
  const next = outboxWriteQueue.then(fn, fn);
  outboxWriteQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function flushSyncOutboxWrites(): Promise<void> {
  return outboxWriteQueue.then(() => undefined);
}

/**
 * Mengantrekan batch perubahan ke `syncOutbox` dengan coalescing per `(entity, key)`.
 * Banyak suntingan pada kunci yang sama menyatu menjadi 1 baris, dan impor 5.000 kartu
 * dijalankan dalam transaksi `bulkPut` per batch (bukan 5.000 transaksi satuan).
 */
export function enqueueOutboxBatch(items: readonly NewSyncOutboxItem[]): Promise<number> {
  if (items.length === 0) return Promise.resolve(0);
  return enqueueOutboxOp(async () => {
    await ensureDeckDbOpen();
    const now = Date.now();
    // 1. Coalesce duplikat (entity, key) di memori terlebih dahulu
    const coalesced = new Map<string, SyncOutboxRow>();
    for (const item of items) {
      const composite = `${item.entity}\0${item.key}`;
      coalesced.set(composite, {
        entity: item.entity,
        key: item.key,
        op: item.op,
        payload: item.payload,
        clientTs: item.clientTs ?? now,
        attempts: 0,
        status: "pending",
        error: undefined,
      });
    }

    const deduped = [...coalesced.values()];
    if (deduped.length === 0) return 0;

    // 2. Satu transaksi rw Dexie untuk lookup kunci eksisting + bulkPut terkoalesensi
    await deckDexie.transaction("rw", deckDexie.syncOutbox, async () => {
      const existingByPair = new Map<string, number>();
      const extraDuplicateIds: number[] = [];

      const LOOKUP_CHUNK = 500;
      for (let i = 0; i < deduped.length; i += LOOKUP_CHUNK) {
        const chunk = deduped.slice(i, i + LOOKUP_CHUNK);
        const pairs = chunk.map((r) => [r.entity, r.key] as [SyncEntity, string]);
        const found = await deckDexie.syncOutbox.where("[entity+key]").anyOf(pairs).toArray();
        for (const row of found) {
          if (row.id === undefined) continue;
          const comp = `${row.entity}\0${row.key}`;
          if (!existingByPair.has(comp)) {
            existingByPair.set(comp, row.id);
          } else {
            extraDuplicateIds.push(row.id);
          }
        }
      }

      if (extraDuplicateIds.length > 0) {
        await deckDexie.syncOutbox.bulkDelete(extraDuplicateIds);
      }

      const toPut: SyncOutboxRow[] = deduped.map((row) => {
        const existingId = existingByPair.get(`${row.entity}\0${row.key}`);
        return existingId !== undefined ? { ...row, id: existingId } : row;
      });
      await deckDexie.syncOutbox.bulkPut(toPut);
    });

    notifyOutboxDirty();
    return deduped.length;
  });
}

export function removeOutboxKeys(entity: SyncEntity, keys: readonly string[]): Promise<number> {
  if (keys.length === 0) return Promise.resolve(0);
  return enqueueOutboxOp(async () => {
    await ensureDeckDbOpen();
    let deleted = 0;
    const CHUNK = 500;
    for (let i = 0; i < keys.length; i += CHUNK) {
      const pairs = keys.slice(i, i + CHUNK).map((k) => [entity, k] as [SyncEntity, string]);
      deleted += await deckDexie.syncOutbox.where("[entity+key]").anyOf(pairs).delete();
    }
    return deleted;
  });
}

export async function getPendingOutboxByEntity(
  entity: SyncEntity,
  limit = 250,
): Promise<SyncOutboxRow[]> {
  await flushSyncOutboxWrites();
  await ensureDeckDbOpen();
  const rows = await deckDexie.syncOutbox
    .where("entity")
    .equals(entity)
    .filter((r) => r.status === "pending")
    .sortBy("id");
  return limit > 0 ? rows.slice(0, limit) : rows;
}

export async function getPendingOutboxCount(): Promise<number> {
  await flushSyncOutboxWrites();
  await ensureDeckDbOpen();
  return deckDexie.syncOutbox.where("status").equals("pending").count();
}

export async function getQuarantinedOutboxRows(): Promise<SyncOutboxRow[]> {
  await flushSyncOutboxWrites();
  await ensureDeckDbOpen();
  return deckDexie.syncOutbox.where("status").equals("quarantined").sortBy("id");
}

export function markOutboxIdsDone(ids: readonly number[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  return enqueueOutboxOp(async () => {
    await ensureDeckDbOpen();
    await deckDexie.syncOutbox.bulkDelete([...ids]);
  });
}

export function markOutboxKeysQuarantined(
  entity: SyncEntity,
  rejected: ReadonlyArray<{ key: string; reason: string }>,
): Promise<void> {
  if (rejected.length === 0) return Promise.resolve();
  return enqueueOutboxOp(async () => {
    await ensureDeckDbOpen();
    const reasonByKey = new Map(rejected.map((r) => [r.key, r.reason]));
    const pairs = rejected.map((r) => [entity, r.key] as [SyncEntity, string]);
    await deckDexie.transaction("rw", deckDexie.syncOutbox, async () => {
      const rows = await deckDexie.syncOutbox.where("[entity+key]").anyOf(pairs).toArray();
      const updated = rows.map((row) => ({
        ...row,
        status: "quarantined" as const,
        attempts: (row.attempts ?? 0) + 1,
        error: reasonByKey.get(row.key) ?? row.error ?? "Ditolak oleh server",
      }));
      if (updated.length > 0) {
        await deckDexie.syncOutbox.bulkPut(updated);
      }
    });
  });
}

export function retryQuarantinedOutboxRow(id: number): Promise<void> {
  return enqueueOutboxOp(async () => {
    await ensureDeckDbOpen();
    await deckDexie.syncOutbox.update(id, { status: "pending", error: undefined });
    notifyOutboxDirty();
  });
}

export function dismissQuarantinedOutboxRow(id: number): Promise<void> {
  return enqueueOutboxOp(async () => {
    await ensureDeckDbOpen();
    await deckDexie.syncOutbox.delete(id);
  });
}

export async function getSyncMeta<T = unknown>(keyName: string): Promise<T | undefined> {
  await ensureDeckDbOpen();
  const row = await deckDexie.syncMeta.get(keyName);
  return row?.value as T | undefined;
}

export async function setSyncMeta(keyName: string, value: unknown): Promise<void> {
  await ensureDeckDbOpen();
  await deckDexie.syncMeta.put({
    key: keyName,
    value,
    updatedAt: Date.now(),
  });
}

export async function deleteSyncMeta(keyName: string): Promise<void> {
  await ensureDeckDbOpen();
  await deckDexie.syncMeta.delete(keyName);
}

export async function switchDeckDatabaseScope(userId: string | null): Promise<void> {
  await Promise.allSettled([flushReviewLogs(), flushSyncOutboxWrites()]);
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

export function appendReviewLog(
  entry: Omit<ReviewLogEntry, "id">,
  opts?: ReviewLogWriteOptions,
): Promise<number> {
  return enqueueLogOp(async () => {
    const id = await deckDexie.reviewLogs.add({ ...entry });
    if (shouldCaptureSync(opts?.suppressSync)) {
      const deviceId = opts?.deviceId ?? getOrCreateDeviceId() ?? "local";
      const payload = reviewLogToServerPayload(entry, deviceId);
      await enqueueOutboxBatch([
        {
          entity: "review_logs",
          key: `${payload.device_id}::${payload.card_id}::${payload.reviewed_at}`,
          op: "upsert",
          payload: payload as unknown as Record<string, unknown>,
          clientTs: payload.reviewed_at,
        },
      ]);
    }
    return id;
  });
}

export function removeLatestReviewLog(
  deckId: string,
  cardId: string,
  opts?: ReviewLogWriteOptions,
): Promise<void> {
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
      if (shouldCaptureSync(opts?.suppressSync)) {
        const deviceId = opts?.deviceId ?? getOrCreateDeviceId() ?? "local";
        await removeOutboxKeys("review_logs", [
          `${deviceId}::${latest.cardId}::${latest.reviewedAt}`,
          `local::${latest.cardId}::${latest.reviewedAt}`,
        ]);
      }
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
export async function putCards(cards: StoredCard[], opts?: CardWriteSyncOptions): Promise<void> {
  if (cards.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(CARDS, "readwrite");
  const store = tx.objectStore(CARDS);
  for (const c of cards) store.put(c, key(c.deckId, c.id));
  await done(tx);

  if (shouldCaptureSync(opts?.suppressSync)) {
    const ts = opts?.clientTs ?? Date.now();
    const outboxItems: NewSyncOutboxItem[] = cards.map((c) => ({
      entity: "cards",
      key: `${c.deckId}::${c.id}`,
      op: "upsert",
      payload: cardToServerPayload(c, ts, null) as unknown as Record<string, unknown>,
      clientTs: ts,
    }));
    await enqueueOutboxBatch(outboxItems);
  }
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

export async function deleteCards(
  deckId: string,
  ids: string[],
  opts?: CardDeleteSyncOptions,
): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(CARDS, "readwrite");
  const store = tx.objectStore(CARDS);
  for (const id of ids) store.delete(key(deckId, id));
  await done(tx);

  if (opts?.rollbackOnly) {
    await removeOutboxKeys(
      "cards",
      ids.map((id) => `${deckId}::${id}`),
    );
    return;
  }

  if (shouldCaptureSync(opts?.suppressSync)) {
    const ts = opts?.clientTs ?? Date.now();
    const outboxItems: NewSyncOutboxItem[] = ids.map((id) => ({
      entity: "cards",
      key: `${deckId}::${id}`,
      op: "delete",
      payload: {
        deck_id: deckId,
        id,
        data: {},
        deleted_at: ts,
        client_updated_at: ts,
      },
      clientTs: ts,
    }));
    await enqueueOutboxBatch(outboxItems);
  }
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
