import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DictionaryManagerModal from "../components/DictionaryManagerModal";
import ReaderPopup from "../components/ReaderPopup";
import {
  decodeTxtBytes,
  getNovelWithBlob,
  incrementNovelMinedCount,
  splitTxtIntoChapters,
  updateNovelProgress,
  type TxtChapter,
} from "../lib/bookStorage";
import { lookup, type LookupResultItem } from "../lib/dictionaryLookup";
import { isJapaneseChar } from "../lib/kana";
import {
  listDictionaries,
  type BookRecord,
  type DictionaryRecord,
} from "../lib/lexiconDb";
import {
  createDomRangeForCleanOffsets,
  extractSentenceAround,
  resolveClickCharacterPosition,
  type ExtractedSentence,
} from "../lib/sentenceExtractor";
import { Button, Icon } from "../ui";
import type {
  FoliateRelocateDetail,
  FoliateTocItem,
  View as FoliateViewElement,
} from "../vendor/foliate-js/view";

export type ReaderTheme = "light" | "sepia" | "dark";
export type ReaderFlow = "paginated" | "scrolled";
export type ReaderWritingMode = "auto" | "horizontal-tb" | "vertical-rl";

interface ActivePopupState {
  anchorRect: { x: number; y: number; bottom: number };
  matchedText: string;
  results: LookupResultItem[];
  extractedSentence: ExtractedSentence;
  rubyHint?: string;
  sourceDoc: Document;
}

const THEME_CONFIG: Record<
  ReaderTheme,
  { label: string; bg: string; surface: string; fg: string; muted: string; border: string }
> = {
  light: {
    label: "Terang",
    bg: "#F6F8FB",
    surface: "#FFFFFF",
    fg: "#141D2B",
    muted: "#5B677B",
    border: "#E3E9F2",
  },
  sepia: {
    label: "Sepia",
    bg: "#f4ecd8",
    surface: "#efe4c8",
    fg: "#2c241b",
    muted: "#6d5d4b",
    border: "#dccbb1",
  },
  dark: {
    label: "Gelap",
    bg: "#161618",
    surface: "#202024",
    fg: "#e6e4e0",
    muted: "#9a968e",
    border: "#2e2e34",
  },
};

function buildEpubStyles(
  theme: ReaderTheme,
  fontSize: number,
  writingMode: ReaderWritingMode,
  showFurigana: boolean,
): string {
  const palette = THEME_CONFIG[theme];
  const wmRule =
    writingMode === "auto"
      ? ""
      : `html, body { writing-mode: ${writingMode} !important; -webkit-writing-mode: ${writingMode} !important; }`;
  const rtRule = showFurigana ? "" : "rt { display: none !important; }";

  return `
    html, body {
      background: ${palette.bg} !important;
      color: ${palette.fg} !important;
      font-family: "Shippori Mincho", "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif !important;
      font-size: ${fontSize}px !important;
      line-height: 1.9 !important;
      cursor: text;
    }
    p {
      line-height: 1.9 !important;
    }
    a {
      color: inherit !important;
    }
    ruby > rt {
      font-size: 0.55em !important;
      color: ${palette.muted} !important;
      user-select: none;
    }
    ::selection {
      background: rgba(38, 72, 122, 0.22) !important;
      text-decoration: underline;
      text-decoration-color: #26487A;
    }
    ${wmRule}
    ${rtRule}
  `;
}

