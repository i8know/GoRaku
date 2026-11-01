import { isJapaneseChar } from "./kana";
import {
  lexiconDb,
  type BookRecord,
  type LexiconDatabase,
} from "./lexiconDb";
import { convertAozoraRubyToHtml } from "./rubyText";

export interface DecodedTxtResult {
  text: string;
  encoding: "utf-8" | "shift_jis" | "euc-jp" | "utf-16le" | "utf-16be";
}

export interface TxtChapter {
  index: number;
  title: string;
  paragraphs: string[]; // HTML aman per paragraf (mendukung <ruby><rt>)
  charCount: number;
}

/**
 * Menghitung skor kualitas teks hasil dekode untuk memilih antara Shift_JIS dan EUC-JP.
 */
function scoreJapaneseText(text: string): number {
  let score = 0;
  const sampleLen = Math.min(text.length, 8000);
  for (let i = 0; i < sampleLen; i++) {
    const code = text.charCodeAt(i);
    if (code === 0xfffd) {
      // Karakter pengganti (replacement char) mengurangi skor secara drastis
      score -= 25;
    } else if (code >= 0x3040 && code <= 0x309f) {
      // Hiragana (sangat umum pada teks novel Jepang)
      score += 4;
    } else if (code >= 0x30a0 && code <= 0x30ff) {
      // Katakana penuh
      score += 3;
    } else if (code >= 0x4e00 && code <= 0x9fff) {
      // Kanji CJK umum
      score += 3;
    } else if (code >= 0xff61 && code <= 0xff9f) {
      // Half-width katakana sering muncul sebagai mojibake pada salah dekode EUC-JP/Shift_JIS
      score -= 2;
    } else if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
      // Karakter kontrol tak wajar
      score -= 10;
    }
  }
  return score;
}

/**
 * Mendeteksi encoding berkas TXT (UTF-8, UTF-16, Shift_JIS, atau EUC-JP)
 * dan mendekodenya menjadi string Unicode.
 */
export function decodeTxtBytes(bytes: Uint8Array): DecodedTxtResult {
  if (bytes.byteLength === 0) {
    return { text: "", encoding: "utf-8" };
  }

  // 1. Cek BOM eksplisit
  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    const decoder = new TextDecoder("utf-8");
    return { text: decoder.decode(bytes.subarray(3)), encoding: "utf-8" };
  }
  if (bytes.byteLength >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const decoder = new TextDecoder("utf-16le");
    return { text: decoder.decode(bytes.subarray(2)), encoding: "utf-16le" };
  }
  if (bytes.byteLength >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const decoder = new TextDecoder("utf-16be");
    return { text: decoder.decode(bytes.subarray(2)), encoding: "utf-16be" };
  }

  // 2. Coba UTF-8 secara ketat (fatal: true)
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    const text = utf8Decoder.decode(bytes);
    return { text, encoding: "utf-8" };
  } catch {
    // Bukan UTF-8 yang valid, lanjutkan ke deteksi Shift_JIS vs EUC-JP
  }

  // 3. Bandingkan Shift_JIS dan EUC-JP
  let sjisText = "";
  let eucText = "";
  try {
    sjisText = new TextDecoder("shift_jis", { fatal: false }).decode(bytes);
  } catch {
    sjisText = "";
  }
  try {
    eucText = new TextDecoder("euc-jp", { fatal: false }).decode(bytes);
  } catch {
    eucText = "";
  }

  const sjisScore = sjisText ? scoreJapaneseText(sjisText) : -Infinity;
  const eucScore = eucText ? scoreJapaneseText(eucText) : -Infinity;

  if (eucScore > sjisScore) {
    return { text: eucText, encoding: "euc-jp" };
  }
  return { text: sjisText, encoding: "shift_jis" };
}

