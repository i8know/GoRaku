// Pemetaan murni & sanitasi payload antara model lokal GoRaku dan tabel Supabase B2.
// Seluruh data dari server diperlakukan sebagai input tak tepercaya (validasi bentuk, rentang,
// serta sanitasi HTML kartu memakai `sanitizeInline` sebelum masuk IndexedDB lokal).

import { sanitizeInline } from "../ankiText";
import type { ReviewLogEntry, StoredCard } from "../deckDb";
import type { SRSCard } from "../srs";
import { clampDayStartHour, DEFAULT_DAY_START_HOUR, normalizeStudyDayKey } from "../studyDay";
import { clampDesiredRetention, DEFAULT_DESIRED_RETENTION } from "../fsrsScheduler";
import type { DeckImportMeta, DeckItem, DeckLimitOverride } from "../../store/useAppStore";

export const SEED_DECK_IDS: ReadonlySet<string> = new Set([
  "1",
  "2",
  "3",
  "ps-root",
  "ps-bi",
  "ps-ankidrone",
  "ps-kotoba",
  "ps-n1",
  "ps-n2",
  "ps-n3",
  "ps-n4",
  "ps-n5",
]);

export function isSeedDeckId(deckId: string): boolean {
  return SEED_DECK_IDS.has(deckId);
}

export function isSeedCardId(deckId: string, cardId: string): boolean {
  return SEED_DECK_IDS.has(deckId) && cardId.startsWith(`s${deckId}-`);
}

export interface ServerSettingsRow {
  user_id?: string;
  data: Record<string, unknown>;
  client_updated_at: number;
  updated_at?: string;
}

export interface ServerDeckRow {
  user_id?: string;
  id: string;
  parent_id: string | null;
  title: string;
  kanji: string;
  category: string;
  meta: Record<string, unknown> | null;
  deleted_at: number | string | null;
  client_updated_at: number;
  updated_at?: string;
}

export interface ServerCardRow {
  user_id?: string;
  deck_id: string;
  id: string;
  data: Record<string, unknown>;
  deleted_at: number | string | null;
  client_updated_at: number;
  updated_at?: string;
}

export interface ServerSrsRow {
  user_id?: string;
  deck_id: string;
  card_id: string;
  data: Record<string, unknown>;
  last_review: number | null;
  reps: number;
  deleted_at: number | null;
  updated_at?: string;
}

export interface ServerCounterRow {
  user_id?: string;
  deck_id: string;
  study_day: string;
  new_introduced: number;
  extra_new: number;
  reviewed_count: number;
  last_activity: number | null;
  reset_at: number;
  updated_at?: string;
}

