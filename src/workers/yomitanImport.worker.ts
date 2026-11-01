/// <reference lib="webworker" />

import {
  deleteDictionaryCascade,
  lexiconDb,
  listDictionaries,
  type DictionaryRecord,
  type TagRecord,
  type TermMetaRecord,
  type TermRecord,
} from "../lib/lexiconDb";
import {
  extractZipEntryJson,
  indexYomitanZip,
  parseTagBankRow,
  parseTermBankRow,
  parseTermMetaBankRow,
  parseYomitanIndex,
  sortBankFileNames,
} from "../lib/yomitanParser";

export type YomitanWorkerRequest =
  | {
      type: "import-yomitan";
      buffer: ArrayBuffer;
      fileName: string;
      replaceExisting?: boolean;
    }
  | {
      type: "cancel";
    };

export type YomitanImportStage =
  | "membuka_zip"
  | "membaca_tag"
  | "menyimpan_istilah"
  | "menyimpan_meta"
  | "membersihkan";

export type YomitanWorkerResponse =
  | {
      type: "progress";
      stage: YomitanImportStage;
      percent: number;
      currentFile: string;
      processedFiles: number;
      totalFiles: number;
      importedTerms: number;
      message: string;
    }
  | {
      type: "complete";
      dictionary: DictionaryRecord;
    }
  | {
      type: "cancelled";
      message: string;
    }
  | {
      type: "error";
      code:
        | "NOT_ZIP"
        | "MISSING_INDEX"
        | "UNKNOWN_FORMAT"
        | "DUPLICATE_DICT"
        | "QUOTA_EXCEEDED"
        | "CORRUPT_DATA"
        | "UNKNOWN";
      message: string;
    };

const BATCH_SIZE = 1000;

let isCancelled = false;
let activeDictId: number | null = null;

function post(msg: YomitanWorkerResponse) {
  self.postMessage(msg);
}

