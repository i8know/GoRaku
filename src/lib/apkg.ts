// Client-side deck reader supporting:
//   - Anki packages (.apkg / .colpkg / .zip): SQLite collection.anki2 / .anki21 / .anki21b (zstd v3) + media (JSON or zstd protobuf)
//   - Delimited text (.csv / .tsv / .txt): auto delimiter detection, quotes, header discovery
//   - Flashcard JSON (.json): native app exports and standard card arrays
//   - Curated starter preset decks ready to load in 1 click

import { inflateSync, strFromU8, unzipSync, type UnzipFileInfo } from "fflate";
import { Decompress } from "fzstd";
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm?url";
import {
  extractImages,
  extractSounds,
  furiToKana,
  furiToKanji,
  hasFurigana,
  sanitizeInline,
  toPlain,
  type FieldMapping,
} from "./ankiText";
import type { StoredCard } from "./deckDb";
import type { SRSCard } from "./srs";

export type ApkgFormat = "anki2" | "anki21" | "anki21b" | "csv" | "tsv" | "json";

export type ApkgErrorCode =
  | "NOT_ZIP"
  | "NO_DATABASE"
  | "UNKNOWN_FORMAT"
  | "SKELETON_ONLY"
  | "ZSTD_FAILED"
  | "CORRUPT_DATABASE"
  | "EMPTY_DECK"
  | "QUOTA_EXCEEDED"
  | "ABORTED";

export class ApkgError extends Error {
  code?: ApkgErrorCode;
  constructor(message: string, code?: ApkgErrorCode) {
    super(message);
    this.name = "ApkgError";
    this.code = code;
  }
}

export interface ApkgNoteType {
  id: string;
  name: string;
  fields: string[];
  noteCount: number;
}

export interface ApkgSubdeck {
  id: string;
  name: string;
  noteCount: number;
}

export interface ApkgSchedule {
  interval: number;
  ease: number;
  repetitions: number;
  lapses?: number;
  nextReview: number;
}

export interface ApkgNote {
  id: string;
  cardId?: string;
  noteTypeId: string;
  deckId: string;
  fields: string[];
  tags: string[];
  schedule?: ApkgSchedule;
}

export interface MediaManifestEntry {
  /** Entry name inside the ZIP archive ("0", "1", ...) */
  index: string;
  /** Original media filename ("NhkLocal_...oga") */
  name: string;
  /** Uncompressed file size in bytes (from protobuf field 2, if present) */
  size: number;
  /** 20-byte SHA-1 digest (from protobuf field 3, if present) */
  sha1?: Uint8Array;
}

