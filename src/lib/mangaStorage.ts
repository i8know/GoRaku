import { strToU8, zipSync } from "fflate";
import { isQuotaExceededError } from "./bookStorage";
import {
  lexiconDb,
  type BookRecord,
  type LexiconDatabase,
  type MangaPageRecord,
} from "./lexiconDb";

/**
 * Daftar ekstensi berkas gambar yang didukung untuk pembaca manga.
 */
const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/**
 * Daftar nama berkas/direktori sistem operasi (sampah) yang harus diabaikan
 * ketika membaca arsip CBZ/ZIP atau folder gambar.
 */
const IGNORED_PATH_SEGMENTS = new Set([
  "__macosx",
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  ".spotlight-v100",
  ".trashes",
  ".fseventsd",
  ".git",
  ".svn",
]);

export interface ComicInfoMetadata {
  title?: string;
  series?: string;
  volume?: string;
  number?: string;
  writer?: string;
  penciller?: string;
  summary?: string;
  readingDirection?: "rtl" | "ltr";
}

export interface MangaPageSource {
  book: BookRecord;
  pageOrder: string[];
  pageCount: number;
  /**
   * Memuat Blob gambar untuk halaman pada indeks `pageIndex` (0-based) secara malas (lazy).
   * Untuk CBZ/ZIP, hanya entri halaman tersebut yang didekompresi dari Blob arsip.
   * Untuk folder/multi-gambar, hanya 1 baris `MangaPageRecord` yang diambil dari IndexedDB.
   */
  loadPageBlob: (pageIndex: number) => Promise<Blob>;
  /**
   * Menutup reader arsip bila sudah selesai digunakan.
   */
  close: () => Promise<void>;
}

/**
 * Menormalisasi pemisah path Windows (`\`) menjadi `/` dan menghapus `/` di awal.
 */
