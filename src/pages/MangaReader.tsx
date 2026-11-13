import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DictionaryManagerModal from "../components/DictionaryManagerModal";
import MangaOcrPanel from "../components/MangaOcrPanel";
import { incrementNovelMinedCount } from "../lib/bookStorage";
import {
  listDictionaries,
  type BookRecord,
  type DictionaryRecord,
  type OcrCacheRecord,
} from "../lib/lexiconDb";
import {
  cropAndPreprocessFromFullImage,
  DEFAULT_OCR_PREPROCESS_OPTIONS,
  inferInitialOcrLang,
  mapViewportBoxToImagePixels,
  type NaturalPixelBox,
  type OcrPreprocessOptions,
  type ViewportBox,
} from "../lib/mangaCoordinates";
import {
  computeDisplayedPageIndices,
  MangaPageWindowCache,
  run300PageMemoryAndLatencyBenchmark,
  type Benchmark300Result,
  type CachedMangaPage,
  type MangaCacheStats,
} from "../lib/mangaPageCache";
import {
  createMangaPageSource,
  updateMangaProgress,
  updateMangaReadingDirection,
  type MangaPageSource,
} from "../lib/mangaStorage";
import {
  clearOcrCache,
  deleteOcrCacheEntry,
  findMatchingOcrCache,
  listOcrCacheForPage,
  saveOcrCacheEntry,
  type OcrLanguage,
  type OcrModelVariant,
  type OcrProgressInfo,
} from "../lib/ocr/ocrProvider";
import { defaultOcrProvider } from "../lib/ocr/tesseractProvider";
import { Button, Icon } from "../ui";

export type FitMode = "fit-height" | "fit-width" | "original";
export type PageViewMode = "single" | "double";