function classifyError(err: unknown): {
  code: Extract<YomitanWorkerResponse, { type: "error" }>["code"];
  message: string;
} {
  if (err instanceof DOMException && err.name === "QuotaExceededError") {
    return {
      code: "QUOTA_EXCEEDED",
      message:
        "Kuota penyimpanan browser (IndexedDB) penuh. Hapus kamus atau deck yang tidak diperlukan lalu coba lagi.",
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/quota/i.test(msg)) {
    return {
      code: "QUOTA_EXCEEDED",
      message:
        "Kuota penyimpanan browser (IndexedDB) penuh. Hapus kamus atau deck yang tidak diperlukan lalu coba lagi.",
    };
  }
  if (/bukan arsip zip|central directory|terpotong/i.test(msg)) {
    return { code: "NOT_ZIP", message: msg };
  }
  if (/index\.json/i.test(msg) && /tidak ditemukan/i.test(msg)) {
    return { code: "MISSING_INDEX", message: msg };
  }
  if (/versi format kamus yomitan tidak dikenal/i.test(msg)) {
    return { code: "UNKNOWN_FORMAT", message: msg };
  }
  if (/sudah terpasang/i.test(msg)) {
    return { code: "DUPLICATE_DICT", message: msg };
  }
  if (/bukan json|gagal mendekompresi|header lokal/i.test(msg)) {
    return { code: "CORRUPT_DATA", message: msg };
  }
  return {
    code: "UNKNOWN",
    message: msg || "Terjadi kesalahan saat mengimpor kamus Yomitan.",
  };
}

async function cleanupPartialImport(dictId: number | null) {
  if (dictId == null) return;
  try {
    post({
      type: "progress",
      stage: "membersihkan",
      percent: 0,
      currentFile: "",
      processedFiles: 0,
      totalFiles: 0,
      importedTerms: 0,
      message: "Membersihkan data kamus setengah jadi...",
    });
    await deleteDictionaryCascade(dictId, lexiconDb);
  } catch {
    // Abaikan error saat rollback
  }
}

async function handleImport(
  buffer: ArrayBuffer,
  replaceExisting = false,
): Promise<void> {
  isCancelled = false;
  activeDictId = null;

  try {
    post({
      type: "progress",
      stage: "membuka_zip",
      percent: 2,
      currentFile: "index.json",
      processedFiles: 0,
      totalFiles: 1,
      importedTerms: 0,
      message: "Membuka arsip ZIP dan memvalidasi index.json...",
    });

    const zipBytes = new Uint8Array(buffer);
    const entries = indexYomitanZip(zipBytes);

    const indexEntry = entries.get("index.json");
    if (!indexEntry) {
      throw new Error(
        "Berkas index.json tidak ditemukan di dalam ZIP. Pastikan berkas ini adalah kamus berformat Yomitan.",
      );
    }

    const rawIndex = extractZipEntryJson(zipBytes, indexEntry);
    const existingDicts = await listDictionaries(lexiconDb);
    const parsedMeta = parseYomitanIndex(rawIndex, existingDicts.length + 1);

    // Cek apakah kamus dengan judul yang sama sudah ada
    const duplicate = existingDicts.find(
      (d) => d.title.toLowerCase() === parsedMeta.title.toLowerCase(),
    );
    if (duplicate) {
      if (!replaceExisting) {
        throw new Error(
          `Kamus "${parsedMeta.title}" sudah terpasang (revisi ${duplicate.revision}). Hapus kamus lama terlebih dahulu atau pilih opsi timpa.`,
        );
      }
      if (duplicate.id != null) {
        await deleteDictionaryCascade(duplicate.id, lexiconDb);
      }
    }

    const allNames = Array.from(entries.keys());
    const tagBankFiles = sortBankFileNames(
      allNames.filter((n) => /^tag_bank_\d+\.json$/i.test(n)),
    );
    const termBankFiles = sortBankFileNames(
      allNames.filter((n) => /^term_bank_\d+\.json$/i.test(n)),
    );
    const metaBankFiles = sortBankFileNames(
      allNames.filter((n) => /^term_meta_bank_\d+\.json$/i.test(n)),
    );

    if (termBankFiles.length === 0) {
      throw new Error(
        "Kamus tidak memiliki berkas term_bank_N.json. Kamus kanji-saja belum didukung pada tahap ini.",
      );
    }

    const totalFiles =
      tagBankFiles.length + termBankFiles.length + metaBankFiles.length;
    let processedFiles = 0;
    let totalTerms = 0;
    let totalTags = 0;
    let totalMeta = 0;

    // Buat entri kamus di tabel dictionaries terlebih dahulu untuk mendapatkan dictId
    const refreshedDicts = await listDictionaries(lexiconDb);
    const dictId = await lexiconDb.dictionaries.add({
      ...parsedMeta,
      priority: refreshedDicts.length + 1,
      termCount: 0,
      tagCount: 0,
      metaCount: 0,
    });
    activeDictId = dictId;

    if (isCancelled) {
      await cleanupPartialImport(activeDictId);
      post({
        type: "cancelled",
        message: "Impor kamus dibatalkan dan data sementara telah dibersihkan.",
      });
      return;
    }

    // 1. Proses tag_bank_N.json
    for (const fileName of tagBankFiles) {
      if (isCancelled) {
        await cleanupPartialImport(activeDictId);
        post({
          type: "cancelled",
          message: "Impor kamus dibatalkan dan data sementara telah dibersihkan.",
        });
        return;
      }

      const entry = entries.get(fileName)!;
      const rows = extractZipEntryJson<unknown[]>(zipBytes, entry);
      if (Array.isArray(rows)) {
        const batch: TagRecord[] = [];
        for (const row of rows) {
          const parsed = parseTagBankRow(row, dictId);
          if (parsed) batch.push(parsed);
          if (batch.length >= BATCH_SIZE) {
            await lexiconDb.tags.bulkAdd(batch);
            totalTags += batch.length;
            batch.length = 0;
          }
        }
        if (batch.length > 0) {
          await lexiconDb.tags.bulkAdd(batch);
          totalTags += batch.length;
        }
      }

      processedFiles++;
      const percent = Math.round((processedFiles / totalFiles) * 100);
      post({
        type: "progress",
        stage: "membaca_tag",
        percent,
        currentFile: fileName,
        processedFiles,
        totalFiles,
        importedTerms: totalTerms,
        message: `Mengimpor tag kamus (${fileName})...`,
      });
    }

    // 2. Proses term_bank_N.json per berkas dan simpan dengan bulkAdd per 1.000 baris
    for (const fileName of termBankFiles) {
      if (isCancelled) {
        await cleanupPartialImport(activeDictId);
        post({
          type: "cancelled",
          message: "Impor kamus dibatalkan dan data sementara telah dibersihkan.",
        });
        return;
      }

      const entry = entries.get(fileName)!;
      const rows = extractZipEntryJson<unknown[]>(zipBytes, entry);
      if (!Array.isArray(rows)) {
        throw new Error(`Isi berkas "${fileName}" bukan array JSON yang valid.`);
      }

      const batch: TermRecord[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (isCancelled) {
          await cleanupPartialImport(activeDictId);
          post({
            type: "cancelled",
            message:
              "Impor kamus dibatalkan dan data sementara telah dibersihkan.",
          });
          return;
        }

        const parsed = parseTermBankRow(rows[i], dictId, parsedMeta.format);
        if (parsed) {
          batch.push(parsed);
        }

        if (batch.length >= BATCH_SIZE) {
          await lexiconDb.terms.bulkAdd(batch);
          totalTerms += batch.length;
          batch.length = 0;

          // Laporkan progress di tengah berkas besar agar UI selalu mulus
          const fileFraction = (i + 1) / rows.length;
          const percent = Math.min(
            99,
            Math.round(((processedFiles + fileFraction) / totalFiles) * 100),
          );
          post({
            type: "progress",
            stage: "menyimpan_istilah",
            percent,
            currentFile: fileName,
            processedFiles,
            totalFiles,
            importedTerms: totalTerms,
            message: `Menyimpan istilah dari ${fileName} (${totalTerms.toLocaleString("id-ID")} entri)...`,
          });
        }
      }

      if (batch.length > 0) {
        await lexiconDb.terms.bulkAdd(batch);
        totalTerms += batch.length;
        batch.length = 0;
      }

      processedFiles++;
      const percent = Math.min(
        99,
        Math.round((processedFiles / totalFiles) * 100),
      );
      post({
        type: "progress",
        stage: "menyimpan_istilah",
        percent,
        currentFile: fileName,
        processedFiles,
        totalFiles,
        importedTerms: totalTerms,
        message: `Selesai memproses ${fileName} (${totalTerms.toLocaleString("id-ID")} entri)...`,
      });
    }

    // 3. Proses term_meta_bank_N.json (frekuensi, pitch accent) — diurai & disimpan
    for (const fileName of metaBankFiles) {
      if (isCancelled) {
        await cleanupPartialImport(activeDictId);
        post({
          type: "cancelled",
          message: "Impor kamus dibatalkan dan data sementara telah dibersihkan.",
        });
        return;
      }

      const entry = entries.get(fileName)!;
      const rows = extractZipEntryJson<unknown[]>(zipBytes, entry);
      if (Array.isArray(rows)) {
        const batch: TermMetaRecord[] = [];
        for (const row of rows) {
          if (isCancelled) {
            await cleanupPartialImport(activeDictId);
            post({
              type: "cancelled",
              message:
                "Impor kamus dibatalkan dan data sementara telah dibersihkan.",
            });
            return;
          }
          const parsed = parseTermMetaBankRow(row, dictId);
          if (parsed) batch.push(parsed);
          if (batch.length >= BATCH_SIZE) {
            await lexiconDb.termMeta.bulkAdd(batch);
            totalMeta += batch.length;
            batch.length = 0;
          }
        }
        if (batch.length > 0) {
          await lexiconDb.termMeta.bulkAdd(batch);
          totalMeta += batch.length;
        }
      }

      processedFiles++;
      const percent = Math.min(
        99,
        Math.round((processedFiles / totalFiles) * 100),
      );
      post({
        type: "progress",
        stage: "menyimpan_meta",
        percent,
        currentFile: fileName,
        processedFiles,
        totalFiles,
        importedTerms: totalTerms,
        message: `Menyimpan metadata frekuensi/pitch (${fileName})...`,
      });
    }

    // Perbarui jumlah akhir pada record kamus
    await lexiconDb.dictionaries.update(dictId, {
      termCount: totalTerms,
      tagCount: totalTags,
      metaCount: totalMeta,
    });

    const saved = await lexiconDb.dictionaries.get(dictId);
    activeDictId = null;

    post({
      type: "complete",
      dictionary: saved ?? {
        id: dictId,
        ...parsedMeta,
        termCount: totalTerms,
        tagCount: totalTags,
        metaCount: totalMeta,
      },
    });
  } catch (err) {
    await cleanupPartialImport(activeDictId);
    activeDictId = null;
    if (isCancelled) {
      post({
        type: "cancelled",
        message: "Impor kamus dibatalkan dan data sementara telah dibersihkan.",
      });
      return;
    }
    const { code, message } = classifyError(err);
    post({ type: "error", code, message });
  }
}

self.onmessage = (event: MessageEvent<YomitanWorkerRequest>) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "cancel") {
    isCancelled = true;
    return;
  }

  if (data.type === "import-yomitan") {
    void handleImport(data.buffer, data.replaceExisting);
  }
};

