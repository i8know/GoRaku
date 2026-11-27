import {
  deckDexie,
  enqueueOutboxBatch,
  flushReviewLogs,
  flushSyncOutboxWrites,
  getAllReviewLogs,
  type NewSyncOutboxItem,
  type ReviewLogEntry as ReviewLogRecord,
} from "./deckDb";
import {
  flushReviewStorageWrites,
  registerReviewBackupExporter,
} from "./reviewStorage";
import { isSafeObjectKey } from "./archiveLimits";
import type { SRSCard } from "./srs";
import { normalizeStudyDayKey } from "./studyDay";
import {
  getOrCreateDeviceId,
  isBlockedUnauthenticatedStorageAccess,
  isPersistWriteSuppressed,
} from "./userStorageScope";
import { isSyncCaptureSuppressed } from "./sync/captureControl";
import { reviewLogToServerPayload } from "./sync/mappers";
import { mergeCounterRecord, mergeSrsRecord } from "./sync/merge";
import { getCounterResetEpoch } from "./sync/storeCapture";
import {
  useReviewStore,
  type DeckActivity,
  type NewIntroducedEntry,
} from "../store/useReviewStore";

export interface ScheduleBackupData {
  version: 1;
  exportedAt: number;
  reviewStorage: {
    srsCards: Record<string, Record<string, SRSCard>>;
    newIntroduced: Record<string, NewIntroducedEntry>;
    activity: Record<string, DeckActivity>;
  };
  reviewLogs?: ReviewLogRecord[];
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isValidSrsCard(val: unknown): val is SRSCard {
  if (!isPlainObject(val)) return false;
  if (typeof val.id !== "string" || val.id.trim().length === 0) return false;
  if (typeof val.easeFactor !== "number" || !Number.isFinite(val.easeFactor)) {
    return false;
  }
  if (typeof val.interval !== "number" || !Number.isFinite(val.interval)) {
    return false;
  }
  if (
    typeof val.repetitions !== "number" ||
    !Number.isFinite(val.repetitions)
  ) {
    return false;
  }
  if (typeof val.nextReview !== "number" || !Number.isFinite(val.nextReview)) {
    return false;
  }
  if (
    val.stability !== undefined &&
    (typeof val.stability !== "number" || !Number.isFinite(val.stability))
  ) {
    return false;
  }
  if (
    val.difficulty !== undefined &&
    (typeof val.difficulty !== "number" || !Number.isFinite(val.difficulty))
  ) {
    return false;
  }
  if (
    val.lastReview !== undefined &&
    (typeof val.lastReview !== "number" || !Number.isFinite(val.lastReview))
  ) {
    return false;
  }
  return true;
}

function isValidReviewLog(val: unknown): val is ReviewLogRecord {
  if (!isPlainObject(val)) return false;
  return (
    typeof val.deckId === "string" &&
    val.deckId.length > 0 &&
    typeof val.cardId === "string" &&
    val.cardId.length > 0 &&
    typeof val.rating === "number" &&
    Number.isFinite(val.rating) &&
    typeof val.state === "number" &&
    Number.isFinite(val.state) &&
    typeof val.due === "number" &&
    Number.isFinite(val.due) &&
    typeof val.stability === "number" &&
    Number.isFinite(val.stability) &&
    typeof val.difficulty === "number" &&
    Number.isFinite(val.difficulty) &&
    typeof val.elapsedDays === "number" &&
    Number.isFinite(val.elapsedDays) &&
    typeof val.scheduledDays === "number" &&
    Number.isFinite(val.scheduledDays) &&
    typeof val.reviewedAt === "number" &&
    Number.isFinite(val.reviewedAt)
  );
}

/**
 * Mengekspor seluruh jadwal belajar (`japanese-review-storage` + `reviewLogs` di Dexie)
 * menjadi objek JSON murni tanpa media.
 */
export async function exportScheduleBackup(): Promise<ScheduleBackupData> {
  await flushReviewLogs();
  const state = useReviewStore.getState();
  let logs: ReviewLogRecord[] = [];
  try {
    logs = await getAllReviewLogs();
  } catch (err) {
    console.warn("Gagal membaca reviewLogs saat ekspor cadangan, melanjutkan tanpa log:", err);
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    reviewStorage: {
      srsCards: JSON.parse(JSON.stringify(state.srsCards)),
      newIntroduced: JSON.parse(JSON.stringify(state.newIntroduced)),
      activity: JSON.parse(JSON.stringify(state.activity)),
    },
    reviewLogs: logs.map(({ id: _id, ...rest }) => rest),
  };
}

export async function exportScheduleBackupJson(): Promise<string> {
  const payload = await exportScheduleBackup();
  return JSON.stringify(payload, null, 2);
}

/** Mengunduh berkas JSON cadangan jadwal belajar dari state store saat ini (termasuk in-memory saat penyimpanan gagal). */
export async function downloadScheduleBackupJson(): Promise<void> {
  const json = await exportScheduleBackupJson();
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `goraku-jadwal-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

registerReviewBackupExporter(downloadScheduleBackupJson);

/**
 * Memvalidasi dan mengimpor cadangan jadwal belajar (JSON string atau objek).
 * Menolak berkas rusak/tidak valid tanpa mengubah data yang sudah ada.
 * Tetap berhasil meskipun field `reviewLogs` tidak disertakan (cadangan lama).
 */
export async function importScheduleBackup(
  input: unknown,
): Promise<{ cardsCount: number; logsCount: number }> {
  let parsed: unknown = input;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error("Berkas JSON jadwal tidak valid atau rusak.");
    }
  }

  if (!isPlainObject(parsed)) {
    throw new Error("Format cadangan jadwal harus berupa objek JSON.");
  }

  const storageContainer = isPlainObject(parsed.reviewStorage)
    ? parsed.reviewStorage
    : isPlainObject(parsed.state)
      ? parsed.state
      : parsed;

  if (!isPlainObject(storageContainer.srsCards)) {
    throw new Error("Data srsCards tidak ditemukan atau tidak valid.");
  }

  const nextSrsCards: Record<string, Record<string, SRSCard>> = {};
  let cardsCount = 0;

  for (const [deckId, deckMap] of Object.entries(storageContainer.srsCards)) {
    if (!isSafeObjectKey(deckId)) {
      throw new Error(`Nama deck "${deckId}" tidak diizinkan.`);
    }
    if (!isPlainObject(deckMap)) {
      throw new Error(`Data kartu untuk deck "${deckId}" tidak valid.`);
    }
    const validatedDeck: Record<string, SRSCard> = {};
    for (const [cardId, cardVal] of Object.entries(deckMap)) {
      if (!isSafeObjectKey(cardId)) {
        throw new Error(`ID kartu "${cardId}" tidak diizinkan.`);
      }
      if (!isValidSrsCard(cardVal)) {
        throw new Error(
          `Kartu "${cardId}" di deck "${deckId}" memiliki struktur tidak valid.`,
        );
      }
      validatedDeck[cardId] = { ...cardVal, id: cardVal.id || cardId };
      cardsCount++;
    }
    nextSrsCards[deckId] = validatedDeck;
  }

  const nextNewIntroduced: Record<string, NewIntroducedEntry> = {};
  if (storageContainer.newIntroduced !== undefined) {
    if (!isPlainObject(storageContainer.newIntroduced)) {
      throw new Error("Field newIntroduced tidak valid.");
    }
    for (const [deckId, introVal] of Object.entries(
      storageContainer.newIntroduced,
    )) {
      if (!isSafeObjectKey(deckId)) {
        throw new Error(`Nama deck "${deckId}" pada newIntroduced tidak diizinkan.`);
      }
      if (
        !isPlainObject(introVal) ||
        typeof introVal.date !== "string" ||
        typeof introVal.count !== "number" ||
        !Number.isFinite(introVal.count)
      ) {
        throw new Error(`Data newIntroduced untuk deck "${deckId}" tidak valid.`);
      }
      const entry: NewIntroducedEntry = {
        date: normalizeStudyDayKey(introVal.date),
        count: Math.max(0, Math.round(introVal.count)),
      };
      if (
        typeof introVal.extraNew === "number" &&
        Number.isFinite(introVal.extraNew) &&
        introVal.extraNew > 0
      ) {
        entry.extraNew = Math.round(introVal.extraNew);
      }
      nextNewIntroduced[deckId] = entry;
    }
  }

  const nextActivity: Record<string, DeckActivity> = {};
  if (storageContainer.activity !== undefined) {
    if (!isPlainObject(storageContainer.activity)) {
      throw new Error("Field activity tidak valid.");
    }
    for (const [deckId, actVal] of Object.entries(storageContainer.activity)) {
      if (!isSafeObjectKey(deckId)) {
        throw new Error(`Nama deck "${deckId}" pada activity tidak diizinkan.`);
      }
      if (
        !isPlainObject(actVal) ||
        typeof actVal.date !== "string" ||
        typeof actVal.count !== "number" ||
        !Number.isFinite(actVal.count) ||
        typeof actVal.last !== "number" ||
        !Number.isFinite(actVal.last)
      ) {
        throw new Error(`Data activity untuk deck "${deckId}" tidak valid.`);
      }
      nextActivity[deckId] = {
        date: normalizeStudyDayKey(actVal.date),
        count: Math.max(0, Math.round(actVal.count)),
        last: actVal.last,
      };
    }
  }

  let validatedLogs: ReviewLogRecord[] | undefined;
  if (parsed.reviewLogs !== undefined) {
    if (!Array.isArray(parsed.reviewLogs)) {
      throw new Error("Field reviewLogs harus berupa array.");
    }
    validatedLogs = [];
    for (const item of parsed.reviewLogs) {
      if (!isValidReviewLog(item)) {
        throw new Error("Terdapat entri reviewLogs yang tidak valid.");
      }
      const { id: _id, ...cleanLog } = item;
      validatedLogs.push(cleanLog);
    }
  }

  // Semua validasi lulus -> gabungkan secara konservatif (tanpa menimpa progres lebih baru)
  // mengikuti aturan merge B2 yang sama (`mergeSrsRecord`, `mergeCounterRecord`, log append-only).
  const current = useReviewStore.getState();

  const mergedSrsCards: Record<string, Record<string, SRSCard>> = {};
  for (const [deckId, deckMap] of Object.entries(current.srsCards ?? {})) {
    mergedSrsCards[deckId] = { ...deckMap };
  }
  for (const [deckId, incomingDeckMap] of Object.entries(nextSrsCards)) {
    const targetDeck = { ...(mergedSrsCards[deckId] ?? {}) };
    for (const [cardId, incomingCard] of Object.entries(incomingDeckMap)) {
      const localCard = targetDeck[cardId] ?? null;
      const { merged, alive } = mergeSrsRecord(
        localCard
          ? {
              card: localCard,
              lastReview: localCard.lastReview ?? null,
              reps: localCard.reps ?? localCard.repetitions ?? 0,
              deletedAt: null,
            }
          : null,
        {
          card: incomingCard,
          lastReview: incomingCard.lastReview ?? null,
          reps: incomingCard.reps ?? incomingCard.repetitions ?? 0,
          deletedAt: null,
        },
      );
      if (alive && merged.card) {
        targetDeck[cardId] = merged.card;
      }
    }
    mergedSrsCards[deckId] = targetDeck;
  }

  const mergedNewIntroduced: Record<string, NewIntroducedEntry> = { ...current.newIntroduced };
  const mergedActivity: Record<string, DeckActivity> = { ...current.activity };
  const counterDeckIds = new Set<string>([
    ...Object.keys(nextNewIntroduced),
    ...Object.keys(nextActivity),
  ]);

  for (const deckId of counterDeckIds) {
    const incIntro = nextNewIntroduced[deckId];
    const incAct = nextActivity[deckId];
    const incDay = incIntro?.date ?? incAct?.date;
    if (!incDay) continue;

    const curIntro = mergedNewIntroduced[deckId];
    const curAct = mergedActivity[deckId];
    const curDay =
      [curIntro?.date, curAct?.date]
        .filter((d): d is string => Boolean(d))
        .map(normalizeStudyDayKey)
        .sort()
        .pop() ?? "";

    // Jangan timpa hari belajar lokal yang lebih baru dengan cadangan dari hari lebih lama
    if (curDay && incDay < curDay) continue;

    const sameDayIntro = curIntro && normalizeStudyDayKey(curIntro.date) === incDay;
    const sameDayAct = curAct && normalizeStudyDayKey(curAct.date) === incDay;
    const localResetAt = getCounterResetEpoch(deckId, incDay);

    const { merged } = mergeCounterRecord(
      sameDayIntro || sameDayAct
        ? {
            newIntroduced: sameDayIntro ? Math.max(0, curIntro.count) : 0,
            extraNew: sameDayIntro ? Math.max(0, curIntro.extraNew ?? 0) : 0,
            reviewedCount: sameDayAct ? Math.max(0, curAct.count) : 0,
            lastActivity: sameDayAct ? curAct.last : null,
            resetAt: localResetAt,
          }
        : null,
      {
        newIntroduced: incIntro ? Math.max(0, incIntro.count) : 0,
        extraNew: incIntro ? Math.max(0, incIntro.extraNew ?? 0) : 0,
        reviewedCount: incAct ? Math.max(0, incAct.count) : 0,
        lastActivity: incAct ? incAct.last : null,
        resetAt: localResetAt,
      },
    );

    if (incIntro || sameDayIntro) {
      mergedNewIntroduced[deckId] = {
        date: incDay,
        count: merged.newIntroduced,
        ...(merged.extraNew > 0 ? { extraNew: merged.extraNew } : {}),
      };
    }
    if (incAct || sameDayAct) {
      mergedActivity[deckId] = {
        date: incDay,
        count: merged.reviewedCount,
        last: merged.lastActivity ?? incAct?.last ?? Date.now(),
      };
    }
  }

  useReviewStore.setState({
    srsCards: mergedSrsCards,
    newIntroduced: mergedNewIntroduced,
    activity: mergedActivity,
  });

  let addedLogsCount = 0;
  if (validatedLogs !== undefined) {
    const existingLogs = await getAllReviewLogs();
    const seenSigs = new Set(
      existingLogs.map((l) => `${l.deckId}::${l.cardId}::${l.reviewedAt}::${l.rating}::${l.state}`),
    );
    const toAppend: Array<Omit<ReviewLogRecord, "id">> = [];
    for (const log of validatedLogs) {
      const sig = `${log.deckId}::${log.cardId}::${log.reviewedAt}::${log.rating}::${log.state}`;
      if (seenSigs.has(sig)) continue;
      seenSigs.add(sig);
      toAppend.push(log);
    }

    if (toAppend.length > 0) {
      await deckDexie.reviewLogs.bulkAdd(toAppend);
      if (
        !isSyncCaptureSuppressed() &&
        !isPersistWriteSuppressed() &&
        !isBlockedUnauthenticatedStorageAccess()
      ) {
        const deviceId = getOrCreateDeviceId() ?? "local";
        const outboxItems: NewSyncOutboxItem[] = toAppend.map((log) => {
          const payload = reviewLogToServerPayload(log, deviceId);
          return {
            entity: "review_logs",
            key: `${payload.device_id}::${payload.card_id}::${payload.reviewed_at}`,
            op: "upsert",
            payload: payload as unknown as Record<string, unknown>,
            clientTs: payload.reviewed_at,
          };
        });
        await enqueueOutboxBatch(outboxItems);
      }
      addedLogsCount = toAppend.length;
    }
    await flushReviewLogs();
  }
  await Promise.allSettled([flushReviewStorageWrites(), flushSyncOutboxWrites()]);

  return {
    cardsCount,
    logsCount: addedLogsCount,
  };
}