export interface ServerReviewLogRow {
  id?: number;
  user_id?: string;
  device_id: string;
  deck_id: string;
  card_id: string;
  rating: number;
  state: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reviewed_at: number;
  updated_at?: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSafeKey(k: string): boolean {
  return k.length > 0 && k.length <= 128 && k !== "__proto__" && k !== "constructor" && k !== "prototype";
}

function clampString(s: unknown, maxLen: number, fallback = ""): string {
  const str = typeof s === "string" ? s : fallback;
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function finiteNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function parseDeletedAtMs(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Decks (exclude derived: due, total, progress, updated)
// ---------------------------------------------------------------------------

function buildDeckMetaPayload(deck: DeckItem): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    level: deck.level || "Campuran • Core",
    color: deck.color || "indigo",
    source: deck.source === "apkg" ? "apkg" : "manual",
  };
  if (deck.subdeckName) meta.subdeckName = deck.subdeckName;
  if (Array.isArray(deck.subdeckIds) && deck.subdeckIds.length > 0) {
    meta.subdeckIds = deck.subdeckIds;
  }
  if (deck.meta) {
    meta.importMeta = deck.meta;
  }
  // Jaga agar ukuran JSON meta tetap di bawah batas CHECK 32 KB (32768 byte)
  if (JSON.stringify(meta).length > 30_000 && meta.importMeta && isPlainObject(meta.importMeta)) {
    const im = meta.importMeta as unknown as DeckImportMeta;
    meta.importMeta = {
      ...im,
      subdecks: Array.isArray(im.subdecks) ? im.subdecks.slice(0, 50) : [],
      noteTypes: Array.isArray(im.noteTypes) ? im.noteTypes.slice(0, 20) : [],
    };
  }
  return meta;
}

/**
 * Sidik jari deterministik hanya dari field identitas DeckItem (mengabaikan field turunan
 * `due`, `total`, `progress`, `updated`, dan `updatedAt`) agar perubahan `total` lokal
 * tidak memicu upsert deck palsu.
 */
export function deckSyncFingerprint(deck: DeckItem): string {
  return JSON.stringify({
    id: deck.id,
    parentId: deck.parentId ?? null,
    title: deck.title,
    kanji: deck.kanji,
    kind: deck.kind,
    level: deck.level,
    color: deck.color,
    source: deck.source ?? "manual",
    subdeckName: deck.subdeckName ?? null,
    subdeckIds: deck.subdeckIds ?? null,
    meta: deck.meta ?? null,
  });
}

export function deckToServerPayload(
  deck: DeckItem,
  clientUpdatedAt: number,
  deletedAt: number | null = null,
): ServerDeckRow {
  return {
    id: clampString(deck.id, 128),
    parent_id: deck.parentId ? clampString(deck.parentId, 128) : null,
    title: clampString(deck.title || "Deck", 200),
    kanji: clampString(deck.kanji || "札", 16),
    category: clampString(deck.kind || "Core", 64),
    meta: buildDeckMetaPayload(deck),
    deleted_at: deletedAt,
    client_updated_at: Math.max(0, Math.round(clientUpdatedAt)),
  };
}

export function deckFromServerRow(row: unknown, existingTotal = 0): DeckItem | null {
  if (!isPlainObject(row)) return null;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!isSafeKey(id)) return null;

  const meta = isPlainObject(row.meta) ? row.meta : {};
  const kind = clampString(row.category, 64, "Core") || "Core";
  const level = typeof meta.level === "string" && meta.level.trim() ? meta.level.trim() : `Campuran • ${kind}`;
  const color = typeof meta.color === "string" && meta.color.trim() ? meta.color.trim() : "indigo";
  const source = meta.source === "apkg" ? "apkg" : "manual";
  const parentId =
    typeof row.parent_id === "string" && isSafeKey(row.parent_id.trim())
      ? row.parent_id.trim()
      : undefined;
  const subdeckName =
    typeof meta.subdeckName === "string" && meta.subdeckName.trim()
      ? meta.subdeckName.trim()
      : undefined;
  const subdeckIds = Array.isArray(meta.subdeckIds)
    ? meta.subdeckIds.filter((x): x is string => typeof x === "string" && isSafeKey(x))
    : undefined;

  let importMeta: DeckImportMeta | undefined;
  if (isPlainObject(meta.importMeta)) {
    const im = meta.importMeta;
    importMeta = {
      fileName: clampString(im.fileName, 256),
      fileSize: Math.max(0, Math.round(finiteNumber(im.fileSize, 0))),
      format: clampString(im.format, 32),
      importedAt: Math.max(0, Math.round(finiteNumber(im.importedAt, 0))),
      noteTypes: Array.isArray(im.noteTypes) ? im.noteTypes.filter((x): x is string => typeof x === "string") : [],
      subdecks: Array.isArray(im.subdecks) ? im.subdecks.filter((x): x is string => typeof x === "string") : [],
      mediaCount: Math.max(0, Math.round(finiteNumber(im.mediaCount, 0))),
      mediaFailed: typeof im.mediaFailed === "number" ? im.mediaFailed : undefined,
      decksCount: typeof im.decksCount === "number" ? im.decksCount : undefined,
      skipped: Math.max(0, Math.round(finiteNumber(im.skipped, 0))),
    };
  }

  const clientTs = Math.max(0, Math.round(finiteNumber(row.client_updated_at, 0)));

  return {
    id,
    title: clampString(row.title, 200, "Deck") || "Deck",
    level,
    kind,
    due: 0,
    total: Math.max(0, Math.round(existingTotal)),
    progress: 0,
    kanji: clampString(row.kanji, 16, "札") || "札",
    color,
    updated: "Hari ini",
    updatedAt: clientTs > 0 ? clientTs : undefined,
    source,
    ...(parentId ? { parentId } : {}),
    ...(subdeckName ? { subdeckName } : {}),
    ...(subdeckIds && subdeckIds.length > 0 ? { subdeckIds } : {}),
    ...(importMeta ? { meta: importMeta } : {}),
  };
}

