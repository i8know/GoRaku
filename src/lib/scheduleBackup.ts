import {
  flushReviewLogs,
  getAllReviewLogs,
  replaceAllReviewLogs,
  type ReviewLogRecord,
} from "./deckDb";
import type { SRSCard } from "./srs";
import { normalizeStudyDayKey } from "./studyDay";
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
  const logs = await getAllReviewLogs();

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
    if (!isPlainObject(deckMap)) {
      throw new Error(`Data kartu untuk deck "${deckId}" tidak valid.`);
    }
    const validatedDeck: Record<string, SRSCard> = {};
    for (const [cardId, cardVal] of Object.entries(deckMap)) {
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

  // Semua validasi lulus -> terapkan secara atomik ke store dan Dexie
  useReviewStore.setState({
    srsCards: nextSrsCards,
    newIntroduced: nextNewIntroduced,
    activity: nextActivity,
  });

  if (validatedLogs !== undefined) {
    await replaceAllReviewLogs(validatedLogs);
    await flushReviewLogs();
  }

  return {
    cardsCount,
    logsCount: validatedLogs ? validatedLogs.length : 0,
  };
}
