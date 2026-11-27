// Mesin sinkronisasi local-first (Push batch RPC + Pull inkremental berhalaman).
// Seluruh operasi push dan pull bersifat idempoten sehingga aman dihentikan di tengah jalan
// (crash / reload / offline mendadak) lalu dilanjutkan tanpa duplikasi atau kehilangan data.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deckDexie,
  deleteCards,
  deleteDeckData,
  enqueueOutboxBatch,
  ensureDeckDbOpen,
  flushReviewLogs,
  flushSyncOutboxWrites,
  getAllReviewLogs,
  getCardCount,
  getCards,
  getPendingOutboxByEntity,
  getPendingOutboxCount,
  getQuarantinedOutboxRows,
  getSyncMeta,
  listStoredDeckIds,
  markOutboxIdsDone,
  markOutboxKeysQuarantined,
  putCards,
  setSyncMeta,
  SYNC_ENTITY_ORDER,
  type NewSyncOutboxItem,
  type StoredCard,
  type SyncEntity,
  type SyncOutboxRow,
} from "../deckDb";
import { flushReviewStorageWrites } from "../reviewStorage";
import { normalizeStudyDayKey } from "../studyDay";
import { getOrCreateDeviceId } from "../userStorageScope";
import { createInitialSettings, useAppStore, type DeckItem } from "../../store/useAppStore";
import { useReviewStore, type DeckActivity, type NewIntroducedEntry } from "../../store/useReviewStore";
import type { SRSCard } from "../srs";
import { withSyncCaptureSuppressed } from "./captureControl";
import {
  cardFromServerRow,
  cardToServerPayload,
  dailyCounterToServerPayload,
  deckFromServerRow,
  deckToServerPayload,
  isSeedCardId,
  isSeedDeckId,
  parseDeletedAtMs,
  reviewLogFromServerRow,
  settingsFromServerRow,
  settingsToServerPayload,
  srsCardFromServerRow,
  srsCardToServerPayload,
} from "./mappers";
import {
  classifySyncError,
  mergeCounterRecord,
  mergeLwwRecord,
  mergeSrsRecord,
  type ClassifiedSyncError,
} from "./merge";
import {
  getCounterResetEpoch,
  loadCounterResetEpochs,
  persistCounterResetEpoch,
  queuePreB2ReviewLogsOnce,
  refreshCaptureSnapshots,
} from "./storeCapture";

export const PUSH_BATCH_SIZE = 250;
export const PULL_PAGE_SIZE = 250;
export const CURSOR_OVERLAP_MS = 5_000;

const META_INITIAL_LOCAL_ENQUEUED = "initialLocalEnqueued";
const META_LAST_SYNC_AT = "lastSyncAt";
const META_SETTINGS_CLIENT_TS = "settingsClientTs";
const META_DECK_TIMESTAMPS = "deckTimestamps";
const META_CARD_TIMESTAMPS = "cardTimestamps";
const META_SRS_TOMBSTONES = "srsTombstones";
const META_DELETED_DECK_IDS = "deletedDeckIds";
const META_DELETED_CARD_KEYS = "deletedCardKeys";

const RPC_BY_ENTITY: Record<SyncEntity, string> = {
  settings: "sync_upsert_settings",
  decks: "sync_upsert_decks",
  cards: "sync_upsert_cards",
  srs_cards: "sync_upsert_srs",
  daily_counters: "sync_upsert_counters",
  review_logs: "sync_insert_review_logs",
};

export interface SyncProgressCallbackPayload {
  phase: "push" | "pull";
  entity: SyncEntity;
  done: number;
  total: number;
}

export interface SyncCycleOptions {
  client: SupabaseClient;
  userId: string;
  deviceId?: string | null;
  pushBatchSize?: number;
  pullPageSize?: number;
  /** Hanya jalankan push (mis. flush cepat saat keluar akun). */
  pushOnly?: boolean;
  onProgress?: (info: SyncProgressCallbackPayload) => void;
  /** Hook pengujian untuk menghentikan siklus di antara langkah secara aman. */
  shouldAbort?: () => boolean;
}

export interface SyncCycleResult {
  ok: boolean;
  aborted: boolean;
  pushed: number;
  pulled: number;
  quarantinedCount: number;
  pendingRemaining: number;
  malformedSkipped: number;
  requestCount: number;
  pushRequestCount?: number;
  error?: ClassifiedSyncError;
}

interface RpcBatchResponse {
  applied?: number;
  skipped?: number;
  rejected?: Array<{ key?: string; code?: string; reason?: string }>;
}

interface CursorState {
  updatedAt: string;
  pk: string;
}

export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function isAbortRequested(opts: SyncCycleOptions): boolean {
  return Boolean(opts.shouldAbort?.());
}

/**
 * Mengurutkan baris deck agar induk (`parent_id`) selalu dikirim sebelum anak sub-deck-nya.
 */
export function sortDeckRowsParentFirst(rows: SyncOutboxRow[]): SyncOutboxRow[] {
  const byId = new Map<string, SyncOutboxRow>();
  for (const r of rows) {
    byId.set(r.key, r);
  }
  const depthCache = new Map<string, number>();
  const getDepth = (id: string, trail = new Set<string>()): number => {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const row = byId.get(id);
    const parentId = typeof row?.payload?.parent_id === "string" ? row.payload.parent_id : null;
    if (!parentId || !byId.has(parentId) || trail.has(id)) {
      depthCache.set(id, 0);
      return 0;
    }
    trail.add(id);
    const d = 1 + getDepth(parentId, trail);
    depthCache.set(id, d);
    return d;
  };
  return [...rows].sort((a, b) => getDepth(a.key) - getDepth(b.key) || (a.id ?? 0) - (b.id ?? 0));
}

/**
 * Menjalankan operasi Supabase dengan refresh JWT + retry tepat satu kali bila terkena 401/JWT expired.
 */
async function callWithAuthRefreshOnce<T>(
  client: SupabaseClient,
  exec: () => Promise<{ data: T; error: unknown }>,
  state: { refreshedOnce: boolean; requestCount: number },
): Promise<{ data: T; error: unknown }> {
  state.requestCount += 1;
  let res = await exec();
  if (!res.error) return res;

  const classified = classifySyncError(res.error);
  if (classified.kind === "auth" && !state.refreshedOnce) {
    state.refreshedOnce = true;
    const refreshFn = (client.auth as unknown as { refreshSession?: () => Promise<{ error: unknown }> })
      ?.refreshSession;
    if (typeof refreshFn === "function") {
      try {
        const refreshed = await refreshFn.call(client.auth);
        if (!refreshed?.error) {
          state.requestCount += 1;
          res = await exec();
        }
      } catch {
        // Biarkan galat auth asli diteruskan agar sync berhenti & minta masuk ulang
      }
    }
  }
  return res;
}

