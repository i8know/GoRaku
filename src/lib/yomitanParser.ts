import { inflateSync, strFromU8 } from "fflate";
import { extractYomitanGlossary, toHiragana } from "./kana";
import type {
  DictionaryRecord,
  TagRecord,
  TermMetaRecord,
  TermRecord,
} from "./lexiconDb";

export interface YomitanIndexJson {
  title: string;
  revision: string;
  format?: number;
  version?: number;
  sequenced?: boolean;
  author?: string;
  url?: string;
  description?: string;
  attribution?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface ZipCentralEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

/**
 * Memvalidasi header ZIP dan membaca Central Directory secara O(1) per berkas
 * tanpa mendekompresi seluruh isi ZIP sekaligus ke memori.
 */
export function indexYomitanZip(zipBytes: Uint8Array): Map<string, ZipCentralEntry> {
  if (
    zipBytes.byteLength < 22 ||
    zipBytes[0] !== 0x50 ||
    zipBytes[1] !== 0x4b
  ) {
    throw new Error("Berkas bukan arsip ZIP yang valid atau berkas rusak.");
  }

  const view = new DataView(
    zipBytes.buffer,
    zipBytes.byteOffset,
    zipBytes.byteLength,
  );

  // Cari End of Central Directory (EOCD) signature 0x06054b50 dari akhir berkas
  const minEocdOffset = Math.max(0, zipBytes.byteLength - 65557);
  let eocdOffset = -1;
  for (let i = zipBytes.byteLength - 22; i >= minEocdOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error(
      "Struktur arsip ZIP rusak (End of Central Directory tidak ditemukan).",
    );
  }

  const cdSize = view.getUint32(eocdOffset + 12, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  if (cdOffset + cdSize > zipBytes.byteLength) {
    throw new Error("Arsip ZIP terpotong atau rusak.");
  }

  const entries = new Map<string, ZipCentralEntry>();
  let pos = cdOffset;
  const cdEnd = cdOffset + cdSize;

  while (pos + 46 <= cdEnd) {
    const sig = view.getUint32(pos, true);
    if (sig !== 0x02014b50) {
      throw new Error("Header Central Directory pada arsip ZIP rusak.");
    }
    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const fileNameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const nameBytes = zipBytes.subarray(pos + 46, pos + 46 + fileNameLen);
    // Normalisasi path: buang prefix folder tunggal jika ada dan ubah backslash ke slash
    const rawName = strFromU8(nameBytes).replace(/\\/g, "/");
    const baseName = rawName.split("/").filter(Boolean).pop() ?? rawName;

    if (!rawName.endsWith("/") && baseName) {
      entries.set(baseName, {
        name: baseName,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      });
    }

    pos += 46 + fileNameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * Mengekstrak satu berkas dari ZIP berdasarkan entri Central Directory.
 */
export function extractZipEntryBytes(
  zipBytes: Uint8Array,
  entry: ZipCentralEntry,
): Uint8Array {
  const view = new DataView(
    zipBytes.buffer,
    zipBytes.byteOffset,
    zipBytes.byteLength,
  );
  const localPos = entry.localHeaderOffset;
  if (
    localPos + 30 > zipBytes.byteLength ||
    view.getUint32(localPos, true) !== 0x04034b50
  ) {
    throw new Error(`Header lokal ZIP rusak untuk berkas "${entry.name}".`);
  }

  const fileNameLen = view.getUint16(localPos + 26, true);
  const extraLen = view.getUint16(localPos + 28, true);
  const dataStart = localPos + 30 + fileNameLen + extraLen;
  const dataEnd = dataStart + entry.compressedSize;

  if (dataEnd > zipBytes.byteLength) {
    throw new Error(`Data berkas "${entry.name}" di dalam ZIP terpotong.`);
  }

  const rawSlice = zipBytes.subarray(dataStart, dataEnd);
  if (entry.compressionMethod === 0) {
    return rawSlice;
  }
  if (entry.compressionMethod === 8) {
    try {
      return inflateSync(rawSlice);
    } catch {
      throw new Error(`Gagal mendekompresi berkas "${entry.name}" di dalam ZIP.`);
    }
  }
  throw new Error(
    `Metode kompresi ZIP (${entry.compressionMethod}) pada "${entry.name}" tidak didukung.`,
  );
}

/**
 * Mengekstrak dan mengurai berkas JSON dari entri ZIP.
 */
export function extractZipEntryJson<T = unknown>(
  zipBytes: Uint8Array,
  entry: ZipCentralEntry,
): T {
  const bytes = extractZipEntryBytes(zipBytes, entry);
  const text = strFromU8(bytes);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Berkas "${entry.name}" bukan JSON yang valid.`);
  }
}

/**
 * Memvalidasi isi `index.json` kamus Yomitan.
 */
export function parseYomitanIndex(
  raw: unknown,
  priority = 1,
): Omit<DictionaryRecord, "id" | "termCount" | "tagCount" | "metaCount"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Format index.json kamus tidak valid.");
  }

  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (!title) {
    throw new Error("Berkas index.json tidak memiliki nama kamus (title).");
  }

  const revision =
    typeof obj.revision === "string" || typeof obj.revision === "number"
      ? String(obj.revision).trim()
      : "1";

  const formatRaw = obj.format ?? obj.version ?? 3;
  const format = Number(formatRaw);
  if (format !== 1 && format !== 2 && format !== 3) {
    throw new Error(
      `Versi format kamus Yomitan tidak dikenal (${String(formatRaw)}). Hanya format versi 1–3 yang didukung.`,
    );
  }

  const author = typeof obj.author === "string" ? obj.author.trim() : undefined;
  const url = typeof obj.url === "string" ? obj.url.trim() : undefined;
  const description =
    typeof obj.description === "string" ? obj.description.trim() : undefined;

  let attribution =
    typeof obj.attribution === "string" ? obj.attribution.trim() : "";
  if (!attribution && /jmdict|jitendex/i.test(title)) {
    attribution =
      "JMdict (Electronic Dictionary Research and Development Group - EDRDG), berlisensi di bawah CC BY-SA 4.0.";
  }

  return {
    title,
    revision,
    format,
    author,
    url,
    description,
    attribution,
    enabled: true,
    priority,
    importedAt: new Date().toISOString(),
  };
}

/**
 * Mengurai satu baris pada `term_bank_N.json` (mendukung format v3 dan v1).
 *
 * Skema resmi `dictionary-term-bank-v3-schema.json`:
 * [0: expression, 1: reading, 2: definitionTags, 3: rules, 4: score, 5: glossary[], 6: sequence, 7: termTags]
 */
export function parseTermBankRow(
  row: unknown,
  dictId: number,
  format = 3,
): TermRecord | null {
  if (!Array.isArray(row) || row.length < 6) return null;

  const expression = String(row[0] ?? "").trim();
  if (!expression) return null;

  const rawReading = String(row[1] ?? "").trim();
  // Normalisasi ke Hiragana untuk indeks pencarian kata berkana
  const reading = toHiragana(rawReading || expression);
  const tags = String(row[2] ?? "").trim();
  const rules = String(row[3] ?? "").trim();
  const score = Number(row[4] ?? 0) || 0;

  let glossary: string[];
  let sequence = 0;
  let termTags = "";

  if (format === 1) {
    glossary = extractYomitanGlossary(row.slice(5));
  } else {
    glossary = extractYomitanGlossary(row[5]);
    sequence = Number(row[6] ?? 0) || 0;
    termTags = String(row[7] ?? "").trim();
  }

  if (glossary.length === 0) return null;

  return {
    dictId,
    expression,
    reading,
    rawReading: rawReading || expression,
    tags,
    rules,
    score,
    glossary,
    sequence,
    termTags,
  };
}

/**
 * Mengurai satu baris pada `tag_bank_N.json`.
 * Urutan tuple: [0: name, 1: category, 2: order, 3: notes, 4: score]
 */
export function parseTagBankRow(row: unknown, dictId: number): TagRecord | null {
  if (!Array.isArray(row) || row.length < 1) return null;
  const name = String(row[0] ?? "").trim();
  if (!name) return null;

  return {
    dictId,
    name,
    category: String(row[1] ?? "").trim(),
    order: Number(row[2] ?? 0) || 0,
    notes: String(row[3] ?? "").trim(),
    score: Number(row[4] ?? 0) || 0,
  };
}

/**
 * Mengurai satu baris pada `term_meta_bank_N.json`.
 * Urutan tuple: [0: expression, 1: mode, 2: data]
 */
export function parseTermMetaBankRow(
  row: unknown,
  dictId: number,
): TermMetaRecord | null {
  if (!Array.isArray(row) || row.length < 3) return null;
  const expression = String(row[0] ?? "").trim();
  const mode = String(row[1] ?? "").trim();
  if (!expression || !mode) return null;

  return {
    dictId,
    expression,
    mode,
    data: row[2],
  };
}

/**
 * Mengurutkan nama berkas bank (mis. term_bank_1.json, term_bank_2.json, ..., term_bank_10.json)
 * berdasarkan nomor urut numeriknya.
 */
export function sortBankFileNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const numA = Number(a.match(/_(\d+)\.json$/i)?.[1] ?? 0);
    const numB = Number(b.match(/_(\d+)\.json$/i)?.[1] ?? 0);
    return numA - numB || a.localeCompare(b);
  });
}

