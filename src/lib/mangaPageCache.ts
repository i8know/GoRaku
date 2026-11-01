import type { MangaPageSource } from "./mangaStorage";

export interface CachedMangaPage {
  pageIndex: number;
  blob: Blob;
  objectUrl: string;
  width: number;
  height: number;
  isSpread: boolean;
  byteSize: number;
  estimatedDecodedBytes: number;
  loadedAt: number;
}

export interface MangaCacheStats {
  activeCachedPages: number;
  activeIndices: number[];
  totalLoadedCount: number;
  totalRevokedCount: number;
  lastTurnLatencyMs: number | null;
  lastTurnWasPreloaded: boolean;
  activeBlobBytes: number;
  activeDecodedBytes: number;
  jsHeapUsedBytes: number | null;
}

export interface Benchmark300Result {
  totalPagesRead: number;
  avgPreloadedTurnMs: number;
  p95PreloadedTurnMs: number;
  minPreloadedTurnMs: number;
  maxPreloadedTurnMs: number;
  activeCachedPagesAfter300: number;
  totalPagesLoaded: number;
  totalPagesRevoked: number;
  activeDecodedMB: number;
  heapBeforeMB: number | null;
  heapAfterMB: number | null;
  heapDeltaMB: number | null;
}

/**
 * Mendeteksi dimensi piksel asli (width x height) dari Blob gambar.
 * Jika `createImageBitmap` tersedia di browser, bitmap langsung ditutup (`bitmap.close()`)
 * setelah membaca dimensi agar tidak menahan memori GPU ganda.
 * Sebagai fallback (atau pada lingkungan tes PNG/JPEG sintetis), membaca header biner PNG/JPEG/WebP.
 */
export async function probeImageDimensions(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob);
      const width = bmp.width || 800;
      const height = bmp.height || 1200;
      bmp.close();
      return { width, height };
    } catch {
      // Lanjutkan ke pembacaan header biner
    }
  }

  try {
    const header = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
    // 1. Cek PNG IHDR (byte 16..23 adalah width & height uint32 big-endian)
    if (
      header.byteLength >= 24 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    ) {
      const view = new DataView(
        header.buffer,
        header.byteOffset,
        header.byteLength,
      );
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);
      if (width > 0 && height > 0) return { width, height };
    }
  } catch {
    // Abaikan
  }

  return { width: 820, height: 1160 };
}

/**
 * Membaca penggunaan JS Heap saat ini jika tersedia di browser (Chromium `performance.memory`)
 * atau Node.js (`process.memoryUsage()`).
 */
export function getCurrentHeapUsedBytes(): number | null {
  try {
    const perf = performance as unknown as {
      memory?: { usedJSHeapSize?: number };
    };
    if (perf?.memory && typeof perf.memory.usedJSHeapSize === "number") {
      return perf.memory.usedJSHeapSize;
    }
  } catch {
    // Abaikan
  }
  try {
    if (
      typeof process !== "undefined" &&
      typeof process.memoryUsage === "function"
    ) {
      return process.memoryUsage().heapUsed;
    }
  } catch {
    // Abaikan
  }
  return null;
}

/**
 * Pengelola cache halaman manga dengan jendela preload ±2 halaman
 * dan pembebasan memori ketat (`URL.revokeObjectURL`) untuk halaman yang jauh.
 */
export class MangaPageWindowCache {
  private source: MangaPageSource;
  private preloadRadius: number;
  private cache = new Map<number, CachedMangaPage>();
  private inflight = new Map<number, Promise<CachedMangaPage>>();
  private totalLoadedCount = 0;
  private totalRevokedCount = 0;
  private lastTurnLatencyMs: number | null = null;
  private lastTurnWasPreloaded = false;
  private destroyed = false;

  constructor(source: MangaPageSource, preloadRadius = 2) {
    this.source = source;
    this.preloadRadius = Math.max(1, preloadRadius);
  }