// ---------------------------------------------------------------------------
// Cards (without media blobs; sanitize inline HTML on pull)
// ---------------------------------------------------------------------------

export function cardToServerPayload(
  card: StoredCard,
  clientUpdatedAt: number,
  deletedAt: number | null = null,
): ServerCardRow {
  const data: Record<string, unknown> =
    deletedAt !== null
      ? {}
      : {
          word: card.word ?? "",
          reading: card.reading ?? "",
          meaning: card.meaning ?? "",
          sentence: card.sentence ?? "",
          translation: card.translation ?? "",
          subdeck: card.subdeck ?? "",
          tags: Array.isArray(card.tags) ? card.tags : [],
          ...(card.audio ? { audio: card.audio } : {}),
          ...(card.sentenceAudio ? { sentenceAudio: card.sentenceAudio } : {}),
          ...(card.image ? { image: card.image } : {}),
        };
  return {
    deck_id: clampString(card.deckId, 128),
    id: clampString(card.id, 128),
    data,
    deleted_at: deletedAt,
    client_updated_at: Math.max(0, Math.round(clientUpdatedAt)),
  };
}

export function cardFromServerRow(row: unknown): StoredCard | null {
  if (!isPlainObject(row)) return null;
  const deckId = typeof row.deck_id === "string" ? row.deck_id.trim() : "";
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!isSafeKey(deckId) || !isSafeKey(id)) return null;
  if (!isPlainObject(row.data)) return null;

  const d = row.data;
  const word = typeof d.word === "string" ? d.word.trim() : "";
  if (!word) return null;

  const reading = typeof d.reading === "string" ? d.reading.trim() : "";
  const meaning = typeof d.meaning === "string" ? sanitizeInline(d.meaning) : "";
  const sentence = typeof d.sentence === "string" ? sanitizeInline(d.sentence) : "";
  const translation = typeof d.translation === "string" ? sanitizeInline(d.translation) : "";
  const subdeck = typeof d.subdeck === "string" ? d.subdeck.trim() : "";
  const tags = Array.isArray(d.tags)
    ? d.tags.filter((t): t is string => typeof t === "string" && t.length <= 128).slice(0, 64)
    : [];

  const audio = typeof d.audio === "string" && d.audio.trim() ? d.audio.trim() : undefined;
  const sentenceAudio =
    typeof d.sentenceAudio === "string" && d.sentenceAudio.trim() ? d.sentenceAudio.trim() : undefined;
  const image = typeof d.image === "string" && d.image.trim() ? d.image.trim() : undefined;

  return {
    id,
    deckId,
    word,
    reading,
    meaning,
    sentence,
    translation,
    subdeck,
    tags,
    ...(audio ? { audio } : {}),
    ...(sentenceAudio ? { sentenceAudio } : {}),
    ...(image ? { image } : {}),
  };
}

// ---------------------------------------------------------------------------
// SRS Cards
// ---------------------------------------------------------------------------

export function srsCardToServerPayload(
  deckId: string,
  cardId: string,
  card: SRSCard | null,
  deletedAt: number | null = null,
): ServerSrsRow {
  if (!card || (deletedAt !== null && (card.lastReview ?? 0) <= deletedAt)) {
    return {
      deck_id: clampString(deckId, 128),
      card_id: clampString(cardId, 128),
      data: {},
      last_review: card?.lastReview != null ? Math.max(0, Math.round(card.lastReview)) : 0,
      reps: card ? Math.max(0, Math.round(card.reps ?? card.repetitions ?? 0)) : 0,
      deleted_at: deletedAt !== null ? Math.max(0, Math.round(deletedAt)) : Date.now(),
    };
  }
  const reps = Math.max(0, Math.round(card.reps ?? card.repetitions ?? 0));
  const lastReview =
    typeof card.lastReview === "number" && Number.isFinite(card.lastReview) && card.lastReview >= 0
      ? Math.round(card.lastReview)
      : null;

  return {
    deck_id: clampString(deckId, 128),
    card_id: clampString(cardId, 128),
    data: { ...card, id: cardId },
    last_review: lastReview,
    reps,
    deleted_at: deletedAt !== null ? Math.max(0, Math.round(deletedAt)) : null,
  };
}