export interface ZipEntryMeta {
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export interface ParsedApkg {
  fileName: string;
  fileSize: number;
  format: ApkgFormat;
  noteTypes: ApkgNoteType[];
  subdecks: ApkgSubdeck[];
  /** Total number of deck entries in the Anki database (including parent hierarchy decks) */
  totalDecks: number;
  notes: ApkgNote[];
  /** media file name → zip entry name ("0", "1", ...) */
  media: Map<string, string>;
  zstdMedia: boolean;
  suggestedTitle: string;
  raw: Uint8Array;
  /** Optional pre-indexed ZIP Central Directory for O(1) entry extraction without re-scanning */
  zipIndex?: Map<string, ZipEntryMeta> | null;
}

// ---------------------------------------------------------------------------
// Low-level helpers (Zstd, Protobuf, ZIP Central Directory, SQLite)
// ---------------------------------------------------------------------------

let sqlPromise: Promise<SqlJsStatic> | null = null;
const isNodeEnv = typeof process !== "undefined" && !!process.versions?.node;

export function getSql(): Promise<SqlJsStatic> {
  sqlPromise ??= initSqlJs(
    isNodeEnv ? undefined : { locateFile: (file) => (file.endsWith(".wasm") ? wasmUrl : file) },
  ).catch((e) => {
    sqlPromise = null;
    throw e;
  });
  return sqlPromise;
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Zstandard frame magic number: 0xFD2FB528 (little-endian: 28 B5 2F FD). */
export const isZstd = (b: Uint8Array): boolean =>
  b.length >= 4 && b[0] === 0x28 && b[1] === 0xb5 && b[2] === 0x2f && b[3] === 0xfd;

/** ZIP archive magic number: PK\x03\x04 (local header) or PK\x05\x06 (empty archive). */
export const isZipSignature = (b: Uint8Array): boolean =>
  b.length >= 4 &&
  b[0] === 0x50 &&
  b[1] === 0x4b &&
  ((b[2] === 0x03 && b[3] === 0x04) || (b[2] === 0x05 && b[3] === 0x06));

/** SQLite 3 header magic: "SQLite format 3\0". */
export const isSqliteHeader = (b: Uint8Array): boolean => {
  if (b.length < 16) return false;
  const sig = "SQLite format 3\0";
  for (let i = 0; i < 16; i++) {
    if (b[i] !== sig.charCodeAt(i)) return false;
  }
  return true;
};

export function zstdDecompress(data: Uint8Array, context = "data"): Uint8Array {
  try {
    // Streaming API handles frames without a declared content size (as written by Anki).
    const chunks: Uint8Array[] = [];
    const d = new Decompress((chunk) => chunks.push(chunk));
    d.push(data, true);
    if (chunks.length === 0) return new Uint8Array(0);
    if (chunks.length === 1) return chunks[0];
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  } catch {
    throw new ApkgError(
      `Gagal mendekode kompresi Zstandard (zstd) pada ${context}. Berkas mungkin rusak atau tidak lengkap.`,
      "ZSTD_FAILED",
    );
  }
}

export const maybeZstd = (b: Uint8Array, context = "data"): Uint8Array =>
  isZstd(b) ? zstdDecompress(b, context) : b;

/**
 * Decode Anki `meta` protobuf (`message PackageMetadata { int32 version = 1; }`).
 * Returns version number (1, 2, or 3) or undefined if empty/unrecognized.
 */
export function decodePackageMeta(buf: Uint8Array): number | undefined {
  if (!buf || buf.length < 2) return undefined;
  if (buf[0] === 0x08) {
    return buf[1] & 0x7f;
  }
  return undefined;
}

/**
 * Minimal protobuf reader for Anki v3's `MediaEntries { repeated MediaEntry entries = 1; }`
 * where each `MediaEntry` has:
 *   - `string name = 1;` (tag 0x0a, wire 2)
 *   - `uint32 size = 2;` (tag 0x10, wire 0)
 *   - `bytes  sha1 = 3;` (tag 0x1a, wire 2, 20 bytes)
 *   - `uint32 legacy_zip_filename = 255;` (optional, wire 0)
 */
export function decodeMediaProtobuf(buf: Uint8Array): MediaManifestEntry[] {
  const entries: MediaManifestEntry[] = [];
  const varint = (b: Uint8Array, p: { i: number }, limit: number): number => {
    let v = 0;
    let shift = 0;
    while (p.i < limit) {
      const byte = b[p.i++];
      v += (byte & 0x7f) * 2 ** shift;
      if (byte < 0x80) return v;
      shift += 7;
      if (shift > 63) throw new Error("Varint overflow");
    }
    throw new Error("Unexpected EOF while reading protobuf varint");
  };

  const skip = (b: Uint8Array, p: { i: number }, wire: number, limit: number) => {
    if (wire === 0) {
      varint(b, p, limit);
    } else if (wire === 1) {
      p.i += 8;
    } else if (wire === 2) {
      const len = varint(b, p, limit);
      p.i += len;
    } else if (wire === 5) {
      p.i += 4;
    } else {
      throw new Error(`Unsupported protobuf wire type: ${wire}`);
    }
    if (p.i > limit) throw new Error("Protobuf field exceeds message boundary");
  };

  const decoder = new TextDecoder();
  let index = 0;
  const p = { i: 0 };
  const totalLen = buf.length;

  while (p.i < totalLen) {
    const tag = varint(buf, p, totalLen);
    const field = Math.floor(tag / 8);
    const wire = tag & 7;
    if (field === 1 && wire === 2) {
      const len = varint(buf, p, totalLen);
      const end = p.i + len;
      if (end > totalLen) throw new Error("Truncated MediaEntry message");

      let name = "";
      let size = 0;
      let sha1: Uint8Array | undefined;
      let legacy: number | undefined;
      const q = { i: p.i };

      while (q.i < end) {
        const t = varint(buf, q, end);
        const f = Math.floor(t / 8);
        const w = t & 7;
        if (f === 1 && w === 2) {
          const l = varint(buf, q, end);
          if (q.i + l > end) throw new Error("Truncated MediaEntry.name");
          name = decoder.decode(buf.subarray(q.i, q.i + l));
          q.i += l;
        } else if (f === 2 && w === 0) {
          size = varint(buf, q, end);
        } else if (f === 3 && w === 2) {
          const l = varint(buf, q, end);
          if (q.i + l > end) throw new Error("Truncated MediaEntry.sha1");
          sha1 = buf.slice(q.i, q.i + l);
          q.i += l;
        } else if (f === 255 && w === 0) {
          legacy = varint(buf, q, end);
        } else {
          skip(buf, q, w, end);
        }
      }

      if (name) {
        entries.push({
          index: String(legacy ?? index),
          name,
          size,
          sha1,
        });
      }
      index++;
      p.i = end;
    } else {
      skip(buf, p, wire, totalLen);
    }
  }

  return entries;
}

/** Returns a Map of `mediaFileName -> zipEntryName ("0", "1", ...)` from raw protobuf bytes. */
export function decodeMediaEntries(buf: Uint8Array): Map<string, string> {
  const result = new Map<string, string>();
  for (const entry of decodeMediaProtobuf(buf)) {
    result.set(entry.name, entry.index);
  }
  return result;
}

/**
 * Parse the `media` file from an `.apkg` archive, automatically detecting:
 * - Zstd-compressed protobuf (Anki v3 `collection.anki21b`)
 * - Legacy JSON object `{"0": "filename.mp3", ...}` (Anki v2 / v2.1)
 * - Uncompressed protobuf (if already decompressed)
 */
export function parseMediaManifest(mediaRaw?: Uint8Array): { media: Map<string, string>; zstdMedia: boolean } {
  const media = new Map<string, string>();
  if (!mediaRaw || mediaRaw.length === 0) {
    return { media, zstdMedia: false };
  }

  if (isZstd(mediaRaw)) {
    const decompressed = zstdDecompress(mediaRaw, "manifest media");
    // After zstd decompression, check if it's JSON or Protobuf
    const firstNonWs = decompressed.find((b) => b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d);
    if (firstNonWs === 0x7b /* '{' */) {
      const json = JSON.parse(strFromU8(decompressed)) as Record<string, string>;
      for (const [k, v] of Object.entries(json)) {
        if (v) media.set(v, k);
      }
      return { media, zstdMedia: true };
    }
    return { media: decodeMediaEntries(decompressed), zstdMedia: true };
  }

  // Legacy uncompressed JSON media map (`{ "0": "sound.mp3" }`)
  const firstByte = mediaRaw.find((b) => b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d);
  if (firstByte === 0x7b /* '{' */) {
    try {
      const json = JSON.parse(strFromU8(mediaRaw)) as Record<string, string>;
      for (const [k, v] of Object.entries(json)) {
        if (v) media.set(v, k);
      }
    } catch {
      /* empty or invalid JSON */
    }
    return { media, zstdMedia: false };
  }

  // Uncompressed protobuf fallback
  if (mediaRaw[0] === 0x0a) {
    try {
      return { media: decodeMediaEntries(mediaRaw), zstdMedia: false };
    } catch {
      return { media, zstdMedia: false };
    }
  }

  return { media, zstdMedia: false };
}

const normZipName = (name: string) => name.replace(/^.*[\\/]/, "");

/**
 * Index the ZIP Central Directory in a single O(entries) pass (~10-15 ms for 5,300 entries).
 * Enables O(1) slice extraction of any entry without re-scanning the 28 MB buffer per batch.
 * Returns `null` if the archive uses ZIP64 so callers can fall back to `fflate.unzipSync`.
 */
export function indexZipEntries(buf: Uint8Array): Map<string, ZipEntryMeta> | null {
  if (!isZipSignature(buf)) {
    throw new ApkgError("Berkas yang dipilih bukan arsip ZIP / .apkg yang valid.", "NOT_ZIP");
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const minEocd = Math.max(0, buf.byteLength - 65557);
  let eocdOffset = -1;
  for (let i = buf.byteLength - 22; i >= minEocd; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) return null;

  const cdSize = view.getUint32(eocdOffset + 12, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) return null;

  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntryMeta>();
  let pos = cdOffset;
  const cdEnd = cdOffset + cdSize;

  while (pos < cdEnd && pos + 46 <= buf.byteLength) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const compression = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);
    const rawName = decoder.decode(buf.subarray(pos + 46, pos + 46 + nameLen));
    entries.set(normZipName(rawName), {
      compression,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

/** Extract a single entry from `buf` using the pre-built Central Directory index. */
export function extractZipEntry(
  buf: Uint8Array,
  zipIndex: Map<string, ZipEntryMeta> | null | undefined,
  entryName: string,
): Uint8Array | undefined {
  if (zipIndex) {
    const meta = zipIndex.get(entryName);
    if (!meta) return undefined;
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const lh = meta.localHeaderOffset;
    if (lh + 30 > buf.byteLength || view.getUint32(lh, true) !== 0x04034b50) {
      throw new ApkgError(`Header entri ZIP "${entryName}" rusak.`, "NOT_ZIP");
    }
    const nameLen = view.getUint16(lh + 26, true);
    const extraLen = view.getUint16(lh + 28, true);
    const dataStart = lh + 30 + nameLen + extraLen;
    if (dataStart + meta.compressedSize > buf.byteLength) {
      throw new ApkgError(`Data entri ZIP "${entryName}" terpotong.`, "NOT_ZIP");
    }
    const slice = buf.subarray(dataStart, dataStart + meta.compressedSize);
    if (meta.compression === 0) return slice;
    if (meta.compression === 8) return inflateSync(slice);
  }

  // Fallback for ZIP64 or non-standard compression
  const unzipped = unzipSync(buf, {
    filter: (f: UnzipFileInfo) => normZipName(f.name) === entryName,
  });
  for (const [k, v] of Object.entries(unzipped)) {
    if (normZipName(k) === entryName) return v;
  }
  return undefined;
}

function rows(db: Database, sql: string): SqlValue[][] {
  return db.exec(sql)[0]?.values ?? [];
}

function hasTable(db: Database, name: string): boolean {
  return rows(db, `SELECT 1 FROM sqlite_master WHERE type='table' AND name='${name}'`).length > 0;
}

/**
 * Patch Anki v3 custom `COLLATE unicase` in SQLite's in-memory schema so standard SQLite (`sql.js`)
 * can query `fields`, `notetypes`, `decks`, and `tags` without failing with
 * `no such collation sequence: unicase` or `no query solution`.
 */
export function patchUnicaseCollation(db: Database): void {
  try {
    db.run("PRAGMA writable_schema = ON;");
    db.run(
      "UPDATE sqlite_master SET sql = replace(sql, 'COLLATE unicase', 'COLLATE nocase') WHERE sql LIKE '%unicase%';",
    );
    db.run("PRAGMA writable_schema = RESET;");
  } catch {
    /* ignore if database has no unicase definitions */
  }
}

function commonRoot(names: string[]): string {
  if (names.length === 0) return "";
  const nonDefault = names.filter((n) => n.toLowerCase() !== "default");
  const target = nonDefault.length > 0 ? nonDefault : names;
  const parts = target.map((n) => n.split("::"));
  const root: string[] = [];
  for (let i = 0; i < parts[0].length; i++) {
    const seg = parts[0][i];
    if (parts.every((p) => p[i] === seg)) root.push(seg);
    else break;
  }
  return root.join(" · ");
}

const SKELETON_RE = /Please update to the latest Anki version/i;

// ---------------------------------------------------------------------------
// APKG / COLPKG Parsing
// ---------------------------------------------------------------------------

export type ParseStep = "unzip" | "decompress" | "database" | "notes";

export async function parseApkgBuffer(
  raw: Uint8Array,
  fileName: string,
  fileSize: number,
  onStep?: (s: ParseStep, pct?: number) => void,
): Promise<ParsedApkg> {
  onStep?.("unzip", 10);

  if (!isZipSignature(raw)) {
    throw new ApkgError(
      "Berkas ini bukan arsip ZIP (.apkg/.colpkg) yang valid. Pastikan berkas tidak rusak.",
      "NOT_ZIP",
    );
  }

  let zipIndex: Map<string, ZipEntryMeta> | null = null;
  const entries: Record<string, Uint8Array> = {};

  try {
    zipIndex = indexZipEntries(raw);
    if (zipIndex) {
      for (const keyName of ["meta", "collection.anki21b", "collection.anki21", "collection.anki2", "media", "media.json"]) {
        if (zipIndex.has(keyName)) {
          const data = extractZipEntry(raw, zipIndex, keyName);
          if (data) entries[keyName] = data;
        }
      }
    } else {
      const unzipped = unzipSync(raw, {
        filter: (f: UnzipFileInfo) =>
          /^(collection\.anki2(?:1b?)?|media(?:\.json)?|meta)$/i.test(normZipName(f.name)),
      });
      for (const [k, v] of Object.entries(unzipped)) {
        entries[normZipName(k).toLowerCase()] = v;
      }
    }
  } catch (e) {
    if (e instanceof ApkgError) throw e;
    throw new ApkgError("Arsip .apkg rusak atau tidak dapat dibuka.", "NOT_ZIP");
  }

  onStep?.("unzip", 100);

  const metaVersion = entries["meta"] ? decodePackageMeta(entries["meta"]) : undefined;

  // Always prefer collection.anki21b (v3) -> collection.anki21 (v2.1) -> collection.anki2 (v2.0).
  // Never read collection.anki2 when collection.anki21b is present because collection.anki2 in v3
  // is only a dummy 1-note upgrade notice skeleton.
  const format: ApkgFormat | undefined = entries["collection.anki21b"]
    ? "anki21b"
    : entries["collection.anki21"]
      ? "anki21"
      : entries["collection.anki2"]
        ? "anki2"
        : undefined;

  if (!format) {
    if (metaVersion !== undefined && metaVersion > 3) {
      throw new ApkgError(
        `Versi format paket Anki (v${metaVersion}) belum didukung oleh aplikasi ini.`,
        "UNKNOWN_FORMAT",
      );
    }
    throw new ApkgError(
      "Tidak ditemukan database koleksi Anki (collection.anki21b / collection.anki21 / collection.anki2) di dalam paket ini.",
      "NO_DATABASE",
    );
  }

  onStep?.("decompress", 20);

  // Parse media manifest (zstd protobuf in v3, or JSON in legacy v2/v2.1)
  const mediaRaw = entries["media"] ?? entries["media.json"];
  const { media, zstdMedia: manifestZstd } = parseMediaManifest(mediaRaw);
  const zstdMedia = manifestZstd || format === "anki21b";

  onStep?.("decompress", 60);

  // Decompress SQLite database if needed (collection.anki21b is zstd-compressed)
  const rawDbEntry = entries[`collection.${format}`];
  const dbBytes =
    format === "anki21b" || isZstd(rawDbEntry)
      ? zstdDecompress(rawDbEntry, `collection.${format}`)
      : rawDbEntry;

  if (!isSqliteHeader(dbBytes)) {
    throw new ApkgError(
      `Database Anki (collection.${format}) tidak memiliki header SQLite3 yang valid atau formatnya tidak dikenal.`,
      "UNKNOWN_FORMAT",
    );
  }

  onStep?.("decompress", 100);
  onStep?.("database", 50);
  const SQL = await getSql();
  let db: Database;
  try {
    db = new SQL.Database(dbBytes);
  } catch {
    throw new ApkgError("Database SQLite Anki tidak dapat dibaca atau rusak.", "CORRUPT_DATABASE");
  }

  try {
    // Handle Anki v3 custom `unicase` collation before running any table queries
    patchUnicaseCollation(db);

    const crt = Number(rows(db, "SELECT crt FROM col")[0]?.[0] ?? 0);
    const noteTypes = new Map<string, ApkgNoteType>();
    const deckNames = new Map<string, string>();

    if (hasTable(db, "notetypes")) {
      // Schema v3 / v18 (Anki ≥ 2.1.28+): notetypes, fields, decks tables
      // Use NOT INDEXED and sort in JS to avoid custom unicase index traversal
      for (const [id, name] of rows(db, "SELECT id, name FROM notetypes NOT INDEXED")) {
        noteTypes.set(String(id), { id: String(id), name: String(name), fields: [], noteCount: 0 });
      }

      const fieldRows = rows(db, "SELECT ntid, ord, name FROM fields").map((r) => ({
        ntid: String(r[0]),
        ord: Number(r[1]),
        name: String(r[2]),
      }));
      fieldRows.sort((a, b) => (a.ntid === b.ntid ? a.ord - b.ord : a.ntid.localeCompare(b.ntid)));
      for (const f of fieldRows) {
        noteTypes.get(f.ntid)?.fields.push(f.name);
      }

      for (const [id, name] of rows(db, "SELECT id, name FROM decks NOT INDEXED")) {
        deckNames.set(String(id), String(name).split("\x1f").join("::"));
      }
    } else {
      const [modelsJson, decksJson] = rows(db, "SELECT models, decks FROM col")[0] ?? [];
      const models = JSON.parse(String(modelsJson || "{}")) as Record<
        string,
        { name: string; flds: { name: string; ord: number }[] }
      >;
      for (const [id, m] of Object.entries(models)) {
        const fields = [...m.flds].sort((a, b) => a.ord - b.ord).map((f) => f.name);
        noteTypes.set(id, { id, name: m.name, fields, noteCount: 0 });
      }
      const decks = JSON.parse(String(decksJson || "{}")) as Record<string, { name: string }>;
      for (const [id, d] of Object.entries(decks)) {
        deckNames.set(id, String(d.name).split("\x1f").join("::"));
      }
    }

    onStep?.("notes", 85);

    const cardCols = rows(db, "PRAGMA table_info(cards)").map((r) => String(r[1]));
    const hasOdid = cardCols.includes("odid");
    const hasReps = cardCols.includes("reps");
    const hasLapses = cardCols.includes("lapses");

    const cardQuery = `SELECT id, nid, did, ${hasOdid ? "odid" : "0"}, ord, type, queue, due, ivl, factor, ${hasReps ? "reps" : "0"}, ${hasLapses ? "lapses" : "0"} FROM cards`;
    const rawCards = rows(db, cardQuery);

    // Sort in JS by (nid, ord) so the first card (lowest ord) per note decides deck + schedule
    rawCards.sort((a, b) => Number(a[1]) - Number(b[1]) || Number(a[4]) - Number(b[4]));

    const firstCard = new Map<string, { cardId: string; did: string; schedule?: ApkgSchedule }>();
    for (const [cid, nid, did, odid, , type, queue, due, ivl, factor, reps, lapses] of rawCards) {
      const key = String(nid);
      if (firstCard.has(key)) continue;
      const targetDid = Number(odid) > 0 ? String(odid) : String(did);
      const t = Number(type);
      const q = Number(queue);
      const ease = Number(factor) > 0 ? Number(factor) / 1000 : 2.5;
      let schedule: ApkgSchedule | undefined;
      if (q >= 0 && t === 2) {
        const interval = Math.max(1, Number(ivl));
        schedule = {
          interval,
          ease,
          repetitions: Number(reps) > 0 ? Number(reps) : interval >= 21 ? 3 : interval >= 6 ? 2 : 1,
          lapses: Number(lapses) || 0,
          nextReview: (crt + Number(due) * 86400) * 1000,
        };
      } else if (q >= 0 && (t === 1 || t === 3)) {
        schedule = {
          interval: 1,
          ease,
          repetitions: Number(reps) || 0,
          lapses: Number(lapses) || 0,
          nextReview: q === 3 ? (crt + Number(due) * 86400) * 1000 : Number(due) * 1000,
        };
      }
      firstCard.set(key, { cardId: String(cid), did: targetDid, schedule });
    }

    const rawNotes = rows(db, "SELECT id, mid, flds, tags FROM notes");
    rawNotes.sort((a, b) => Number(a[0]) - Number(b[0]));

    const notes: ApkgNote[] = [];
    const deckCounts = new Map<string, number>();

    for (const [id, mid, flds, tags] of rawNotes) {
      const nid = String(id);
      const card = firstCard.get(nid);
      if (!card) continue;
      const noteTypeId = String(mid);
      const nt = noteTypes.get(noteTypeId);
      if (nt) nt.noteCount++;
      deckCounts.set(card.did, (deckCounts.get(card.did) ?? 0) + 1);
      notes.push({
        id: nid,
        cardId: card.cardId,
        noteTypeId,
        deckId: card.did,
        fields: String(flds).split("\x1f"),
        tags: String(tags).trim().split(/\s+/).filter(Boolean),
        schedule: card.schedule,
      });
    }

    if (notes.length === 0) {
      throw new ApkgError("Paket Anki ini tidak berisi catatan atau kartu apa pun.", "EMPTY_DECK");
    }

    // Catch packages that ONLY contain the v3 upgrade placeholder in collection.anki2
    if (notes.length === 1 && SKELETON_RE.test(notes[0].fields.join(" "))) {
      throw new ApkgError(
        "Berkas ini hanya berisi kerangka peringatan “Please update to the latest Anki version” tanpa data kartu utama (collection.anki21b tidak ditemukan). Silakan ekspor ulang dari Anki atau periksa keutuhan berkas .apkg Anda.",
        "SKELETON_ONLY",
      );
    }

    const subdecks: ApkgSubdeck[] = [...deckCounts.entries()]
      .map(([id, noteCount]) => ({ id, name: deckNames.get(id) ?? `Deck ${id}`, noteCount }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const suggestedTitle =
      commonRoot(subdecks.map((d) => d.name)) ||
      (subdecks.length === 1 ? subdecks[0].name.split("::").pop()! : "") ||
      fileName.replace(/\.(apkg|colpkg|zip)$/i, "").replace(/[_-]+/g, " ");

    onStep?.("notes", 100);

    return {
      fileName,
      fileSize,
      format,
      noteTypes: [...noteTypes.values()].filter((n) => n.noteCount > 0),
      subdecks,
      totalDecks: Math.max(deckNames.size, subdecks.length),
      notes,
      media,
      zstdMedia,
      suggestedTitle,
      raw,
      zipIndex,
    };
  } finally {
    db.close();
  }
}

export async function parseApkg(file: File, onStep?: (s: ParseStep) => void): Promise<ParsedApkg> {
  onStep?.("unzip");
  await tick();
  const raw = new Uint8Array(await file.arrayBuffer());
  return parseApkgBuffer(raw, file.name, file.size, (s) => onStep?.(s));
}

// ---------------------------------------------------------------------------
// CSV / TSV / TXT Parsing
// ---------------------------------------------------------------------------

function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          cell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        row.push(cell.trim());
        cell = "";
      } else if (c === "\r") {
        if (next === "\n") i++;
        row.push(cell.trim());
        if (row.some((v) => v.length > 0)) rows.push(row);
        row = [];
        cell = "";
      } else if (c === "\n") {
        row.push(cell.trim());
        if (row.some((v) => v.length > 0)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += c;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((v) => v.length > 0)) rows.push(row);
  }

  return rows;
}

export function parseDelimitedText(text: string, fileName: string, fileSize: number): ParsedApkg {
  const clean = text.replace(/^\ufeff/, "").trim();
  if (!clean) throw new ApkgError("File teks atau CSV kosong.", "EMPTY_DECK");

  const lines = clean.split(/\r?\n/).filter(Boolean).slice(0, 10);
  const isTsvFile = /\.tsv$/i.test(fileName);
  let delimiter = ",";

  if (isTsvFile) {
    delimiter = "\t";
  } else {
    const counts = { "\t": 0, ",": 0, ";": 0, "|": 0 };
    for (const line of lines) {
      counts["\t"] += (line.match(/\t/g) ?? []).length;
      counts[","] += (line.match(/,/g) ?? []).length;
      counts[";"] += (line.match(/;/g) ?? []).length;
      counts["|"] += (line.match(/\|/g) ?? []).length;
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] > 0) delimiter = best[0];
  }

  const allRows = parseDelimitedRows(clean, delimiter);
  if (allRows.length === 0) throw new ApkgError("Tidak ada baris data yang ditemukan dalam file CSV/TSV.", "EMPTY_DECK");

  const firstRow = allRows[0];
  const secondRow = allRows[1] ?? [];
  const headerWords =
    /^(word|expression|kanji|vocab|reading|kana|meaning|translation|sentence|example|audio|image|tags|kata|bacaan|arti|kalimat|terjemah)$/i;
  const cjk = /[\u3040-\u30ff\u3400-\u9fff]/;

  const row0HasHeaderWord = firstRow.some((col) => headerWords.test(col.trim()));
  const row0IsLatinWhileRow1HasCjk =
    firstRow.every((col) => !cjk.test(col)) && secondRow.some((col) => cjk.test(col));
  const hasHeader = row0HasHeaderWord || row0IsLatinWhileRow1HasCjk;

  const fields = hasHeader
    ? firstRow.map((f, i) => f.trim() || `Field ${i + 1}`)
    : firstRow.map((_, i) => `Kolom ${i + 1}`);

  const dataRows = hasHeader ? allRows.slice(1) : allRows;
  if (dataRows.length === 0) {
    throw new ApkgError("File hanya memiliki baris header tanpa baris data kartu.", "EMPTY_DECK");
  }

  const notes: ApkgNote[] = dataRows.map((row, idx) => ({
    id: `csv-${idx + 1}`,
    noteTypeId: "csv-type",
    deckId: "csv-deck",
    fields: fields.map((_, i) => row[i] ?? ""),
    tags: [],
  }));

  const suggestedTitle = fileName.replace(/\.(csv|tsv|txt)$/i, "").replace(/[_-]+/g, " ");

  return {
    fileName,
    fileSize,
    format: delimiter === "\t" ? "tsv" : "csv",
    noteTypes: [{ id: "csv-type", name: "Daftar Baris Teks", fields, noteCount: notes.length }],
    subdecks: [{ id: "csv-deck", name: suggestedTitle, noteCount: notes.length }],
    totalDecks: 1,
    notes,
    media: new Map(),
    zstdMedia: false,
    suggestedTitle,
    raw: new Uint8Array(),
  };
}

// ---------------------------------------------------------------------------
// JSON Parsing
// ---------------------------------------------------------------------------

export function parseJsonDeck(text: string, fileName: string, fileSize: number): ParsedApkg {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApkgError("File JSON tidak valid atau rusak.", "UNKNOWN_FORMAT");
  }

  let cards: {
    word: string;
    reading?: string;
    meaning?: string;
    sentence?: string;
    translation?: string;
    tags?: string[];
    srs?: unknown;
  }[] = [];
  let suggestedTitle = fileName.replace(/\.json$/i, "").replace(/[_-]+/g, " ");

  if (Array.isArray(parsed)) {
    cards = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.title === "string") suggestedTitle = obj.title;
    if (Array.isArray(obj.cards)) cards = obj.cards;
  }

  if (cards.length === 0) {
    throw new ApkgError("Tidak ada kartu yang ditemukan dalam file JSON ini.", "EMPTY_DECK");
  }

  const fields = ["Kata", "Bacaan", "Arti", "Kalimat", "Terjemahan", "Tag"];
  const notes: ApkgNote[] = cards.map((c, i) => {
    const tags = Array.isArray(c.tags) ? c.tags : [];
    return {
      id: `json-${i + 1}`,
      noteTypeId: "json-type",
      deckId: "json-deck",
      fields: [
        c.word || "",
        c.reading || "",
        c.meaning || "",
        c.sentence || "",
        c.translation || "",
        tags.join(", "),
      ],
      tags,
    };
  });

  return {
    fileName,
    fileSize,
    format: "json",
    noteTypes: [{ id: "json-type", name: "Kartu JSON", fields, noteCount: notes.length }],
    subdecks: [{ id: "json-deck", name: suggestedTitle, noteCount: notes.length }],
    totalDecks: 1,
    notes,
    media: new Map(),
    zstdMedia: false,
    suggestedTitle,
    raw: new Uint8Array(),
  };
}

// ---------------------------------------------------------------------------
// Universal File Router
// ---------------------------------------------------------------------------

export async function parseDeckFile(file: File, onStep?: (s: ParseStep) => void): Promise<ParsedApkg> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".apkg") || name.endsWith(".colpkg") || name.endsWith(".zip")) {
    return parseApkg(file, onStep);
  }

  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
    onStep?.("unzip");
    await tick();
    const text = await file.text();
    onStep?.("database");
    await tick();
    const res = parseDelimitedText(text, file.name, file.size);
    onStep?.("notes");
    return res;
  }

  if (name.endsWith(".json")) {
    onStep?.("unzip");
    await tick();
    const text = await file.text();
    onStep?.("database");
    await tick();
    const res = parseJsonDeck(text, file.name, file.size);
    onStep?.("notes");
    return res;
  }

  // Sniff magic bytes if extension is non-standard
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (isZipSignature(header)) {
    return parseApkg(file, onStep);
  }

  throw new ApkgError(
    "Format file tidak didukung. Harap pilih file paket Anki (.apkg/.colpkg), file tabel (.csv/.tsv), atau (.json).",
    "UNKNOWN_FORMAT",
  );
}

