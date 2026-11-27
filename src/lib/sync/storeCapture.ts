// Penangkapan perubahan store Zustand (`useAppStore` & `useReviewStore`) dengan diff terhadap
// snapshot terakhir yang diamati, sehingga perubahan field turunan (`due`, `total`, `progress`,
// `updated`) tidak memicu tulis balik palsu dan seluruh mutasi terkoalesensi di `syncOutbox`.

import {
  deckDexie,
  enqueueOutboxBatch,
  ensureDeckDbOpen,
  getSyncMeta,
  setSyncMeta,
  type NewSyncOutboxItem,
} from "../deckDb";
import { normalizeStudyDayKey } from "../studyDay";
import {
  getOrCreateDeviceId,
  isBlockedUnauthenticatedStorageAccess,
  isPersistWriteSuppressed,
} from "../userStorageScope";
import { useAppStore, type DeckItem } from "../../store/useAppStore";
import { useReviewStore, type DeckActivity, type NewIntroducedEntry } from "../../store/useReviewStore";
import type { SRSCard } from "../srs";
import { isSyncCaptureSuppressed } from "./captureControl";
import {
  dailyCounterToServerPayload,
  deckSyncFingerprint,
  deckToServerPayload,
  isSeedDeckId,
  reviewLogToServerPayload,
  settingsToServerPayload,
  srsCardToServerPayload,
} from "./mappers";

interface CounterSnapshot {
  deckId: string;
  studyDay: string;
  newIntroduced: number;
  extraNew: number;
  reviewedCount: number;
  lastActivity: number | null;
}

const META_COUNTER_EPOCHS = "counterResetEpochs";
const META_PRE_B2_LOGS_QUEUED = "preB2LogsQueued";

let initialized = false;
let unsubApp: (() => void) | null = null;
let unsubReview: (() => void) | null = null;

let prevDecksMap = new Map<string, { deck: DeckItem; fp: string }>();
let prevSettingsSig = "";
let prevSrsRef: Record<string, Record<string, SRSCard>> = {};
let prevCountersMap = new Map<string, CounterSnapshot>();
let counterResetEpochs: Record<string, number> = {};

function shouldCaptureStoreChange(): boolean {
  return (
    !isSyncCaptureSuppressed() &&
    !isPersistWriteSuppressed() &&
    !isBlockedUnauthenticatedStorageAccess()
  );
}

function buildDecksSnapshot(decks: readonly DeckItem[]): Map<string, { deck: DeckItem; fp: string }> {
  const map = new Map<string, { deck: DeckItem; fp: string }>();
  for (const d of decks) {
    map.set(d.id, { deck: d, fp: deckSyncFingerprint(d) });
  }
  return map;
}

function buildSettingsSignature(state: ReturnType<typeof useAppStore.getState>): string {
  return JSON.stringify({
    settings: state.settings,
    deckLimits: state.deckLimits,
  });
}

function buildCountersSnapshot(
  newIntroduced: Record<string, NewIntroducedEntry>,
  activity: Record<string, DeckActivity>,
): Map<string, CounterSnapshot> {
  const out = new Map<string, CounterSnapshot>();

  const ensure = (deckId: string, rawDate: string): CounterSnapshot => {
    const studyDay = normalizeStudyDayKey(rawDate);
    const k = `${deckId}::${studyDay}`;
    let entry = out.get(k);
    if (!entry) {
      entry = {
        deckId,
        studyDay,
        newIntroduced: 0,
        extraNew: 0,
        reviewedCount: 0,
        lastActivity: null,
      };
      out.set(k, entry);
    }
    return entry;
  };

  for (const [deckId, intro] of Object.entries(newIntroduced ?? {})) {
    if (!intro || typeof intro.date !== "string") continue;
    const snap = ensure(deckId, intro.date);
    snap.newIntroduced = Math.max(0, Math.round(intro.count ?? 0));
    snap.extraNew = Math.max(0, Math.round(intro.extraNew ?? 0));
  }

  for (const [deckId, act] of Object.entries(activity ?? {})) {
    if (!act || typeof act.date !== "string") continue;
    const snap = ensure(deckId, act.date);
    snap.reviewedCount = Math.max(0, Math.round(act.count ?? 0));
    snap.lastActivity = typeof act.last === "number" && Number.isFinite(act.last) ? Math.round(act.last) : null;
  }

  return out;
}