export function isSrsRowAlive(lastReview: number | null | undefined, deletedAt: number | null | undefined): boolean {
  if (deletedAt === null || deletedAt === undefined) return true;
  return (lastReview ?? 0) > deletedAt;
}

export function srsCardFromServerRow(row: unknown): {
  deckId: string;
  cardId: string;
  card: SRSCard | null;
  lastReview: number | null;
  reps: number;
  deletedAt: number | null;
} | null {
  if (!isPlainObject(row)) return null;
  const deckId = typeof row.deck_id === "string" ? row.deck_id.trim() : "";
  const cardId = typeof row.card_id === "string" ? row.card_id.trim() : "";
  if (!isSafeKey(deckId) || !isSafeKey(cardId)) return null;

  const lastReviewRaw = row.last_review;
  const lastReview =
    lastReviewRaw === null || lastReviewRaw === undefined
      ? null
      : Math.max(0, Math.round(finiteNumber(lastReviewRaw, -1)));
  if (lastReview !== null && lastReview < 0) return null;

  const reps = Math.max(0, Math.round(finiteNumber(row.reps, 0)));
  const deletedAtRaw = row.deleted_at;
  const deletedAt =
    deletedAtRaw === null || deletedAtRaw === undefined
      ? null
      : Math.max(0, Math.round(finiteNumber(deletedAtRaw, -1)));
  if (deletedAt !== null && deletedAt < 0) return null;

  if (!isSrsRowAlive(lastReview, deletedAt)) {
    return { deckId, cardId, card: null, lastReview, reps, deletedAt };
  }

  if (!isPlainObject(row.data)) return null;
  const d = row.data;
  const easeFactor = finiteNumber(d.easeFactor, NaN);
  const interval = finiteNumber(d.interval, NaN);
  const repetitions = finiteNumber(d.repetitions, NaN);
  const nextReview = finiteNumber(d.nextReview, NaN);
  if (!Number.isFinite(easeFactor) || !Number.isFinite(interval) || !Number.isFinite(repetitions) || !Number.isFinite(nextReview)) {
    return null;
  }

  const card: SRSCard = {
    id: cardId,
    easeFactor: Math.max(1.3, easeFactor),
    interval: Math.max(0, interval),
    repetitions: Math.max(0, Math.round(repetitions)),
    nextReview: Math.round(nextReview),
  };
  if (typeof d.stability === "number" && Number.isFinite(d.stability)) card.stability = d.stability;
  if (typeof d.difficulty === "number" && Number.isFinite(d.difficulty)) card.difficulty = d.difficulty;
  if (typeof d.state === "number" && Number.isFinite(d.state) && d.state >= 0 && d.state <= 3) {
    card.state = Math.round(d.state);
  }
  if (typeof d.lapses === "number" && Number.isFinite(d.lapses)) card.lapses = Math.max(0, Math.round(d.lapses));
  if (typeof d.reps === "number" && Number.isFinite(d.reps)) card.reps = Math.max(0, Math.round(d.reps));
  else card.reps = reps;
  if (typeof d.lastReview === "number" && Number.isFinite(d.lastReview)) {
    card.lastReview = Math.round(d.lastReview);
  } else if (lastReview !== null) {
    card.lastReview = lastReview;
  }
  if (d.scheduler === "fsrs") card.scheduler = "fsrs";

  return { deckId, cardId, card, lastReview: card.lastReview ?? lastReview, reps: card.reps ?? reps, deletedAt };
}

// ---------------------------------------------------------------------------
// Daily Counters & Review Logs
// ---------------------------------------------------------------------------