  /**
   * Mengambil halaman tunggal (dari cache jika sudah di-preload, atau memuat dari source).
   */
  async getPage(pageIndex: number): Promise<CachedMangaPage> {
    if (this.destroyed) {
      throw new Error("Cache halaman manga telah ditutup.");
    }
    const existing = this.cache.get(pageIndex);
    if (existing) {
      return existing;
    }

    const pending = this.inflight.get(pageIndex);
    if (pending) {
      return pending;
    }

    const loadPromise = (async (): Promise<CachedMangaPage> => {
      const blob = await this.source.loadPageBlob(pageIndex);
      const { width, height } = await probeImageDimensions(blob);
      const objectUrl =
        typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(blob)
          : `blob:mock-page-${pageIndex}`;

      const entry: CachedMangaPage = {
        pageIndex,
        blob,
        objectUrl,
        width,
        height,
        isSpread: width > height,
        byteSize: blob.size,
        estimatedDecodedBytes: width * height * 4,
        loadedAt: performance.now(),
      };

      if (this.destroyed) {
        if (typeof URL.revokeObjectURL === "function" && objectUrl.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // Abaikan
          }
        }
        throw new Error("Cache halaman manga telah ditutup.");
      }

      this.cache.set(pageIndex, entry);
      this.totalLoadedCount++;
      return entry;
    })();