export function normalizeEntryPath(rawPath: string): string {
  return rawPath.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

/**
 * Memeriksa apakah sebuah path entri di dalam CBZ/ZIP atau folder merupakan
 * berkas gambar manga yang valid (.jpg, .jpeg, .png, .webp) dan bukan entri sampah
 * seperti `__MACOSX`, `.DS_Store`, `Thumbs.db`, atau berkas AppleDouble `._*`.
 */
export function isValidMangaImageEntry(rawPath: string): boolean {
  const normalized = normalizeEntryPath(rawPath);
  if (!normalized || normalized.endsWith("/")) {
    return false;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return false;

  for (const seg of segments) {
    const lowerSeg = seg.toLowerCase();
    if (IGNORED_PATH_SEGMENTS.has(lowerSeg)) {
      return false;
    }
    // Abaikan berkas resource fork macOS (._namafile) atau berkas tersembunyi (.namafile)
    if (seg.startsWith("._") || seg.startsWith(".")) {
      return false;
    }
  }

  const fileName = segments[segments.length - 1].toLowerCase();
  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx <= 0) return false;

  const ext = fileName.slice(dotIdx);
  return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
}

/**
 * Mengembalikan MIME type berdasarkan ekstensi nama berkas gambar.
 */
export function getImageMimeType(entryPath: string): string {
  const lower = entryPath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/**
 * Memecah string menjadi token teks dan angka untuk perbandingan natural sort.
 */
function tokenizeNatural(str: string): Array<string | bigint> {
  const tokens: Array<string | bigint> = [];
  const re = /(\d+)|([^\d]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(str)) !== null) {
    if (match[1] !== undefined) {
      try {
        tokens.push(BigInt(match[1]));
      } catch {
        tokens.push(match[1]);
      }
    } else if (match[2] !== undefined) {
      tokens.push(match[2]);
    }
  }
  return tokens;
}

/**
 * Membandingkan dua nama berkas/path secara natural sort (mis. "page_2.jpg" < "page_10.jpg",
 * "ch2/01.png" < "ch10/01.png"). Bekerja konsisten lintas platform dan browser.
 */
export function naturalCompare(a: string, b: string): number {
  if (a === b) return 0;

  const segsA = normalizeEntryPath(a).split("/");
  const segsB = normalizeEntryPath(b).split("/");
  const minSegs = Math.min(segsA.length, segsB.length);

  for (let s = 0; s < minSegs; s++) {
    const partA = segsA[s];
    const partB = segsB[s];
    if (partA === partB) continue;

    // Jika keduanya berada di segmen terakhir (nama berkas), pisahkan ekstensi dulu
    // agar "page2.jpg" dibandingkan dengan "page2_a.jpg" tanpa terganggu titik ekstensi.
    const isLastA = s === segsA.length - 1;
    const isLastB = s === segsB.length - 1;
    const baseA =
      isLastA && partA.lastIndexOf(".") > 0
        ? partA.slice(0, partA.lastIndexOf("."))
        : partA;
    const baseB =
      isLastB && partB.lastIndexOf(".") > 0
        ? partB.slice(0, partB.lastIndexOf("."))
        : partB;

    const tokA = tokenizeNatural(baseA);
    const tokB = tokenizeNatural(baseB);
    const len = Math.min(tokA.length, tokB.length);

    for (let i = 0; i < len; i++) {
      const tA = tokA[i];
      const tB = tokB[i];
      if (typeof tA === "bigint" && typeof tB === "bigint") {
        if (tA !== tB) return tA < tB ? -1 : 1;
      } else if (typeof tA === "bigint" && typeof tB === "string") {
        return -1;
      } else if (typeof tA === "string" && typeof tB === "bigint") {
        return 1;
      } else {
        const sA = String(tA);
        const sB = String(tB);
        const lowerCmp = sA.toLowerCase().localeCompare(sB.toLowerCase(), "en");
        if (lowerCmp !== 0) return lowerCmp;
      }
    }

    if (tokA.length !== tokB.length) {
      return tokA.length - tokB.length;
    }

    // Tie-breaker bila nilai angka sama (mis. "02" vs "2") atau beda kapitalisasi
    const tie = partA.toLowerCase().localeCompare(partB.toLowerCase(), "en");
    if (tie !== 0) return tie;
    return partA < partB ? -1 : partA > partB ? 1 : 0;
  }

  return segsA.length - segsB.length;
}

/**
 * Mengurutkan daftar nama halaman menggunakan natural sort tanpa mengubah array asli.
 */
export function naturalSortPageNames(pageNames: readonly string[]): string[] {
  return [...pageNames].sort(naturalCompare);
}

/**
 * Membaca tag XML sederhana (mendukung DOMParser di browser dan fallback regex untuk lingkungan tes/Node).
 */
function extractXmlTagText(xml: string, tagName: string): string | undefined {
  const re = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m = re.exec(xml);
  if (!m || !m[1]) return undefined;
  const decoded = m[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
  return decoded || undefined;
}

/**
 * Mengurai isi berkas ComicInfo.xml (opsional di dalam CBZ/ZIP atau folder manga).
 */
export function parseComicInfoXml(xmlText: string): ComicInfoMetadata {
  if (!xmlText || !xmlText.trim()) return {};

  const series = extractXmlTagText(xmlText, "Series");
  const title = extractXmlTagText(xmlText, "Title");
  const volume = extractXmlTagText(xmlText, "Volume");
  const number = extractXmlTagText(xmlText, "Number");
  const writer = extractXmlTagText(xmlText, "Writer");
  const penciller = extractXmlTagText(xmlText, "Penciller");
  const summary = extractXmlTagText(xmlText, "Summary");
  const mangaFlag = extractXmlTagText(xmlText, "Manga")?.toLowerCase();

  let readingDirection: "rtl" | "ltr" | undefined;
  if (mangaFlag === "yes" || mangaFlag === "yesandrighttoleft") {
    readingDirection = "rtl";
  } else if (mangaFlag === "no") {
    readingDirection = "ltr";
  }

  return {
    title,
    series,
    volume: volume && volume !== "-1" ? volume : undefined,
    number: number && number !== "-1" ? number : undefined,
    writer,
    penciller,
    summary,
    readingDirection,
  };
}

/**
 * Menyusun judul dan penulis tampilan dari metadata ComicInfo.xml + nama berkas/folder cadangan.
 */
export function resolveMangaMetadataFromComicInfo(
  comicInfo: ComicInfoMetadata,
  fallbackTitle: string,
  fallbackAuthor = "Manga Lokal",
): {
  title: string;
  author: string;
  volume?: string;
  readingDirection: "rtl" | "ltr";
} {
  let title = fallbackTitle.trim() || "Manga Tanpa Judul";
  const volumeLabel = comicInfo.volume
    ? `Vol. ${comicInfo.volume}`
    : comicInfo.number
      ? `Ch. ${comicInfo.number}`
      : undefined;

  if (comicInfo.series && comicInfo.title && comicInfo.series !== comicInfo.title) {
    title = volumeLabel
      ? `${comicInfo.series} (${volumeLabel}) - ${comicInfo.title}`
      : `${comicInfo.series} - ${comicInfo.title}`;
  } else if (comicInfo.series) {
    title = volumeLabel ? `${comicInfo.series} ${volumeLabel}` : comicInfo.series;
  } else if (comicInfo.title) {
    title =
      volumeLabel && !comicInfo.title.includes(volumeLabel)
        ? `${comicInfo.title} (${volumeLabel})`
        : comicInfo.title;
  }

  const creators = [comicInfo.writer, comicInfo.penciller]
    .map((c) => c?.trim())
    .filter((c, i, arr): c is string => Boolean(c) && arr.indexOf(c) === i);
  const author = creators.length > 0 ? creators.join(", ") : fallbackAuthor;

  return {
    title,
    author,
    volume: volumeLabel,
    readingDirection: comicInfo.readingDirection ?? "rtl",
  };
}

/**
 * Membuat thumbnail ringan (WebP/JPEG, lebar maks ~320px) dari halaman pertama
 * untuk ditampilkan sebagai sampul kartu di Perpustakaan.
 * Jika berjalan di lingkungan non-browser (Vitest/Node), mengembalikan Blob asli secara aman.
 */
export async function createThumbnailBlob(
  imageBlob: Blob,
  maxWidth = 320,
  quality = 0.78,
): Promise<Blob> {
  if (
    typeof createImageBitmap !== "function" ||
    (typeof OffscreenCanvas === "undefined" && typeof document === "undefined")
  ) {
    return imageBlob;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(imageBlob);
    const origW = bitmap.width || 1;
    const origH = bitmap.height || 1;
    const scale = origW > maxWidth ? maxWidth / origW : 1;
    const targetW = Math.max(1, Math.round(origW * scale));
    const targetH = Math.max(1, Math.round(origH * scale));

    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(targetW, targetH);
      const ctx = canvas.getContext("2d");
      if (!ctx) return imageBlob;
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      try {
        return await canvas.convertToBlob({ type: "image/webp", quality });
      } catch {
        return await canvas.convertToBlob({ type: "image/jpeg", quality });
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageBlob;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const outBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", quality);
    });
    return outBlob ?? imageBlob;
  } catch {
    return imageBlob;
  } finally {
    try {
      bitmap?.close();
    } catch {
      // Abaikan
    }
  }
}

/**
 * Memuat modul `zip.js` yang sudah ada di proyek untuk membaca arsip CBZ/ZIP secara malas (lazy)
 * menggunakan `BlobReader` (hanya membaca Central Directory dan slice per halaman saat dibutuhkan).
 */
async function loadZipJs() {
  const mod = await import("../vendor/foliate-js/vendor/zip.js");
  try {
    mod.configure({ useWebWorkers: false });
  } catch {
    // Abaikan bila sudah dikonfigurasi
  }
  return mod as {
    BlobReader: new (blob: Blob) => unknown;
    BlobWriter: new (mimeType?: string) => unknown;
    TextWriter: new (encoding?: string) => unknown;
    ZipReader: new (reader: unknown) => {
      getEntries: () => Promise<
        Array<{
          filename: string;
          directory?: boolean;
          uncompressedSize?: number;
          getData?: (writer: unknown) => Promise<Blob | string>;
        }>
      >;
      close: () => Promise<void>;
    };
  };
}

/**
 * Menambahkan berkas arsip manga (.cbz atau .zip) ke Perpustakaan.
 * Arsip asli disimpan utuh sebagai Blob di `bookFiles` tanpa mengekstrak seluruh isi ke memori;
 * saat impor hanya Central Directory ZIP, ComicInfo.xml (bila ada), dan halaman pertama (untuk thumbnail)
 * yang dibaca.
 */
export async function addMangaArchiveFile(
  file: File,
  db: LexiconDatabase = lexiconDb,
): Promise<BookRecord> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) {
    throw new Error(
      "Format PDF tidak didukung. Silakan unggah manga berformat CBZ, ZIP, atau kumpulan berkas gambar (JPG, PNG, WebP).",
    );
  }
  if (!lowerName.endsWith(".cbz") && !lowerName.endsWith(".zip")) {
    throw new Error(
      `Format berkas "${file.name}" tidak didukung untuk manga. Gunakan berkas .cbz, .zip, atau kumpulan gambar.`,
    );
  }
  if (file.size === 0) {
    throw new Error(`Berkas arsip "${file.name}" kosong (0 byte).`);
  }

  // Periksa tanda tangan (magic bytes) ZIP: PK\x03\x04 atau PK\x05\x06
  const headerBytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const isPkZip =
    headerBytes.byteLength >= 4 &&
    headerBytes[0] === 0x50 &&
    headerBytes[1] === 0x4b &&
    (headerBytes[2] === 0x03 || headerBytes[2] === 0x05);

  if (!isPkZip) {
    throw new Error(
      `Gagal membuka "${file.name}": Arsip CBZ/ZIP rusak atau bukan berkas ZIP yang valid.`,
    );
  }

  const { BlobReader, BlobWriter, TextWriter, ZipReader } = await loadZipJs();
  const zipReader = new ZipReader(new BlobReader(file));

  try {
    let entries: Awaited<ReturnType<typeof zipReader.getEntries>>;
    try {
      entries = await zipReader.getEntries();
    } catch {
      throw new Error(
        `Gagal membaca struktur arsip "${file.name}": Arsip CBZ/ZIP rusak atau terenkripsi.`,
      );
    }

    const entryMap = new Map<string, (typeof entries)[number]>();
    const imagePageNames: string[] = [];
    let comicInfoEntry: (typeof entries)[number] | undefined;

    for (const entry of entries) {
      if (entry.directory) continue;
      const normName = normalizeEntryPath(entry.filename);
      if (!normName) continue;

      if (/(^|\/)comicinfo\.xml$/i.test(normName) && ! normName.toLowerCase().includes("__macosx")) {
        comicInfoEntry = entry;
        continue;
      }

      if (isValidMangaImageEntry(normName)) {
        entryMap.set(normName, entry);
        imagePageNames.push(normName);
      }
    }

    if (imagePageNames.length === 0) {
      throw new Error(
        `Arsip "${file.name}" tidak berisi berkas gambar yang didukung (JPG, PNG, WebP).`,
      );
    }

    const sortedPages = naturalSortPageNames(imagePageNames);

    // Baca ComicInfo.xml bila ada (opsional)
    let comicInfo: ComicInfoMetadata = {};
    if (comicInfoEntry?.getData) {
      try {
        const xmlText = String(await comicInfoEntry.getData(new TextWriter("utf-8")));
        comicInfo = parseComicInfoXml(xmlText);
      } catch {
        // ComicInfo.xml opsional; abaikan bila gagal diurai
      }
    }

    const baseTitle =
      file.name.replace(/\.(cbz|zip)$/i, "").replace(/[_]+/g, " ").trim() ||
      "Manga Tanpa Judul";
    const resolvedMeta = resolveMangaMetadataFromComicInfo(
      comicInfo,
      baseTitle,
      lowerName.endsWith(".cbz") ? "Arsip CBZ" : "Arsip ZIP",
    );

    // Ekstrak HANYA halaman pertama untuk membuat thumbnail sampul
    let coverBlob: Blob | undefined;
    const firstPageName = sortedPages[0];
    const firstEntry = entryMap.get(firstPageName);
    if (firstEntry?.getData) {
      try {
        const rawFirstBlob = (await firstEntry.getData(
          new BlobWriter(getImageMimeType(firstPageName)),
        )) as Blob;
        if (rawFirstBlob instanceof Blob && rawFirstBlob.size > 0) {
          coverBlob = await createThumbnailBlob(rawFirstBlob);
        }
      } catch {
        // Sampul opsional bila pembuatan thumbnail gagal
      }
    }

    const id = `manga-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const format = lowerName.endsWith(".cbz") ? "cbz" : "zip";

    const record: BookRecord = {
      id,
      type: "manga",
      title: resolvedMeta.title,
      author: resolvedMeta.author,
      volume: resolvedMeta.volume,
      format,
      coverBlob,
      fileSize: file.size,
      pageCount: sortedPages.length,
      currentPage: 0,
      readingDirection: resolvedMeta.readingDirection,
      pageOrder: sortedPages,
      progress: 0,
      lastLocation: "page:0",
      addedAt: nowIso,
      lastReadAt: nowIso,
      minedCount: 0,
    };

    try {
      await db.transaction("rw", db.books, db.bookFiles, async () => {
        await db.books.put(record);
        // Simpan File/Blob asli secara langsung tanpa menyalin seluruh arsip ke ArrayBuffer RAM
        await db.bookFiles.put({ bookId: id, blob: file });
      });
    } catch (err) {
      if (isQuotaExceededError(err)) {
        throw new Error(
          "Kuota penyimpanan browser penuh saat menyimpan arsip manga. Hapus beberapa koleksi lama lalu coba lagi.",
        );
      }
      throw err;
    }

    return record;
  } finally {
    try {
      await zipReader.close();
    } catch {
      // Abaikan
    }
  }
}

/**
 * Menambahkan manga dari pemilihan beberapa berkas gambar (.jpg, .png, .webp)
 * atau pemilihan satu folder (`webkitdirectory` / drag-and-drop folder).
 * Setiap gambar disimpan sebagai record terpisah di tabel `mangaPages` agar saat membaca
 * hanya halaman yang sedang dibuka yang dimuat ke memori.
 */
export async function addMangaImagesOrFolder(
  filesInput: FileList | File[],
  customTitle?: string,
  db: LexiconDatabase = lexiconDb,
): Promise<BookRecord> {
  const files = Array.from(filesInput);
  if (files.length === 0) {
    throw new Error("Tidak ada berkas yang dipilih.");
  }

  // Jika pengguna memilih berkas PDF
  if (
    files.some((f) => f.name.toLowerCase().endsWith(".pdf")) &&
    !files.some((f) => isValidMangaImageEntry(f.webkitRelativePath || f.name))
  ) {
    throw new Error(
      "Format PDF tidak didukung. Silakan pilih berkas CBZ, ZIP, atau kumpulan gambar (JPG, PNG, WebP).",
    );
  }

  let comicInfoFile: File | undefined;
  const validFilesMap = new Map<string, File>();
  let totalSize = 0;
  let detectedFolderName = "";

  for (const file of files) {
    const rawRel = file.webkitRelativePath || file.name;
    const normPath = normalizeEntryPath(rawRel);
    if (!normPath) continue;

    if (!detectedFolderName && normPath.includes("/")) {
      const firstSeg = normPath.split("/")[0];
      if (firstSeg && !IGNORED_PATH_SEGMENTS.has(firstSeg.toLowerCase())) {
        detectedFolderName = firstSeg;
      }
    }

    if (
      /(^|\/)comicinfo\.xml$/i.test(normPath) &&
      !normPath.toLowerCase().includes("__macosx")
    ) {
      comicInfoFile = file;
      continue;
    }

    if (isValidMangaImageEntry(normPath)) {
      if (file.size === 0) continue;
      // Hindari tabrakan nama bila pengguna memilih berkas dengan nama identik
      let uniqueKey = normPath;
      let dupCounter = 2;
      while (validFilesMap.has(uniqueKey)) {
        const dotIdx = normPath.lastIndexOf(".");
        uniqueKey =
          dotIdx > 0
            ? `${normPath.slice(0, dotIdx)}_${dupCounter}${normPath.slice(dotIdx)}`
            : `${normPath}_${dupCounter}`;
        dupCounter++;
      }
      validFilesMap.set(uniqueKey, file);
      totalSize += file.size;
    }
  }

  if (validFilesMap.size === 0) {
    throw new Error(
      "Tidak ditemukan berkas gambar yang didukung (JPG, PNG, WebP). Berkas bukan gambar dan folder sistem (__MACOSX) telah diabaikan.",
    );
  }

  const sortedPages = naturalSortPageNames(Array.from(validFilesMap.keys()));

  let comicInfo: ComicInfoMetadata = {};
  if (comicInfoFile) {
    try {
      const xmlText = await comicInfoFile.text();
      comicInfo = parseComicInfoXml(xmlText);
    } catch {
      // Abaikan bila ComicInfo.xml gagal dibaca
    }
  }

  // Tentukan judul cadangan dari customTitle, nama folder, atau nama berkas pertama
  let fallbackTitle = customTitle?.trim() || detectedFolderName.trim();
  if (!fallbackTitle) {
    const firstFileName = sortedPages[0].split("/").pop() || "Manga";
    const withoutExt = firstFileName.replace(/\.(jpe?g|png|webp)$/i, "");
    const strippedNum = withoutExt.replace(/[\s_-]*(?:page|hal|p)?[\s_-]*\d+$/i, "").trim();
    fallbackTitle =
      strippedNum || withoutExt || `Koleksi Gambar (${sortedPages.length} Hal)`;
  }

  const resolvedMeta = resolveMangaMetadataFromComicInfo(
    comicInfo,
    fallbackTitle,
    detectedFolderName ? "Folder Gambar" : `${sortedPages.length} Gambar`,
  );

  // Buat thumbnail sampul dari halaman pertama
  let coverBlob: Blob | undefined;
  const firstFile = validFilesMap.get(sortedPages[0]);
  if (firstFile) {
    try {
      coverBlob = await createThumbnailBlob(firstFile);
    } catch {
      coverBlob = firstFile;
    }
  }

  const id = `manga-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = new Date().toISOString();

  const record: BookRecord = {
    id,
    type: "manga",
    title: resolvedMeta.title,
    author: resolvedMeta.author,
    volume: resolvedMeta.volume,
    format: "images",
    coverBlob,
    fileSize: totalSize,
    pageCount: sortedPages.length,
    currentPage: 0,
    readingDirection: resolvedMeta.readingDirection,
    pageOrder: sortedPages,
    progress: 0,
    lastLocation: "page:0",
    addedAt: nowIso,
    lastReadAt: nowIso,
    minedCount: 0,
  };

  const pageRecords: MangaPageRecord[] = sortedPages.map((pageName) => {
    const f = validFilesMap.get(pageName)!;
    return {
      bookId: id,
      pageName,
      blob: f,
    };
  });

  try {
    await db.transaction("rw", db.books, db.mangaPages, async () => {
      await db.books.put(record);
      const BATCH_SIZE = 50;
      for (let i = 0; i < pageRecords.length; i += BATCH_SIZE) {
        await db.mangaPages.bulkPut(pageRecords.slice(i, i + BATCH_SIZE));
      }
    });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      throw new Error(
        "Kuota penyimpanan browser penuh saat menyimpan halaman manga. Hapus beberapa koleksi lama lalu coba lagi.",
      );
    }
    throw err;
  }

  return record;
}

