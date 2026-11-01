import {
  lexiconDb,
  type LexiconDatabase,
  type OcrCacheRecord,
} from "../lexiconDb";
import type { NaturalPixelBox } from "../mangaCoordinates";

export type OcrLanguage = "jpn" | "jpn_vert";
export type OcrModelVariant = "fast" | "best";

export interface OcrProgressInfo {
  status: string;
  progress: number; // 0..1
  lang?: OcrLanguage;
}

export interface OcrRecognizeOptions {
  lang?: OcrLanguage;
  modelVariant?: OcrModelVariant;
  onProgress?: (info: OcrProgressInfo) => void;
}

export interface OcrRecognitionResult {
  text: string;
  rawText: string;
  confidence?: number;
  elapsedMs?: number;
  columnOrderVerifiedRtl?: boolean;
}

/**
 * Antarmuka penyedia OCR yang dapat diganti (pluggable OCR architecture).
 * Memungkinkan implementasi TesseractProvider saat ini, maupun penyedia masa depan
 * seperti manga-ocr atau impor hasil Mokuro tanpa mengubah komponen UI pembaca.
 */
export interface OcrProvider {
  recognize(
    image: Blob,
    opts?: OcrRecognizeOptions,
  ): Promise<OcrRecognitionResult>;
  terminate?(): Promise<void>;
}

/**
 * Mengonversi karakter katakana setengah-lebar (half-width katakana, U+FF66..U+FF9F)
 * menjadi katakana lebar-penuh melalui NFKC, tanpa mengubah tanda baca Jepang standar.
 */
function normalizeHalfwidthKatakana(input: string): string {
  return input.replace(/[\uff66-\uff9f]+/g, (m) => m.normalize("NFKC"));
}

/**
 * Menormalisasi teks hasil OCR Tesseract bahasa Jepang:
 * 1. Menghapus spasi (ASCII maupun ideographic) yang disisipkan Tesseract di antara karakter Jepang.
 * 2. Menyamakan tanda baca setengah-lebar (`!`, `?`, `~`, `.`, `,`, `...`) di sekitar teks Jepang menjadi lebar-penuh (`！`, `？`, `〜`, `。`, `、`, `…`).
 * 3. Membuang simbol liar akibat garis tepi gelembung / derau screentone (`|`, `\`, `^`, `` ` ``, simbol box-drawing, karakter kontrol).
 * 4. Menggabungkan baris/kolom (`\n`) menjadi kalimat Jepang yang utuh.
 */
