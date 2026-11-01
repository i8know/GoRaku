import "fake-indexeddb/auto";
import { zipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { LexiconDatabase } from "../lexiconDb";
import {
  computeDisplayedPageIndices,
  MangaPageWindowCache,
  run300PageMemoryAndLatencyBenchmark,
} from "../mangaPageCache";
import {
  addMangaArchiveFile,
  createMangaPageSource,
} from "../mangaStorage";

/**
 * Membuat byte PNG minimal yang valid dengan dimensi `width` x `height` pada chunk IHDR
 * beserta payload tambahan agar ukuran berkas menyerupai halaman manga.
 */
function createSyntheticPngBytes(
  width: number,
  height: number,
  pageNumber: number,
  payloadBytes = 16384,
): Uint8Array {
  const buf = new Uint8Array(32 + payloadBytes);
  // PNG signature
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length (13) & type
  buf.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(buf.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  view.setUint32(24, pageNumber, false);
  return buf;
}

describe("Tahap 2 - Pembaca Manga (Mode 1/2 Halaman, Spread, Preload ±2 & Benchmark 300 Halaman)", () => {
  let db: LexiconDatabase;

  beforeEach(() => {
    db = new LexiconDatabase(`test-manga-reader-${Date.now()}-${Math.random()}`);
  });

  it("menampilkan gambar spread (lebar > tinggi) secara tunggal pada mode 2 halaman", () => {
    // Halaman 0: potret, Halaman 1: potret, Halaman 2: spread lebar, Halaman 3: potret, Halaman 4: potret
    const spreads: Record<number, boolean> = {
      0: false,
      1: false,
      2: true, // spread (width > height)
      3: false,
      4: false,
    };
    const isSpread = (idx: number) => Boolean(spreads[idx]);

    // Mode 1 halaman selalu 1 halaman
    expect(computeDisplayedPageIndices(0, 5, "single", isSpread)).toEqual([0]);

    // Mode 2 halaman: halaman 0 & 1 adalah potret -> tampil berpasangan [0, 1]
    expect(computeDisplayedPageIndices(0, 5, "double", isSpread)).toEqual([0, 1]);

    // Jika berada di halaman 1 dan halaman 2 adalah spread -> halaman 1 tampil sendiri [1]
    expect(computeDisplayedPageIndices(1, 5, "double", isSpread)).toEqual([1]);

    // Halaman 2 adalah spread -> tampil sendiri [2]
    expect(computeDisplayedPageIndices(2, 5, "double", isSpread)).toEqual([2]);

    // Halaman 3 & 4 adalah potret -> tampil berpasangan [3, 4]
    expect(computeDisplayedPageIndices(3, 5, "double", isSpread)).toEqual([3, 4]);
  });

  it("memuat di muka ±2 halaman dan melepaskan halaman yang jauh (revokeObjectURL)", async () => {
    const zipEntries: Record<string, Uint8Array> = {};
    for (let i = 1; i <= 12; i++) {
      const name = `page_${String(i).padStart(3, "0")}.png`;
      zipEntries[name] = createSyntheticPngBytes(820, 1160, i, 4096);
    }
    const cbzFile = new File([zipSync(zipEntries, { level: 0 })], "Test12.cbz");
    const rec = await addMangaArchiveFile(cbzFile, db);
    const source = await createMangaPageSource(rec.id, db);
    const cache = new MangaPageWindowCache(source, 2);

    try {
      // Buka halaman indeks 0 -> jendela aktif [0, 1, 2]
      await cache.setActivePage(0, false);
      await cache.preloadRange(0, 2);
      let stats = cache.getStats();
      expect(stats.activeIndices).toEqual([0, 1, 2]);
      expect(stats.activeCachedPages).toBe(3);

      // Pindah ke halaman indeks 5 -> jendela aktif [3, 4, 5, 6, 7], halaman 0, 1, 2 harus dilepas!
      await cache.setActivePage(5, false);
      await cache.preloadRange(3, 7);
      stats = cache.getStats();
      expect(stats.activeIndices).toEqual([3, 4, 5, 6, 7]);
      expect(stats.activeCachedPages).toBe(5);
      expect(stats.totalRevokedCount).toBe(3);
    } finally {
      cache.destroy();
      await source.close();
    }
  });

  it("mengukur waktu pindah halaman setelah preload dan penggunaan memori setelah membaca 300 halaman CBZ", async () => {
    const zipEntries: Record<string, Uint8Array> = {};
    for (let i = 1; i <= 300; i++) {
      const name = `page_${String(i).padStart(3, "0")}.png`;
      // Halaman ke-50 dan ke-150 dibuat sebagai spread (1640x1160)
      const isSpread = i === 50 || i === 150;
      zipEntries[name] = createSyntheticPngBytes(
        isSpread ? 1640 : 820,
        1160,
        i,
        16384,
      );
    }

    const cbzFile = new File(
      [zipSync(zipEntries, { level: 0 })],
      "Benchmark_300_Pages.cbz",
    );
    const rec = await addMangaArchiveFile(cbzFile, db);
    expect(rec.pageCount).toBe(300);

    const source = await createMangaPageSource(rec.id, db);
    try {
      const result = await run300PageMemoryAndLatencyBenchmark(source, 300);

      console.log(
        `[Benchmark 300 Halaman] ` +
          `Rata-rata pindah halaman (preloaded): ${result.avgPreloadedTurnMs} ms | ` +
          `P95: ${result.p95PreloadedTurnMs} ms | Min: ${result.minPreloadedTurnMs} ms | Max: ${result.maxPreloadedTurnMs} ms | ` +
          `Cache aktif setelah 300 hal: ${result.activeCachedPagesAfter300} hal (${result.activeDecodedMB} MB bitmap) | ` +
          `Total dimuat: ${result.totalPagesLoaded}, Total dilepas (revoked): ${result.totalPagesRevoked} | ` +
          `JS Heap: ${result.heapBeforeMB} MB -> ${result.heapAfterMB} MB (Delta: ${result.heapDeltaMB} MB)`,
      );

      // Verifikasi bahwa setelah membaca 300 halaman:
      // 1. Jumlah halaman di cache aktif tetap dibatasi (di halaman terakhir 299, hanya menyimpan [297, 298, 299] = 3 halaman)
      expect(result.activeCachedPagesAfter300).toBeLessThanOrEqual(5);
      // 2. Sebanyak >= 295 halaman yang sudah dilewati benar-benar telah di-revoke dari memori
      expect(result.totalPagesRevoked).toBeGreaterThanOrEqual(295);
      // 3. Kecepatan pindah halaman yang sudah di-preload sangat cepat (< 5 ms)
      expect(result.avgPreloadedTurnMs).toBeLessThan(5);
    } finally {
      await source.close();
    }
  });
});