export function dailyCounterToServerPayload(params: {
  deckId: string;
  studyDay: string;
  newIntroduced: number;
  extraNew: number;
  reviewedCount: number;
  lastActivity: number | null;
  resetAt: number;
}): ServerCounterRow {
  return {
    deck_id: clampString(params.deckId, 128),
    study_day: normalizeStudyDayKey(params.studyDay),
    new_introduced: Math.max(0, Math.round(params.newIntroduced)),
    extra_new: Math.max(0, Math.round(params.extraNew)),
    reviewed_count: Math.max(0, Math.round(params.reviewedCount)),
    last_activity:
      typeof params.lastActivity === "number" && Number.isFinite(params.lastActivity)
        ? Math.max(0, Math.round(params.lastActivity))
        : null,
    reset_at: Math.max(0, Math.round(params.resetAt)),
  };
}

export function reviewLogToServerPayload(
  entry: Omit<ReviewLogEntry, "id">,
  deviceId: string,
): ServerReviewLogRow {
  return {
    device_id: clampString(deviceId || "local", 128),
    deck_id: clampString(entry.deckId, 128),
    card_id: clampString(entry.cardId, 128),
    rating: Math.max(1, Math.min(4, Math.round(entry.rating))),
    state: Math.max(0, Math.min(3, Math.round(entry.state))),
    due: Math.round(entry.due),
    stability: Number.isFinite(entry.stability) ? entry.stability : 0,
    difficulty: Number.isFinite(entry.difficulty) ? entry.difficulty : 0,
    elapsed_days: Math.max(0, Number.isFinite(entry.elapsedDays) ? entry.elapsedDays : 0),
    scheduled_days: Math.max(0, Math.round(Number.isFinite(entry.scheduledDays) ? entry.scheduledDays : 0)),
    reviewed_at: Math.round(entry.reviewedAt),
  };
}

export function reviewLogFromServerRow(row: unknown): (Omit<ReviewLogEntry, "id"> & { serverId?: number; deviceId?: string }) | null {
  if (!isPlainObject(row)) return null;
  const deckId = typeof row.deck_id === "string" ? row.deck_id.trim() : "";
  const cardId = typeof row.card_id === "string" ? row.card_id.trim() : "";
  if (!isSafeKey(deckId) || !isSafeKey(cardId)) return null;

  const rating = Math.round(finiteNumber(row.rating, NaN));
  const state = Math.round(finiteNumber(row.state, NaN));
  const due = Math.round(finiteNumber(row.due, NaN));
  const stability = finiteNumber(row.stability, NaN);
  const difficulty = finiteNumber(row.difficulty, NaN);
  const elapsedDays = finiteNumber(row.elapsed_days, NaN);
  const scheduledDays = Math.round(finiteNumber(row.scheduled_days, NaN));
  const reviewedAt = Math.round(finiteNumber(row.reviewed_at, NaN));

  if (
    rating < 1 || rating > 4 ||
    state < 0 || state > 3 ||
    !Number.isFinite(due) ||
    !Number.isFinite(stability) ||
    !Number.isFinite(difficulty) ||
    !Number.isFinite(elapsedDays) || elapsedDays < 0 ||
    !Number.isFinite(scheduledDays) || scheduledDays < 0 ||
    !Number.isFinite(reviewedAt) || reviewedAt <= 0
  ) {
    return null;
  }

  return {
    ...(typeof row.id === "number" && Number.isFinite(row.id) ? { serverId: row.id } : {}),
    ...(typeof row.device_id === "string" ? { deviceId: row.device_id } : {}),
    deckId,
    cardId,
    rating,
    state,
    due,
    stability,
    difficulty,
    elapsedDays,
    scheduledDays,
    reviewedAt,
  };
}

// ---------------------------------------------------------------------------
// Settings + deckLimits
// ---------------------------------------------------------------------------

export interface SyncedSettingsBundle {
  settings: {
    newCards: number;
    maxReview: number;
    dayStartHour: number;
    desiredRetention: number;
    newOrder: "urutan" | "acak";
    furi: boolean;
    audio: boolean;
    romaji: boolean;
    remind: boolean;
    time: string;
    weekly: boolean;
    size: string;
  };
  deckLimits: Record<string, DeckLimitOverride>;
}