/**
 * Mengantrekan satu kali seluruh data lokal yang sudah ada sebelum B2 aktif (mis. hasil adopsi B1
 * atau pembuatan lokal sebelum sinkronisasi pertama).
 * Mengikuti K2 Opsi A: tidak mengunggah body kartu seed bawaan yang belum disentuh, dan tidak
 * mengunggah SRS demo seed (`lastReview === 1`), namun mengunggah semua deck/kartu buatan user
 * serta kartu non-seed yang ditambahkan ke deck seed (beserta rantai deck seed demi FK).
 */
export async function enqueueInitialLocalDataOnce(deviceId: string): Promise<number> {
  await ensureDeckDbOpen();
  const alreadyDone = await getSyncMeta<boolean>(META_INITIAL_LOCAL_ENQUEUED);
  if (alreadyDone) return 0;

  const appState = useAppStore.getState();
  const reviewState = useReviewStore.getState();
  const now = Date.now();
  const items: NewSyncOutboxItem[] = [];

  // 1. Settings: hanya beri client_updated_at > 0 jika berbeda dari bawaan atau ada deckLimits
  const defaults = createInitialSettings();
  const hasCustomSettings =
    JSON.stringify(appState.settings) !== JSON.stringify(defaults) ||
    Object.keys(appState.deckLimits ?? {}).length > 0;
  if (hasCustomSettings) {
    items.push({
      entity: "settings",
      key: "settings",
      op: "upsert",
      payload: settingsToServerPayload(appState.settings, appState.deckLimits, now) as unknown as Record<string, unknown>,
      clientTs: now,
    });
  }

  // 2. Decks non-seed & kartu (plus rantai deck seed bila ada kartu non-seed di dalamnya)
  const decksById = new Map(appState.decks.map((d) => [d.id, d]));
  const queuedSeedDeckIds = new Set<string>();
  const queueSeedChain = (seedId: string) => {
    let cur = decksById.get(seedId);
    const visited = new Set<string>();
    while (cur && !visited.has(cur.id)) {
      visited.add(cur.id);
      if (!queuedSeedDeckIds.has(cur.id)) {
        queuedSeedDeckIds.add(cur.id);
        const ts = cur.updatedAt ?? 0;
        items.push({
          entity: "decks",
          key: cur.id,
          op: "upsert",
          payload: deckToServerPayload(cur, ts, null) as unknown as Record<string, unknown>,
          clientTs: ts,
        });
      }
      cur = cur.parentId ? decksById.get(cur.parentId) : undefined;
    }
  };

  for (const d of appState.decks) {
    if (!isSeedDeckId(d.id)) {
      const ts = d.updatedAt ?? d.meta?.importedAt ?? now;
      items.push({
        entity: "decks",
        key: d.id,
        op: "upsert",
        payload: deckToServerPayload(d, ts, null) as unknown as Record<string, unknown>,
        clientTs: ts,
      });
    }
  }

  const storedDeckIds = await listStoredDeckIds();
  for (const deckId of storedDeckIds) {
    if (!decksById.has(deckId)) continue;
    const cards = await getCards(deckId);
    const toUpload = isSeedDeckId(deckId)
      ? cards.filter((c) => !isSeedCardId(deckId, c.id))
      : cards;

    if (toUpload.length > 0) {
      if (isSeedDeckId(deckId)) queueSeedChain(deckId);
      const deckTs = decksById.get(deckId)?.updatedAt ?? now;
      for (const c of toUpload) {
        items.push({
          entity: "cards",
          key: `${c.deckId}::${c.id}`,
          op: "upsert",
          payload: cardToServerPayload(c, deckTs, null) as unknown as Record<string, unknown>,
          clientTs: deckTs,
        });
      }
    }
  }

  // 3. SRS cards nyata (abaikan demo seed dengan lastReview === 1)
  for (const [deckId, cardMap] of Object.entries(reviewState.srsCards ?? {})) {
    for (const [cardId, card] of Object.entries(cardMap ?? {})) {
      if (isSeedCardId(deckId, cardId) && card.lastReview === 1 && card.nextReview === 1) {
        continue;
      }
      items.push({
        entity: "srs_cards",
        key: `${deckId}::${cardId}`,
        op: "upsert",
        payload: srsCardToServerPayload(deckId, cardId, card, null) as unknown as Record<string, unknown>,
        clientTs: card.lastReview ?? now,
      });
    }
  }

  // 4. Daily counters lokal
  const counterMap = new Map<
    string,
    { deckId: string; studyDay: string; newIntro: number; extraNew: number; reviewed: number; lastAct: number | null }
  >();
  for (const [deckId, intro] of Object.entries(reviewState.newIntroduced ?? {})) {
    if (!intro?.date) continue;
    const day = normalizeStudyDayKey(intro.date);
    const k = `${deckId}::${day}`;
    const cur = counterMap.get(k) ?? { deckId, studyDay: day, newIntro: 0, extraNew: 0, reviewed: 0, lastAct: null };
    cur.newIntro = Math.max(0, Math.round(intro.count ?? 0));
    cur.extraNew = Math.max(0, Math.round(intro.extraNew ?? 0));
    counterMap.set(k, cur);
  }
  for (const [deckId, act] of Object.entries(reviewState.activity ?? {})) {
    if (!act?.date) continue;
    const day = normalizeStudyDayKey(act.date);
    const k = `${deckId}::${day}`;
    const cur = counterMap.get(k) ?? { deckId, studyDay: day, newIntro: 0, extraNew: 0, reviewed: 0, lastAct: null };
    cur.reviewed = Math.max(0, Math.round(act.count ?? 0));
    cur.lastAct = typeof act.last === "number" && Number.isFinite(act.last) ? Math.round(act.last) : null;
    counterMap.set(k, cur);
  }
  for (const [k, c] of counterMap.entries()) {
    items.push({
      entity: "daily_counters",
      key: k,
      op: "upsert",
      payload: dailyCounterToServerPayload({
        deckId: c.deckId,
        studyDay: c.studyDay,
        newIntroduced: c.newIntro,
        extraNew: c.extraNew,
        reviewedCount: c.reviewed,
        lastActivity: c.lastAct,
        resetAt: getCounterResetEpoch(c.deckId, c.studyDay),
      }) as unknown as Record<string, unknown>,
      clientTs: now,
    });
  }

  let queued = 0;
  const CHUNK = 500;
  for (let i = 0; i < items.length; i += CHUNK) {
    queued += await enqueueOutboxBatch(items.slice(i, i + CHUNK));
    if (i + CHUNK < items.length) await yieldToEventLoop();
  }

  queued += await queuePreB2ReviewLogsOnce(deviceId);
  await setSyncMeta(META_INITIAL_LOCAL_ENQUEUED, true);
  return queued;
}

// ---------------------------------------------------------------------------
// Push Stage
// ---------------------------------------------------------------------------