function escapeHtmlBasic(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CHAPTER_HEADING_RE =
  /^\s*(?:第[一二三四五六七八九十百千零〇0-9０-９]+[章話節部編幕回]|プロローグ|エピローグ|序章|終章|幕間|Chapter\s+\d+|CHAPTER\s+\d+)(?:\s+.*|\u3000.*|$)/;

/**
 * Memecah isi novel TXT menjadi daftar bab (`TxtChapter[]`) dan mengubah
 * notasi furigana Aozora Bunko (`｜漢字《かんじ》` / `漢字《かんじ》`) menjadi `<ruby>`.
 */
export function splitTxtIntoChapters(
  rawText: string,
  fallbackTitle = "Bagian 1",
  maxCharsPerAutoChapter = 6000,
): TxtChapter[] {
  const normalized = rawText.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    return [
      {
        index: 0,
        title: fallbackTitle,
        paragraphs: [],
        charCount: 0,
      },
    ];
  }

  const lines = normalized.split("\n");
  const rawSections: { title: string; lines: string[] }[] = [];
  let currentTitle = fallbackTitle;
  let currentLines: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (
      trimmed.length > 0 &&
      trimmed.length <= 60 &&
      CHAPTER_HEADING_RE.test(trimmed)
    ) {
      if (currentLines.some((l) => l.trim().length > 0)) {
        rawSections.push({ title: currentTitle, lines: currentLines });
      }
      currentTitle = trimmed;
      currentLines = [];
    } else {
      currentLines.push(rawLine);
    }
  }

  if (currentLines.some((l) => l.trim().length > 0)) {
    rawSections.push({ title: currentTitle, lines: currentLines });
  }

  // Jika hanya terbentuk 1 bagian tetapi teks sangat panjang, pecah otomatis per ~maxCharsPerAutoChapter
  const finalSections: { title: string; lines: string[] }[] = [];
  if (rawSections.length === 1 && normalized.length > maxCharsPerAutoChapter * 1.4) {
    let partNum = 1;
    let accumChars = 0;
    let bucket: string[] = [];
    for (const line of rawSections[0].lines) {
      bucket.push(line);
      accumChars += line.length;
      if (accumChars >= maxCharsPerAutoChapter && line.trim().length > 0) {
        finalSections.push({
          title: `Bagian ${partNum}`,
          lines: bucket,
        });
        partNum++;
        accumChars = 0;
        bucket = [];
      }
    }
    if (bucket.some((l) => l.trim().length > 0)) {
      finalSections.push({
        title: `Bagian ${partNum}`,
        lines: bucket,
      });
    }
  } else {
    finalSections.push(...rawSections);
  }

  return finalSections.map((sec, idx) => {
    const paragraphs: string[] = [];
    let charCount = 0;

    for (const line of sec.lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      charCount += trimmed.length;
      const htmlLine = convertAozoraRubyToHtml(escapeHtmlBasic(line));
      paragraphs.push(htmlLine);
    }

    return {
      index: idx,
      title: sec.title,
      paragraphs,
      charCount,
    };
  });
}

function formatAuthorMetadata(authorRaw: unknown): string {
  if (!authorRaw) return "Penulis Tidak Diketahui";
  if (typeof authorRaw === "string") return authorRaw.trim() || "Penulis Tidak Diketahui";
  if (Array.isArray(authorRaw)) {
    const names = authorRaw
      .map((item) => formatAuthorMetadata(item))
      .filter((n) => n && n !== "Penulis Tidak Diketahui");
    return names.join(", ") || "Penulis Tidak Diketahui";
  }
  if (typeof authorRaw === "object") {
    const obj = authorRaw as Record<string, unknown>;
    if (typeof obj.name === "string" && obj.name.trim()) return obj.name.trim();
    const firstVal = Object.values(obj).find((v) => typeof v === "string");
    if (typeof firstVal === "string" && firstVal.trim()) return firstVal.trim();
  }
  return "Penulis Tidak Diketahui";
}

function formatTitleMetadata(titleRaw: unknown, fallback: string): string {
  if (!titleRaw) return fallback;
  if (typeof titleRaw === "string") return titleRaw.trim() || fallback;
  if (typeof titleRaw === "object") {
    const obj = titleRaw as Record<string, unknown>;
    const firstVal = Object.values(obj).find((v) => typeof v === "string");
    if (typeof firstVal === "string" && firstVal.trim()) return firstVal.trim();
  }
  return fallback;
}