/**
 * Membuka sumber halaman manga secara malas (lazy page loader).
 * - Untuk CBZ/ZIP: hanya membaca Central Directory dari Blob di `bookFiles`,
 *   dan mengekstrak 1 entri halaman saat `loadPageBlob(pageIndex)` dipanggil.
 * - Untuk koleksi gambar/folder (`images`): mengambil 1 baris `MangaPageRecord`
 *   dari IndexedDB saat `loadPageBlob(pageIndex)` dipanggil.
 */
export async function createMangaPageSource(
  bookId: string,
  db: LexiconDatabase = lexiconDb,
): Promise<MangaPageSource> {
  const book = await db.books.get(bookId);
  if (!book) {
    throw new Error("Data manga tidak ditemukan di Perpustakaan.");
  }

  const pageOrder = book.pageOrder ?? [];
  if (pageOrder.length === 0) {
    throw new Error(`Manga "${book.title}" tidak memiliki daftar halaman yang valid.`);
  }

  if (book.format === "images") {
    return {
      book,
      pageOrder,
      pageCount: pageOrder.length,
      async loadPageBlob(pageIndex: number): Promise<Blob> {
        if (pageIndex < 0 || pageIndex >= pageOrder.length) {
          throw new Error(`Indeks halaman ${pageIndex + 1} di luar jangkauan.`);
        }
        const pageName = pageOrder[pageIndex];
        const rec = await db.mangaPages.get([bookId, pageName]);
        if (!rec || !rec.blob) {
          throw new Error(`Berkas gambar untuk halaman "${pageName}" tidak ditemukan.`);
        }
        return rec.blob;
      },
      async close() {
        // Tidak ada handle arsip yang perlu ditutup untuk format "images"
      },
    };
  }

  // Format CBZ atau ZIP -> gunakan ZipReader + BlobReader secara malas
  const fileRec = await db.bookFiles.get(bookId);
  if (!fileRec || !fileRec.blob) {
    throw new Error(`Berkas arsip untuk manga "${book.title}" tidak ditemukan di penyimpanan.`);
  }

  const { BlobReader, BlobWriter, ZipReader } = await loadZipJs();
  const zipReader = new ZipReader(new BlobReader(fileRec.blob));
  const entries = await zipReader.getEntries();
  const entryMap = new Map<string, (typeof entries)[number]>();

  for (const entry of entries) {
    if (!entry.directory) {
      entryMap.set(normalizeEntryPath(entry.filename), entry);
    }
  }

  let zipReadQueue: Promise<unknown> = Promise.resolve();

  return {
    book,
    pageOrder,
    pageCount: pageOrder.length,
    async loadPageBlob(pageIndex: number): Promise<Blob> {
      if (pageIndex < 0 || pageIndex >= pageOrder.length) {
        throw new Error(`Indeks halaman ${pageIndex + 1} di luar jangkauan.`);
      }
      const pageName = pageOrder[pageIndex];
      const entry = entryMap.get(pageName);
      if (!entry || !entry.getData) {
        throw new Error(`Halaman "${pageName}" tidak ditemukan di dalam arsip.`);
      }
      const nextTask = zipReadQueue.then(
        () =>
          entry.getData!(
            new BlobWriter(getImageMimeType(pageName)),
          ) as Promise<Blob>,
      );
      zipReadQueue = nextTask.catch(() => {});
      return await nextTask;
    },
    async close() {
      try {
        await zipReader.close();
      } catch {
        // Abaikan
      }
    },
  };
}