export default function MangaReaderPage({
  notify,
}: {
  notify: (m: string) => void;
}) {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [source, setSource] = useState<MangaPageSource | null>(null);
  const [book, setBook] = useState<BookRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Kamus Yomitan
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);
  const [dictModalOpen, setDictModalOpen] = useState(false);

  // Pengaturan Pembaca Manga
  const [readingDirection, setReadingDirection] = useState<"rtl" | "ltr">("rtl");
  const [viewMode, setViewMode] = useState<PageViewMode>("single");
  const [fitMode, setFitMode] = useState<FitMode>("fit-height");
  const [currentPage, setCurrentPage] = useState(0);

  // Halaman yang sedang tampil (1 halaman atau 2 halaman berdampingan)
  const [primaryPage, setPrimaryPage] = useState<CachedMangaPage | null>(null);
  const [secondaryPage, setSecondaryPage] = useState<CachedMangaPage | null>(null);
  const [knownSpreads, setKnownSpreads] = useState<Record<number, boolean>>({});

  // Zoom & Pan (geser)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);

  // Layar penuh, HUD di ponsel, dan telemetri performa
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [showPerfPanel, setShowPerfPanel] = useState(false);
  const [cacheStats, setCacheStats] = useState<MangaCacheStats | null>(null);
  const [turnHistoryMs, setTurnHistoryMs] = useState<number[]>([]);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [benchmarkResult, setBenchmarkResult] =
    useState<Benchmark300Result | null>(null);

  // === TAHAP 3: State Mode "Pilih Gelembung" & OCR ===
  const [selectBubbleMode, setSelectBubbleMode] = useState(false);
  const [ocrPanelOpen, setOcrPanelOpen] = useState(false);
  const [ocrTargetPageIndex, setOcrTargetPageIndex] = useState<number>(0);
  const [ocrBbox, setOcrBbox] = useState<NaturalPixelBox | null>(null);
  const [rawCropBlob, setRawCropBlob] = useState<Blob | null>(null);
  const [preprocessedBlob, setPreprocessedBlob] = useState<Blob | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgressInfo | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrLang, setOcrLang] = useState<OcrLanguage>("jpn_vert");
  const [ocrVariant, setOcrVariant] = useState<OcrModelVariant>("best");
  const [preprocessOpts, setPreprocessOpts] = useState<OcrPreprocessOptions>(
    DEFAULT_OCR_PREPROCESS_OPTIONS,
  );
  const [editedText, setEditedText] = useState("");
  const [confirmedText, setConfirmedText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(
    undefined,
  );
  const [ocrElapsedMs, setOcrElapsedMs] = useState<number | undefined>(
    undefined,
  );
  const [cachedBubbles, setCachedBubbles] = useState<OcrCacheRecord[]>([]);
  const [activeCacheId, setActiveCacheId] = useState<number | undefined>(
    undefined,
  );

  // Kotak seleksi visual saat pengguna menyeret mouse/sentuh pada mode "Pilih Gelembung"
  const [liveSelectionBox, setLiveSelectionBox] = useState<ViewportBox | null>(
    null,
  );

  const readerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<MangaPageWindowCache | null>(null);
  const imgRefs = useRef<Map<number, HTMLImageElement>>(new Map());

  // State drag seleksi gelembung
  const bubbleDragRef = useRef<{
    active: boolean;
    pageIndex: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    active: false,
    pageIndex: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // State internal pointer/sentuh untuk mode baca normal (ketuk vs drag pan vs pinch zoom)
  const dragSessionRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
    movedDistance: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
    movedDistance: 0,
  });

  const pinchSessionRef = useRef<{
    active: boolean;
    initialDistance: number;
    initialZoom: number;
  }>({
    active: false,
    initialDistance: 0,
    initialZoom: 1,
  });

  const lastTapTimeRef = useRef<number>(0);

  // Muat daftar kamus aktif
  useEffect(() => {
    void listDictionaries().then(setDictionaries).catch(() => {});
  }, []);

  const activeDictCount = dictionaries.filter((d) => d.enabled).length;

  // 1. Inisialisasi MangaPageSource & MangaPageWindowCache (±2 halaman preload)
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    let activeSource: MangaPageSource | null = null;
    let activeCache: MangaPageWindowCache | null = null;

    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        activeSource = await createMangaPageSource(bookId);
        if (cancelled) {
          await activeSource.close();
          return;
        }
        activeCache = new MangaPageWindowCache(activeSource, 2);
        cacheRef.current = activeCache;
        setSource(activeSource);
        setBook(activeSource.book);
        setReadingDirection(activeSource.book.readingDirection ?? "rtl");
        const initialPage = Math.max(
          0,
          Math.min(
            activeSource.pageCount - 1,
            activeSource.book.currentPage ?? 0,
          ),
        );
        setCurrentPage(initialPage);
        setOcrTargetPageIndex(initialPage);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error ? err.message : "Gagal memuat manga.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      activeCache?.destroy();
      cacheRef.current = null;
      void activeSource?.close();
    };
  }, [bookId]);

  // Muat daftar cache OCR untuk halaman yang sedang aktif
  const refreshPageOcrCache = useCallback(
    async (targetPageIdx: number) => {
      if (!bookId) return;
      try {
        const list = await listOcrCacheForPage(bookId, targetPageIdx);
        setCachedBubbles(list);
      } catch {
        setCachedBubbles([]);
      }
    },
    [bookId],
  );

  // 2. Muat halaman aktif + preload ±2 halaman + lepaskan halaman jauh setiap pindah halaman
  useEffect(() => {
    const cache = cacheRef.current;
    if (!cache || !source || !bookId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await cache.setActivePage(
          currentPage,
          viewMode === "double",
        );
        if (cancelled) return;

        setPrimaryPage(res.primary);
        setSecondaryPage(res.secondary);
        setOcrTargetPageIndex(currentPage);
        void refreshPageOcrCache(currentPage);

        setKnownSpreads((prev) => {
          const next = { ...prev, [res.primary.pageIndex]: res.primary.isSpread };
          if (res.secondary) {
            next[res.secondary.pageIndex] = res.secondary.isSpread;
          }
          return next;
        });

        setCacheStats(cache.getStats());
        if (res.wasPreloaded) {
          setTurnHistoryMs((prev) => [...prev.slice(-29), res.turnLatencyMs]);
        }

        // Simpan posisi baca ke Dexie
        await updateMangaProgress(bookId, currentPage, source.pageCount);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error ? err.message : "Gagal memuat halaman manga.",
          );
        }
      }
    })();

    const timer = window.setTimeout(() => {
      if (!cancelled && cacheRef.current) {
        setCacheStats(cacheRef.current.getStats());
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, bookId, currentPage, viewMode, refreshPageOcrCache]);

  // Pantau status fullscreen browser
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const pageCount = source?.pageCount ?? 0;

  const displayedIndices = useMemo(() => {
    return computeDisplayedPageIndices(
      currentPage,
      pageCount,
      viewMode,
      (idx) => {
        const cached = cacheRef.current?.peekPage(idx);
        if (cached) return cached.isSpread;
        return Boolean(knownSpreads[idx]);
      },
    );
  }, [currentPage, pageCount, viewMode, knownSpreads, primaryPage, secondaryPage]);

  const resetZoomAndPan = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (pageCount <= 0) return;
      const clamped = Math.max(0, Math.min(pageCount - 1, targetPage));
      setCurrentPage(clamped);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    [pageCount],
  );

  const goNext = useCallback(() => {
    if (pageCount <= 0) return;
    const step = viewMode === "double" && secondaryPage ? 2 : 1;
    if (currentPage + step < pageCount) {
      goToPage(currentPage + step);
    } else if (currentPage < pageCount - 1) {
      goToPage(pageCount - 1);
    }
  }, [pageCount, viewMode, secondaryPage, currentPage, goToPage]);

  const goPrev = useCallback(() => {
    if (pageCount <= 0 || currentPage <= 0) return;
    if (viewMode === "single") {
      goToPage(currentPage - 1);
      return;
    }
    const prev1 = currentPage - 1;
    const prev2 = currentPage - 2;
    const isPrev1Spread =
      cacheRef.current?.peekPage(prev1)?.isSpread ?? Boolean(knownSpreads[prev1]);
    if (isPrev1Spread || prev2 < 0) {
      goToPage(prev1);
      return;
    }
    const isPrev2Spread =
      cacheRef.current?.peekPage(prev2)?.isSpread ?? Boolean(knownSpreads[prev2]);
    if (isPrev2Spread) {
      goToPage(prev1);
      return;
    }
    goToPage(prev2);
  }, [pageCount, currentPage, viewMode, knownSpreads, goToPage]);

  const handleToggleDirection = async () => {
    const nextDir = readingDirection === "rtl" ? "ltr" : "rtl";
    setReadingDirection(nextDir);
    if (bookId) {
      await updateMangaReadingDirection(bookId, nextDir);
      notify(
        `Arah baca diubah ke ${nextDir === "rtl" ? "Kanan-ke-Kiri (RTL)" : "Kiri-ke-Kanan (LTR)"}`,
      );
    }
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await readerContainerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      notify("Browser tidak mengizinkan mode layar penuh saat ini.");
    }
  };

  // === TAHAP 3: Jalankan Ekstraksi Crop Resolusi Penuh & OCR pada Gelembung ===
  const executeBubbleOcr = useCallback(
    async (
      targetPageIdx: number,
      bbox: NaturalPixelBox,
      langToUse: OcrLanguage,
      variantToUse: OcrModelVariant,
      optsToUse: OcrPreprocessOptions,
      bypassCache = false,
    ) => {
      const cache = cacheRef.current;
      if (!cache || !bookId) return;

      setOcrPanelOpen(true);
      setOcrTargetPageIndex(targetPageIdx);
      setOcrBbox(bbox);
      setOcrLang(langToUse);
      setOcrVariant(variantToUse);
      setPreprocessOpts(optsToUse);
      setOcrError(null);

      try {
        // Ambil Blob gambar halaman RESOLUSI PENUH dari cache halaman
        const pageEntry = await cache.getPage(targetPageIdx);
        const cropped = await cropAndPreprocessFromFullImage(
          pageEntry.blob,
          bbox,
          optsToUse,
        );
        setRawCropBlob(cropped.rawCropBlob);
        setPreprocessedBlob(cropped.preprocessedBlob);

        // 1. Cek apakah sudah ada di cache Dexie per (manga, halaman, kotak)
        if (!bypassCache) {
          const cached = await findMatchingOcrCache(
            bookId,
            targetPageIdx,
            bbox,
          );
          if (cached) {
            setOcrLang(cached.lang);
            setEditedText(cached.text);
            setConfirmedText(cached.text);
            setOcrConfidence(cached.confidence);
            setOcrElapsedMs(0);
            setActiveCacheId(cached.id);
            notify("Teks gelembung dimuat dari cache OCR lokal");
            return;
          }
        }

        // 2. Jalankan Tesseract OCR di Web Worker pada citra hasil pra-pemrosesan
        setOcrRunning(true);
        setOcrProgress({
          status: "Menyiapkan pengenalan huruf...",
          progress: 0.05,
          lang: langToUse,
        });

        const res = await defaultOcrProvider.recognize(
          cropped.preprocessedBlob,
          {
            lang: langToUse,
            modelVariant: variantToUse,
            onProgress: (info) => setOcrProgress(info),
          },
        );

        const recognizedText = res.text || "";
        setEditedText(recognizedText);
        setConfirmedText(recognizedText);
        setOcrConfidence(res.confidence);
        setOcrElapsedMs(res.elapsedMs);

        if (!recognizedText) {
          setOcrError(
            "Tidak ada teks yang terdeteksi otomatis pada area tersebut",
          );
        }

        // Simpan ke cache Dexie
        const saved = await saveOcrCacheEntry({
          bookId,
          pageIndex: targetPageIdx,
          bbox,
          lang: langToUse,
          rawText: res.rawText || recognizedText,
          text: recognizedText,
          confidence: res.confidence,
        });
        setActiveCacheId(saved.id);
        await refreshPageOcrCache(targetPageIdx);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Gagal menjalankan OCR pada gelembung.";
        setOcrError(msg);
      } finally {
        setOcrRunning(false);
        setOcrProgress(null);
      }
    },
    [bookId, notify, refreshPageOcrCache],
  );

  // Selesaikan seretan kotak gelembung -> petakan koordinat viewport ke piksel gambar asli
  const finalizeBubbleSelection = useCallback(
    (
      pageIdx: number,
      startX: number,
      startY: number,
      endX: number,
      endY: number,
    ) => {
      const selBox: ViewportBox = {
        left: Math.min(startX, endX),
        top: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
      };

      if (selBox.width < 10 || selBox.height < 10) {
        return;
      }

      const imgEl = imgRefs.current.get(pageIdx);
      const pageData = cacheRef.current?.peekPage(pageIdx);
      if (!imgEl || !pageData) return;

      const imgRect = imgEl.getBoundingClientRect();
      const mapped = mapViewportBoxToImagePixels({
        selectionBox: selBox,
        naturalWidth: pageData.width,
        naturalHeight: pageData.height,
        baseImageRect: {
          left: imgRect.left,
          top: imgRect.top,
          width: imgRect.width,
          height: imgRect.height,
        },
        alreadyTransformed: true,
        devicePixelRatio: window.devicePixelRatio || 1,
        inputSpace: "css",
        objectFit: "contain",
      });

      if (!mapped) {
        notify("Area seleksi terlalu kecil atau berada di luar halaman manga.");
        return;
      }

      // Pilihan bahasa awal otomatis: jpn_vert jika kotak lebih tinggi daripada lebarnya, jpn jika lebih lebar
      const autoLang = inferInitialOcrLang(mapped);
      void executeBubbleOcr(
        pageIdx,
        mapped,
        autoLang,
        ocrVariant,
        preprocessOpts,
        false,
      );
    },
    [executeBubbleOcr, notify, ocrVariant, preprocessOpts],
  );

  // Pilih salah satu gelembung dari cache halaman
  const handleSelectCachedBubble = useCallback(
    async (entry: OcrCacheRecord) => {
      const cache = cacheRef.current;
      if (!cache) return;
      setOcrPanelOpen(true);
      setOcrTargetPageIndex(entry.pageIndex);
      setOcrBbox(entry.bbox);
      setOcrLang(entry.lang);
      setEditedText(entry.text);
      setConfirmedText(entry.text);
      setOcrConfidence(entry.confidence);
      setOcrElapsedMs(0);
      setOcrError(null);
      setActiveCacheId(entry.id);

      try {
        const pageEntry = await cache.getPage(entry.pageIndex);
        const cropped = await cropAndPreprocessFromFullImage(
          pageEntry.blob,
          entry.bbox,
          preprocessOpts,
        );
        setRawCropBlob(cropped.rawCropBlob);
        setPreprocessedBlob(cropped.preprocessedBlob);
      } catch {
        // Abaikan bila gagal memotong ulang pratinjau
      }
    },
    [preprocessOpts],
  );

  // Konfirmasi edit teks pengguna & perbarui cache Dexie
  const handleConfirmEditedText = async (newText: string) => {
    const cleaned = newText.trim();
    setEditedText(cleaned);
    setConfirmedText(cleaned);

    if (bookId && ocrBbox) {
      const saved = await saveOcrCacheEntry({
        id: activeCacheId,
        bookId,
        pageIndex: ocrTargetPageIndex,
        bbox: ocrBbox,
        lang: ocrLang,
        rawText: cleaned,
        text: cleaned,
        confidence: ocrConfidence,
      });
      setActiveCacheId(saved.id);
      await refreshPageOcrCache(ocrTargetPageIndex);
      notify("Teks gelembung dikonfirmasi & disimpan ke cache");
    }
  };

  // Navigasi Keyboard yang sadar RTL + Pintasan Mode Pilih Gelembung (B)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setSelectBubbleMode((m) => !m);
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (readingDirection === "rtl") {
          goNext();
        } else {
          goPrev();
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (readingDirection === "rtl") {
          goPrev();
        } else {
          goNext();
        }
      } else if (e.key === " ") {
        e.preventDefault();
        if (e.shiftKey) {
          goPrev();
        } else {
          goNext();
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        goToPage(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToPage(pageCount - 1);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void handleToggleFullscreen();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((z) => {
          const next = Math.max(0.5, Number((z - 0.25).toFixed(2)));
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoomAndPan();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readingDirection, goNext, goPrev, goToPage, pageCount, resetZoomAndPan]);

  // Temukan indeks halaman tempat titik `(clientX, clientY)` berada
  const findPageIndexAtPoint = (clientX: number, clientY: number): number => {
    for (const [pageIdx, imgEl] of imgRefs.current.entries()) {
      const r = imgEl.getBoundingClientRect();
      if (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      ) {
        return pageIdx;
      }
    }
    return currentPage;
  };

  // Zoom Roda Mouse (Wheel)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.18 : -0.18;
    setZoom((prevZoom) => {
      const nextZoom = Math.max(
        0.5,
        Math.min(4, Number((prevZoom + delta).toFixed(2))),
      );
      if (nextZoom <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  };

  // Mouse Down: Mode Pilih Gelembung vs Mode Geser/Ketuk Normal
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    if (selectBubbleMode) {
      const targetPageIdx = findPageIndexAtPoint(e.clientX, e.clientY);
      bubbleDragRef.current = {
        active: true,
        pageIndex: targetPageIdx,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      };
      setLiveSelectionBox({
        left: e.clientX,
        top: e.clientY,
        width: 0,
        height: 0,
      });
      return;
    }

    dragSessionRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: pan.x,
      originPanY: pan.y,
      movedDistance: 0,
    };
    if (zoom > 1) {
      setIsDraggingPan(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectBubbleMode && bubbleDragRef.current.active) {
      const b = bubbleDragRef.current;
      b.currentX = e.clientX;
      b.currentY = e.clientY;
      setLiveSelectionBox({
        left: Math.min(b.startX, b.currentX),
        top: Math.min(b.startY, b.currentY),
        width: Math.abs(b.currentX - b.startX),
        height: Math.abs(b.currentY - b.startY),
      });
      return;
    }

    const sess = dragSessionRef.current;
    if (!sess.active) return;
    const dx = e.clientX - sess.startX;
    const dy = e.clientY - sess.startY;
    const dist = Math.hypot(dx, dy);
    sess.movedDistance = Math.max(sess.movedDistance, dist);

    if (zoom > 1 || dist > 6) {
      setIsDraggingPan(true);
      setPan({
        x: sess.originPanX + dx,
        y: sess.originPanY + dy,
      });
    }
  };

  const handleViewportTapOrClick = (clientX: number, clientY: number) => {
    const now = performance.now();
    if (now - lastTapTimeRef.current < 280) {
      lastTapTimeRef.current = 0;
      if (zoom > 1.05) {
        resetZoomAndPan();
      } else {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (rect) {
          const offsetX = rect.width / 2 - (clientX - rect.left);
          const offsetY = rect.height / 2 - (clientY - rect.top);
          setZoom(2);
          setPan({ x: offsetX * 0.6, y: offsetY * 0.6 });
        } else {
          setZoom(2);
        }
      }
      return;
    }
    lastTapTimeRef.current = now;

    if (zoom > 1.05) return;

    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;

    const relX = (clientX - rect.left) / rect.width;
    if (relX < 0.28) {
      if (readingDirection === "rtl") {
        goNext();
      } else {
        goPrev();
      }
    } else if (relX > 0.72) {
      if (readingDirection === "rtl") {
        goPrev();
      } else {
        goNext();
      }
    } else {
      setHudVisible((v) => !v);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectBubbleMode && bubbleDragRef.current.active) {
      const b = bubbleDragRef.current;
      b.active = false;
      setLiveSelectionBox(null);
      finalizeBubbleSelection(
        b.pageIndex,
        b.startX,
        b.startY,
        e.clientX,
        e.clientY,
      );
      return;
    }

    const sess = dragSessionRef.current;
    if (!sess.active) return;
    sess.active = false;
    setIsDraggingPan(false);

    if (sess.movedDistance < 8) {
      handleViewportTapOrClick(e.clientX, e.clientY);
    }
  };

  // Sentuh (Touch): Mode Pilih Gelembung vs Pinch-to-Zoom / Drag Pan / Zona Ketuk
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (selectBubbleMode && e.touches.length === 1) {
      const t = e.touches[0];
      const targetPageIdx = findPageIndexAtPoint(t.clientX, t.clientY);
      bubbleDragRef.current = {
        active: true,
        pageIndex: targetPageIdx,
        startX: t.clientX,
        startY: t.clientY,
        currentX: t.clientX,
        currentY: t.clientY,
      };
      setLiveSelectionBox({
        left: t.clientX,
        top: t.clientY,
        width: 0,
        height: 0,
      });
      return;
    }

    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchSessionRef.current = {
        active: true,
        initialDistance: Math.max(10, dist),
        initialZoom: zoom,
      };
      dragSessionRef.current.active = false;
      bubbleDragRef.current.active = false;
      setLiveSelectionBox(null);
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      dragSessionRef.current = {
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        originPanX: pan.x,
        originPanY: pan.y,
        movedDistance: 0,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (selectBubbleMode && bubbleDragRef.current.active && e.touches.length === 1) {
      const t = e.touches[0];
      const b = bubbleDragRef.current;
      b.currentX = t.clientX;
      b.currentY = t.clientY;
      setLiveSelectionBox({
        left: Math.min(b.startX, b.currentX),
        top: Math.min(b.startY, b.currentY),
        width: Math.abs(b.currentX - b.startX),
        height: Math.abs(b.currentY - b.startY),
      });
      return;
    }

    if (e.touches.length === 2 && pinchSessionRef.current.active) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = dist / pinchSessionRef.current.initialDistance;
      const nextZoom = Math.max(
        0.5,
        Math.min(
          4,
          Number((pinchSessionRef.current.initialZoom * ratio).toFixed(2)),
        ),
      );
      setZoom(nextZoom);
      if (nextZoom <= 1) setPan({ x: 0, y: 0 });
      return;
    }

    if (e.touches.length === 1 && dragSessionRef.current.active) {
      const t = e.touches[0];
      const sess = dragSessionRef.current;
      const dx = t.clientX - sess.startX;
      const dy = t.clientY - sess.startY;
      const dist = Math.hypot(dx, dy);
      sess.movedDistance = Math.max(sess.movedDistance, dist);

      if (zoom > 1) {
        setPan({
          x: sess.originPanX + dx,
          y: sess.originPanY + dy,
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (selectBubbleMode && bubbleDragRef.current.active) {
      const b = bubbleDragRef.current;
      b.active = false;
      setLiveSelectionBox(null);
      const t = e.changedTouches[0];
      if (t) {
        finalizeBubbleSelection(
          b.pageIndex,
          b.startX,
          b.startY,
          t.clientX,
          t.clientY,
        );
      }
      return;
    }

    if (pinchSessionRef.current.active && e.touches.length < 2) {
      pinchSessionRef.current.active = false;
      return;
    }

    const sess = dragSessionRef.current;
    if (sess.active && e.changedTouches.length > 0) {
      sess.active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sess.startX;

      if (zoom <= 1.05 && Math.abs(dx) > 55 && sess.movedDistance > 55) {
        if (dx > 0) {
          if (readingDirection === "rtl") goNext();
          else goPrev();
        } else {
          if (readingDirection === "rtl") goPrev();
          else goNext();
        }
        return;
      }

      if (sess.movedDistance < 10) {
        handleViewportTapOrClick(t.clientX, t.clientY);
      }
    }
  };

  // Jalankan Benchmark 300 Halaman langsung dari Pembaca
  const handleRun300Benchmark = async () => {
    if (!source || runningBenchmark) return;
    setRunningBenchmark(true);
    try {
      const res = await run300PageMemoryAndLatencyBenchmark(source, 300);
      setBenchmarkResult(res);
      notify(
        `Benchmark 300 hal selesai: rata-rata ${res.avgPreloadedTurnMs.toFixed(2)} ms/halaman, cache aktif tetap ${res.activeCachedPagesAfter300} halaman.`,
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Gagal menjalankan benchmark.",
      );
    } finally {
      setRunningBenchmark(false);
    }
  };

  const avgTurnLatencyMs = useMemo(() => {
    if (turnHistoryMs.length === 0) return null;
    const sum = turnHistoryMs.reduce((a, b) => a + b, 0);
    return Number((sum / turnHistoryMs.length).toFixed(2));
  }, [turnHistoryMs]);

  if (loading) {
    return (
      <div className="p-10 text-center">
        <p className="text-[14px]" style={{ color: "var(--tinta-2)" }}>
          Membuka arsip manga &amp; menyiapkan jendela preload (±2 halaman)...
        </p>
      </div>
    );
  }

  if (errorMsg || !book || !source) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <p className="text-[15px] font-semibold mb-2 text-[var(--shu)]">
          {errorMsg ?? "Manga tidak ditemukan"}
        </p>
        <Button className="outline-button" onClick={() => navigate("/library")}>
          <Icon name="arrow-left" size={16} /> Kembali ke Perpustakaan
        </Button>
      </div>
    );
  }

  const orderedRenderedPages: CachedMangaPage[] = [];
  if (primaryPage) {
    if (secondaryPage) {
      if (readingDirection === "rtl") {
        orderedRenderedPages.push(secondaryPage, primaryPage);
      } else {
        orderedRenderedPages.push(primaryPage, secondaryPage);
      }
    } else {
      orderedRenderedPages.push(primaryPage);
    }
  }

  const getImageFitClasses = (isTwoPagesShowing: boolean): string => {
    if (fitMode === "fit-height") {
      return isTwoPagesShowing
        ? "max-h-[calc(100vh-140px)] max-w-[49vw] w-auto h-auto object-contain"
        : "max-h-[calc(100vh-140px)] max-w-[96vw] w-auto h-auto object-contain";
    }
    if (fitMode === "fit-width") {
      return isTwoPagesShowing
        ? "w-[48vw] max-w-[680px] h-auto object-contain"
        : "w-[94vw] max-w-[1080px] h-auto object-contain";
    }
    return "max-w-none h-auto w-auto";
  };

  const pageLabel =
    displayedIndices.length === 2
      ? `${displayedIndices[0] + 1}–${displayedIndices[1] + 1} / ${pageCount}`
      : `${currentPage + 1} / ${pageCount}`;

  return (
    <div
      ref={readerContainerRef}
      className="flex flex-col select-none rounded-2xl overflow-hidden border relative"
      style={{
        background: "#0d0d0f",
        color: "#f4f1ea",
        borderColor: "rgba(255,255,255,0.1)",
        minHeight: isFullscreen ? "100vh" : "calc(100vh - 88px)",
      }}
    >
      <DictionaryManagerModal
        open={dictModalOpen}
        onClose={() => setDictModalOpen(false)}
        onDictionariesChanged={setDictionaries}
      />

      {/* Bilah Alat Atas (HUD Top Bar) */}
      {hudVisible && (
        <header
          className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b z-20"
          style={{
            background: "rgba(20, 20, 22, 0.94)",
            backdropFilter: "blur(10px)",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          {/* Kiri: Tombol Kembali & Info Judul */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/library")}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-medium border transition hover:bg-white/10"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}
              title="Kembali ke Perpustakaan"
            >
              <Icon name="arrow-left" size={15} />
              <span className="hidden sm:inline">Perpustakaan</span>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[14px] font-bold truncate max-w-[180px] sm:max-w-[280px]">
                  {book.title}
                </h1>
                {primaryPage?.isSpread && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                    Spread Lebar
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                Hal. {pageLabel} •{" "}
                <span className="font-mono">
                  {source.pageOrder[currentPage]}
                </span>
              </p>
            </div>
          </div>

          {/* Kanan: Tombol Pilih Gelembung (OCR), Kamus, Arah Baca, 1/2 Hal, Fit, Zoom, Performa, Layar Penuh */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Tombol Utama Mode Pilih Gelembung (OCR) */}
            <button
              type="button"
              onClick={() => {
                setSelectBubbleMode((m) => {
                  const next = !m;
                  if (next) {
                    setOcrPanelOpen(true);
                  }
                  return next;
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold border transition"
              style={{
                borderColor: selectBubbleMode
                  ? "var(--mizu)"
                  : "rgba(255,255,255,0.22)",
                background: selectBubbleMode
                  ? "var(--ai)"
                  : "rgba(38, 72, 122, 0.28)",
                color: "#ffffff",
              }}
              title="Aktifkan mode Pilih Gelembung (Pintasan: B) lalu seret kotak di sekitar gelembung dialog untuk di-OCR"
            >
              <Icon name="target" size={14} />
              <span>
                {selectBubbleMode
                  ? "Mode Pilih Gelembung: AKTIF"
                  : "Pilih Gelembung (OCR)"}
              </span>
            </button>

            {/* Tombol Buka/Tutup Panel OCR / Input Manual */}
            <button
              type="button"
              onClick={() => setOcrPanelOpen((o) => !o)}
              className="rounded-xl px-2.5 py-1.5 text-[12px] font-medium border transition hover:bg-white/10"
              style={{
                borderColor: ocrPanelOpen
                  ? "#fbbf24"
                  : "rgba(255,255,255,0.18)",
                background: ocrPanelOpen
                  ? "rgba(251, 191, 36, 0.15)"
                  : "transparent",
              }}
              title="Buka atau tutup panel teks OCR & input manual"
            >
              Panel OCR{" "}
              {cachedBubbles.length > 0 ? `(${cachedBubbles.length})` : ""}
            </button>

            {/* Tombol Kelola Kamus Yomitan */}
            <button
              type="button"
              onClick={() => setDictModalOpen(true)}
              className="rounded-xl px-2.5 py-1.5 text-[12px] font-medium border transition hover:bg-white/10"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}
              title="Kelola Kamus Yomitan"
            >
              <Icon name="book" size={14} />{" "}
              <span className="hidden md:inline">Kamus</span> ({activeDictCount})
            </button>

            {/* Sakelar Arah Baca RTL / LTR */}
            <button
              type="button"
              onClick={() => void handleToggleDirection()}
              className="rounded-xl px-2.5 py-1.5 text-[12px] font-semibold border transition hover:bg-white/10"
              style={{
                borderColor:
                  readingDirection === "rtl"
                    ? "var(--mizu)"
                    : "rgba(255,255,255,0.18)",
                background:
                  readingDirection === "rtl"
                    ? "rgba(38, 72, 122, 0.36)"
                    : "transparent",
              }}
              title="Ubah arah baca manga (disimpan per judul)"
            >
              {readingDirection === "rtl" ? "← RTL" : "LTR →"}
            </button>

            {/* Sakelar 1 Halaman vs 2 Halaman */}
            <button
              type="button"
              onClick={() =>
                setViewMode((m) => (m === "single" ? "double" : "single"))
              }
              className="rounded-xl px-2.5 py-1.5 text-[12px] font-medium border transition hover:bg-white/10"
              style={{
                borderColor:
                  viewMode === "double"
                    ? "#38bdf8"
                    : "rgba(255,255,255,0.18)",
                background:
                  viewMode === "double"
                    ? "rgba(56, 189, 248, 0.16)"
                    : "transparent",
              }}
              title="Mode 1 halaman atau 2 halaman berdampingan"
            >
              {viewMode === "single" ? "1 Hal" : "2 Hal"}
            </button>

            {/* Pilihan Mode Fit */}
            <select
              value={fitMode}
              onChange={(e) => {
                setFitMode(e.target.value as FitMode);
                resetZoomAndPan();
              }}
              aria-label="Mode ukuran tampilan halaman"
              className="rounded-xl px-2 py-1.5 text-[12px] border bg-[#1b1b1e] text-neutral-100"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}
            >
              <option value="fit-height">Fit Tinggi</option>
              <option value="fit-width">Fit Lebar</option>
              <option value="original">Asli (1:1)</option>
            </select>

            {/* Kontrol Zoom */}
            <div
              className="flex items-center rounded-xl border overflow-hidden"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}
            >
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => {
                    const next = Math.max(0.5, Number((z - 0.25).toFixed(2)));
                    if (next <= 1) setPan({ x: 0, y: 0 });
                    return next;
                  })
                }
                className="px-2 py-1 text-[12px] hover:bg-white/10"
                title="Perkecil (-)"
                aria-label="Perkecil zoom"
              >
                −
              </button>
              <button
                type="button"
                onClick={resetZoomAndPan}
                className="px-2 py-1 text-[11.5px] font-mono hover:bg-white/10 border-x"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
                title="Reset Zoom & Geser (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))
                }
                className="px-2 py-1 text-[12px] hover:bg-white/10"
                title="Perbesar (+)"
                aria-label="Perbesar zoom"
              >
                +
              </button>
            </div>

            {/* Tombol Info Performa & Memori */}
            <button
              type="button"
              onClick={() => setShowPerfPanel((s) => !s)}
              className="rounded-xl px-2.5 py-1.5 text-[12px] border transition hover:bg-white/10"
              style={{
                borderColor: showPerfPanel
                  ? "#10b981"
                  : "rgba(255,255,255,0.18)",
                background: showPerfPanel
                  ? "rgba(16, 185, 129, 0.16)"
                  : "transparent",
              }}
              title="Lihat metrik kecepatan preload & penggunaan memori"
            >
              <Icon name="bolt" size={14} />
            </button>

            {/* Tombol Layar Penuh */}
            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              className="rounded-xl px-2.5 py-1.5 text-[12px] border transition hover:bg-white/10"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}
              title="Layar Penuh (F)"
            >
              {isFullscreen ? "Keluar" : "Penuh"}
            </button>
          </div>
        </header>
      )}

      {/* Banner Instruksi saat Mode Pilih Gelembung Aktif */}
      {selectBubbleMode && (
        <div
          className="px-4 py-1.5 text-[12px] flex items-center justify-between gap-2 border-b z-20"
          style={{
            background: "rgba(196, 84, 63, 0.22)",
            borderColor: "rgba(251, 191, 36, 0.35)",
            color: "#fde68a",
          }}
        >
          <span>
            <strong>Mode Pilih Gelembung Aktif:</strong> Seret kotak (mouse atau
            sentuhan jari) mengelilingi gelembung dialog pada halaman manga
            untuk memotong dari gambar resolusi penuh dan menjalankan OCR.
          </span>
          <button
            type="button"
            onClick={() => setSelectBubbleMode(false)}
            className="text-[11.5px] underline font-semibold shrink-0 text-white"
          >
            Selesai Pilih (B)
          </button>
        </div>
      )}

      {/* Panel Telemetri Performa, Preload ±2 Halaman, & Benchmark 300 Halaman */}
      {showPerfPanel && cacheStats && (
        <div
          className="px-4 py-3 border-b text-[12px] flex flex-wrap items-center justify-between gap-3 z-20"
          style={{
            background: "rgba(16, 24, 22, 0.95)",
            borderColor: "rgba(16, 185, 129, 0.3)",
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-neutral-400">Pindah Hal. Terakhir:</span>{" "}
              <strong className="text-emerald-400 font-mono">
                {cacheStats.lastTurnLatencyMs !== null
                  ? `${cacheStats.lastTurnLatencyMs.toFixed(2)} ms`
                  : "-"}
              </strong>{" "}
              <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-white/10">
                {cacheStats.lastTurnWasPreloaded ? "PRELOADED HIT" : "COLD LOAD"}
              </span>
            </div>
            {avgTurnLatencyMs !== null && (
              <div>
                <span className="text-neutral-400">Rata-rata Preload:</span>{" "}
                <strong className="font-mono text-emerald-300">
                  {avgTurnLatencyMs} ms
                </strong>
              </div>
            )}
            <div>
              <span className="text-neutral-400">Jendela Cache Aktif (±2):</span>{" "}
              <strong className="font-mono">
                {cacheStats.activeCachedPages} hal
              </strong>{" "}
              <span className="text-neutral-400 font-mono">
                ([{cacheStats.activeIndices.map((i) => i + 1).join(", ")}])
              </span>
            </div>
            <div>
              <span className="text-neutral-400">URL Dilepas (Revoked):</span>{" "}
              <strong className="font-mono text-amber-300">
                {cacheStats.totalRevokedCount} hal
              </strong>
            </div>
            <div>
              <span className="text-neutral-400">Memori Bitmap Aktif:</span>{" "}
              <strong className="font-mono">
                {(cacheStats.activeDecodedBytes / (1024 * 1024)).toFixed(1)} MB
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={runningBenchmark}
              onClick={() => void handleRun300Benchmark()}
              className="rounded-lg px-2.5 py-1 text-[11.5px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition"
            >
              {runningBenchmark
                ? "Mengukur 300 Hal..."
                : "Uji Benchmark 300 Halaman"}
            </button>
          </div>

          {benchmarkResult && (
            <div className="w-full pt-2 border-t border-white/10 text-[11.5px] font-mono text-emerald-200 flex flex-wrap gap-x-5 gap-y-1">
              <span>✓ Hasil Uji {benchmarkResult.totalPagesRead} Halaman:</span>
              <span>
                Waktu Pindah (Preloaded): rata-rata{" "}
                <strong>{benchmarkResult.avgPreloadedTurnMs} ms</strong> (P95:{" "}
                {benchmarkResult.p95PreloadedTurnMs} ms)
              </span>
              <span>
                Cache Aktif Akhir:{" "}
                <strong>
                  {benchmarkResult.activeCachedPagesAfter300} halaman
                </strong>{" "}
                ({benchmarkResult.activeDecodedMB} MB decoded)
              </span>
              <span>
                Total Dimuat/Dilepas: {benchmarkResult.totalPagesLoaded} dimuat /{" "}
                <strong>{benchmarkResult.totalPagesRevoked} dilepas</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Kanvas Utama Pembaca Manga */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          dragSessionRef.current.active = false;
          setIsDraggingPan(false);
          if (bubbleDragRef.current.active) {
            bubbleDragRef.current.active = false;
            setLiveSelectionBox(null);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 relative overflow-auto flex items-center justify-center"
        style={{
          background: "#0d0d0f",
          cursor: selectBubbleMode
            ? "crosshair"
            : zoom > 1
              ? isDraggingPan
                ? "grabbing"
                : "grab"
              : "default",
          touchAction: selectBubbleMode || zoom > 1 ? "none" : "pan-y",
        }}
      >
        <div
          className="flex items-center justify-center gap-1 transition-transform duration-75 ease-out"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {orderedRenderedPages.map((page) => {
            const pageBubbles = cachedBubbles.filter(
              (b) => b.pageIndex === page.pageIndex,
            );
            return (
              <div
                key={page.pageIndex}
                className="relative inline-block"
                data-page-index={page.pageIndex}
              >
                <img
                  ref={(el) => {
                    if (el) imgRefs.current.set(page.pageIndex, el);
                    else imgRefs.current.delete(page.pageIndex);
                  }}
                  src={page.objectUrl}
                  alt={`Halaman ${page.pageIndex + 1}`}
                  draggable={false}
                  className={`${getImageFitClasses(orderedRenderedPages.length === 2)} shadow-2xl select-none block`}
                />

                {/* Overlay Gelembung yang Sudah Tersimpan di Cache Halaman Ini */}
                {pageBubbles.map((cb, bIdx) => {
                  const leftPct = (cb.bbox.x / Math.max(1, page.width)) * 100;
                  const topPct = (cb.bbox.y / Math.max(1, page.height)) * 100;
                  const widthPct = (cb.bbox.w / Math.max(1, page.width)) * 100;
                  const heightPct =
                    (cb.bbox.h / Math.max(1, page.height)) * 100;
                  const isActive = activeCacheId === cb.id && ocrPanelOpen;

                  return (
                    <button
                      key={cb.id ?? bIdx}
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSelectCachedBubble(cb);
                      }}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                        borderColor: isActive ? "var(--ai)" : "#fbbf24",
                        background: isActive
                          ? "rgba(38, 72, 122, 0.30)"
                          : "rgba(251, 191, 36, 0.14)",
                      }}
                      className="absolute border-2 rounded-md transition-colors hover:bg-[var(--ai)]/30 group"
                      title={`Gelembung #${bIdx + 1}: ${cb.text || "(Klik untuk membuka)"}`}
                    >
                      <span
                        className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow"
                        style={{
                          background: isActive ? "var(--ai)" : "#fbbf24",
                          color: isActive ? "#ffffff" : "#111111",
                        }}
                      >
                        {bIdx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Kotak Seleksi Visual Saat Pengguna Menyeret di Mode Pilih Gelembung */}
        {liveSelectionBox && liveSelectionBox.width > 2 && (
          <div
            className="fixed pointer-events-none z-40 border-2 border-[var(--mizu)] bg-[var(--ai)]/25 rounded-sm shadow-lg"
            style={{
              left: `${liveSelectionBox.left}px`,
              top: `${liveSelectionBox.top}px`,
              width: `${liveSelectionBox.width}px`,
              height: `${liveSelectionBox.height}px`,
            }}
          />
        )}

        {/* Indikator Mengambang saat HUD disembunyikan di ponsel */}
        {!hudVisible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setHudVisible(true);
            }}
            className="fixed bottom-4 right-4 z-30 rounded-full px-3.5 py-1.5 text-[12px] font-mono bg-black/75 text-white border border-white/15 shadow-lg"
          >
            Hal. {pageLabel} ({readingDirection.toUpperCase()}) • Ketuk untuk Menu
          </button>
        )}
      </div>

      {/* Panel Hasil OCR Berdampingan + Klik Kata Kamus Yomitan */}
      {ocrPanelOpen && (
        <MangaOcrPanel
          bookTitle={book.title}
          bookVolume={book.volume}
          pageIndex={ocrTargetPageIndex}
          pageFileName={source.pageOrder[ocrTargetPageIndex]}
          bbox={ocrBbox}
          rawCropBlob={rawCropBlob}
          preprocessedBlob={preprocessedBlob}
          ocrRunning={ocrRunning}
          ocrProgress={ocrProgress}
          ocrError={ocrError}
          lang={ocrLang}
          modelVariant={ocrVariant}
          preprocessOpts={preprocessOpts}
          editedText={editedText}
          confirmedText={confirmedText}
          confidence={ocrConfidence}
          elapsedMs={ocrElapsedMs}
          cachedBubbles={cachedBubbles}
          activeCacheId={activeCacheId}
          activeDictCount={activeDictCount}
          onChangeEditedText={(txt) => {
            setEditedText(txt);
            setConfirmedText(txt);
          }}
          onConfirmText={(txt) => void handleConfirmEditedText(txt)}
          onReOcr={(nextLang, nextVariant, nextOpts) => {
            if (ocrBbox) {
              void executeBubbleOcr(
                ocrTargetPageIndex,
                ocrBbox,
                nextLang,
                nextVariant,
                nextOpts,
                true,
              );
            }
          }}
          onSelectCachedBubble={(entry) => void handleSelectCachedBubble(entry)}
          onDeleteCachedBubble={async (id) => {
            await deleteOcrCacheEntry(id);
            if (activeCacheId === id) {
              setActiveCacheId(undefined);
            }
            await refreshPageOcrCache(ocrTargetPageIndex);
            notify("Cache gelembung dihapus");
          }}
          onClearPageCache={async () => {
            if (!bookId) return;
            await clearOcrCache(bookId, ocrTargetPageIndex);
            setActiveCacheId(undefined);
            await refreshPageOcrCache(ocrTargetPageIndex);
            notify(
              `Seluruh cache OCR pada halaman ${ocrTargetPageIndex + 1} dihapus`,
            );
          }}
          onOpenDictManager={() => setDictModalOpen(true)}
          onCardMined={(word, deckTitle) => {
            if (bookId) {
              void incrementNovelMinedCount(bookId, 1);
            }
            notify(`Kata "${word}" ditambahkan ke deck "${deckTitle}"`);
          }}
          onClosePanel={() => setOcrPanelOpen(false)}
        />
      )}

      {/* Bilah Navigasi & Slider Bawah (HUD Bottom Bar) */}
      {hudVisible && (
        <footer
          className="px-4 py-2.5 border-t z-20 flex flex-col gap-2"
          style={{
            background: "rgba(20, 20, 22, 0.94)",
            backdropFilter: "blur(10px)",
            borderColor: "rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                readingDirection === "rtl" ? goNext() : goPrev()
              }
              disabled={
                readingDirection === "rtl"
                  ? currentPage >= pageCount - 1
                  : currentPage <= 0
              }
              className="rounded-xl px-3 py-1.5 text-[12px] font-medium border hover:bg-white/10 disabled:opacity-35 transition shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}
            >
              {readingDirection === "rtl" ? "← Berikutnya" : "← Sebelumnya"}
            </button>

            <div className="flex-1 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={Math.max(0, pageCount - 1)}
                value={currentPage}
                dir={readingDirection}
                onChange={(e) => goToPage(Number(e.target.value))}
                aria-label="Slider navigasi halaman manga"
                className="w-full accent-[var(--ai)] cursor-pointer"
              />
            </div>

            <span className="text-[12.5px] font-mono font-semibold shrink-0 min-w-[76px] text-center">
              {pageLabel}
            </span>

            <button
              type="button"
              onClick={() =>
                readingDirection === "rtl" ? goPrev() : goNext()
              }
              disabled={
                readingDirection === "rtl"
                  ? currentPage <= 0
                  : currentPage >= pageCount - 1
              }
              className="rounded-xl px-3 py-1.5 text-[12px] font-medium border hover:bg-white/10 disabled:opacity-35 transition shrink-0"
              style={{ borderColor: "rgba(255,255,255,0.18)" }}
            >
              {readingDirection === "rtl" ? "Sebelumnya →" : "Berikutnya →"}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
            <span>
              {readingDirection === "rtl"
                ? "RTL: [←] / [Spasi] = Maju • [→] = Mundur • [B] = Mode Pilih Gelembung (OCR)"
                : "LTR: [→] / [Spasi] = Maju • [←] = Mundur • [B] = Mode Pilih Gelembung (OCR)"}
            </span>
            <span>
              Zoom: Roda Mouse / Pinch / Ketuk Ganda • [F] Layar Penuh
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