// ---------------------------------------------------------------------------
// Curated Preset Decks (1-click ready to study)
// ---------------------------------------------------------------------------

export interface PresetDeck {
  id: string;
  title: string;
  level: string;
  kind: string;
  kanji: string;
  color: string;
  description: string;
  cards: { word: string; reading: string; meaning: string; sentence: string; translation: string; tags: string[] }[];
}

export const PRESET_DECKS: PresetDeck[] = [
  {
    id: "preset-n5",
    title: "JLPT N5 Core Essentials",
    level: "N5",
    kind: "Core",
    kanji: "初",
    color: "coral",
    description: "50 kata & frasa dasar paling esensial untuk memulai fondasi bahasa Jepang.",
    cards: [
      { word: "日本語", reading: "にほんご", meaning: "Bahasa Jepang", sentence: " 日本語[にほんご]を 勉強[べんきょう]しています。", translation: "Saya sedang belajar bahasa Jepang.", tags: ["N5", "Bahasa"] },
      { word: "勉強", reading: "べんきょう", meaning: "belajar", sentence: " 毎日[まいにち] 日本語[にほんご]を 勉強[べんきょう]する。", translation: "Setiap hari belajar bahasa Jepang.", tags: ["N5", "Kegiatan"] },
      { word: "食べる", reading: "たべる", meaning: "makan", sentence: " 朝[あさ]ごはんを 食[た]べましたか？", translation: "Apakah kamu sudah makan sarapan?", tags: ["N5", "Kata Kerja"] },
      { word: "飲む", reading: "のむ", meaning: "minum", sentence: "お 茶[ちゃ]を 飲[の]みます。", translation: "Saya minum teh.", tags: ["N5", "Kata Kerja"] },
      { word: "行く", reading: "いく", meaning: "pergi", sentence: " 明日[あした] 学校[がっこう]へ 行[い]きます。", translation: "Besok saya pergi ke sekolah.", tags: ["N5", "Kata Kerja"] },
      { word: "来る", reading: "くる", meaning: "datang", sentence: " 友達[ともだち]が 家[いえ]に 来[き]ました。", translation: "Teman saya datang ke rumah.", tags: ["N5", "Kata Kerja"] },
      { word: "見る", reading: "みる", meaning: "melihat; menonton", sentence: "アニメを 見[み]るのが 好[す]きです。", translation: "Saya suka menonton anime.", tags: ["N5", "Kata Kerja"] },
      { word: "聞く", reading: "きく", meaning: "mendengar; bertanya", sentence: " 音楽[おんがく]を 聞[き]くのが 趣味[しゅみ]です。", translation: "Hobi saya adalah mendengarkan musik.", tags: ["N5", "Kata Kerja"] },
      { word: "話す", reading: "はなす", meaning: "berbicara", sentence: " 日本語[にほんご]で 話[はな]しましょう。", translation: "Mari berbicara dalam bahasa Jepang.", tags: ["N5", "Kata Kerja"] },
      { word: "読む", reading: "よむ", meaning: "membaca", sentence: " 本[ほん]を 読[よ]む。", translation: "Membaca buku.", tags: ["N5", "Kata Kerja"] },
      { word: "書く", reading: "かく", meaning: "menulis", sentence: " 手紙[てがみ]を 書[か]く。", translation: "Menulis surat.", tags: ["N5", "Kata Kerja"] },
      { word: "買う", reading: "かう", meaning: "membeli", sentence: " 新[あたら]しい 靴[くつ]を 買[か]いました。", translation: "Saya membeli sepatu baru.", tags: ["N5", "Kata Kerja"] },
      { word: "新しい", reading: "あたらしい", meaning: "baru", sentence: "これは 新[あたら]しい スマホです。", translation: "Ini adalah smartphone baru.", tags: ["N5", "Sifat"] },
      { word: "古い", reading: "ふるい", meaning: "lama; tua (benda)", sentence: "この 本[ほん]は 古[ふる]いです。", translation: "Buku ini sudah tua.", tags: ["N5", "Sifat"] },
      { word: "大きい", reading: "おおきい", meaning: "besar", sentence: " 大[おお]きい 部屋[へや]ですね。", translation: "Kamarnya besar, ya.", tags: ["N5", "Sifat"] },
      { word: "小さい", reading: "ちいさい", meaning: "kecil", sentence: " 小[ちい]さい 猫[ねこ]がいます。", translation: "Ada kucing kecil.", tags: ["N5", "Sifat"] },
      { word: "良い", reading: "いい", meaning: "bagus; baik", sentence: " 天気[てんき]が いいですね。", translation: "Cuacanya bagus, ya.", tags: ["N5", "Sifat"] },
      { word: "高い", reading: "たかい", meaning: "tinggi; mahal", sentence: "この 時計[とけい]は 高[たか]いです。", translation: "Jam tangan ini mahal.", tags: ["N5", "Sifat"] },
      { word: "安い", reading: "やすい", meaning: "murah", sentence: " 安[やす]くて 美味[おい]しいです。", translation: "Murah dan lezat.", tags: ["N5", "Sifat"] },
      { word: "楽しい", reading: "たのしい", meaning: "menyenangkan", sentence: " 旅行[りょこう]は 楽[たの]しかったです。", translation: "Perjalanannya sangat menyenangkan.", tags: ["N5", "Sifat"] },
      { word: "難しい", reading: "むずかしい", meaning: "sulit", sentence: " 漢字[かんじ]は 難[むずか]しいです。", translation: "Kanji itu sulit.", tags: ["N5", "Sifat"] },
      { word: "好き", reading: "すき", meaning: "suka", sentence: " 日本[にほん]の 料理[りょうり]が 好[す]きです。", translation: "Saya suka masakan Jepang.", tags: ["N5", "Sifat"] },
      { word: "友達", reading: "ともだち", meaning: "teman", sentence: " 友達[ともだち]と 遊[あそ]びます。", translation: "Bermain bersama teman.", tags: ["N5", "Orang"] },
      { word: "先生", reading: "せんせい", meaning: "guru; dokter", sentence: " 先生[せんせい]、 質問[しつもん]があります。", translation: "Sensei, saya punya pertanyaan.", tags: ["N5", "Orang"] },
      { word: "学生", reading: "がくせい", meaning: "pelajar; mahasiswa", sentence: " 私[わたし]は 大学[だいがく]の 学生[がくせい]です。", translation: "Saya adalah mahasiswa universitas.", tags: ["N5", "Orang"] },
    ],
  },
  {
    id: "preset-anime",
    title: "Anime & Manga Immersion",
    level: "N3",
    kind: "Anime",
    kanji: "魂",
    color: "indigo",
    description: "Kosakata dramatis dan emosional yang paling sering muncul di dialog anime dan manga.",
    cards: [
      { word: "仲間", reading: "なかま", meaning: "rekan seperjuangan; sahabat", sentence: "あいつらは 俺[おれ]の 大切[たいせつ]な 仲間[なかま]だ！", translation: "Mereka adalah rekan berhargaku!", tags: ["Anime", "Ikatan"] },
      { word: "絆", reading: "きずな", meaning: "ikatan emosional / batin", sentence: " 僕[ぼく]たちの 絆[きずな]は 決[けっ]して 壊[こわ]れない。", translation: "Ikatan kita tak akan pernah hancur.", tags: ["Anime", "Ikatan"] },
      { word: "覚悟", reading: "かくご", meaning: "kesiapan mental; tekad", sentence: "お 前[まえ]、 覚悟[かくご]はできているのか？", translation: "Apakah kamu sudah siap menghadapinya?", tags: ["Anime", "Mental"] },
      { word: "諦める", reading: "あきらめる", meaning: "menyerah", sentence: " 最後[さいご]まで 諦[あきら]めるな！", translation: "Jangan menyerah sampai titik akhir!", tags: ["Anime", "Aksi"] },
      { word: "守る", reading: "まもる", meaning: "melindungi", sentence: " 大切[たいせつ]な 人[ひと]を 守[まも]るために 強[つよ]くなる。", translation: "Aku menjadi kuat demi melindungi orang berharga.", tags: ["Anime", "Aksi"] },
      { word: "倒す", reading: "たおす", meaning: "mengalahkan; merobohkan", sentence: " 強敵[きょうてき]を 倒[たお]した。", translation: "Berhasil mengalahkan musuh tangguh.", tags: ["Anime", "Aksi"] },
      { word: "奇跡", reading: "きせき", meaning: "keajaiban", sentence: " 奇跡[きせき]は 待[ま]つものじゃない、 起[お]こすものだ。", translation: "Keajaiban bukan untuk ditunggu, tapi diciptakan.", tags: ["Anime", "Tema"] },
      { word: "運命", reading: "うんめい", meaning: "takdir", sentence: " 運命[うんめい]を 変[か]えてみせる。", translation: "Akan kutunjukkan cara mengubah takdir.", tags: ["Anime", "Tema"] },
      { word: "絶望", reading: "ぜつぼう", meaning: "keputusasaan", sentence: " 絶望[ぜつぼう]の 淵[ふち]から 立[た]ち 上[あ]がる。", translation: "Bangkit kembali dari jurang keputusasaan.", tags: ["Anime", "Emosi"] },
      { word: "希望", reading: "きぼう", meaning: "harapan", sentence: "まだ 希望[きぼう]の 光[ひかり]は 消[き]えていない。", translation: "Cahaya harapan masih belum padam.", tags: ["Anime", "Emosi"] },
    ],
  },
  {
    id: "preset-phrases",
    title: "Frasa Praktis di Jepang",
    level: "N4",
    kind: "Novel",
    kanji: "話",
    color: "sage",
    description: "Ungkapan sopan dan sehari-hari yang dipakai saat traveling atau tinggal di Jepang.",
    cards: [
      { word: "すみません", reading: "すみません", meaning: "permisi; maaf; terima kasih", sentence: "すみません、お 水[みず]をいただけますか？", translation: "Permisi, boleh minta air?", tags: ["Frasa", "Sopan"] },
      { word: "お会計", reading: "おかいけい", meaning: "pembayaran; bon; tagihan", sentence: "お 会計[かいけい]をお 願い[ねがい]します。", translation: "Tolong bon pembayarannya.", tags: ["Restoran"] },
      { word: "おすすめ", reading: "おすすめ", meaning: "rekomendasi", sentence: " 今日の おすすめは 何[なん]ですか？", translation: "Apa rekomendasi menu untuk hari ini?", tags: ["Restoran"] },
      { word: "大丈夫", reading: "だいじょうぶ", meaning: "tidak apa-apa; baik-baik saja", sentence: " 大丈夫[だいじょうぶ]ですから、ご 心配[しんぱい]なく。", translation: "Tidak apa-apa, jangan khawatir.", tags: ["Frasa", "Sehari-hari"] },
      { word: "お疲れ様でした", reading: "おつかれさまでした", meaning: "terima kasih atas kerja kerasnya", sentence: " 今日[きょう]も 一日[いちにち]、お 疲[つか]れ 様[さま]でした。", translation: "Terima kasih atas kerja kerasnya hari ini.", tags: ["Kerja", "Sopan"] },
      { word: "助けて", reading: "たすけて", meaning: "tolong!; bantu aku!", sentence: " 誰[だれ]か 助[たす]けてください！", translation: "Siapapun tolong bantu saya!", tags: ["Darurat"] },
      { word: "遠慮なく", reading: "えんりょなく", meaning: "jangan sungkan; tanpa ragu", sentence: "どうぞ 遠慮[えんりょ]なく 召[め]し 上[あ]がってください。", translation: "Silakan dinikmati tanpa sungkan.", tags: ["Etika"] },
    ],
  },
];

