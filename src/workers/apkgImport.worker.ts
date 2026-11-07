// Web Worker for non-blocking Anki .apkg (v2 / v2.1 / v3 zstd) & deck file import.
// Runs ZIP indexing, zstd decompression, SQLite (sql.js WASM) querying, field mapping,
// duplicate detection, and batched IndexedDB writes off the main UI thread.

import {
  ApkgError,
  extractMedia,
  noteToCard,
  parseDeckFile,
  presetToParsed,
  scheduleToSrs,
  type ApkgErrorCode,
  type ApkgFormat,
  type ApkgNote,
  type ApkgNoteType,
  type ApkgSubdeck,
  type ParsedApkg,
  type ParseStep,
  type PresetDeck,
} from "../lib/apkg";
import { guessMapping, type FieldMapping } from "../lib/ankiText";
import {
  CARD_BATCH_SIZE,
  deleteCards,
  deleteDeckData,
  deleteMedia,
  getCardCount,
  getExistingCardIds,
  isQuotaError,
  putCards,
  putMedia,
  type StoredCard,
} from "../lib/deckDb";
import type { SRSCard } from "../lib/srs";
import { extractLevelCode, detectSubdeckHierarchy, type SubdeckDetectionResult } from "../lib/deckSubdecks";

export interface SubdeckCommitDef {
  key: string;
  id: string;
  title: string;
  subdeckName: string;
  level: string;
  kind: string;
  kanji: string;
  color: string;
  pathKey?: string;
  parentPathKey?: string;
  parentId?: string;
  isContainer?: boolean;
}

export interface SubdeckCommitResultItem {
  id: string;
  parentId: string;
  title: string;
  subdeckName: string;
  level: string;
  kind: string;
  kanji: string;
  color: string;
  total: number;
  srsCards: SRSCard[];
  pathKey?: string;
  parentPathKey?: string;
  isContainer?: boolean;
}

export interface SubdeckStat {
  noteCount: number;
  scheduledCount: number;
  noteTypeIds: string[];
}

export interface WorkerParsedSummary {
  fileName: string;
  fileSize: number;
  format: ApkgFormat;
  noteTypes: ApkgNoteType[];
  subdecks: ApkgSubdeck[];
  totalDecks: number;
  totalNotes: number;
  mediaCount: number;
  scheduledCount: number;
  suggestedTitle: string;
  initialMappings: Record<string, FieldMapping>;
  /** Up to 30 sample notes per noteTypeId for live preview on the main thread */
  samplesByType: Record<string, ApkgNote[]>;
  /** Per-subdeck note counts and noteType usage so the UI can filter subdecks without holding 5,000+ notes */
  subdeckStats: Record<string, SubdeckStat>;
  /** Auto-detected subdeck structure and level segregation */
  hierarchy: SubdeckDetectionResult;
}

export interface WorkerCommitOptions {
  deckId: string;
  isNewDeck: boolean;
  selectedDeckIds: string[];
  mappings: Record<string, FieldMapping>;
  includeMedia: boolean;
  scheduleMode: "new" | "estimate";
  duplicateMode: "skip" | "update";
  subdeckOptions?: {
    enabled: boolean;
    strategy: "anki-subdecks" | "level-tags" | "none";
    groups: SubdeckCommitDef[];
  };
}

export interface WorkerCommitResult {
  deckId: string;
  decksCount: number;
  cardsAdded: number;
  cardsUpdated: number;
  cardsTotal: number;
  finalDeckTotal: number;
  mediaStored: number;
  mediaFailed: number;
  skipped: number;
  skippedDuplicates: number;
  skippedEmpty: number;
  scheduled: number;
  srsCards: SRSCard[];
  subdecksCreated?: SubdeckCommitResultItem[];
}

export type WorkerRequest =
  | { type: "parse-file"; file: File }
  | { type: "parse-preset"; preset: PresetDeck }
  | { type: "preview-media"; requestId: number; name: string }
  | { type: "commit-import"; options: WorkerCommitOptions };

export type WorkerResponse =
  | { type: "parse-progress"; step: ParseStep; pct: number }
  | { type: "parse-success"; summary: WorkerParsedSummary }
  | { type: "preview-media-result"; requestId: number; name: string; blob?: Blob }
  | {
      type: "commit-progress";
      phase: "cards" | "media" | "finish";
      done: number;
      total: number;
      pct: number;
      writtenCardIdsBatch?: string[];
      writtenMediaBatch?: string[];
    }
  | { type: "commit-success"; result: WorkerCommitResult }
  | { type: "error"; message: string; code?: ApkgErrorCode };

let currentParsed: ParsedApkg | null = null;

function post(msg: WorkerResponse) {
  self.postMessage(msg);
}