async function pushOutbox(
  opts: SyncCycleOptions,
  deviceId: string,
  authState: { refreshedOnce: boolean; requestCount: number },
): Promise<{ pushed: number; aborted: boolean; error?: ClassifiedSyncError }> {
  const batchSize = Math.max(1, opts.pushBatchSize ?? PUSH_BATCH_SIZE);
  let totalPushed = 0;

  await flushReviewLogs();
  await flushSyncOutboxWrites();

  const totalPendingInitial = await getPendingOutboxCount();
  let processedSoFar = 0;

  for (const entity of SYNC_ENTITY_ORDER) {
    if (isAbortRequested(opts)) {
      return { pushed: totalPushed, aborted: true };
    }

    // Jika ada kartu pada deck seed di outbox, pastikan deck seed-nya sudah ada di outbox sebelum batch decks/cards
    if (entity === "decks") {
      const pendingCards = await getPendingOutboxByEntity("cards", 0);
      const neededSeedDeckIds = new Set<string>();
      for (const row of pendingCards) {
        const dId = typeof row.payload.deck_id === "string" ? row.payload.deck_id : "";
        if (isSeedDeckId(dId)) neededSeedDeckIds.add(dId);
      }
      if (neededSeedDeckIds.size > 0) {
        const allDecks = useAppStore.getState().decks;
        const decksById = new Map(allDecks.map((d) => [d.id, d]));
        const seedUpserts: NewSyncOutboxItem[] = [];
        const visited = new Set<string>();
        for (const seedId of neededSeedDeckIds) {
          let cur = decksById.get(seedId);
          while (cur && !visited.has(cur.id)) {
            visited.add(cur.id);
            seedUpserts.push({
              entity: "decks",
              key: cur.id,
              op: "upsert",
              payload: deckToServerPayload(cur, cur.updatedAt ?? 0, null) as unknown as Record<string, unknown>,
              clientTs: cur.updatedAt ?? 0,
            });
            cur = cur.parentId ? decksById.get(cur.parentId) : undefined;
          }
        }
        if (seedUpserts.length > 0) {
          // Hanya masukkan jika belum ada entri decks (supaya tidak menimpa edit/tombstone user yang lebih baru)
          const existingDecks = await getPendingOutboxByEntity("decks", 0);
          const existingDeckKeys = new Set(existingDecks.map((r) => r.key));
          const missingOnly = seedUpserts.filter((it) => !existingDeckKeys.has(it.key));
          if (missingOnly.length > 0) {
            await enqueueOutboxBatch(missingOnly);
          }
        }
      }
    }

    let pendingRows = await getPendingOutboxByEntity(entity, 0);
    if (pendingRows.length === 0) continue;

    if (entity === "decks") {
      pendingRows = sortDeckRowsParentFirst(pendingRows);
    }

    const rpcName = RPC_BY_ENTITY[entity];
    const pushedTsMap =
      entity === "decks"
        ? { ...((await getSyncMeta<Record<string, number>>(META_DECK_TIMESTAMPS)) ?? {}) }
        : entity === "cards"
          ? { ...((await getSyncMeta<Record<string, number>>(META_CARD_TIMESTAMPS)) ?? {}) }
          : null;
    let pushedTsDirty = false;
    let pushedSettingsTs: number | null = null;

    for (let i = 0; i < pendingRows.length; i += batchSize) {
      if (isAbortRequested(opts)) {
        if (pushedTsMap && pushedTsDirty) {
          await setSyncMeta(entity === "decks" ? META_DECK_TIMESTAMPS : META_CARD_TIMESTAMPS, pushedTsMap);
        }
        if (pushedSettingsTs !== null) {
          await setSyncMeta(META_SETTINGS_CLIENT_TS, pushedSettingsTs);
        }
        return { pushed: totalPushed, aborted: true };
      }

      const batch = pendingRows.slice(i, i + batchSize);
      const payloads = batch.map((row) => {
        if (entity === "review_logs") {
          const rawDev = typeof row.payload.device_id === "string" ? row.payload.device_id : "";
          if (!rawDev || rawDev === "local") {
            return { ...row.payload, device_id: deviceId };
          }
        }
        return row.payload;
      });

      const res = await callWithAuthRefreshOnce<RpcBatchResponse>(
        opts.client,
        async () => {
          const out = await opts.client.rpc(rpcName, { p_rows: payloads });
          return { data: out.data as RpcBatchResponse, error: out.error };
        },
        authState,
      );

      if (res.error) {
        if (pushedTsMap && pushedTsDirty) {
          await setSyncMeta(entity === "decks" ? META_DECK_TIMESTAMPS : META_CARD_TIMESTAMPS, pushedTsMap);
        }
        if (pushedSettingsTs !== null) {
          await setSyncMeta(META_SETTINGS_CLIENT_TS, pushedSettingsTs);
        }
        const classified = classifySyncError(res.error);
        if (classified.kind === "constraint") {
          // Fallback karantina bila seluruh batch ditolak dengan 23514/23503/22xxx
          await markOutboxKeysQuarantined(
            entity,
            batch.map((r) => ({ key: r.key, reason: classified.message })),
          );
          processedSoFar += batch.length;
          opts.onProgress?.({
            phase: "push",
            entity,
            done: Math.min(processedSoFar, Math.max(processedSoFar, totalPendingInitial)),
            total: Math.max(processedSoFar, totalPendingInitial),
          });
          continue;
        }
        return { pushed: totalPushed, aborted: false, error: classified };
      }

      const rpcData = (res.data ?? {}) as RpcBatchResponse;
      const rejectedList = Array.isArray(rpcData.rejected) ? rpcData.rejected : [];
      const rejectedKeySet = new Set<string>();
      const toQuarantine: Array<{ key: string; reason: string }> = [];

      for (const rej of rejectedList) {
        const k = typeof rej?.key === "string" ? rej.key : "";
        if (!k) continue;
        rejectedKeySet.add(k);
        const codePart = rej.code ? `[${rej.code}] ` : "";
        toQuarantine.push({
          key: k,
          reason: `${codePart}${rej.reason ?? "Baris ditolak oleh validasi server."}`,
        });
      }

      if (toQuarantine.length > 0) {
        await markOutboxKeysQuarantined(entity, toQuarantine);
      }

      const succeededRows = batch.filter((r) => !rejectedKeySet.has(r.key) && r.id !== undefined);
      const succeededIds = succeededRows.map((r) => r.id!);

      if (succeededIds.length > 0) {
        await markOutboxIdsDone(succeededIds);
        totalPushed += succeededIds.length;
        // Catat timestamp client yang baru saja berhasil dikirim agar pull gema langsung seri (skip tulis ulang)
        for (const r of succeededRows) {
          const ts = Number(r.payload.client_updated_at ?? r.clientTs ?? 0);
          if (!Number.isFinite(ts) || ts < 0) continue;
          if (pushedTsMap) {
            if (ts > (pushedTsMap[r.key] ?? -1)) {
              pushedTsMap[r.key] = ts;
              pushedTsDirty = true;
            }
          } else if (entity === "settings") {
            pushedSettingsTs = Math.max(pushedSettingsTs ?? 0, ts);
          }
        }
      }

      processedSoFar += batch.length;
      opts.onProgress?.({
        phase: "push",
        entity,
        done: processedSoFar,
        total: Math.max(processedSoFar, totalPendingInitial),
      });

      if (i + batchSize < pendingRows.length) {
        await yieldToEventLoop();
      }
    }

    if (pushedTsMap && pushedTsDirty) {
      await setSyncMeta(entity === "decks" ? META_DECK_TIMESTAMPS : META_CARD_TIMESTAMPS, pushedTsMap);
    }
    if (pushedSettingsTs !== null) {
      await setSyncMeta(META_SETTINGS_CLIENT_TS, pushedSettingsTs);
    }
  }

  return { pushed: totalPushed, aborted: false };
}