export function presetToParsed(preset: PresetDeck): ParsedApkg {
  const fields = ["Kata", "Bacaan", "Arti", "Kalimat", "Terjemahan", "Tag"];
  const notes: ApkgNote[] = preset.cards.map((c, i) => ({
    id: `preset-${preset.id}-${i + 1}`,
    noteTypeId: "preset-type",
    deckId: preset.id,
    fields: [c.word, c.reading, c.meaning, c.sentence, c.translation, c.tags.join(", ")],
    tags: c.tags,
  }));

  return {
    fileName: `${preset.title}.json`,
    fileSize: 4096,
    format: "json",
    noteTypes: [{ id: "preset-type", name: "Preset Deck", fields, noteCount: notes.length }],
    subdecks: [{ id: preset.id, name: preset.title, noteCount: notes.length }],
    totalDecks: 1,
    notes,
    media: new Map(),
    zstdMedia: false,
    suggestedTitle: preset.title,
    raw: new Uint8Array(),
  };
}

// ---------------------------------------------------------------------------
// Converting notes → cards
// ---------------------------------------------------------------------------

export function noteToCard(note: ApkgNote, mapping: FieldMapping, deckId: string, subdeck: string): StoredCard | null {
  const get = (i: number) => (i >= 0 ? (note.fields[i] ?? "") : "");
  const wordPlain = toPlain(get(mapping.word));
  const word = furiToKanji(wordPlain).trim();
  if (!word) return null;

  let reading = "";
  if (mapping.reading >= 0) reading = furiToKana(toPlain(get(mapping.reading))).replace(/\s+/g, "");
  else if (hasFurigana(wordPlain)) reading = furiToKana(wordPlain).replace(/\s+/g, "");
  if (reading === word) reading = "";

  // Extract [sound:...] and <img src="..."> references so they can be resolved to Blobs via URL.createObjectURL
  const audio =
    extractSounds(get(mapping.audio))[0] ??
    extractSounds(get(mapping.word))[0] ??
    extractSounds(get(mapping.reading))[0];
  const sentenceAudio = extractSounds(get(mapping.sentenceAudio))[0] ?? extractSounds(get(mapping.sentence))[0];
  const image =
    extractImages(get(mapping.image))[0] ??
    extractImages(get(mapping.meaning))[0] ??
    extractImages(get(mapping.sentence))[0];

  return {
    id: note.id,
    deckId,
    word,
    reading,
    meaning: sanitizeInline(get(mapping.meaning)),
    sentence: sanitizeInline(get(mapping.sentence)),
    translation: sanitizeInline(get(mapping.translation)),
    audio,
    sentenceAudio,
    image,
    subdeck,
    tags: note.tags,
  };
}