function buildSummary(p: ParsedApkg): WorkerParsedSummary {
  const initialMappings: Record<string, FieldMapping> = {};
  const samplesByType: Record<string, ApkgNote[]> = {};

  for (const nt of p.noteTypes) {
    const matching = p.notes.filter((n) => n.noteTypeId === nt.id);
    const sampleNotes = matching.slice(0, 30);
    samplesByType[nt.id] = sampleNotes;
    initialMappings[nt.id] = guessMapping(
      nt.fields,
      sampleNotes.slice(0, 25).map((n) => n.fields),
    );
  }

  const subdeckStats: Record<string, SubdeckStat> = {};
  const subdeckTypeSets = new Map<string, Set<string>>();
  for (const sd of p.subdecks) {
    subdeckStats[sd.id] = { noteCount: 0, scheduledCount: 0, noteTypeIds: [] };
    subdeckTypeSets.set(sd.id, new Set());
  }

  let scheduledCount = 0;
  for (const n of p.notes) {
    const st = subdeckStats[n.deckId];
    if (st) {
      st.noteCount++;
      if (n.schedule) st.scheduledCount++;
      subdeckTypeSets.get(n.deckId)?.add(n.noteTypeId);
    }
    if (n.schedule) scheduledCount++;
  }

  for (const [sdId, typeSet] of subdeckTypeSets.entries()) {
    if (subdeckStats[sdId]) {
      subdeckStats[sdId].noteTypeIds = [...typeSet];
    }
  }

  return {
    fileName: p.fileName,
    fileSize: p.fileSize,
    format: p.format,
    noteTypes: p.noteTypes,
    subdecks: p.subdecks,
    totalDecks: p.totalDecks,
    totalNotes: p.notes.length,
    mediaCount: p.media.size,
    scheduledCount,
    suggestedTitle: p.suggestedTitle,
    initialMappings,
    samplesByType,
    subdeckStats,
    hierarchy: detectSubdeckHierarchy(p),
  };
}

async function handleParseFile(file: File) {
  currentParsed = null;
  post({ type: "parse-progress", step: "unzip", pct: 5 });

  const name = file.name.toLowerCase();
  if (name.endsWith(".apkg") || name.endsWith(".colpkg") || name.endsWith(".zip")) {
    const raw = new Uint8Array(await file.arrayBuffer());
    const { parseApkgBuffer } = await import("../lib/apkg");
    const parsed = await parseApkgBuffer(raw, file.name, file.size, (step, pct = 50) => {
      post({ type: "parse-progress", step, pct });
    });
    currentParsed = parsed;
    post({ type: "parse-success", summary: buildSummary(parsed) });
    return;
  }

  const parsed = await parseDeckFile(file, (step) => {
    const pct = step === "unzip" ? 25 : step === "decompress" ? 50 : step === "database" ? 75 : 95;
    post({ type: "parse-progress", step, pct });
  });
  currentParsed = parsed;
  post({ type: "parse-success", summary: buildSummary(parsed) });
}

function handleParsePreset(preset: PresetDeck) {
  post({ type: "parse-progress", step: "notes", pct: 80 });
  const parsed = presetToParsed(preset);
  currentParsed = parsed;
  post({ type: "parse-success", summary: buildSummary(parsed) });
}

async function handlePreviewMedia(requestId: number, name: string) {
  if (!currentParsed || !name || !currentParsed.media.has(name)) {
    post({ type: "preview-media-result", requestId, name });
    return;
  }
  let resolvedBlob: Blob | undefined;
  await extractMedia(
    currentParsed,
    [name],
    async (files) => {
      if (files[0]) resolvedBlob = files[0][1];
    },
    1,
  );
  post({ type: "preview-media-result", requestId, name, blob: resolvedBlob });
}