export default function ReaderPage({
  notify,
}: {
  notify: (m: string) => void;
}) {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<BookRecord | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preferensi Pembaca (disimpan di localStorage)
  const [theme, setTheme] = useState<ReaderTheme>(
    () => (localStorage.getItem("ma-reader-theme") as ReaderTheme) || "light",
  );
  const [fontSize, setFontSize] = useState<number>(
    () => Number(localStorage.getItem("ma-reader-fontsize")) || 19,
  );
  const [flow, setFlow] = useState<ReaderFlow>(
    () => (localStorage.getItem("ma-reader-flow") as ReaderFlow) || "paginated",
  );
  const [writingMode, setWritingMode] = useState<ReaderWritingMode>("auto");
  const [showFurigana, setShowFurigana] = useState(true);

  // Navigasi & TOC
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);

  const [tocItems, setTocItems] = useState<FoliateTocItem[]>([]);
  const [currentChapterLabel, setCurrentChapterLabel] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // State Popup Kamus & Sentence Mining (Tahap 4)
  const [popupState, setPopupState] = useState<ActivePopupState | null>(null);

  // Khusus TXT
  const [txtChapters, setTxtChapters] = useState<TxtChapter[]>([]);
  const [txtChapterIndex, setTxtChapterIndex] = useState<number>(0);
  const [txtPageIndex, setTxtPageIndex] = useState<number>(0);
  const txtContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingTxtScrollRatioRef = useRef<number | null>(null);

  // Khusus EPUB (foliate-js)
  const epubHostRef = useRef<HTMLDivElement | null>(null);
  const foliateViewRef = useRef<FoliateViewElement | null>(null);

  useEffect(() => {
    localStorage.setItem("ma-reader-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("ma-reader-fontsize", String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("ma-reader-flow", flow);
  }, [flow]);

  useEffect(() => {
    void listDictionaries().then(setDictionaries).catch(() => {});
  }, []);

  const clearPopupAndSelection = useCallback(() => {
    setPopupState((prev) => {
      if (prev?.sourceDoc) {
        try {
          prev.sourceDoc.defaultView?.getSelection()?.removeAllRanges();
        } catch {
          // Abaikan
        }
      }
      return null;
    });
  }, []);

  /**
   * Handler utama saat pengguna mengeklik/mengetuk kata di dokumen novel
   * (berlaku baik untuk iframe dokumen section foliate-js maupun kontainer TXT).
   */
  const handleDocumentClick = useCallback(
    async (doc: Document, clientX: number, clientY: number) => {
      // Abaikan jika klik berasal dari tautan <a href>
      const rawSelection = doc.defaultView?.getSelection();
      if (
        rawSelection &&
        !rawSelection.isCollapsed &&
        rawSelection.toString().trim().length > 1
      ) {
        // Jika pengguna sedang menyeleksi teks manual secara drag, jangan timpa kecuali klik biasa
      }

      const resolved = resolveClickCharacterPosition(doc, clientX, clientY);
      if (!resolved) {
        clearPopupAndSelection();
        return;
      }

      const { cleanText, charIndex, rubyHints, nodeOffsets } = resolved;
      const clickedChar = cleanText[charIndex] ?? "";
      if (!isJapaneseChar(clickedChar)) {
        clearPopupAndSelection();
        return;
      }

      const lookupOut = await lookup(cleanText, charIndex);
      const matchLen =
        lookupOut.matchedLength > 0 ? lookupOut.matchedLength : 1;
      const matchedText =
        lookupOut.matchedText || cleanText.slice(charIndex, charIndex + 1);

      // Cari apakah ada petunjuk furigana <ruby><rt> pada rentang kata yang cocok
      const matchingRubyHints = rubyHints.filter(
        (h) =>
          h.startOffset < charIndex + matchLen && h.endOffset > charIndex,
      );
      const rubyHintStr =
        matchingRubyHints.length > 0
          ? matchingRubyHints.map((h) => `${h.base}[${h.reading}]`).join(" ")
          : undefined;

      // Sorot (highlight) rentang kata yang cocok pada DOM dokumen
      const domRange = createDomRangeForCleanOffsets(
        doc,
        nodeOffsets,
        charIndex,
        charIndex + matchLen,
      );

      const frameEl = doc.defaultView?.frameElement as Element | null;
      const frameRect = frameEl
        ? frameEl.getBoundingClientRect()
        : { left: 0, top: 0 };

      let anchorX = frameRect.left + clientX;
      let anchorY = frameRect.top + clientY;
      let anchorBottom = anchorY + 22;

      if (domRange) {
        try {
          const sel = doc.defaultView?.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(domRange);

          const rangeRect = domRange.getBoundingClientRect();
          if (rangeRect.width > 0 || rangeRect.height > 0) {
            anchorX = frameRect.left + rangeRect.left;
            anchorY = frameRect.top + rangeRect.top;
            anchorBottom = frameRect.top + rangeRect.bottom;
          }
        } catch {
          // Gunakan koordinat klik sebagai fallback
        }
      }

      // Ekstrak kalimat sumber di sekitar kata yang diklik
      const extractedSentence = extractSentenceAround(
        cleanText,
        charIndex,
        matchLen,
      );

      setPopupState({
        anchorRect: {
          x: anchorX,
          y: anchorY,
          bottom: anchorBottom,
        },
        matchedText,
        results: lookupOut.results,
        extractedSentence,
        rubyHint: rubyHintStr,
        sourceDoc: doc,
      });
    },
    [clearPopupAndSelection],
  );

  // 1. Muat data novel dari IndexedDB
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    void (async () => {
      try {
        const data = await getNovelWithBlob(bookId);
        if (cancelled) return;
        if (!data) {
          setErrorMsg("Novel tidak ditemukan di Perpustakaan.");
          setLoading(false);
          return;
        }
        setBook(data.book);
        setBlob(data.blob);
        setProgressPercent(data.book.progress ?? 0);

        if (data.book.format === "txt") {
          const buffer = await data.blob.arrayBuffer();
          if (cancelled) return;
          const { text } = decodeTxtBytes(new Uint8Array(buffer));
          const chapters = splitTxtIntoChapters(text, data.book.title);
          setTxtChapters(chapters);
          setTocItems(
            chapters.map((ch) => ({
              label: ch.title,
              href: `txt:${ch.index}`,
            })),
          );

          // Pulihkan posisi baca TXT ("ch:N:scroll:F")
          let initialCh = 0;
          let initialScroll = 0;
          if (data.book.lastLocation?.startsWith("ch:")) {
            const parts = data.book.lastLocation.split(":");
            initialCh = Math.max(
              0,
              Math.min(chapters.length - 1, Number(parts[1]) || 0),
            );
            initialScroll = Number(parts[3]) || 0;
          }
          setTxtChapterIndex(initialCh);
          setCurrentChapterLabel(chapters[initialCh]?.title ?? data.book.title);
          pendingTxtScrollRatioRef.current = initialScroll;
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error ? err.message : "Gagal memuat berkas novel.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // 2. Inisialisasi Pembaca EPUB dengan foliate-js
  useEffect(() => {
    if (!book || !blob || book.format !== "epub" || !epubHostRef.current) return;

    let destroyed = false;
    let viewEl: FoliateViewElement | null = null;

    void (async () => {
      try {
        await import("../vendor/foliate-js/view.js");
        if (destroyed || !epubHostRef.current) return;

        epubHostRef.current.innerHTML = "";
        viewEl = document.createElement("foliate-view") as FoliateViewElement;
        viewEl.style.width = "100%";
        viewEl.style.height = "100%";
        viewEl.style.display = "block";
        epubHostRef.current.appendChild(viewEl);
        foliateViewRef.current = viewEl;

        const epubFile = new File([blob], `${book.title}.epub`, {
          type: "application/epub+zip",
        });

        await viewEl.open(epubFile);
        if (destroyed) return;

        setTocItems(viewEl.book.toc ?? []);

        if (viewEl.renderer) {
          viewEl.renderer.setAttribute("flow", flow);
          viewEl.renderer.setStyles?.(
            buildEpubStyles(theme, fontSize, writingMode, showFurigana),
          );
        }

        viewEl.addEventListener("load", ((
          e: CustomEvent<{ doc: Document; index: number }>,
        ) => {
          const { doc } = e.detail;
          viewEl?.renderer?.setStyles?.(
            buildEpubStyles(theme, fontSize, writingMode, showFurigana),
          );
          doc.addEventListener("click", (ev: MouseEvent) => {
            const targetEl = ev.target as Element | null;
            if (targetEl?.closest?.("a[href]")) return;
            void handleDocumentClick(doc, ev.clientX, ev.clientY);
          });
        }) as EventListener);

        viewEl.addEventListener("relocate", ((
          e: CustomEvent<FoliateRelocateDetail>,
        ) => {
          const detail = e.detail;
          const pct =
            typeof detail.fraction === "number"
              ? Math.round(detail.fraction * 100)
              : book.progress;
          setProgressPercent(pct);
          if (detail.tocItem?.label) {
            setCurrentChapterLabel(detail.tocItem.label);
          }
          if (detail.cfi && book.id) {
            void updateNovelProgress(book.id, detail.cfi, pct);
          }
        }) as EventListener);

        await viewEl.init({
          lastLocation: book.lastLocation,
          showTextStart: !book.lastLocation,
        });
        setLoading(false);
      } catch (err) {
        if (!destroyed) {
          setErrorMsg(
            err instanceof Error
              ? `Gagal merender EPUB: ${err.message}`
              : "Gagal merender berkas EPUB.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      destroyed = true;
      try {
        viewEl?.close();
        viewEl?.remove();
      } catch {
        // Abaikan
      }
      foliateViewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id, blob]);

  // Perbarui gaya & mode aliran EPUB saat preferensi berubah tanpa memuat ulang buku
  useEffect(() => {
    const view = foliateViewRef.current;
    if (!view || !view.renderer) return;
    view.renderer.setAttribute("flow", flow);
    view.renderer.setStyles?.(
      buildEpubStyles(theme, fontSize, writingMode, showFurigana),
    );
  }, [theme, fontSize, flow, writingMode, showFurigana]);

  // Pulihkan posisi scroll TXT setelah bab dimuat
  useEffect(() => {
    if (book?.format !== "txt" || !txtContainerRef.current) return;
    const el = txtContainerRef.current;
    const ratio = pendingTxtScrollRatioRef.current;
    if (ratio != null && ratio > 0) {
      requestAnimationFrame(() => {
        const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
        el.scrollTop = Math.round(maxScroll * ratio);
        pendingTxtScrollRatioRef.current = null;
      });
    } else {
      el.scrollTop = 0;
    }
  }, [book?.format, txtChapterIndex, txtChapters.length]);

  const saveTxtPosition = useCallback(
    (chIdx: number, scrollRatio: number) => {
      if (!book || txtChapters.length === 0) return;
      const clampedRatio = Math.max(0, Math.min(1, scrollRatio));
      const overallFraction =
        (chIdx + clampedRatio) / Math.max(1, txtChapters.length);
      const pct = Math.round(overallFraction * 100);
      setProgressPercent(pct);
      const loc = `ch:${chIdx}:scroll:${clampedRatio.toFixed(4)}`;
      void updateNovelProgress(book.id, loc, pct);
    },
    [book, txtChapters.length],
  );

  const handleTxtScroll = () => {
    const el = txtContainerRef.current;
    if (!el || book?.format !== "txt") return;
    const maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
    const ratio = el.scrollTop / maxScroll;
    saveTxtPosition(txtChapterIndex, ratio);
  };

  const TXT_PARAGRAPHS_PER_PAGE = 14;
  const activeTxtChapter = txtChapters[txtChapterIndex];
  const totalTxtPagesInChapter = activeTxtChapter
    ? Math.max(
        1,
        Math.ceil(activeTxtChapter.paragraphs.length / TXT_PARAGRAPHS_PER_PAGE),
      )
    : 1;

  const handlePrev = () => {
    clearPopupAndSelection();
    if (book?.format === "epub") {
      void foliateViewRef.current?.goLeft();
      return;
    }
    if (flow === "paginated") {
      if (txtPageIndex > 0) {
        const nextP = txtPageIndex - 1;
        setTxtPageIndex(nextP);
        saveTxtPosition(txtChapterIndex, nextP / totalTxtPagesInChapter);
        txtContainerRef.current?.scrollTo({ top: 0 });
        return;
      }
    }
    if (txtChapterIndex > 0) {
      const prevCh = txtChapterIndex - 1;
      setTxtChapterIndex(prevCh);
      setTxtPageIndex(0);
      setCurrentChapterLabel(txtChapters[prevCh]?.title ?? "");
      saveTxtPosition(prevCh, 0);
    }
  };

  const handleNext = () => {
    clearPopupAndSelection();
    if (book?.format === "epub") {
      void foliateViewRef.current?.goRight();
      return;
    }
    if (flow === "paginated") {
      if (txtPageIndex < totalTxtPagesInChapter - 1) {
        const nextP = txtPageIndex + 1;
        setTxtPageIndex(nextP);
        saveTxtPosition(txtChapterIndex, (nextP + 1) / totalTxtPagesInChapter);
        txtContainerRef.current?.scrollTo({ top: 0 });
        return;
      }
    }
    if (txtChapterIndex < txtChapters.length - 1) {
      const nextCh = txtChapterIndex + 1;
      setTxtChapterIndex(nextCh);
      setTxtPageIndex(0);
      setCurrentChapterLabel(txtChapters[nextCh]?.title ?? "");
      saveTxtPosition(nextCh, 0);
    }
  };

  const handleSelectToc = (item: FoliateTocItem) => {
    setTocOpen(false);
    clearPopupAndSelection();
    if (book?.format === "epub") {
      void foliateViewRef.current?.goTo(item.href);
      setCurrentChapterLabel(item.label);
      return;
    }
    if (item.href.startsWith("txt:")) {
      const idx = Number(item.href.slice(4)) || 0;
      setTxtChapterIndex(idx);
      setTxtPageIndex(0);
      setCurrentChapterLabel(txtChapters[idx]?.title ?? item.label);
      saveTxtPosition(idx, 0);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const [sessionMinedCount, setSessionMinedCount] = useState(0);

  const handleCardMined = (word: string, deckTitle: string) => {
    setSessionMinedCount((c) => c + 1);
    if (book?.id) {
      void incrementNovelMinedCount(book.id, 1);
      setBook((prev) =>
        prev ? { ...prev, minedCount: (prev.minedCount ?? 0) + 1 } : prev,
      );
    }
    notify(`"${word}" berhasil ditambahkan ke deck ${deckTitle}`);
  };

  const palette = THEME_CONFIG[theme];
  const activeDictCount = dictionaries.filter((d) => d.enabled).length;

  const visibleTxtParagraphs =
    activeTxtChapter && flow === "paginated"
      ? activeTxtChapter.paragraphs.slice(
          txtPageIndex * TXT_PARAGRAPHS_PER_PAGE,
          (txtPageIndex + 1) * TXT_PARAGRAPHS_PER_PAGE,
        )
      : (activeTxtChapter?.paragraphs ?? []);

  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden shadow-lg"
      style={{
        height: "calc(100vh - 108px)",
        minHeight: "560px",
        background: palette.bg,
        color: palette.fg,
        borderColor: palette.border,
      }}
    >
      {/* Top Reader Toolbar */}
      <header
        className="px-4 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap shrink-0"
        style={{
          background: palette.surface,
          borderColor: palette.border,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/library")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12.5px] font-medium cursor-pointer"
            style={{
              borderColor: palette.border,
              color: palette.fg,
              background: palette.bg,
            }}
          >
            <Icon name="arrow-left" size={15} /> Perpustakaan
          </button>

          <button
            type="button"
            onClick={() => {
              setTocOpen((v) => !v);
              setSettingsOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12.5px] font-medium cursor-pointer"
            style={{
              borderColor: palette.border,
              color: palette.fg,
              background: tocOpen ? "rgba(194, 78, 52, 0.14)" : palette.bg,
            }}
          >
            <Icon name="list" size={15} /> Daftar Isi ({tocItems.length})
          </button>

          <div className="min-w-0 hidden md:block pl-1">
            <div className="text-[13.5px] font-semibold truncate max-w-xs lg:max-w-md">
              {book?.title ?? "Memuat..."}
            </div>
            <div
              className="text-[11px] truncate max-w-xs lg:max-w-md"
              style={{ color: palette.muted }}
            >
              {currentChapterLabel || book?.author}
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-lg"
            style={{
              background: palette.bg,
              color: palette.muted,
            }}
            title="Klik kata bahasa Jepang di dalam teks untuk melihat kamus dan menambang kalimat"
          >
            <Icon name="mine" size={13} /> {book?.minedCount ?? 0} ditambang
            {sessionMinedCount > 0 && (
              <strong
                className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] text-white"
                style={{ background: "var(--ai)" }}
              >
                +{sessionMinedCount} sesi ini
              </strong>
            )}
          </span>

          <button
            type="button"
            onClick={() => setDictModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-medium cursor-pointer"
            style={{
              borderColor: palette.border,
              color: palette.fg,
              background: palette.bg,
            }}
            title="Kelola Kamus Yomitan"
          >
            <Icon name="book" size={14} /> Kamus ({activeDictCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setSettingsOpen((v) => !v);
              setTocOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-medium cursor-pointer"
            style={{
              borderColor: palette.border,
              color: palette.fg,
              background: settingsOpen ? "rgba(194, 78, 52, 0.14)" : palette.bg,
            }}
          >
            <Icon name="settings" size={14} /> Tampilan
          </button>
        </div>
      </header>

      {/* Body Area with optional TOC / Settings Drawers */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Drawer Daftar Isi (TOC) */}
        {tocOpen && (
          <aside
            className="w-72 border-r overflow-y-auto p-4 z-20 shrink-0"
            style={{
              background: palette.surface,
              borderColor: palette.border,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13.5px] font-semibold">Daftar Isi</h3>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                className="p-1 rounded"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            {tocItems.length === 0 ? (
              <p className="text-[12px]" style={{ color: palette.muted }}>
                Buku ini tidak memiliki daftar isi terstruktur.
              </p>
            ) : (
              <ul className="space-y-1 text-[12.5px]">
                {tocItems.map((item, i) => (
                  <li key={`${item.href}-${i}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectToc(item)}
                      className="w-full text-left px-2.5 py-2 rounded-lg transition-colors hover:bg-black/5 truncate cursor-pointer"
                      style={{
                        fontWeight:
                          currentChapterLabel === item.label ? 600 : 400,
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}

        {/* Panel Pengaturan Tampilan Pembaca */}
        {settingsOpen && (
          <div
            className="absolute right-4 top-3 z-30 w-80 rounded-2xl border p-4 shadow-xl space-y-4 text-[12.5px]"
            style={{
              background: palette.surface,
              borderColor: palette.border,
              color: palette.fg,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[13.5px]">
                Pengaturan Pembaca
              </span>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-1"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            {/* Tema */}
            <div>
              <div className="mb-1.5 font-medium">Tema Warna</div>
              <div className="grid grid-cols-3 gap-2">
                {(["light", "sepia", "dark"] as ReaderTheme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className="py-1.5 px-2 rounded-lg border text-center font-medium cursor-pointer"
                    style={{
                      background: THEME_CONFIG[t].bg,
                      color: THEME_CONFIG[t].fg,
                      borderColor:
                        theme === t ? "var(--ai)" : THEME_CONFIG[t].border,
                      boxShadow:
                        theme === t ? "0 0 0 2px rgba(38,72,122,0.28)" : "none",
                    }}
                  >
                    {THEME_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ukuran Huruf */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium">Ukuran Huruf</span>
                <span className="font-mono">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.max(14, s - 1))}
                  className="px-3 py-1 rounded-lg border font-semibold cursor-pointer"
                  style={{ borderColor: palette.border }}
                >
                  A-
                </button>
                <input
                  type="range"
                  min={14}
                  max={28}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(28, s + 1))}
                  className="px-3 py-1 rounded-lg border font-semibold cursor-pointer"
                  style={{ borderColor: palette.border }}
                >
                  A+
                </button>
              </div>
            </div>

            {/* Mode Aliran: Halaman vs Gulir */}
            <div>
              <div className="mb-1.5 font-medium">Mode Baca</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFlow("paginated")}
                  className="py-1.5 px-2.5 rounded-lg border font-medium cursor-pointer"
                  style={{
                    borderColor:
                      flow === "paginated" ? "var(--ai)" : palette.border,
                    background:
                      flow === "paginated"
                        ? "rgba(38, 72, 122, 0.12)"
                        : palette.bg,
                  }}
                >
                  Per Halaman
                </button>
                <button
                  type="button"
                  onClick={() => setFlow("scrolled")}
                  className="py-1.5 px-2.5 rounded-lg border font-medium cursor-pointer"
                  style={{
                    borderColor:
                      flow === "scrolled" ? "var(--ai)" : palette.border,
                    background:
                      flow === "scrolled"
                        ? "rgba(38, 72, 122, 0.12)"
                        : palette.bg,
                  }}
                >
                  Gulir (Scroll)
                </button>
              </div>
            </div>

            {/* Arah Teks (Horizontal vs Tategaki Vertikal) */}
            <div>
              <div className="mb-1.5 font-medium">
                Arah Teks (Uji Yokogaki / Tategaki)
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[11.5px]">
                {(
                  [
                    { id: "auto", label: "Otomatis" },
                    { id: "horizontal-tb", label: "Horizontal" },
                    { id: "vertical-rl", label: "Vertikal" },
                  ] as const
                ).map((wm) => (
                  <button
                    key={wm.id}
                    type="button"
                    onClick={() => setWritingMode(wm.id)}
                    className="py-1.5 px-2 rounded-lg border font-medium cursor-pointer"
                    style={{
                      borderColor:
                        writingMode === wm.id ? "var(--ai)" : palette.border,
                      background:
                        writingMode === wm.id
                          ? "rgba(38, 72, 122, 0.12)"
                          : palette.bg,
                    }}
                  >
                    {wm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Furigana */}
            <label className="flex items-center justify-between pt-1 cursor-pointer select-none">
              <span className="font-medium">
                Tampilkan Furigana (<code>&lt;ruby&gt;</code>)
              </span>
              <input
                type="checkbox"
                checked={showFurigana}
                onChange={(e) => setShowFurigana(e.target.checked)}
                className="w-4 h-4 rounded"
              />
            </label>
          </div>
        )}

        {/* Konten Utama Pembaca */}
        <div className="flex-1 h-full relative overflow-hidden flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-[14px]">
              Memuat isi novel...
            </div>
          )}

          {errorMsg && (
            <div className="p-8 text-center space-y-3">
              <div className="text-[15px] font-semibold text-red-700">
                {errorMsg}
              </div>
              <Button
                className="outline-button"
                onClick={() => navigate("/library")}
              >
                Kembali ke Perpustakaan
              </Button>
            </div>
          )}

          {/* Kontainer EPUB (foliate-js) */}
          {book?.format === "epub" && (
            <div ref={epubHostRef} className="w-full flex-1 overflow-hidden" />
          )}

          {/* Kontainer TXT */}
          {book?.format === "txt" && !loading && !errorMsg && (
            <div
              ref={txtContainerRef}
              onScroll={flow === "scrolled" ? handleTxtScroll : undefined}
              onClick={(e) => {
                const doc = e.currentTarget.ownerDocument;
                if (doc) {
                  void handleDocumentClick(doc, e.clientX, e.clientY);
                }
              }}
              className={`flex-1 overflow-auto px-6 sm:px-12 py-8 mx-auto w-full cursor-text ${
                writingMode === "vertical-rl" ? "max-w-none" : "max-w-3xl"
              } ${!showFurigana ? "hide-rt" : ""}`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: 1.95,
                fontFamily:
                  '"Shippori Mincho", "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif',
                writingMode:
                  writingMode === "vertical-rl"
                    ? "vertical-rl"
                    : "horizontal-tb",
              }}
              lang="ja"
            >
              <style>{`
                .hide-rt ruby rt { display: none !important; }
                .txt-reader-content ruby rt {
                  font-size: 0.55em;
                  color: ${palette.muted};
                  user-select: none;
                }
                .txt-reader-content p {
                  margin-bottom: 1.15em;
                  text-align: justify;
                }
                .txt-reader-content ::selection {
                  background: rgba(38, 72, 122, 0.22);
                  text-decoration: underline;
                  text-decoration-color: #26487A;
                }
              `}</style>
              <div className="txt-reader-content">
                {activeTxtChapter && (
                  <h2
                    className="font-bold mb-6 pb-2 border-b"
                    style={{
                      fontSize: `${Math.round(fontSize * 1.2)}px`,
                      borderColor: palette.border,
                    }}
                  >
                    {activeTxtChapter.title}
                  </h2>
                )}
                {visibleTxtParagraphs.map((paraHtml, idx) => (
                  <p
                    key={idx}
                    dangerouslySetInnerHTML={{ __html: paraHtml }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigasi Halaman/Bab & Progres */}
      <footer
        className="px-4 py-2.5 border-t flex items-center justify-between gap-4 shrink-0 text-[12px]"
        style={{
          background: palette.surface,
          borderColor: palette.border,
          color: palette.muted,
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium cursor-pointer"
          style={{
            borderColor: palette.border,
            color: palette.fg,
            background: palette.bg,
          }}
        >
          ← Sebelumnya
        </button>

        <div className="flex items-center gap-3 flex-1 max-w-md">
          <span className="truncate hidden sm:inline">
            {currentChapterLabel || book?.title}
          </span>
          {book?.format === "txt" && flow === "paginated" && (
            <span className="font-mono shrink-0">
              Hal {txtPageIndex + 1}/{totalTxtPagesInChapter}
            </span>
          )}
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: palette.border }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background: "var(--ai)",
              }}
            />
          </div>
          <span
            className="font-mono font-semibold shrink-0"
            style={{ color: palette.fg }}
          >
            {progressPercent}%
          </span>
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-medium cursor-pointer"
          style={{
            borderColor: palette.border,
            color: palette.fg,
            background: palette.bg,
          }}
        >
          Berikutnya →
        </button>
      </footer>

      {/* Popup Kamus & Sentence Mining (Tahap 4) */}
      {popupState && book && (
        <ReaderPopup
          anchorRect={popupState.anchorRect}
          matchedText={popupState.matchedText}
          results={popupState.results}
          extractedSentence={popupState.extractedSentence}
          rubyHint={popupState.rubyHint}
          bookTitle={book.title}
          chapterLabel={currentChapterLabel || book.title}
          activeDictCount={activeDictCount}
          onCardMined={handleCardMined}
          onOpenDictManager={() => setDictModalOpen(true)}
          onClose={clearPopupAndSelection}
        />
      )}

      <DictionaryManagerModal
        open={dictModalOpen}
        onClose={() => setDictModalOpen(false)}
        onDictionariesChanged={setDictionaries}
      />
    </div>
  );
}