function countersEqual(a: CounterSnapshot | undefined, b: CounterSnapshot | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.newIntroduced === b.newIntroduced &&
    a.extraNew === b.extraNew &&
    a.reviewedCount === b.reviewedCount &&
    a.lastActivity === b.lastActivity
  );
}

function srsEqual(a: SRSCard | undefined, b: SRSCard | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.easeFactor === b.easeFactor &&
    a.interval === b.interval &&
    a.repetitions === b.repetitions &&
    a.nextReview === b.nextReview &&
    a.stability === b.stability &&
    a.difficulty === b.difficulty &&
    a.state === b.state &&
    a.lapses === b.lapses &&
    a.reps === b.reps &&
    a.lastReview === b.lastReview &&
    a.scheduler === b.scheduler
  );
}

export function getCounterResetEpoch(deckId: string, studyDay: string): number {
  const key = `${deckId}::${normalizeStudyDayKey(studyDay)}`;
  return Math.max(
    counterResetEpochs["*"] ?? 0,
    counterResetEpochs[deckId] ?? 0,
    counterResetEpochs[key] ?? 0,
  );
}

export function setCounterResetEpochInMemory(scopeKey: string, resetAt: number): void {
  const prev = counterResetEpochs[scopeKey] ?? 0;
  if (resetAt > prev) {
    counterResetEpochs = { ...counterResetEpochs, [scopeKey]: Math.round(resetAt) };
  }
}

export async function loadCounterResetEpochs(): Promise<Record<string, number>> {
  try {
    const saved = await getSyncMeta<Record<string, number>>(META_COUNTER_EPOCHS);
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      counterResetEpochs = { ...saved };
    } else {
      counterResetEpochs = {};
    }
  } catch {
    counterResetEpochs = {};
  }
  return counterResetEpochs;
}

export async function persistCounterResetEpoch(scopeKey: string, resetAt: number): Promise<void> {
  setCounterResetEpochInMemory(scopeKey, resetAt);
  try {
    await setSyncMeta(META_COUNTER_EPOCHS, counterResetEpochs);
  } catch {
    // Abaikan kegagalan persist meta sekunder
  }
}

/**
 * Menyegarkan baseline snapshot store tanpa mengantrekan perubahan ke outbox.
 * Wajib dipanggil sesudah perpindahan scope user, rehidrasi, seeding awal, maupun
 * penerapan hasil pull dari server.
 */
export function refreshCaptureSnapshots(): void {
  const appState = useAppStore.getState();
  const reviewState = useReviewStore.getState();
  prevDecksMap = buildDecksSnapshot(appState.decks);
  prevSettingsSig = buildSettingsSignature(appState);
  prevSrsRef = reviewState.srsCards;
  prevCountersMap = buildCountersSnapshot(reviewState.newIntroduced, reviewState.activity);
}

function handleAppStoreUpdate(state: ReturnType<typeof useAppStore.getState>): void {
  if (!shouldCaptureStoreChange()) {
    prevDecksMap = buildDecksSnapshot(state.decks);
    prevSettingsSig = buildSettingsSignature(state);
    return;
  }

  const now = Date.now();
  const outboxItems: NewSyncOutboxItem[] = [];

  // 1. Diff settings + deckLimits
  const nextSettingsSig = buildSettingsSignature(state);
  if (nextSettingsSig !== prevSettingsSig) {
    prevSettingsSig = nextSettingsSig;
    outboxItems.push({
      entity: "settings",
      key: "settings",
      op: "upsert",
      payload: settingsToServerPayload(state.settings, state.deckLimits, now) as unknown as Record<string, unknown>,
      clientTs: now,
    });
  }

  // 2. Diff decks (hanya field identitas; abaikan due, total, progress, updated)
  const nextDecksMap = buildDecksSnapshot(state.decks);
  for (const [id, entry] of nextDecksMap.entries()) {
    const prev = prevDecksMap.get(id);
    if (!prev || prev.fp !== entry.fp) {
      outboxItems.push({
        entity: "decks",
        key: id,
        op: "upsert",
        payload: deckToServerPayload(entry.deck, now, null) as unknown as Record<string, unknown>,
        clientTs: now,
      });
    }
  }
  for (const [id, prev] of prevDecksMap.entries()) {
    if (!nextDecksMap.has(id)) {
      outboxItems.push({
        entity: "decks",
        key: id,
        op: "delete",
        payload: deckToServerPayload(prev.deck, now, now) as unknown as Record<string, unknown>,
        clientTs: now,
      });
    }
  }
  prevDecksMap = nextDecksMap;

  if (outboxItems.length > 0) {
    void enqueueOutboxBatch(outboxItems);
  }
}