/**
 * Menambahkan berkas novel baru (.epub atau .txt) ke IndexedDB (`books` & `bookFiles`).
 */
export async function addNovelFile(
  file: File,
  db: LexiconDatabase = lexiconDb,
): Promise<BookRecord> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) {
    throw new Error(
      "Format PDF tidak didukung. Silakan unggah novel berformat EPUB atau TXT.",
    );
  }
  if (lowerName.endsWith(".mobi") || lowerName.endsWith(".azw3")) {
    throw new Error(
      "Format MOBI/AZW3 berada di luar cakupan tahap ini. Silakan gunakan berkas EPUB atau TXT.",
    );
  }
  if (!lowerName.endsWith(".epub") && !lowerName.endsWith(".txt")) {
    throw new Error(
      `Format berkas "${file.name}" tidak didukung. Pilih berkas .epub atau .txt.`,
    );
  }

  const baseTitle = file.name.replace(/\.(epub|txt)$/i, "").trim() || "Novel Tanpa Judul";
  const id = `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = new Date().toISOString();

  if (lowerName.endsWith(".txt")) {
    const buffer = await file.arrayBuffer();
    const { text, encoding } = decodeTxtBytes(new Uint8Array(buffer));
    if (!text.trim()) {
      throw new Error("Berkas TXT kosong atau tidak berisi teks yang dapat dibaca.");
    }

    // Cek apakah 2 baris pertama adalah Judul & Penulis gaya Aozora Bunko
    const firstLines = text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let title = baseTitle;
    let author = "Berkas Teks (TXT)";
    if (
      firstLines.length >= 2 &&
      firstLines[0].length <= 45 &&
      firstLines[1].length <= 35 &&
      !firstLines[0].endsWith("。")
    ) {
      title = firstLines[0];
      author = firstLines[1];
    }

    const record: BookRecord = {
      id,
      type: "novel",
      title,
      author,
      format: "txt",
      encoding,
      fileSize: file.size,
      totalChars: text.length,
      progress: 0,
      lastLocation: "ch:0:scroll:0",
      addedAt: nowIso,
      lastReadAt: nowIso,
      minedCount: 0,
    };

    const blob = new Blob([buffer], { type: "text/plain" });
    try {
      await db.transaction("rw", db.books, db.bookFiles, async () => {
        await db.books.put(record);
        await db.bookFiles.put({ bookId: id, blob });
      });
    } catch (err) {
      if (isQuotaExceededError(err)) {
        throw new Error(
          "Kuota penyimpanan browser penuh. Hapus beberapa buku atau manga yang sudah selesai dibaca, lalu coba lagi.",
        );
      }
      throw err;
    }

    return record;
  }

  // Format EPUB -> ekstrak metadata & sampul menggunakan foliate-js
  const { makeBook } = await import("../vendor/foliate-js/view.js");
  let bookObj: Awaited<ReturnType<typeof makeBook>> | null = null;
  try {
    bookObj = await makeBook(file);
    const title = formatTitleMetadata(bookObj.metadata?.title, baseTitle);
    const author = formatAuthorMetadata(bookObj.metadata?.author);
    let coverBlob: Blob | undefined;
    try {
      const c = await bookObj.getCover?.();
      if (c instanceof Blob && c.size > 0) {
        coverBlob = c;
      }
    } catch {
      // Sampul opsional
    }

    const record: BookRecord = {
      id,
      type: "novel",
      title,
      author,
      format: "epub",
      coverBlob,
      fileSize: file.size,
      progress: 0,
      addedAt: nowIso,
      lastReadAt: nowIso,
      minedCount: 0,
    };

    const epubBlob = new Blob([await file.arrayBuffer()], {
      type: "application/epub+zip",
    });

    await db.transaction("rw", db.books, db.bookFiles, async () => {
      await db.books.put(record);
      await db.bookFiles.put({ bookId: id, blob: epubBlob });
    });

    return record;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      throw new Error(
        "Kuota penyimpanan browser penuh. Hapus beberapa buku atau manga yang sudah selesai dibaca, lalu coba lagi.",
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Gagal membuka berkas EPUB "${file.name}": ${msg || "Arsip EPUB rusak atau tidak valid."}`,
    );
  } finally {
    try {
      bookObj?.destroy?.();
    } catch {
      // Abaikan
    }
  }
}