    this.inflight.set(pageIndex, loadPromise);
    try {
      return await loadPromise;
    } finally {
      this.inflight.delete(pageIndex);
    }
  }

  /**
   * Memeriksa apakah halaman `pageIndex` sudah siap di memori (sudah di-preload).
   */
  hasPage(pageIndex: number): boolean {
    return this.cache.has(pageIndex);
  }

  /**
   * Mengambil data halaman yang sudah ada di cache secara sinkron (tanpa menunggu Promise).
   */
  peekPage(pageIndex: number): CachedMangaPage | undefined {
    return this.cache.get(pageIndex);
  }

  /**
   * Berpindah ke halaman `centerPage` (dan `secondPage` bila mode 2 halaman):
   * 1. Mengukur waktu akses halaman aktif (`lastTurnLatencyMs`).
   * 2. Membuang (evict & `URL.revokeObjectURL`) seluruh halaman di luar jendela `[minKeep..maxKeep]`.
   * 3. Memicu preload ±`preloadRadius` halaman di sekitar posisi baca secara asinkron.
   */
  async setActivePage(
    centerPage: number,
    isDoublePageMode = false,
  ): Promise<{
    primary: CachedMangaPage;
    secondary: CachedMangaPage | null;
    turnLatencyMs: number;
    wasPreloaded: boolean;
  }> {
    const t0 = performance.now();
    const wasPreloaded = this.cache.has(centerPage);

    const primary = await this.getPage(centerPage);
    let secondary: CachedMangaPage | null = null;

    if (
      isDoublePageMode &&
      !primary.isSpread &&
      centerPage + 1 < this.source.pageCount
    ) {
      const candidateNext = await this.getPage(centerPage + 1);
      if (!candidateNext.isSpread) {
        secondary = candidateNext;
      }
    }

    const turnLatencyMs = Math.max(0.01, performance.now() - t0);
    this.lastTurnLatencyMs = turnLatencyMs;
    this.lastTurnWasPreloaded = wasPreloaded;

    // Tentukan batas jendela halaman yang dipertahankan (±preloadRadius)
    const extraForward = secondary ? 1 : 0;
    const minKeep = Math.max(0, centerPage - this.preloadRadius);
    const maxKeep = Math.min(
      this.source.pageCount - 1,
      centerPage + extraForward + this.preloadRadius,
    );

    // Lepaskan halaman yang berada di luar jendela [minKeep..maxKeep]
    this.evictOutsideRange(minKeep, maxKeep);

    // Preload halaman tetangga di dalam jendela secara latar belakang
    void this.preloadRange(minKeep, maxKeep);

    return {
      primary,
      secondary,
      turnLatencyMs,
      wasPreloaded,
    };
  }

  /**
   * Memuat halaman dalam rentang `[start..end]` di muka tanpa memblokir UI.
   */
  async preloadRange(start: number, end: number): Promise<void> {
    const tasks: Promise<unknown>[] = [];
    for (let idx = start; idx <= end; idx++) {
      if (idx < 0 || idx >= this.source.pageCount) continue;
      if (!this.cache.has(idx)) {
        tasks.push(this.getPage(idx).catch(() => {}));
      }
    }
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
  }

  /**
   * Melepaskan (`URL.revokeObjectURL`) semua halaman di luar rentang `[minKeep..maxKeep]`.
   */
  evictOutsideRange(minKeep: number, maxKeep: number): void {
    for (const [idx, entry] of this.cache.entries()) {
      if (idx < minKeep || idx > maxKeep) {
        if (typeof URL.revokeObjectURL === "function") {
          try {
            URL.revokeObjectURL(entry.objectUrl);
          } catch {
            // Abaikan
          }
        }
        this.cache.delete(idx);
        this.totalRevokedCount++;
      }
    }
  }

  /**
   * Mengembalikan metrik penggunaan memori dan kecepatan pindah halaman saat ini.
   */
  getStats(): MangaCacheStats {
    let activeBlobBytes = 0;
    let activeDecodedBytes = 0;
    const activeIndices: number[] = [];

    for (const [idx, entry] of this.cache.entries()) {
      activeIndices.push(idx);
      activeBlobBytes += entry.byteSize;
      activeDecodedBytes += entry.estimatedDecodedBytes;
    }
    activeIndices.sort((a, b) => a - b);

    return {
      activeCachedPages: this.cache.size,
      activeIndices,
      totalLoadedCount: this.totalLoadedCount,
      totalRevokedCount: this.totalRevokedCount,
      lastTurnLatencyMs: this.lastTurnLatencyMs,
      lastTurnWasPreloaded: this.lastTurnWasPreloaded,
      activeBlobBytes,
      activeDecodedBytes,
      jsHeapUsedBytes: getCurrentHeapUsedBytes(),
    };
  }

  /**
   * Membersihkan seluruh halaman di cache dan mencabut semua ObjectURL saat keluar dari pembaca.
   */
  destroy(): void {
    this.destroyed = true;
    for (const [, entry] of this.cache.entries()) {
      if (typeof URL.revokeObjectURL === "function") {
        try {
          URL.revokeObjectURL(entry.objectUrl);
        } catch {
          // Abaikan
        }
      }
      this.totalRevokedCount++;
    }
    this.cache.clear();
    this.inflight.clear();
  }
}

/**
 * Menentukan halaman mana saja yang ditampilkan pada layar saat ini
 * berdasarkan mode 1 halaman / 2 halaman dan aturan gambar lebar (spread).
 */
export function computeDisplayedPageIndices(
  currentPage: number,
  pageCount: number,
  viewMode: "single" | "double",
  isPageSpread: (pageIndex: number) => boolean,
): number[] {
  if (pageCount <= 0) return [];
  const clamped = Math.max(0, Math.min(pageCount - 1, currentPage));
  if (viewMode === "single" || pageCount === 1) {
    return [clamped];
  }

  // Jika halaman saat ini sendiri adalah spread (lebar > tinggi), tampilkan sendiri
  if (isPageSpread(clamped)) {
    return [clamped];
  }

  const nextIdx = clamped + 1;
  if (nextIdx >= pageCount) {
    return [clamped];
  }

  // Jika halaman berikutnya adalah spread, jangan gabungkan dengan halaman saat ini
  if (isPageSpread(nextIdx)) {
    return [clamped];
  }

  return [clamped, nextIdx];
}