/**
 * Estimate SRS state from Anki's `ivl`, `factor`, and `due`.
 * TODO(FSRS): Implement full FSRS state estimation (stability S, difficulty D, retrievability R)
 * from Anki v3 `cards.data` JSON (`{"s": ..., "d": ...}`) and `revlog` history when migrating
 * the review engine from SM-2 to native FSRS-5.
 */
export function scheduleToSrs(id: string, s: ApkgSchedule): SRSCard {
  return {
    id,
    easeFactor: Math.max(1.3, s.ease),
    interval: Math.max(1, s.interval),
    repetitions: s.repetitions,
    nextReview: s.nextReview,
  };
}

const MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  flac: "audio/flac",
  webm: "audio/webm",
  mp4: "video/mp4",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
};

export const mimeOf = (name: string): string =>
  MIME[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

/**
 * Extract the given media files from the archive in batches, decompressing one by one
 * using the O(1) Central Directory index so large decks never re-scan the entire ZIP
 * or load all media blobs into memory at once.
 */
export async function extractMedia(
  parsed: ParsedApkg,
  names: Iterable<string>,
  onBatch: (files: [string, Blob][], done: number, total: number, failedInBatch: number) => Promise<void>,
  batchSize = 100,
): Promise<{ stored: number; failed: number; total: number }> {
  const wanted: [entry: string, name: string][] = [];
  for (const name of names) {
    const entry = parsed.media.get(name);
    if (entry !== undefined) wanted.push([entry, name]);
  }
  if (wanted.length === 0) return { stored: 0, failed: 0, total: 0 };

  const zipIndex = parsed.zipIndex !== undefined ? parsed.zipIndex : indexZipEntries(parsed.raw);
  let done = 0;
  let stored = 0;
  let failed = 0;

  for (let i = 0; i < wanted.length; i += batchSize) {
    const slice = wanted.slice(i, i + batchSize);
    const out: [string, Blob][] = [];
    let batchFailed = 0;

    for (const [entryName, fileName] of slice) {
      try {
        const rawBytes = extractZipEntry(parsed.raw, zipIndex, entryName);
        if (!rawBytes) {
          batchFailed++;
          continue;
        }
        const bytes = parsed.zstdMedia || isZstd(rawBytes) ? maybeZstd(rawBytes, fileName) : rawBytes;
        out.push([fileName, new Blob([bytes as BlobPart], { type: mimeOf(fileName) })]);
      } catch {
        batchFailed++;
      }
    }

    done += slice.length;
    stored += out.length;
    failed += batchFailed;
    await onBatch(out, done, wanted.length, batchFailed);
    await tick();
  }

  return { stored, failed, total: wanted.length };
}