// ---------------------------------------------------------------------------
// Pull Stage (Incremental keyset pagination with overlap window)
// ---------------------------------------------------------------------------

function subtractOverlapIso(iso: string, overlapMs: number): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(Math.max(0, ms - overlapMs)).toISOString();
}

function qVal(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function recomputeAllDeckTotalsLocally(): Promise<void> {
  const currentDecks = useAppStore.getState().decks;
  if (currentDecks.length === 0) return;

  const directCounts = new Map<string, number>();
  for (const d of currentDecks) {
    directCounts.set(d.id, await getCardCount(d.id));
  }

  const childrenMap = new Map<string, string[]>();
  for (const d of currentDecks) {
    if (d.parentId) {
      const list = childrenMap.get(d.parentId) ?? [];
      list.push(d.id);
      childrenMap.set(d.parentId, list);
    }
  }

  const totalCache = new Map<string, number>();
  const calcTotal = (deckId: string, visited = new Set<string>()): number => {
    if (totalCache.has(deckId)) return totalCache.get(deckId)!;
    if (visited.has(deckId)) return directCounts.get(deckId) ?? 0;
    visited.add(deckId);
    let sum = directCounts.get(deckId) ?? 0;
    for (const childId of childrenMap.get(deckId) ?? []) {
      sum += calcTotal(childId, visited);
    }
    totalCache.set(deckId, sum);
    return sum;
  };

  let changed = false;
  const nextDecks = currentDecks.map((d) => {
    const computed = calcTotal(d.id);
    const directChildren = childrenMap.get(d.id);
    const nextSubdeckIds =
      directChildren && directChildren.length > 0
        ? Array.from(new Set([...(d.subdeckIds ?? []).filter((sid) => directChildren.includes(sid)), ...directChildren]))
        : undefined;
    if (
      d.total !== computed ||
      JSON.stringify(d.subdeckIds ?? []) !== JSON.stringify(nextSubdeckIds ?? [])
    ) {
      changed = true;
      return {
        ...d,
        total: computed,
        ...(nextSubdeckIds ? { subdeckIds: nextSubdeckIds } : { subdeckIds: undefined }),
      };
    }
    return d;
  });

  if (changed) {
    useAppStore.setState({ decks: nextDecks });
  }
}

async function pullIncremental(
  opts: SyncCycleOptions,
  authState: { refreshedOnce: boolean; requestCount: number },
): Promise<{ pulled: number; malformedSkipped: number; aborted: boolean; error?: ClassifiedSyncError }> {
  const pageSize = Math.max(1, opts.pullPageSize ?? PULL_PAGE_SIZE);
  let totalPulled = 0;
  let malformedSkipped = 0;
  let decksOrCardsChanged = false;

  await loadCounterResetEpochs();

  // 1. Pull user_settings
  if (isAbortRequested(opts)) return { pulled: totalPulled, malformedSkipped, aborted: true };
  {
    const cursorIso = await getSyncMeta<string>("cursor:settings");
    const res = await callWithAuthRefreshOnce<unknown[]>(
      opts.client,
      async () => {
        let q = opts.client
          .from("user_settings")
          .select("data, client_updated_at, updated_at")
          .eq("user_id", opts.userId);
        if (cursorIso) {
          q = q.gte("updated_at", subtractOverlapIso(cursorIso, CURSOR_OVERLAP_MS));
        }
        const out = await q;
        return { data: (out.data as unknown[]) ?? [], error: out.error };
      },
      authState,
    );
    if (res.error) {
      return { pulled: totalPulled, malformedSkipped, aborted: false, error: classifySyncError(res.error) };
    }

    const row = Array.isArray(res.data) ? res.data[0] : null;
    if (row) {
      const parsed = settingsFromServerRow(row);
      if (!parsed) {
        malformedSkipped += 1;
      } else {
        const localTs = (await getSyncMeta<number>(META_SETTINGS_CLIENT_TS)) ?? 0;
        const merged = mergeLwwRecord(
          { client_updated_at: localTs },
          { client_updated_at: parsed.clientUpdatedAt },
        );
        if (merged.winner === "incoming") {
          await withSyncCaptureSuppressed(() => {
            if (parsed.bundle.settings) {
              useAppStore.getState().updateSettings(parsed.bundle.settings);
            }
            if (parsed.bundle.deckLimits !== undefined) {
              useAppStore.setState({ deckLimits: parsed.bundle.deckLimits });
            }
          });
          await setSyncMeta(META_SETTINGS_CLIENT_TS, parsed.clientUpdatedAt);
          totalPulled += 1;
        }
      }
      const updatedAt = (row as { updated_at?: unknown }).updated_at;
      if (typeof updatedAt === "string" && updatedAt) {
        await setSyncMeta("cursor:settings", updatedAt);
      }
    }
  }

  // 2. Pull decks (paged by updated_at asc, id asc)
  {
    const savedCursor = await getSyncMeta<CursorState>("cursor:decks");
    let queryMinUpdatedAt = savedCursor ? subtractOverlapIso(savedCursor.updatedAt, CURSOR_OVERLAP_MS) : null;
    let lastPageCursor: CursorState | null = null;
    const deckTsMap: Record<string, number> = {
      ...((await getSyncMeta<Record<string, number>>(META_DECK_TIMESTAMPS)) ?? {}),
    };
    const deletedDeckSet = new Set<string>(
      (await getSyncMeta<string[]>(META_DELETED_DECK_IDS)) ?? [],
    );
    let deckTsDirty = false;
    let deletedDecksDirty = false;

    while (true) {
      if (isAbortRequested(opts)) {
        if (deckTsDirty) await setSyncMeta(META_DECK_TIMESTAMPS, deckTsMap);
        if (deletedDecksDirty) await setSyncMeta(META_DELETED_DECK_IDS, [...deletedDeckSet]);
        return { pulled: totalPulled, malformedSkipped, aborted: true };
      }

      const res = await callWithAuthRefreshOnce<Record<string, unknown>[]>(
        opts.client,
        async () => {
          let q = opts.client
            .from("decks")
            .select("id, parent_id, title, kanji, category, meta, deleted_at, client_updated_at, updated_at")
            .eq("user_id", opts.userId)
            .order("updated_at", { ascending: true })
            .order("id", { ascending: true })
            .limit(pageSize);

          if (lastPageCursor) {
            const ts = qVal(lastPageCursor.updatedAt);
            const pk = qVal(lastPageCursor.pk);
            q = q.or(`updated_at.gt.${ts},and(updated_at.eq.${ts},id.gt.${pk})`);
          } else if (queryMinUpdatedAt) {
            q = q.gte("updated_at", queryMinUpdatedAt);
          }
          const out = await q;
          return { data: (out.data as Record<string, unknown>[]) ?? [], error: out.error };
        },
        authState,
      );

      if (res.error) {
        if (deckTsDirty) await setSyncMeta(META_DECK_TIMESTAMPS, deckTsMap);
        if (deletedDecksDirty) await setSyncMeta(META_DELETED_DECK_IDS, [...deletedDeckSet]);
        return { pulled: totalPulled, malformedSkipped, aborted: false, error: classifySyncError(res.error) };
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length === 0) break;

      await withSyncCaptureSuppressed(async () => {
        const curDecks = [...useAppStore.getState().decks];
        const deckIdxById = new Map(curDecks.map((d, idx) => [d.id, idx]));

        for (const row of rows) {
          const id = typeof row.id === "string" ? row.id.trim() : "";
          const incomingTs = Number(row.client_updated_at ?? 0);
          const deletedMs = parseDeletedAtMs(row.deleted_at);
          if (!id || !Number.isFinite(incomingTs) || incomingTs < 0) {
            malformedSkipped += 1;
            continue;
          }

          const existingIdx = deckIdxById.get(id);
          const existingLocalTs = Math.max(
            deckTsMap[id] ?? -1,
            existingIdx !== undefined ? (curDecks[existingIdx].updatedAt ?? 0) : -1,
          );

          const lww = mergeLwwRecord(
            existingLocalTs >= 0 ? { client_updated_at: existingLocalTs } : null,
            { client_updated_at: incomingTs, deleted_at: deletedMs },
          );
          if (lww.winner !== "incoming" && existingIdx !== undefined) {
            continue;
          }
          // Jika lokal belum punya deck dan incoming adalah tombstone -> tetap catat timestamp agar tidak dibangkitkan
          if (deletedMs !== null) {
            deckTsMap[id] = incomingTs;
            deckTsDirty = true;
            if (!deletedDeckSet.has(id)) {
              deletedDeckSet.add(id);
              deletedDecksDirty = true;
            }
            if (existingIdx !== undefined) {
              // Pastikan deck baru yang sudah masuk `curDecks` di halaman ini tersimpan sebelum removeDeck membaca store
              useAppStore.setState({ decks: curDecks });
              useAppStore.getState().removeDeck(id);
              useReviewStore.getState().removeDeck(id);
              await deleteDeckData(id).catch(() => undefined);
              decksOrCardsChanged = true;
              // Refresh array lokal setelah removeDeck
              const refreshed = useAppStore.getState().decks;
              curDecks.length = 0;
              curDecks.push(...refreshed);
              deckIdxById.clear();
              curDecks.forEach((d, idx) => deckIdxById.set(d.id, idx));
            }
            totalPulled += 1;
            continue;
          }

          const existingTotal = existingIdx !== undefined ? curDecks[existingIdx].total : 0;
          const mapped = deckFromServerRow(row, existingTotal);
          if (!mapped) {
            malformedSkipped += 1;
            continue;
          }

          deckTsMap[id] = incomingTs;
          deckTsDirty = true;
          if (deletedDeckSet.delete(id)) {
            deletedDecksDirty = true;
          }
          if (existingIdx !== undefined) {
            curDecks[existingIdx] = mapped;
          } else {
            deckIdxById.set(id, curDecks.length);
            curDecks.push(mapped);
          }
          decksOrCardsChanged = true;
          totalPulled += 1;
        }

        if (decksOrCardsChanged) {
          useAppStore.setState({ decks: curDecks });
        }
      });

      const lastRow = rows[rows.length - 1];
      const lastUpdated = typeof lastRow.updated_at === "string" ? lastRow.updated_at : "";
      const lastId = typeof lastRow.id === "string" ? lastRow.id : "";
      if (lastUpdated && lastId) {
        lastPageCursor = { updatedAt: lastUpdated, pk: lastId };
        await setSyncMeta("cursor:decks", lastPageCursor);
      }
      if (deckTsDirty) {
        await setSyncMeta(META_DECK_TIMESTAMPS, deckTsMap);
        deckTsDirty = false;
      }
      if (deletedDecksDirty) {
        await setSyncMeta(META_DELETED_DECK_IDS, [...deletedDeckSet]);
        deletedDecksDirty = false;
      }

      opts.onProgress?.({ phase: "pull", entity: "decks", done: totalPulled, total: totalPulled });
      if (rows.length < pageSize) break;
      await yieldToEventLoop();
    }
  }

  // 3. Pull cards (paged by updated_at asc, deck_id asc, id asc; sanitize every card!)
  {
    const savedCursor = await getSyncMeta<CursorState>("cursor:cards");
    const queryMinUpdatedAt = savedCursor ? subtractOverlapIso(savedCursor.updatedAt, CURSOR_OVERLAP_MS) : null;
    let lastPageCursor: CursorState | null = null;
    const cardTsMap: Record<string, number> = {
      ...((await getSyncMeta<Record<string, number>>(META_CARD_TIMESTAMPS)) ?? {}),
    };
    const deletedCardSet = new Set<string>(
      (await getSyncMeta<string[]>(META_DELETED_CARD_KEYS)) ?? [],
    );
    let cardTsDirty = false;
    let deletedCardsDirty = false;

    while (true) {
      if (isAbortRequested(opts)) {
        if (cardTsDirty) await setSyncMeta(META_CARD_TIMESTAMPS, cardTsMap);
        if (deletedCardsDirty) await setSyncMeta(META_DELETED_CARD_KEYS, [...deletedCardSet]);
        return { pulled: totalPulled, malformedSkipped, aborted: true };
      }

      const res = await callWithAuthRefreshOnce<Record<string, unknown>[]>(
        opts.client,
        async () => {
          let q = opts.client
            .from("cards")
            .select("deck_id, id, data, deleted_at, client_updated_at, updated_at")
            .eq("user_id", opts.userId)
            .order("updated_at", { ascending: true })
            .order("deck_id", { ascending: true })
            .order("id", { ascending: true })
            .limit(pageSize);

          if (lastPageCursor) {
            const [lastDeck, lastCid] = lastPageCursor.pk.split("\0");
            const ts = qVal(lastPageCursor.updatedAt);
            const dk = qVal(lastDeck);
            const cid = qVal(lastCid);
            q = q.or(
              `updated_at.gt.${ts},and(updated_at.eq.${ts},deck_id.gt.${dk}),and(updated_at.eq.${ts},deck_id.eq.${dk},id.gt.${cid})`,
            );
          } else if (queryMinUpdatedAt) {
            q = q.gte("updated_at", queryMinUpdatedAt);
          }
          const out = await q;
          return { data: (out.data as Record<string, unknown>[]) ?? [], error: out.error };
        },
        authState,
      );

      if (res.error) {
        if (cardTsDirty) await setSyncMeta(META_CARD_TIMESTAMPS, cardTsMap);
        if (deletedCardsDirty) await setSyncMeta(META_DELETED_CARD_KEYS, [...deletedCardSet]);
        return { pulled: totalPulled, malformedSkipped, aborted: false, error: classifySyncError(res.error) };
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length === 0) break;

      const cardsToPut: StoredCard[] = [];
      const deletesByDeck = new Map<string, string[]>();

      for (const row of rows) {
        const deckId = typeof row.deck_id === "string" ? row.deck_id.trim() : "";
        const id = typeof row.id === "string" ? row.id.trim() : "";
        const incomingTs = Number(row.client_updated_at ?? 0);
        const deletedMs = parseDeletedAtMs(row.deleted_at);
        if (!deckId || !id || !Number.isFinite(incomingTs) || incomingTs < 0) {
          malformedSkipped += 1;
          continue;
        }
        const key = `${deckId}::${id}`;
        const existingLocalTs = cardTsMap[key];
        const lww = mergeLwwRecord(
          existingLocalTs !== undefined ? { client_updated_at: existingLocalTs } : null,
          { client_updated_at: incomingTs, deleted_at: deletedMs },
        );
        if (lww.winner !== "incoming") continue;

        if (deletedMs !== null) {
          cardTsMap[key] = incomingTs;
          cardTsDirty = true;
          if (!deletedCardSet.has(key)) {
            deletedCardSet.add(key);
            deletedCardsDirty = true;
          }
          const arr = deletesByDeck.get(deckId) ?? [];
          arr.push(id);
          deletesByDeck.set(deckId, arr);
          decksOrCardsChanged = true;
          totalPulled += 1;
          continue;
        }

        const sanitized = cardFromServerRow(row);
        if (!sanitized) {
          malformedSkipped += 1;
          continue;
        }
        cardTsMap[key] = incomingTs;
        cardTsDirty = true;
        if (deletedCardSet.delete(key)) {
          deletedCardsDirty = true;
        }
        cardsToPut.push(sanitized);
        decksOrCardsChanged = true;
        totalPulled += 1;
      }

      await withSyncCaptureSuppressed(async () => {
        if (cardsToPut.length > 0) {
          await putCards(cardsToPut, { suppressSync: true });
        }
        for (const [dId, cIds] of deletesByDeck.entries()) {
          await deleteCards(dId, cIds, { suppressSync: true });
          useReviewStore.getState().forgetCards(dId, cIds);
        }
      });

      const lastRow = rows[rows.length - 1];
      const lastUpdated = typeof lastRow.updated_at === "string" ? lastRow.updated_at : "";
      const lastDeck = typeof lastRow.deck_id === "string" ? lastRow.deck_id : "";
      const lastCid = typeof lastRow.id === "string" ? lastRow.id : "";
      if (lastUpdated && lastDeck && lastCid) {
        lastPageCursor = { updatedAt: lastUpdated, pk: `${lastDeck}\0${lastCid}` };
        await setSyncMeta("cursor:cards", lastPageCursor);
      }
      if (cardTsDirty) {
        await setSyncMeta(META_CARD_TIMESTAMPS, cardTsMap);
        cardTsDirty = false;
      }
      if (deletedCardsDirty) {
        await setSyncMeta(META_DELETED_CARD_KEYS, [...deletedCardSet]);
        deletedCardsDirty = false;
      }

      opts.onProgress?.({ phase: "pull", entity: "cards", done: totalPulled, total: totalPulled });
      if (rows.length < pageSize) break;
      await yieldToEventLoop();
    }
  }

  // 4. Pull srs_cards (paged, exact mergeSrsRecord + alive rule)
  {
    const savedCursor = await getSyncMeta<CursorState>("cursor:srs_cards");
    const queryMinUpdatedAt = savedCursor ? subtractOverlapIso(savedCursor.updatedAt, CURSOR_OVERLAP_MS) : null;
    let lastPageCursor: CursorState | null = null;
    const srsTombstones: Record<string, number> = {
      ...((await getSyncMeta<Record<string, number>>(META_SRS_TOMBSTONES)) ?? {}),
    };
    let tombstonesDirty = false;

    while (true) {
      if (isAbortRequested(opts)) {
        if (tombstonesDirty) await setSyncMeta(META_SRS_TOMBSTONES, srsTombstones);
        return { pulled: totalPulled, malformedSkipped, aborted: true };
      }

      const res = await callWithAuthRefreshOnce<Record<string, unknown>[]>(
        opts.client,
        async () => {
          let q = opts.client
            .from("srs_cards")
            .select("deck_id, card_id, data, last_review, reps, deleted_at, updated_at")
            .eq("user_id", opts.userId)
            .order("updated_at", { ascending: true })
            .order("deck_id", { ascending: true })
            .order("card_id", { ascending: true })
            .limit(pageSize);

          if (lastPageCursor) {
            const [lastDeck, lastCid] = lastPageCursor.pk.split("\0");
            const ts = qVal(lastPageCursor.updatedAt);
            const dk = qVal(lastDeck);
            const cid = qVal(lastCid);
            q = q.or(
              `updated_at.gt.${ts},and(updated_at.eq.${ts},deck_id.gt.${dk}),and(updated_at.eq.${ts},deck_id.eq.${dk},card_id.gt.${cid})`,
            );
          } else if (queryMinUpdatedAt) {
            q = q.gte("updated_at", queryMinUpdatedAt);
          }
          const out = await q;
          return { data: (out.data as Record<string, unknown>[]) ?? [], error: out.error };
        },
        authState,
      );

      if (res.error) {
        if (tombstonesDirty) await setSyncMeta(META_SRS_TOMBSTONES, srsTombstones);
        return { pulled: totalPulled, malformedSkipped, aborted: false, error: classifySyncError(res.error) };
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length === 0) break;

      await withSyncCaptureSuppressed(() => {
        const curSrs = useReviewStore.getState().srsCards;
        let nextSrs: Record<string, Record<string, SRSCard>> | null = null;

        for (const row of rows) {
          const parsed = srsCardFromServerRow(row);
          if (!parsed) {
            malformedSkipped += 1;
            continue;
          }
          const key = `${parsed.deckId}::${parsed.cardId}`;
          const localCard = (nextSrs ?? curSrs)[parsed.deckId]?.[parsed.cardId] ?? null;
          const localDel = srsTombstones[key] ?? null;

          const { merged, changed, alive } = mergeSrsRecord(
            localCard || localDel !== null
              ? {
                  card: localCard,
                  lastReview: localCard?.lastReview ?? null,
                  reps: localCard ? (localCard.reps ?? localCard.repetitions ?? 0) : 0,
                  deletedAt: localDel,
                }
              : null,
            {
              card: parsed.card,
              lastReview: parsed.lastReview,
              reps: parsed.reps,
              deletedAt: parsed.deletedAt,
            },
          );

          if (merged.deletedAt !== null && merged.deletedAt !== localDel) {
            srsTombstones[key] = merged.deletedAt;
            tombstonesDirty = true;
          }

          if (!changed) continue;
          if (!nextSrs) nextSrs = { ...curSrs };
          const deckMap = { ...(nextSrs[parsed.deckId] ?? {}) };
          if (alive && merged.card) {
            deckMap[parsed.cardId] = merged.card;
            nextSrs[parsed.deckId] = deckMap;
          } else {
            delete deckMap[parsed.cardId];
            if (Object.keys(deckMap).length === 0) {
              delete nextSrs[parsed.deckId];
            } else {
              nextSrs[parsed.deckId] = deckMap;
            }
          }
          totalPulled += 1;
        }

        if (nextSrs) {
          useReviewStore.setState({ srsCards: nextSrs });
        }
      });

      const lastRow = rows[rows.length - 1];
      const lastUpdated = typeof lastRow.updated_at === "string" ? lastRow.updated_at : "";
      const lastDeck = typeof lastRow.deck_id === "string" ? lastRow.deck_id : "";
      const lastCid = typeof lastRow.card_id === "string" ? lastRow.card_id : "";
      if (lastUpdated && lastDeck && lastCid) {
        lastPageCursor = { updatedAt: lastUpdated, pk: `${lastDeck}\0${lastCid}` };
        await setSyncMeta("cursor:srs_cards", lastPageCursor);
      }
      if (tombstonesDirty) {
        await setSyncMeta(META_SRS_TOMBSTONES, srsTombstones);
        tombstonesDirty = false;
      }

      if (rows.length < pageSize) break;
      await yieldToEventLoop();
    }
  }

  // 5. Pull daily_counters (paged, exact mergeCounterRecord with reset_at)
  {
    const savedCursor = await getSyncMeta<CursorState>("cursor:daily_counters");
    const queryMinUpdatedAt = savedCursor ? subtractOverlapIso(savedCursor.updatedAt, CURSOR_OVERLAP_MS) : null;
    let lastPageCursor: CursorState | null = null;

    while (true) {
      if (isAbortRequested(opts)) {
        return { pulled: totalPulled, malformedSkipped, aborted: true };
      }

      const res = await callWithAuthRefreshOnce<Record<string, unknown>[]>(
        opts.client,
        async () => {
          let q = opts.client
            .from("daily_counters")
            .select("deck_id, study_day, new_introduced, extra_new, reviewed_count, last_activity, reset_at, updated_at")
            .eq("user_id", opts.userId)
            .order("updated_at", { ascending: true })
            .order("deck_id", { ascending: true })
            .order("study_day", { ascending: true })
            .limit(pageSize);

          if (lastPageCursor) {
            const [lastDeck, lastDay] = lastPageCursor.pk.split("\0");
            const ts = qVal(lastPageCursor.updatedAt);
            const dk = qVal(lastDeck);
            const day = qVal(lastDay);
            q = q.or(
              `updated_at.gt.${ts},and(updated_at.eq.${ts},deck_id.gt.${dk}),and(updated_at.eq.${ts},deck_id.eq.${dk},study_day.gt.${day})`,
            );
          } else if (queryMinUpdatedAt) {
            q = q.gte("updated_at", queryMinUpdatedAt);
          }
          const out = await q;
          return { data: (out.data as Record<string, unknown>[]) ?? [], error: out.error };
        },
        authState,
      );

      if (res.error) {
        return { pulled: totalPulled, malformedSkipped, aborted: false, error: classifySyncError(res.error) };
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length === 0) break;

      const epochsToPersist: Array<[string, number]> = [];
      await withSyncCaptureSuppressed(() => {
        const revState = useReviewStore.getState();
        const nextIntro: Record<string, NewIntroducedEntry> = { ...revState.newIntroduced };
        const nextAct: Record<string, DeckActivity> = { ...revState.activity };
        let mutated = false;

        for (const row of rows) {
          const deckId = typeof row.deck_id === "string" ? row.deck_id.trim() : "";
          const rawDay = typeof row.study_day === "string" ? row.study_day.trim() : "";
          if (!deckId || rawDay.length < 8) {
            malformedSkipped += 1;
            continue;
          }
          const studyDay = normalizeStudyDayKey(rawDay);
          const curIntro = nextIntro[deckId];
          const curAct = nextAct[deckId];
          const introSameDay = curIntro && normalizeStudyDayKey(curIntro.date) === studyDay;
          const actSameDay = curAct && normalizeStudyDayKey(curAct.date) === studyDay;

          // Jangan timpa hari yang lebih baru di lokal dengan baris hari lama dari server
          const localLatestDay = [
            curIntro?.date ? normalizeStudyDayKey(curIntro.date) : "",
            curAct?.date ? normalizeStudyDayKey(curAct.date) : "",
          ]
            .filter(Boolean)
            .sort()
            .pop();
          if (localLatestDay && studyDay < localLatestDay) {
            continue;
          }

          const localResetAt = getCounterResetEpoch(deckId, studyDay);
          const incomingResetAt = Math.max(0, Math.round(Number(row.reset_at ?? 0) || 0));
          const localState =
            introSameDay || actSameDay || localResetAt > 0
              ? {
                  newIntroduced: introSameDay ? Math.max(0, curIntro.count) : 0,
                  extraNew: introSameDay ? Math.max(0, curIntro.extraNew ?? 0) : 0,
                  reviewedCount: actSameDay ? Math.max(0, curAct.count) : 0,
                  lastActivity: actSameDay ? curAct.last : null,
                  resetAt: localResetAt,
                }
              : null;

          const { merged, changed } = mergeCounterRecord(localState, {
            newIntroduced: Math.max(0, Math.round(Number(row.new_introduced ?? 0) || 0)),
            extraNew: Math.max(0, Math.round(Number(row.extra_new ?? 0) || 0)),
            reviewedCount: Math.max(0, Math.round(Number(row.reviewed_count ?? 0) || 0)),
            lastActivity:
              row.last_activity === null || row.last_activity === undefined
                ? null
                : Math.max(0, Math.round(Number(row.last_activity))),
            resetAt: incomingResetAt,
          });

          if (merged.resetAt > localResetAt) {
            epochsToPersist.push([`${deckId}::${studyDay}`, merged.resetAt]);
          }
          if (!changed) continue;

          if (merged.newIntroduced === 0 && merged.extraNew === 0 && merged.resetAt > localResetAt) {
            delete nextIntro[deckId];
          } else if (merged.newIntroduced > 0 || merged.extraNew > 0) {
            nextIntro[deckId] = {
              date: studyDay,
              count: merged.newIntroduced,
              ...(merged.extraNew > 0 ? { extraNew: merged.extraNew } : {}),
            };
          }

          if (merged.reviewedCount === 0 && merged.lastActivity === null && merged.resetAt > localResetAt) {
            delete nextAct[deckId];
          } else if (merged.reviewedCount > 0 || merged.lastActivity !== null) {
            nextAct[deckId] = {
              date: studyDay,
              count: merged.reviewedCount,
              last: merged.lastActivity ?? Date.now(),
            };
          }

          mutated = true;
          totalPulled += 1;
        }

        if (mutated) {
          useReviewStore.setState({ newIntroduced: nextIntro, activity: nextAct });
        }
      });

      for (const [k, ts] of epochsToPersist) {
        await persistCounterResetEpoch(k, ts);
      }

      const lastRow = rows[rows.length - 1];
      const lastUpdated = typeof lastRow.updated_at === "string" ? lastRow.updated_at : "";
      const lastDeck = typeof lastRow.deck_id === "string" ? lastRow.deck_id : "";
      const lastDay = typeof lastRow.study_day === "string" ? lastRow.study_day : "";
      if (lastUpdated && lastDeck && lastDay) {
        lastPageCursor = { updatedAt: lastUpdated, pk: `${lastDeck}\0${lastDay}` };
        await setSyncMeta("cursor:daily_counters", lastPageCursor);
      }

      if (rows.length < pageSize) break;
      await yieldToEventLoop();
    }
  }

  // 6. Pull review_logs (paged by id > cursor)
  {
    let lastLogId = (await getSyncMeta<number>("cursor:review_logs")) ?? 0;
    const existingLogs = await getAllReviewLogs();
    const seenSigs = new Set(
      existingLogs.map((l) => `${l.deckId}::${l.cardId}::${l.reviewedAt}::${l.rating}::${l.state}`),
    );

    while (true) {
      if (isAbortRequested(opts)) {
        return { pulled: totalPulled, malformedSkipped, aborted: true };
      }

      const res = await callWithAuthRefreshOnce<Record<string, unknown>[]>(
        opts.client,
        async () => {
          const out = await opts.client
            .from("review_logs")
            .select(
              "id, device_id, deck_id, card_id, rating, state, due, stability, difficulty, elapsed_days, scheduled_days, reviewed_at",
            )
            .eq("user_id", opts.userId)
            .gt("id", lastLogId)
            .order("id", { ascending: true })
            .limit(pageSize);
          return { data: (out.data as Record<string, unknown>[]) ?? [], error: out.error };
        },
        authState,
      );

      if (res.error) {
        return { pulled: totalPulled, malformedSkipped, aborted: false, error: classifySyncError(res.error) };
      }

      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length === 0) break;

      const toAdd: Array<Omit<import("../deckDb").ReviewLogEntry, "id">> = [];
      let maxIdInPage = lastLogId;

      for (const row of rows) {
        const parsed = reviewLogFromServerRow(row);
        if (!parsed) {
          malformedSkipped += 1;
          continue;
        }
        if (parsed.serverId && parsed.serverId > maxIdInPage) {
          maxIdInPage = parsed.serverId;
        }
        const sig = `${parsed.deckId}::${parsed.cardId}::${parsed.reviewedAt}::${parsed.rating}::${parsed.state}`;
        if (seenSigs.has(sig)) continue;
        seenSigs.add(sig);
        const { serverId: _s, deviceId: _d, ...clean } = parsed;
        toAdd.push(clean);
      }

      if (toAdd.length > 0) {
        await deckDexie.reviewLogs.bulkAdd(toAdd);
        totalPulled += toAdd.length;
      }

      if (maxIdInPage > lastLogId) {
        lastLogId = maxIdInPage;
        await setSyncMeta("cursor:review_logs", lastLogId);
      }

      if (rows.length < pageSize) break;
      await yieldToEventLoop();
    }
  }

  // Recompute derived deck totals locally & finalize snapshots
  await withSyncCaptureSuppressed(async () => {
    if (decksOrCardsChanged) {
      await recomputeAllDeckTotalsLocally();
    }
    refreshCaptureSnapshots();
  });
  await flushReviewStorageWrites();

  return { pulled: totalPulled, malformedSkipped, aborted: false };
}