/**
 * Memperbarui urutan halaman manga (mis. dari pengurutan manual pengguna atau reset ke natural sort)
 * serta memperbarui thumbnail sampul jika halaman pertama berubah.
 */
export async function updateMangaPageOrder(
  bookId: string,
  newPageOrder: string[],
  db: LexiconDatabase = lexiconDb,
): Promise<BookRecord> {
  const book = await db.books.get(bookId);
  if (!book) {
    throw new Error("Manga tidak ditemukan.");
  }
  if (newPageOrder.length === 0) {
    throw new Error("Daftar halaman tidak boleh kosong.");
  }

  const prevFirst = book.pageOrder?.[0];
  const nextFirst = newPageOrder[0];

  let updatedCoverBlob = book.coverBlob;
  if (prevFirst !== nextFirst) {
    let source: MangaPageSource | null = null;
    try {
      // Gunakan urutan baru sementara untuk memuat halaman pertama yang baru
      await db.books.update(bookId, {
        pageOrder: newPageOrder,
        pageCount: newPageOrder.length,
      });
      source = await createMangaPageSource(bookId, db);
      const firstPageBlob = await source.loadPageBlob(0);
      updatedCoverBlob = await createThumbnailBlob(firstPageBlob);
    } catch {
      // Pertahankan sampul lama jika pembuatan thumbnail gagal
    } finally {
      await source?.close();
    }
  }

  const clampedCurrent = Math.max(
    0,
    Math.min(newPageOrder.length - 1, book.currentPage ?? 0),
  );
  const progress =
    newPageOrder.length <= 1
      ? 100
      : Math.round(((clampedCurrent + 1) / newPageOrder.length) * 100);

  await db.books.update(bookId, {
    pageOrder: newPageOrder,
    pageCount: newPageOrder.length,
    currentPage: clampedCurrent,
    progress: book.progress > 0 ? progress : 0,
    coverBlob: updatedCoverBlob,
  });

  const updated = await db.books.get(bookId);
  return updated!;
}

