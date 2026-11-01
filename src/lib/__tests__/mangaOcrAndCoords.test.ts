import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addMinedCardToDeck,
  buildCardDuplicateKey,
  getDeckDuplicateKeys,
} from "../deckCards";
import { getMedia } from "../deckDb";
import { LexiconDatabase } from "../lexiconDb";
import {
  applyOcrPixelPreprocessing,
  compressBubbleImageForCard,
  DEFAULT_OCR_PREPROCESS_OPTIONS,
  inferInitialOcrLang,
  mapViewportBoxToImagePixels,
} from "../mangaCoordinates";
import {
  clearOcrCache,
  deleteOcrCacheEntry,
  findMatchingOcrCache,
  listOcrCacheForPage,
  normalizeJapaneseOcrText,
  orderVerticalOcrColumnsRtl,
  saveOcrCacheEntry,
  splitBubbleIntoSentences,
} from "../ocr/ocrProvider";

describe("Tahap 3 - Pemetaan Koordinat, Pra-pemrosesan, Normalisasi Teks OCR, Urutan jpn_vert & Cache Dexie", () => {
  let db: LexiconDatabase;

  beforeEach(() => {
    db = new LexiconDatabase(`test-manga-ocr-${Date.now()}-${Math.random()}`);
  });

  it("memetakan koordinat tampilan ke piksel gambar asli pada zoom 1x, 2x, 2.5x, geser (pan), dan berbagai DPR", () => {
    // Gambar asli resolusi penuh: 1600 x 2400 piksel
    // Ditampilkan pada kotak dasar: left=100, top=50, width=800, height=1200 (skala 0.5x dari ukuran asli)
    const baseImageRect = { left: 100, top: 50, width: 800, height: 1200 };

    // 1. Zoom = 1.0, Pan = (0, 0), DPR = 1
    // Kotak seleksi layar: left=300, top=250, width=100, height=200
    // Relatif terhadap baseImageRect: x = 200..300, y = 200..400 -> pada gambar asli (2x): x=400, y=400, w=200, h=400
    const res1 = mapViewportBoxToImagePixels({
      selectionBox: { left: 300, top: 250, width: 100, height: 200 },
      naturalWidth: 1600,
      naturalHeight: 2400,
      baseImageRect,
      zoom: 1,
      panX: 0,
      panY: 0,
      devicePixelRatio: 1,
    });
    expect(res1).toEqual({ x: 400, y: 400, w: 200, h: 400 });

    // 2. Zoom = 2.0 (pusat di tengah baseImageRect: (500, 650)), Pan = (-120, +80)
    // Saat zoom 2.0 & pan (-120, +80):
    // transformedLeft = 500 + (100 - 500)*2 - 120 = 500 - 800 - 120 = -420
    // transformedTop  = 650 + (50 - 650)*2 + 80  = 650 - 1200 + 80 = -470
    // transformedWidth = 1600, transformedHeight = 2400 (1 piksel layar = 1 piksel asli!)
    // Jika pengguna memilih piksel asli (x=500, y=600, w=180, h=320), di layar posisinya adalah:
    // screenLeft = -420 + 500 = 80, screenTop = -470 + 600 = 130, w = 180, h = 320
    const resZoomPan = mapViewportBoxToImagePixels({
      selectionBox: { left: 80, top: 130, width: 180, height: 320 },
      naturalWidth: 1600,
      naturalHeight: 2400,
      baseImageRect,
      zoom: 2.0,
      panX: -120,
      panY: 80,
      devicePixelRatio: 2,
      inputSpace: "css",
    });
    expect(resZoomPan).toEqual({ x: 500, y: 600, w: 180, h: 320 });

    // 3. Ruang koordinat fisik perangkat (inputSpace = "device") pada layar Retina/HiDPI (DPR = 3)
    const resDeviceDpr3 = mapViewportBoxToImagePixels({
      selectionBox: {
        left: 300 * 3,
        top: 250 * 3,
        width: 100 * 3,
        height: 200 * 3,
      },
      naturalWidth: 1600,
      naturalHeight: 2400,
      baseImageRect,
      zoom: 1,
      panX: 0,
      panY: 0,
      devicePixelRatio: 3,
      inputSpace: "device",
    });
    expect(resDeviceDpr3).toEqual({ x: 400, y: 400, w: 200, h: 400 });

    // 4. Perhitungan object-fit: contain dengan pillarbox kiri-kanan
    // Kontainer layar lebar 1000 x 1200 untuk gambar 1600 x 2400 (aspek 2:3 -> lebar konten 800, pillarbox kiri=100)
    const resContain = mapViewportBoxToImagePixels({
      selectionBox: { left: 100 + 200, top: 100, width: 150, height: 300 },
      naturalWidth: 1600,
      naturalHeight: 2400,
      baseImageRect: { left: 0, top: 0, width: 1000, height: 1200 },
      alreadyTransformed: true,
      objectFit: "contain",
    });
    expect(resContain).toEqual({ x: 400, y: 200, w: 300, h: 600 });
  });

  it("memilih bahasa awal jpn_vert untuk kotak tinggi dan jpn untuk kotak lebar", () => {
    expect(inferInitialOcrLang({ w: 180, h: 360 })).toBe("jpn_vert");
    expect(inferInitialOcrLang({ w: 420, h: 160 })).toBe("jpn");
    expect(inferInitialOcrLang({ w: 200, h: 200 })).toBe("jpn");
  });

  it("menormalisasi teks hasil OCR Jepang (hapus spasi antar karakter Jepang, tanda baca, simbol liar, gabung baris)", () => {
    // 1. Hapus spasi di antara karakter Jepang & gabungkan baris vertikal
    const rawSpaced = "今 日 は\n天 気 が\nいい から\n散 歩 に 行 こ う !";
    expect(normalizeJapaneseOcrText(rawSpaced)).toBe(
      "今日は天気がいいから散歩に行こう！",
    );

    // 2. Buang simbol liar tepi gelembung (|, \, ^, _, box-drawing) & konversi katakana setengah-lebar
    const rawNoisy = "│|「ﾎﾝﾄに!?\\^_` 信じられない...」┃";
    expect(normalizeJapaneseOcrText(rawNoisy)).toBe(
      "「ホントに！？信じられない…」",
    );

    // 3. Pertahankan spasi tunggal antar kata alfabet Latin bila ada di dalam dialog
    const mixedLatin = "彼 は Good Morning と 言 っ た .";
    expect(normalizeJapaneseOcrText(mixedLatin)).toBe(
      "彼はGood Morningと言った。",
    );
  });

  it("memastikan urutan baca jpn_vert selalu kolom kanan-ke-kiri (RTL)", () => {
    // Simulasi output baris vertikal Tesseract di mana kolom kiri tidak sengaja keluar lebih dulu
    const unorderedVerticalColumns = [
      { text: "散歩に行こう！", bbox: { x0: 40, y0: 30, x1: 80, y1: 320 } }, // Kolom paling kiri (ke-3)
      { text: "今日は", bbox: { x0: 200, y0: 40, x1: 240, y1: 260 } }, // Kolom paling kanan (ke-1)
      { text: "天気がいいから", bbox: { x0: 120, y0: 25, x1: 160, y1: 310 } }, // Kolom tengah (ke-2)
    ];

    const ordered = orderVerticalOcrColumnsRtl(unorderedVerticalColumns);
    expect(ordered.wasReordered).toBe(true);
    expect(normalizeJapaneseOcrText(ordered.joinedText)).toBe(
      "今日は天気がいいから散歩に行こう！",
    );
  });

  it("menerapkan pra-pemrosesan piksel (grayscale, kontras, binarisasi) dan memecah multi-kalimat", () => {
    // 2 piksel RGBA: piksel 1 gelap (teks: 30,30,30,255), piksel 2 abu-abu terang screentone (245,245,245,255)
    const rgba = new Uint8ClampedArray([30, 30, 30, 255, 245, 245, 245, 255]);
    applyOcrPixelPreprocessing(rgba, DEFAULT_OCR_PREPROCESS_OPTIONS);
    expect(rgba[0]).toBeLessThan(20); // Teks semakin pekat
    expect(rgba[4]).toBe(255); // Screentone tipis menjadi putih bersih

    // Uji binarisasi tegas
    const rgbaBin = new Uint8ClampedArray([120, 120, 120, 255, 200, 200, 200, 255]);
    applyOcrPixelPreprocessing(rgbaBin, {
      ...DEFAULT_OCR_PREPROCESS_OPTIONS,
      binarize: true,
      binarizeThreshold: 165,
    });
    expect(rgbaBin[0]).toBe(0);
    expect(rgbaBin[4]).toBe(255);

    // Uji pemecahan multi-kalimat dalam satu gelembung
    const sentences = splitBubbleIntoSentences(
      "今日はとても楽しかったね！明日もまた図書館で一緒に勉強しよう。",
    );
    expect(sentences).toEqual([
      "今日はとても楽しかったね！",
      "明日もまた図書館で一緒に勉強しよう。",
    ]);
  });

  it("menyimpan, mencocokkan (IoU), memperbarui, dan menghapus cache hasil OCR di Dexie", async () => {
    const saved = await saveOcrCacheEntry(
      {
        bookId: "manga-1",
        pageIndex: 2,
        bbox: { x: 500, y: 120, w: 200, h: 360 },
        lang: "jpn_vert",
        rawText: "今 日 は 散 歩",
        text: "今日は散歩",
        confidence: 91,
      },
      db,
    );
    expect(saved.id).toBeDefined();

    // Kotak yang sedikit bergeser beberapa piksel tetap cocok lewat IoU >= 0.72
    const matched = await findMatchingOcrCache(
      "manga-1",
      2,
      { x: 505, y: 124, w: 198, h: 356 },
      db,
    );
    expect(matched?.text).toBe("今日は散歩");

    // Perbarui teks setelah dikoreksi pengguna
    const updated = await saveOcrCacheEntry(
      {
        id: saved.id,
        bookId: "manga-1",
        pageIndex: 2,
        bbox: saved.bbox,
        lang: "jpn_vert",
        rawText: saved.rawText,
        text: "今日は散歩に行こう",
        confidence: 91,
      },
      db,
    );
    expect(updated.text).toBe("今日は散歩に行こう");

    const pageList = await listOcrCacheForPage("manga-1", 2, db);
    expect(pageList).toHaveLength(1);

    await deleteOcrCacheEntry(saved.id!, db);
    expect(await listOcrCacheForPage("manga-1", 2, db)).toHaveLength(0);

    // Uji clearOcrCache per halaman
    await saveOcrCacheEntry(
      {
        bookId: "manga-1",
        pageIndex: 3,
        bbox: { x: 100, y: 100, w: 150, h: 200 },
        lang: "jpn",
        rawText: "テスト",
        text: "テスト",
      },
      db,
    );
    await clearOcrCache("manga-1", 3, db);
    expect(await listOcrCacheForPage("manga-1", 3, db)).toHaveLength(0);
  });

  it("Tahap 4: menambahkan kartu sentence mining dari manga lengkap dengan gambar gelembung, sumber & deteksi duplikat", async () => {
    const deckId = `deck-manga-mining-${Date.now()}`;
    const dummyCropBlob = new Blob(["fake-image-bytes-png-data"], {
      type: "image/png",
    });

    const card = await addMinedCardToDeck(deckId, {
      word: "約束",
      reading: "やくそく",
      meaning: "Janji; perjanjian",
      sentence: "それは絶対に破らない<b>約束</b>だ。",
      translation: "Sumber: One Piece • Vol. 1 • Hal. 12 (012.png)",
      subdeck: "One Piece",
      tags: ["mined", "manga", "One Piece"],
      imageBlob: dummyCropBlob,
    });

    expect(card.id).toBeDefined();
    expect(card.word).toBe("約束");
    expect(card.reading).toBe("やくそく");
    expect(card.image).toBeDefined();
    expect(card.image).toMatch(/^manga-bubble-.+\.(webp|jpg)$/);

    // Verifikasi media tersimpan di penyimpanan media yang sama (IndexedDB MEDIA store)
    const storedBlob = await getMedia(deckId, card.image!);
    expect(storedBlob).toBeDefined();
    expect(storedBlob?.size).toBeGreaterThan(0);

    // Verifikasi deteksi duplikat (expression + reading)
    const duplicateKeys = await getDeckDuplicateKeys(deckId);
    const expectedKey = buildCardDuplicateKey("約束", "やくそく");
    expect(duplicateKeys.has(expectedKey)).toBe(true);

    // Kunci fallback kata juga ada
    expect(duplicateKeys.has("約束::*")).toBe(true);
  });

  it("Tahap 4: mengompres gambar gelembung dialog dengan fallback aman", async () => {
    const sampleBlob = new Blob(["dummy-png-crop"], { type: "image/png" });
    const compressed = await compressBubbleImageForCard(sampleBlob, 800, 0.8);
    expect(compressed.blob).toBeDefined();
    expect(["webp", "jpg"]).toContain(compressed.ext);
  });
});