/**
 * Menjalankan satu siklus sinkronisasi penuh (initial enqueue -> push -> pull).
 * Sepenuhnya idempoten dan aman diinterupsi pada titik mana pun.
 */
export async function runSyncCycle(opts: SyncCycleOptions): Promise<SyncCycleResult> {
  const deviceId = opts.deviceId ?? getOrCreateDeviceId(opts.userId) ?? "local";
  const authState = { refreshedOnce: false, requestCount: 0 };

  try {
    await ensureDeckDbOpen();
    if (!opts.pushOnly) {
      await enqueueInitialLocalDataOnce(deviceId);
    }

    const pushRes = await pushOutbox(opts, deviceId, authState);
    const pushRequestCount = authState.requestCount;
    if (pushRes.error || pushRes.aborted) {
      const [pendingRemaining, quarantined] = await Promise.all([
        getPendingOutboxCount(),
        getQuarantinedOutboxRows(),
      ]);
      return {
        ok: false,
        aborted: pushRes.aborted,
        pushed: pushRes.pushed,
        pulled: 0,
        quarantinedCount: quarantined.length,
        pendingRemaining,
        malformedSkipped: 0,
        requestCount: authState.requestCount,
        pushRequestCount,
        error: pushRes.error,
      };
    }

    let pulled = 0;
    let malformedSkipped = 0;
    if (!opts.pushOnly) {
      const pullRes = await pullIncremental(opts, authState);
      pulled = pullRes.pulled;
      malformedSkipped = pullRes.malformedSkipped;
      if (pullRes.error || pullRes.aborted) {
        const [pendingRemaining, quarantined] = await Promise.all([
          getPendingOutboxCount(),
          getQuarantinedOutboxRows(),
        ]);
        return {
          ok: false,
          aborted: pullRes.aborted,
          pushed: pushRes.pushed,
          pulled,
          quarantinedCount: quarantined.length,
          pendingRemaining,
          malformedSkipped,
          requestCount: authState.requestCount,
          pushRequestCount,
          error: pullRes.error,
        };
      }
      await setSyncMeta(META_LAST_SYNC_AT, Date.now());
    }

    const [pendingRemaining, quarantined] = await Promise.all([
      getPendingOutboxCount(),
      getQuarantinedOutboxRows(),
    ]);

    return {
      ok: true,
      aborted: false,
      pushed: pushRes.pushed,
      pulled,
      quarantinedCount: quarantined.length,
      pendingRemaining,
      malformedSkipped,
      requestCount: authState.requestCount,
      pushRequestCount,
    };
  } catch (err) {
    const classified = classifySyncError(err);
    const [pendingRemaining, quarantined] = await Promise.all([
      getPendingOutboxCount().catch(() => 0),
      getQuarantinedOutboxRows().catch(() => []),
    ]);
    return {
      ok: false,
      aborted: false,
      pushed: 0,
      pulled: 0,
      quarantinedCount: quarantined.length,
      pendingRemaining,
      malformedSkipped: 0,
      requestCount: authState.requestCount,
      error: classified,
    };
  }
}

export async function getLastSyncAtMeta(): Promise<number | null> {
  try {
    const val = await getSyncMeta<number>(META_LAST_SYNC_AT);
    return typeof val === "number" && Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}