function handleReviewStoreUpdate(state: ReturnType<typeof useReviewStore.getState>): void {
  if (!shouldCaptureStoreChange()) {
    prevSrsRef = state.srsCards;
    prevCountersMap = buildCountersSnapshot(state.newIntroduced, state.activity);
    return;
  }

  const now = Date.now();
  const outboxItems: NewSyncOutboxItem[] = [];

  // 1. Diff srsCards (per deckId + cardId, fast-path referensi objek)
  if (state.srsCards !== prevSrsRef) {
    const allDeckIds = new Set<string>([
      ...Object.keys(prevSrsRef ?? {}),
      ...Object.keys(state.srsCards ?? {}),
    ]);
    for (const deckId of allDeckIds) {
      const prevDeck = prevSrsRef?.[deckId];
      const nextDeck = state.srsCards?.[deckId];
      if (prevDeck === nextDeck) continue;

      const prevKeys = prevDeck ? Object.keys(prevDeck) : [];
      const nextKeys = nextDeck ? Object.keys(nextDeck) : [];

      for (const cardId of nextKeys) {
        const nextCard = nextDeck![cardId];
        const prevCard = prevDeck?.[cardId];
        if (!srsEqual(prevCard, nextCard)) {
          outboxItems.push({
            entity: "srs_cards",
            key: `${deckId}::${cardId}`,
            op: "upsert",
            payload: srsCardToServerPayload(deckId, cardId, nextCard, null) as unknown as Record<string, unknown>,
            clientTs: now,
          });
        }
      }

      for (const cardId of prevKeys) {
        if (!nextDeck || !Object.prototype.hasOwnProperty.call(nextDeck, cardId)) {
          outboxItems.push({
            entity: "srs_cards",
            key: `${deckId}::${cardId}`,
            op: "delete",
            payload: srsCardToServerPayload(deckId, cardId, null, now) as unknown as Record<string, unknown>,
            clientTs: now,
          });
        }
      }
    }
    prevSrsRef = state.srsCards;
  }

  // 2. Diff daily_counters (newIntroduced + activity)
  const nextCountersMap = buildCountersSnapshot(state.newIntroduced, state.activity);
  const touchedResetScopes: string[] = [];

  for (const [key, nextEntry] of nextCountersMap.entries()) {
    const prevEntry = prevCountersMap.get(key);
    if (!countersEqual(prevEntry, nextEntry)) {
      const resetAt = getCounterResetEpoch(nextEntry.deckId, nextEntry.studyDay);
      outboxItems.push({
        entity: "daily_counters",
        key,
        op: "upsert",
        payload: dailyCounterToServerPayload({
          ...nextEntry,
          resetAt,
        }) as unknown as Record<string, unknown>,
        clientTs: now,
      });
    }
  }

  for (const [key, prevEntry] of prevCountersMap.entries()) {
    if (!nextCountersMap.has(key)) {
      // Counter hilang (Reset progres global / per-deck) -> naikkan epoch reset_at agar tidak bangkit di pull
      setCounterResetEpochInMemory(key, now);
      touchedResetScopes.push(key);
      outboxItems.push({
        entity: "daily_counters",
        key,
        op: "upsert",
        payload: dailyCounterToServerPayload({
          deckId: prevEntry.deckId,
          studyDay: prevEntry.studyDay,
          newIntroduced: 0,
          extraNew: 0,
          reviewedCount: 0,
          lastActivity: null,
          resetAt: now,
        }) as unknown as Record<string, unknown>,
        clientTs: now,
      });
    }
  }
  prevCountersMap = nextCountersMap;

  if (touchedResetScopes.length > 0) {
    void setSyncMeta(META_COUNTER_EPOCHS, counterResetEpochs).catch(() => {});
  }

  if (outboxItems.length > 0) {
    void enqueueOutboxBatch(outboxItems);
  }
}