export function normalizeJapaneseOcrText(rawText: string): string {
  if (!rawText) return "";

  let text = normalizeHalfwidthKatakana(rawText);

  // 1. Samakan baris baru dan hapus karakter kontrol
  text = text.replace(/\r\n?/g, "\n");
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");

  // 2. Buang simbol liar yang sering muncul dari pinggiran gelembung dialog atau screentone
  text = text.replace(
    /[┌┐└┘├┤┬┴┼━┃┏┓┗┛┣┫┳┻╋─│╭╮╯╰╱╲╳¦§¨©®°±²³´µ¶¸¹¢£¤¥€¬¯°±÷×\\^`_|~]/g,
    (ch) => (ch === "~" ? "〜" : ""),
  );

  // 3. Gabungkan baris (Tesseract memisahkan tiap kolom vertikal / baris horizontal dengan \n)
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("");

  const jpCharClass =
    "[\\u3000-\\u303f\\u3040-\\u309f\\u30a0-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff01-\\uff65]";

  // 4. Samakan tanda baca setengah-lebar ke lebar-penuh jika berdampingan dengan karakter Jepang (termasuk bila terpisah spasi OCR)
  text = text.replace(/\.{2,}|…+/g, "…");
  text = text.replace(/!\?/g, "！？");
  text = text.replace(/\?!/g, "？！");
  text = text.replace(new RegExp(`(${jpCharClass})[\\s\\u3000]*!+`, "g"), "$1！");
  text = text.replace(new RegExp(`(${jpCharClass})[\\s\\u3000]*\\?+`, "g"), "$1？");
  text = text.replace(
    new RegExp(`(${jpCharClass})[\\s\\u3000]*\\.(?=[\\s\\u3000]*${jpCharClass}|$)`, "g"),
    "$1。",
  );
  text = text.replace(
    new RegExp(`(${jpCharClass})[\\s\\u3000]*,(?=[\\s\\u3000]*${jpCharClass}|$)`, "g"),
    "$1、",
  );

  // 5. Hapus spasi yang disisipkan di antara karakter Jepang / tanda baca Jepang
  const spaceBetweenJpRe = new RegExp(
    `(${jpCharClass})[\\s\\u3000]+(?=${jpCharClass})`,
    "g",
  );
  let prev = "";
  while (prev !== text) {
    prev = text;
    text = text.replace(spaceBetweenJpRe, "$1");
  }

  // Hapus juga spasi antara karakter Jepang dan angka/huruf di dalam kalimat Jepang
  text = text.replace(
    new RegExp(`(${jpCharClass})[\\s\\u3000]+([0-9A-Za-z])`, "g"),
    "$1$2",
  );
  text = text.replace(
    new RegExp(`([0-9A-Za-z])[\\s\\u3000]+(${jpCharClass})`, "g"),
    "$1$2",
  );

  // Rapikan spasi berlebih pada teks non-Jepang bila ada
  text = text.replace(/[ \t]{2,}/g, " ").trim();

  return text;
}

/**
 * Mengurutkan kolom-kolom vertikal dari output baris Tesseract `jpn_vert`
 * secara ketat dari KANAN ke KIRI (descending berdasarkan koordinat X tengah kolom)
 * apabila baris-baris tersebut merupakan kolom vertikal yang terpisah secara horizontal.
 */
export function orderVerticalOcrColumnsRtl(
  lines: Array<{
    text: string;
    bbox?: { x0: number; y0: number; x1: number; y1: number };
  }>,
): { joinedText: string; wasReordered: boolean } {
  const validLines = lines.filter((l) => l.text && l.text.trim().length > 0);
  if (validLines.length <= 1) {
    return {
      joinedText: validLines.map((l) => l.text).join("\n"),
      wasReordered: false,
    };
  }

  const allHaveBbox = validLines.every(
    (l) =>
      l.bbox &&
      typeof l.bbox.x0 === "number" &&
      typeof l.bbox.x1 === "number" &&
      l.bbox.x1 >= l.bbox.x0,
  );

  if (!allHaveBbox) {
    return {
      joinedText: validLines.map((l) => l.text).join("\n"),
      wasReordered: false,
    };
  }

  const indexed = validLines.map((l, idx) => {
    const b = l.bbox!;
    return {
      idx,
      text: l.text,
      centerX: (b.x0 + b.x1) / 2,
      centerY: (b.y0 + b.y1) / 2,
      width: Math.max(1, b.x1 - b.x0),
      height: Math.max(1, b.y1 - b.y0),
    };
  });

  // Urutkan dari kanan ke kiri (centerX besar ke kecil).
  // Jika dua fragmen berada pada kolom X yang hampir sama (selisih X < separuh lebar kolom),
  // urutkan dari atas ke bawah (centerY kecil ke besar).
  const sorted = [...indexed].sort((a, b) => {
    const avgW = (a.width + b.width) / 2;
    if (Math.abs(a.centerX - b.centerX) > avgW * 0.45) {
      return b.centerX - a.centerX; // Kanan ke kiri!
    }
    return a.centerY - b.centerY; // Atas ke bawah dalam kolom yang sama
  });

  const wasReordered = sorted.some((item, i) => item.idx !== i);
  return {
    joinedText: sorted.map((item) => item.text).join("\n"),
    wasReordered,
  };
}

/**
 * Memecah teks gelembung dialog menjadi daftar kalimat individual apabila gelembung
 * berisi lebih dari satu kalimat (untuk fitur pemilihan kalimat saat Sentence Mining di Tahap 4).
 */
export function splitBubbleIntoSentences(text: string): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  const parts: string[] = [];
  // Pisahkan setelah tanda akhir kalimat Jepang (。！？!?) termasuk penutup kutipan (」』）)
  const re = /[^。！？!?]+[。！？!?]+[」』）)]*/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(cleaned)) !== null) {
    const seg = match[0].trim();
    if (seg) parts.push(seg);
    lastEnd = re.lastIndex;
  }

  if (lastEnd < cleaned.length) {
    const tail = cleaned.slice(lastEnd).trim();
    if (tail) parts.push(tail);
  }

  return parts.length > 0 ? parts : [cleaned];
}

/**
 * Menghitung Intersection-over-Union (IoU) antara dua kotak piksel asli
 * untuk mencocokkan cache OCR per (manga, halaman, kotak).
 */
export function computeBoxIoU(a: NaturalPixelBox, b: NaturalPixelBox): number {
  const xA = Math.max(a.x, b.x);
  const yA = Math.max(a.y, b.y);
  const xB = Math.min(a.x + a.w, b.x + b.w);
  const yB = Math.min(a.y + a.h, b.y + b.h);

  const interW = Math.max(0, xB - xA);
  const interH = Math.max(0, yB - yA);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;

  const areaA = Math.max(1, a.w * a.h);
  const areaB = Math.max(1, b.w * b.h);
  return interArea / (areaA + areaB - interArea);
}

/**
 * Mengambil seluruh entri cache OCR yang tersimpan untuk `(bookId, pageIndex)`.
 */
export async function listOcrCacheForPage(
  bookId: string,
  pageIndex: number,
  db: LexiconDatabase = lexiconDb,
): Promise<OcrCacheRecord[]> {
  const rows = await db.ocrCache
    .where("[bookId+pageIndex]")
    .equals([bookId, pageIndex])
    .toArray();
  return rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

/**
 * Mencari entri cache OCR yang cocok dengan kotak `bbox` (IoU >= 0.72) pada halaman yang sama.
 */
export async function findMatchingOcrCache(
  bookId: string,
  pageIndex: number,
  bbox: NaturalPixelBox,
  db: LexiconDatabase = lexiconDb,
): Promise<OcrCacheRecord | null> {
  const rows = await listOcrCacheForPage(bookId, pageIndex, db);
  let bestMatch: OcrCacheRecord | null = null;
  let bestIoU = 0;

  for (const row of rows) {
    const iou = computeBoxIoU(row.bbox, bbox);
    if (iou >= 0.72 && iou > bestIoU) {
      bestIoU = iou;
      bestMatch = row;
    }
  }
  return bestMatch;
}

/**
 * Menyimpan atau memperbarui hasil OCR per `(bookId, pageIndex, bbox)` di Dexie.
 */
export async function saveOcrCacheEntry(
  entry: Omit<OcrCacheRecord, "id" | "createdAt"> & { id?: number },
  db: LexiconDatabase = lexiconDb,
): Promise<OcrCacheRecord> {
  const existing =
    entry.id !== undefined
      ? await db.ocrCache.get(entry.id)
      : await findMatchingOcrCache(
          entry.bookId,
          entry.pageIndex,
          entry.bbox,
          db,
        );

  const nowIso = new Date().toISOString();
  if (existing?.id !== undefined) {
    const updated: OcrCacheRecord = {
      ...existing,
      bbox: entry.bbox,
      lang: entry.lang,
      rawText: entry.rawText,
      text: entry.text,
      confidence: entry.confidence,
      createdAt: nowIso,
    };
    await db.ocrCache.put(updated);
    return updated;
  }

  const record: OcrCacheRecord = {
    bookId: entry.bookId,
    pageIndex: entry.pageIndex,
    bbox: entry.bbox,
    lang: entry.lang,
    rawText: entry.rawText,
    text: entry.text,
    confidence: entry.confidence,
    createdAt: nowIso,
  };
  const id = await db.ocrCache.add(record);
  return { ...record, id };
}

/**
 * Menghapus satu entri cache OCR berdasarkan ID.
 */
export async function deleteOcrCacheEntry(
  id: number,
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  await db.ocrCache.delete(id);
}

/**
 * Menghapus seluruh cache OCR untuk satu halaman manga atau seluruh manga.
 */
export async function clearOcrCache(
  bookId: string,
  pageIndex?: number,
  db: LexiconDatabase = lexiconDb,
): Promise<number> {
  if (typeof pageIndex === "number") {
    return await db.ocrCache
      .where("[bookId+pageIndex]")
      .equals([bookId, pageIndex])
      .delete();
  }
  return await db.ocrCache.where("bookId").equals(bookId).delete();
}