/**
 * Memperbarui posisi halaman baca manga dan persentase progres di Dexie.
 */
export async function updateMangaProgress(
  bookId: string,
  currentPage: number,
  pageCount: number,
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  const total = Math.max(1, pageCount);
  const clampedPage = Math.max(0, Math.min(total - 1, currentPage));
  const pct =
    clampedPage === 0
      ? 0
      : Math.max(1, Math.min(100, Math.round(((clampedPage + 1) / total) * 100)));

  await db.books.update(bookId, {
    currentPage: clampedPage,
    pageCount: total,
    progress: pct,
    lastLocation: `page:${clampedPage}`,
    lastReadAt: new Date().toISOString(),
  });
}

/**
 * Memperbarui arah baca manga ("rtl" atau "ltr") per judul.
 */
export async function updateMangaReadingDirection(
  bookId: string,
  readingDirection: "rtl" | "ltr",
  db: LexiconDatabase = lexiconDb,
): Promise<void> {
  await db.books.update(bookId, { readingDirection });
}

/**
 * Membuat berkas sampel `.cbz` secara lokal di memori browser (berisi ComicInfo.xml
 * dan 4 halaman manga berbahasa Jepang dengan gelembung dialog vertikal & horizontal)
 * agar pengguna dapat langsung menguji alur Perpustakaan Manga, Pembaca RTL, OCR,
 * dan Sentence Mining kapan saja.
 */