/**
 * Memastikan baris deck seed (beserta rantai induk `parentId`-nya) ikut diantrekan ke `decks`
 * ketika pengguna mengubah/menambah/menghapus kartu pada deck seed (K2 Opsi A) agar
 * constraint FK `(user_id, deck_id) -> public.decks` selalu terpenuhi di server.
 */
export async function ensureSeedDeckChainQueued(deckId: string): Promise<void> {
  if (!isSeedDeckId(deckId) || !shouldCaptureStoreChange()) return;
  const allDecks = useAppStore.getState().decks;
  const chain: DeckItem[] = [];
  let cur = allDecks.find((d) => d.id === deckId);
  const visited = new Set<string>();
  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId ? allDecks.find((d) => d.id === cur!.parentId) : undefined;
  }
  if (chain.length === 0) return;

  const items: NewSyncOutboxItem[] = chain.map((d) => ({
    entity: "decks",
    key: d.id,
    op: "upsert",
    // client_updated_at = d.updatedAt ?? 0 sehingga tidak mengalahkan edit/tombstone nyata di server
    payload: deckToServerPayload(d, d.updatedAt ?? 0, null) as unknown as Record<string, unknown>,
    clientTs: d.updatedAt ?? 0,
  }));
  await enqueueOutboxBatch(items);
}

/**
 * Mengantrekan satu kali seluruh `reviewLogs` lokal yang dibuat sebelum B2 aktif
 * saat sinkronisasi awal berlangsung (Task 3 #4).
 */
export async function queuePreB2ReviewLogsOnce(deviceId?: string | null): Promise<number> {
  await ensureDeckDbOpen();
  const alreadyQueued = await getSyncMeta<boolean>(META_PRE_B2_LOGS_QUEUED);
  if (alreadyQueued) return 0;

  const resolvedDeviceId = deviceId ?? getOrCreateDeviceId() ?? "local";
  const allLogs = await deckDexie.reviewLogs.toArray();
  let queued = 0;

  const CHUNK = 500;
  for (let i = 0; i < allLogs.length; i += CHUNK) {
    const slice = allLogs.slice(i, i + CHUNK);
    const items: NewSyncOutboxItem[] = slice.map((log) => {
      const { id: _dropId, ...rest } = log;
      const payload = reviewLogToServerPayload(rest, resolvedDeviceId);
      return {
        entity: "review_logs",
        key: `${payload.device_id}::${payload.card_id}::${payload.reviewed_at}`,
        op: "upsert",
        payload: payload as unknown as Record<string, unknown>,
        clientTs: payload.reviewed_at,
      };
    });
    queued += await enqueueOutboxBatch(items);
  }

  await setSyncMeta(META_PRE_B2_LOGS_QUEUED, true);
  return queued;
}

/** Memulai langganan tangkapan perubahan store (idempoten). */
export function startSyncStoreCapture(): void {
  if (initialized) return;
  initialized = true;
  refreshCaptureSnapshots();
  unsubApp = useAppStore.subscribe((state) => handleAppStoreUpdate(state));
  unsubReview = useReviewStore.subscribe((state) => handleReviewStoreUpdate(state));
}

/** @internal Hanya untuk pengujian unit. */
export function stopSyncStoreCaptureForTest(): void {
  unsubApp?.();
  unsubReview?.();
  unsubApp = null;
  unsubReview = null;
  initialized = false;
  counterResetEpochs = {};
}