export function settingsToServerPayload(
  settings: SyncedSettingsBundle["settings"],
  deckLimits: Record<string, DeckLimitOverride>,
  clientUpdatedAt: number,
): ServerSettingsRow {
  return {
    data: {
      settings,
      deckLimits,
    },
    client_updated_at: Math.max(0, Math.round(clientUpdatedAt)),
  };
}

export function settingsFromServerRow(row: unknown): {
  bundle: Partial<SyncedSettingsBundle>;
  clientUpdatedAt: number;
} | null {
  if (!isPlainObject(row) || !isPlainObject(row.data)) return null;
  const clientUpdatedAt = Math.max(0, Math.round(finiteNumber(row.client_updated_at, 0)));
  const data = row.data;
  const rawSettings = isPlainObject(data.settings) ? data.settings : data;

  const parsedSettings: Partial<SyncedSettingsBundle["settings"]> = {};
  if (typeof rawSettings.newCards === "number" && Number.isFinite(rawSettings.newCards)) {
    parsedSettings.newCards = Math.max(1, Math.min(50, Math.round(rawSettings.newCards)));
  }
  if (typeof rawSettings.maxReview === "number" && Number.isFinite(rawSettings.maxReview)) {
    parsedSettings.maxReview = Math.max(1, Math.min(1000, Math.round(rawSettings.maxReview)));
  }
  if (typeof rawSettings.dayStartHour === "number" && Number.isFinite(rawSettings.dayStartHour)) {
    parsedSettings.dayStartHour = clampDayStartHour(rawSettings.dayStartHour);
  }
  if (typeof rawSettings.desiredRetention === "number" && Number.isFinite(rawSettings.desiredRetention)) {
    parsedSettings.desiredRetention = clampDesiredRetention(rawSettings.desiredRetention);
  }
  if (rawSettings.newOrder === "urutan" || rawSettings.newOrder === "acak") {
    parsedSettings.newOrder = rawSettings.newOrder;
  }
  if (typeof rawSettings.furi === "boolean") parsedSettings.furi = rawSettings.furi;
  if (typeof rawSettings.audio === "boolean") parsedSettings.audio = rawSettings.audio;
  if (typeof rawSettings.romaji === "boolean") parsedSettings.romaji = rawSettings.romaji;
  if (typeof rawSettings.remind === "boolean") parsedSettings.remind = rawSettings.remind;
  if (typeof rawSettings.time === "string" && /^\d{2}:\d{2}$/.test(rawSettings.time)) {
    parsedSettings.time = rawSettings.time;
  }
  if (typeof rawSettings.weekly === "boolean") parsedSettings.weekly = rawSettings.weekly;
  if (rawSettings.size === "Kecil" || rawSettings.size === "Sedang" || rawSettings.size === "Besar") {
    parsedSettings.size = rawSettings.size;
  }

  let parsedLimits: Record<string, DeckLimitOverride> | undefined;
  if (isPlainObject(data.deckLimits)) {
    parsedLimits = {};
    for (const [deckId, val] of Object.entries(data.deckLimits)) {
      if (!isSafeKey(deckId) || !isPlainObject(val)) continue;
      const entry: DeckLimitOverride = {};
      if (typeof val.newCards === "number" && Number.isFinite(val.newCards)) {
        entry.newCards = Math.max(1, Math.min(50, Math.round(val.newCards)));
      }
      if (typeof val.maxReview === "number" && Number.isFinite(val.maxReview)) {
        entry.maxReview = Math.max(1, Math.min(1000, Math.round(val.maxReview)));
      }
      if (entry.newCards !== undefined || entry.maxReview !== undefined) {
        parsedLimits[deckId] = entry;
      }
    }
  }

  return {
    bundle: {
      ...(Object.keys(parsedSettings).length > 0
        ? {
            settings: {
              newCards: 15,
              maxReview: 120,
              dayStartHour: DEFAULT_DAY_START_HOUR,
              desiredRetention: DEFAULT_DESIRED_RETENTION,
              newOrder: "urutan",
              furi: true,
              audio: true,
              romaji: false,
              remind: true,
              time: "19:30",
              weekly: true,
              size: "Sedang",
              ...parsedSettings,
            },
          }
        : {}),
      ...(parsedLimits !== undefined ? { deckLimits: parsedLimits } : {}),
    },
    clientUpdatedAt,
  };
}