export async function createSampleMangaCbzFile(): Promise<File> {
  const pagesSpec = [
    {
      filename: "page_1.png",
      bg: "#f6f1e6",
      accent: "#c4543f",
      header: "語楽マンガ 第1話",
      sub: "「新しい朝の始まり」",
      bubbles: [
        { x: 540, y: 120, w: 190, h: 360, vert: true, lines: ["今日は", "天気が", "いいから", "散歩に行こう"] },
        { x: 110, y: 520, w: 210, h: 360, vert: true, lines: ["昨日の夜は", "遅くまで", "日本語の", "本を読んだ"] },
      ],
    },
    {
      filename: "page_2.png",
      bg: "#f3efe6",
      accent: "#233c35",
      header: "第1話 • 2ページ",
      sub: "「図書館での出会い」",
      bubbles: [
        { x: 520, y: 130, w: 200, h: 370, vert: true, lines: ["この漫画は", "とても", "面白くて", "勉強になる"] },
        { x: 90, y: 560, w: 460, h: 170, vert: false, lines: ["分からない言葉を", "すぐ辞書で調べよう！"] },
      ],
    },
    {
      filename: "page_10.png",
      bg: "#f7f3eb",
      accent: "#3b4d5e",
      header: "第1話 • 3ページ (page_10.png)",
      sub: "「自然なページ順（Natural Sort）のテスト」",
      bubbles: [
        { x: 510, y: 140, w: 210, h: 380, vert: true, lines: ["毎日少しずつ", "練習すれば", "必ず上手に", "なれるよ"] },
        { x: 100, y: 550, w: 470, h: 170, vert: false, lines: ["美味しい珈琲を飲んで", "少し休憩しよう。"] },
      ],
    },
  ];

  const zipFiles: Record<string, Uint8Array> = {};

  const comicInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo>
  <Title>新しい朝の始まり</Title>
  <Series>語楽サンプル漫画</Series>
  <Volume>1</Volume>
  <Writer>語楽スタジオ</Writer>
  <Manga>YesAndRightToLeft</Manga>
</ComicInfo>`;
  zipFiles["ComicInfo.xml"] = strToU8(comicInfoXml);

  // Tambahkan berkas sampah tiruan (__MACOSX/.DS_Store) untuk membuktikan filter otomatis bekerja
  zipFiles["__MACOSX/._page_1.png"] = strToU8("junk");
  zipFiles[".DS_Store"] = strToU8("junk");

  for (let i = 0; i < pagesSpec.length; i++) {
    const spec = pagesSpec[i];
    const canvas = document.createElement("canvas");
    canvas.width = 820;
    canvas.height = 1160;
    const ctx = canvas.getContext("2d")!;

    // Latar halaman
    ctx.fillStyle = spec.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bingkai panel manga
    ctx.strokeStyle = "#1c1a17";
    ctx.lineWidth = 5;
    ctx.strokeRect(45, 50, 730, 1040);

    // Garis pembagi panel
    ctx.beginPath();
    ctx.moveTo(45, 480);
    ctx.lineTo(775, 480);
    ctx.stroke();

    // Header ilustrasi panel
    ctx.fillStyle = spec.accent;
    ctx.fillRect(65, 70, 260, 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(spec.header, 80, 100);

    ctx.fillStyle = "#4f4a41";
    ctx.font = "20px sans-serif";
    ctx.fillText(spec.sub, 65, 145);

    // Gambar gelembung dialog
    for (const b of spec.bubbles) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 36);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#000000";
      ctx.font = 'bold 34px "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif';
      ctx.textBaseline = "top";

      if (b.vert) {
        // Gambar teks vertikal kolom kanan-ke-kiri
        const colSpacing = 44;
        const startX = b.x + b.w - 52;
        const startY = b.y + 34;
        b.lines.forEach((colText, colIdx) => {
          const x = startX - colIdx * colSpacing;
          Array.from(colText).forEach((ch, rowIdx) => {
            ctx.fillText(ch, x, startY + rowIdx * 40);
          });
        });
      } else {
        // Gambar teks horizontal
        const startX = b.x + 28;
        const startY = b.y + 42;
        b.lines.forEach((lineText, rowIdx) => {
          ctx.fillText(lineText, startX, startY + rowIdx * 48);
        });
      }
    }

    // Nomor halaman di kaki halaman
    ctx.fillStyle = "#6a645a";
    ctx.font = "18px sans-serif";
    ctx.fillText(`- ${i + 1} / ${pagesSpec.length} -`, 370, 1125);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/png");
    });
    zipFiles[spec.filename] = new Uint8Array(await blob.arrayBuffer());
  }

  const zipped = zipSync(zipFiles, { level: 0 });
  return new File([zipped], "Goraku_Sample_Manga_Vol1.cbz", {
    type: "application/vnd.comicbook+zip",
  });
}