async function handleCommitImport(options: WorkerCommitOptions) {
  if (!currentParsed) {
    throw new ApkgError("Data paket belum siap. Silakan pilih berkas kembali.", "EMPTY_DECK");
  }

  const {
    deckId,
    isNewDeck,
    selectedDeckIds,
    mappings,
    includeMedia,
    scheduleMode,
    duplicateMode,
    subdeckOptions,
  } = options;
  const isSubdecksEnabled = !!subdeckOptions?.enabled && (subdeckOptions.groups?.length ?? 0) > 0;
  const subdeckGroups = isSubdecksEnabled ? subdeckOptions.groups : [];
  const groupByKey = new Map(subdeckGroups.map((g) => [g.key, g]));

  const selectedSet = new Set(selectedDeckIds);
  const subdeckName = new Map(currentParsed.subdecks.map((d) => [d.id, d.name]));
  const selectedNotes = currentParsed.notes.filter((n) => selectedSet.has(n.deckId));

  if (selectedNotes.length === 0) {
    throw new ApkgError("Tidak ada catatan pada sub-deck yang dipilih.", "EMPTY_DECK");
  }

  const newlyAddedCardIds: string[] = [];
  const writtenMediaNames: string[] = [];
  const subdeckCardsCount: Record<string, number> = {};
  const subdeckSrsMap: Record<string, SRSCard[]> = {};

  try {
    const existingIds = isNewDeck ? new Set<string>() : await getExistingCardIds(deckId);
    const seenInImport = new Set<string>();

    const cardsToWrite: StoredCard[] = [];
    const srs: SRSCard[] = [];
    let cardsAdded = 0;
    let cardsUpdated = 0;
    let skippedDuplicates = 0;
    let skippedEmpty = 0;

    for (let i = 0; i < selectedNotes.length; i++) {
      const note = selectedNotes[i];
      const isDuplicate = existingIds.has(note.id) || seenInImport.has(note.id);

      if (isDuplicate && duplicateMode === "skip") {
        skippedDuplicates++;
        continue;
      }

      const mapping = mappings[note.noteTypeId];
      if (!mapping) {
        skippedEmpty++;
        continue;
      }

      let targetDeckId = deckId;
      let targetSubdeckLabel = subdeckName.get(note.deckId) ?? "";

      if (isSubdecksEnabled) {
        if (subdeckOptions.strategy === "anki-subdecks") {
          const g = groupByKey.get(note.deckId);
          if (g) {
            targetDeckId = g.id;
            targetSubdeckLabel = g.subdeckName;
          }
        } else if (subdeckOptions.strategy === "level-tags") {
          let matchedLevel: string | undefined;
          for (const tag of note.tags) {
            const lvl = extractLevelCode(tag);
            if (lvl && lvl !== "Campuran") {
              matchedLevel = lvl;
              break;
            }
          }
          const g = groupByKey.get(matchedLevel || "other") ?? subdeckGroups[0];
          if (g) {
            targetDeckId = g.id;
            targetSubdeckLabel = g.subdeckName;
          }
        }
      }

      const card = noteToCard(note, mapping, targetDeckId, targetSubdeckLabel);
      if (!card) {
        skippedEmpty++;
        continue;
      }

      cardsToWrite.push(card);
      seenInImport.add(note.id);
      subdeckCardsCount[targetDeckId] = (subdeckCardsCount[targetDeckId] || 0) + 1;

      if (isDuplicate) {
        cardsUpdated++;
      } else {
        cardsAdded++;
        newlyAddedCardIds.push(card.id);
      }

      if (scheduleMode === "estimate" && note.schedule) {
        const srsItem = scheduleToSrs(card.id, note.schedule);
        srs.push(srsItem);
        if (!subdeckSrsMap[targetDeckId]) subdeckSrsMap[targetDeckId] = [];
        subdeckSrsMap[targetDeckId].push(srsItem);
      }
    }

    const skipped = skippedDuplicates + skippedEmpty;

    if (cardsToWrite.length === 0) {
      if (skippedDuplicates > 0 && skippedEmpty === 0) {
        const finalDeckTotal = isSubdecksEnabled
          ? cardsToWrite.length
          : await getCardCount(deckId);
        post({
          type: "commit-success",
          result: {
            deckId,
            decksCount:
              selectedDeckIds.length === currentParsed.subdecks.length
                ? currentParsed.totalDecks
                : selectedDeckIds.length,
            cardsAdded: 0,
            cardsUpdated: 0,
            cardsTotal: 0,
            finalDeckTotal,
            mediaStored: 0,
            mediaFailed: 0,
            skipped,
            skippedDuplicates,
            skippedEmpty: 0,
            scheduled: 0,
            srsCards: [],
            subdecksCreated: [],
          },
        });
        return;
      }
      throw new ApkgError(
        "Tidak ada kartu yang dapat disimpan. Pastikan field “Kata / Depan” sudah dipetakan dengan benar.",
        "EMPTY_DECK",
      );
    }

    // Write cards in batches of 500 (CARD_BATCH_SIZE) in a single transaction per batch
    post({
      type: "commit-progress",
      phase: "cards",
      done: 0,
      total: cardsToWrite.length,
      pct: 0,
    });

    for (let i = 0; i < cardsToWrite.length; i += CARD_BATCH_SIZE) {
      const batch = cardsToWrite.slice(i, i + CARD_BATCH_SIZE);
      await putCards(batch);
      const batchNewIds = batch.filter((c) => !existingIds.has(c.id)).map((c) => c.id);
      const done = Math.min(cardsToWrite.length, i + batch.length);
      const pct = Math.round((done / cardsToWrite.length) * 100);
      post({
        type: "commit-progress",
        phase: "cards",
        done,
        total: cardsToWrite.length,
        pct,
        writtenCardIdsBatch: batchNewIds,
      });
    }

    // Media extraction & storage in batches of 100
    let mediaStored = 0;
    let mediaFailed = 0;

    if (includeMedia && currentParsed.media.size > 0) {
      const allSubdecksSelected = selectedDeckIds.length === currentParsed.subdecks.length;
      const wantedMedia = new Set<string>();

      if (allSubdecksSelected) {
        for (const name of currentParsed.media.keys()) wantedMedia.add(name);
      } else {
        for (const c of cardsToWrite) {
          if (c.audio && currentParsed.media.has(c.audio)) wantedMedia.add(c.audio);
          if (c.sentenceAudio && currentParsed.media.has(c.sentenceAudio)) wantedMedia.add(c.sentenceAudio);
          if (c.image && currentParsed.media.has(c.image)) wantedMedia.add(c.image);
        }
      }

      if (wantedMedia.size > 0) {
        post({
          type: "commit-progress",
          phase: "media",
          done: 0,
          total: wantedMedia.size,
          pct: 0,
        });

        const mediaRes = await extractMedia(
          currentParsed,
          wantedMedia,
          async (files, done, total) => {
            const batchMediaNames: string[] = [];
            if (files.length > 0) {
              await putMedia(deckId, files);
              for (const [mName] of files) {
                writtenMediaNames.push(mName);
                batchMediaNames.push(mName);
              }
            }
            const pct = total ? Math.round((done / total) * 100) : 100;
            post({
              type: "commit-progress",
              phase: "media",
              done,
              total,
              pct,
              writtenMediaBatch: batchMediaNames,
            });
          },
          100,
        );

        mediaStored = mediaRes.stored;
        mediaFailed = mediaRes.failed;
      }
    }

    post({
      type: "commit-progress",
      phase: "finish",
      done: 1,
      total: 1,
      pct: 100,
    });

    const subdecksCreated: SubdeckCommitResultItem[] | undefined = isSubdecksEnabled
      ? subdeckGroups
          .map((g) => ({
            id: g.id,
            parentId: g.parentId || deckId,
            title: g.title,
            subdeckName: g.subdeckName,
            level: g.level,
            kind: g.kind,
            kanji: g.kanji,
            color: g.color,
            total: subdeckCardsCount[g.id] ?? 0,
            srsCards: subdeckSrsMap[g.id] ?? [],
            pathKey: g.pathKey,
            parentPathKey: g.parentPathKey,
            isContainer: g.isContainer,
          }))
          .filter((s) => s.isContainer || s.total > 0)
      : undefined;

    const finalDeckTotal = isSubdecksEnabled
      ? cardsToWrite.length
      : await getCardCount(deckId);

    const decksCount =
      selectedDeckIds.length === currentParsed.subdecks.length
        ? currentParsed.totalDecks
        : selectedDeckIds.length;

    post({
      type: "commit-success",
      result: {
        deckId,
        decksCount,
        cardsAdded,
        cardsUpdated,
        cardsTotal: cardsAdded + cardsUpdated,
        finalDeckTotal,
        mediaStored,
        mediaFailed,
        skipped,
        skippedDuplicates,
        skippedEmpty,
        scheduled: srs.length,
        srsCards: srs,
        subdecksCreated,
      },
    });
  } catch (err) {
    // Rollback partial data written before the failure
    try {
      if (isNewDeck) {
        await deleteDeckData(deckId);
        if (isSubdecksEnabled) {
          for (const g of subdeckGroups) {
            await deleteDeckData(g.id);
          }
        }
      } else {
        await deleteCards(deckId, newlyAddedCardIds);
        await deleteMedia(deckId, writtenMediaNames);
      }
    } catch {
      /* ignore rollback error */
    }
    throw err;
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === "parse-file") {
      await handleParseFile(msg.file);
    } else if (msg.type === "parse-preset") {
      handleParsePreset(msg.preset);
    } else if (msg.type === "preview-media") {
      await handlePreviewMedia(msg.requestId, msg.name);
    } else if (msg.type === "commit-import") {
      await handleCommitImport(msg.options);
    }
  } catch (err) {
    if (isQuotaError(err)) {
      post({
        type: "error",
        code: "QUOTA_EXCEEDED",
        message:
          "Kuota penyimpanan IndexedDB penuh. Coba impor tanpa menyertakan media atau hapus deck lama yang tidak terpakai.",
      });
      return;
    }
    if (err instanceof ApkgError) {
      post({
        type: "error",
        code: err.code,
        message: err.message,
      });
      return;
    }
    post({
      type: "error",
      message:
        err instanceof Error && err.message
          ? `Gagal memproses berkas: ${err.message}`
          : "Terjadi kesalahan saat memproses berkas deck. Pastikan berkas tidak rusak.",
    });
  }
};