/**
 * Mengambil seluruh daftar novel di Perpustakaan (diurutkan dari yang terakhir dibaca).
 */
export async function listNovels(
  db: LexiconDatabase = lexiconDb,
): Promise<BookRecord[]> {
  const all = await db.books.toArray();
  return all.sort((a, b) => {
    const tA = a.lastReadAt ?? a.addedAt;
    const tB = b.lastReadAt ?? b.addedAt;
    return tB.localeCompare(tA);
  });
}

/**
 * Mengambil metadata buku beserta Blob berkas aslinya untuk dibuka di Pembaca.
 */
export async function getNovelWithBlob(
  bookId: string,
  db: LexiconDatabase = lexiconDb,
): Promise<{ book: BookRecord; blob: Blob } | null> {
  const [book, fileRec] = await Promise.all([
    db.books.get(bookId),
    db.bookFiles.get(bookId),
  ]);
  if (!book || !fileRec) return null;
  return { book, blob: fileRec.blob };
}

/**
 * Memperbarui posisi baca terakhir (CFI atau offset TXT) dan persentase progres.
 */
export async function updateNovelProgress(
  bookId: string,
  lastLocation: string,
  progress: number,
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  await db.books.update(bookId, {
    lastLocation,
    progress: clamped,
    lastReadAt: new Date().toISOString(),
  });
}

/**
 * Menambah penghitung jumlah kalimat yang ditambang (minedCount) dari buku tertentu.
 */
export async function incrementNovelMinedCount(
  bookId: string,
  delta = 1,
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  await db.transaction("rw", db.books, async () => {
    const book = await db.books.get(bookId);
    if (!book) return;
    await db.books.update(bookId, {
      minedCount: (book.minedCount ?? 0) + delta,
      lastReadAt: new Date().toISOString(),
    });
  });
}

export function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; message?: string; inner?: unknown };
  const name = (e.name ?? "").toLowerCase();
  const msg = (e.message ?? "").toLowerCase();
  if (
    name.includes("quotaexceeded") ||
    msg.includes("quota") ||
    msg.includes("storage full") ||
    msg.includes("disk full")
  ) {
    return true;
  }
  if (e.inner) return isQuotaExceededError(e.inner);
  return false;
}

/**
 * Memperbarui judul buku atau manga di Perpustakaan.
 */
export async function updateBookTitle(
  bookId: string,
  newTitle: string,
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  const trimmed = newTitle.trim();
  if (!trimmed) {
    throw new Error("Judul tidak boleh kosong.");
  }
  await db.books.update(bookId, { title: trimmed });
}

/**
 * Menghapus novel atau manga beserta seluruh berkas halaman dan cache OCR-nya dari IndexedDB.
 */
export async function deleteNovel(
  bookId: string,
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  await db.transaction(
    "rw",
    [db.books, db.bookFiles, db.mangaPages, db.ocrCache],
    async () => {
      await db.books.delete(bookId);
      await db.bookFiles.delete(bookId);
      await db.mangaPages.where("bookId").equals(bookId).delete();
      await db.ocrCache.where("bookId").equals(bookId).delete();
    },
  );
}

/**
 * Menghasilkan huruf Kanji sampul otomatis dari judul buku bila EPUB/TXT tidak memiliki gambar sampul.
 */
export function extractCoverKanji(title: string): string {
  const kanjiMatches = title.match(/[\u4e00-\u9fff]/g);
  if (kanjiMatches && kanjiMatches.length >= 2) {
    return kanjiMatches.slice(0, 2).join("");
  }
  if (kanjiMatches && kanjiMatches.length === 1) {
    return kanjiMatches[0];
  }
  const jpMatches = Array.from(title).filter(isJapaneseChar);
  if (jpMatches.length > 0) {
    return jpMatches.slice(0, 2).join("");
  }
  return title.slice(0, 2).toUpperCase() || "本";
}