/**
 * Menjalankan simulasi & pengukuran nyata membaca 300 halaman berurutan dengan
 * preload ±2 halaman dan pelepasan memori otomatis.
 * Jika manga yang sedang dibuka memiliki < 300 halaman, indeks halaman akan
 * melingkar (modulo `source.pageCount`) sebanyak 300 kali perpindahan halaman
 * sehingga tetap benar-benar memuat, mendekode, dan melepaskan 300 halaman berturut-turut.
 */
export async function run300PageMemoryAndLatencyBenchmark(
  source: MangaPageSource,
  totalTurns = 300,
): Promise<Benchmark300Result> {
  const pageCount = source.pageCount;
  if (pageCount <= 0) {
    throw new Error("Manga tidak memiliki halaman untuk diuji.");
  }

  // Buat source sintetis 300 halaman yang memetakan setiap halaman ke source asli
  const virtualSource: MangaPageSource = {
    book: source.book,
    pageOrder: Array.from(
      { length: totalTurns },
      (_, i) => source.pageOrder[i % pageCount],
    ),
    pageCount: totalTurns,
    async loadPageBlob(idx: number): Promise<Blob> {
      const realBlob = await source.loadPageBlob(idx % pageCount);
      // Buat salinan Blob baru agar setiap halaman memiliki alokasi memori & ObjectURL unik
      return new Blob([realBlob], { type: realBlob.type });
    },
    async close() {},
  };

  const cache = new MangaPageWindowCache(virtualSource, 2);
  const heapBefore = getCurrentHeapUsedBytes();
  const preloadedLatencies: number[] = [];

  try {
    // Buka halaman 0 dan tunggu preload awal (±2 halaman) selesai
    await cache.setActivePage(0, false);
    await cache.preloadRange(0, Math.min(totalTurns - 1, 2));

    for (let page = 1; page < totalTurns; page++) {
      // Pastikan preload dari langkah sebelumnya sudah selesai sebagaimana pengguna membaca normal
      await cache.preloadRange(
        Math.max(0, page - 2),
        Math.min(totalTurns - 1, page + 1),
      );
      const res = await cache.setActivePage(page, false);
      if (res.wasPreloaded) {
        preloadedLatencies.push(res.turnLatencyMs);
      }
    }

    const stats = cache.getStats();
    const heapAfter = getCurrentHeapUsedBytes();

    const sorted = [...preloadedLatencies].sort((a, b) => a - b);
    const avg =
      sorted.length > 0
        ? sorted.reduce((acc, v) => acc + v, 0) / sorted.length
        : 0;
    const p95 =
      sorted.length > 0
        ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
        : 0;
    const min = sorted.length > 0 ? sorted[0] : 0;
    const max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;

    const heapBeforeMB =
      heapBefore !== null ? Number((heapBefore / (1024 * 1024)).toFixed(2)) : null;
    const heapAfterMB =
      heapAfter !== null ? Number((heapAfter / (1024 * 1024)).toFixed(2)) : null;
    const heapDeltaMB =
      heapBeforeMB !== null && heapAfterMB !== null
        ? Number((heapAfterMB - heapBeforeMB).toFixed(2))
        : null;

    return {
      totalPagesRead: totalTurns,
      avgPreloadedTurnMs: Number(avg.toFixed(3)),
      p95PreloadedTurnMs: Number(p95.toFixed(3)),
      minPreloadedTurnMs: Number(min.toFixed(3)),
      maxPreloadedTurnMs: Number(max.toFixed(3)),
      activeCachedPagesAfter300: stats.activeCachedPages,
      totalPagesLoaded: stats.totalLoadedCount,
      totalPagesRevoked: stats.totalRevokedCount,
      activeDecodedMB: Number(
        (stats.activeDecodedBytes / (1024 * 1024)).toFixed(2),
      ),
      heapBeforeMB,
      heapAfterMB,
      heapDeltaMB,
    };
  } finally {
    cache.destroy();
  }
}
