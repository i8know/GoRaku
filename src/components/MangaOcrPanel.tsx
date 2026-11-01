import React, { useEffect, useState } from "react";
import {
  lookup,
  type LookupResultItem,
} from "../lib/dictionaryLookup";
import type { OcrCacheRecord } from "../lib/lexiconDb";
import type {
  NaturalPixelBox,
  OcrPreprocessOptions,
} from "../lib/mangaCoordinates";
import type {
  OcrLanguage,
  OcrModelVariant,
  OcrProgressInfo,
} from "../lib/ocr/ocrProvider";
import { splitBubbleIntoSentences } from "../lib/ocr/ocrProvider";
import {
  extractSentenceAround,
  type ExtractedSentence,
} from "../lib/sentenceExtractor";
import { speakJapanese } from "../lib/tts";
import { Icon } from "../ui";
import ReaderPopup from "./ReaderPopup";

export interface MangaOcrPanelProps {
  bookTitle: string;
  bookVolume?: string;
  pageIndex: number;
  pageFileName?: string;
  bbox: NaturalPixelBox | null;
  rawCropBlob: Blob | null;
  preprocessedBlob: Blob | null;
  ocrRunning: boolean;
  ocrProgress: OcrProgressInfo | null;
  ocrError: string | null;
  lang: OcrLanguage;
  modelVariant: OcrModelVariant;
  preprocessOpts: OcrPreprocessOptions;
  editedText: string;
  confirmedText: string;
  confidence?: number;
  elapsedMs?: number;
  cachedBubbles: OcrCacheRecord[];
  activeCacheId?: number;
  activeDictCount: number;
  onChangeEditedText: (text: string) => void;
  onConfirmText: (text: string) => void;
  onReOcr: (
    nextLang: OcrLanguage,
    nextVariant: OcrModelVariant,
    nextOpts: OcrPreprocessOptions,
  ) => void;
  onSelectCachedBubble: (entry: OcrCacheRecord) => void;
  onDeleteCachedBubble: (id: number) => void;
  onClearPageCache: () => void;
  onOpenDictManager: () => void;
  onCardMined: (word: string, deckTitle: string) => void;
  onClosePanel: () => void;
}

export default function MangaOcrPanel({
  bookTitle,
  bookVolume,
  pageIndex,
  pageFileName,
  bbox,
  rawCropBlob,
  preprocessedBlob,
  ocrRunning,
  ocrProgress,
  ocrError,
  lang,
  modelVariant,
  preprocessOpts,
  editedText,
  confirmedText,
  confidence,
  elapsedMs,
  cachedBubbles,
  activeCacheId,
  activeDictCount,
  onChangeEditedText,
  onConfirmText,
  onReOcr,
  onSelectCachedBubble,
  onDeleteCachedBubble,
  onClearPageCache,
  onOpenDictManager,
  onCardMined,
  onClosePanel,
}: MangaOcrPanelProps) {
  const [rawCropUrl, setRawCropUrl] = useState<string | null>(null);
  const [procCropUrl, setProcCropUrl] = useState<string | null>(null);
  const [showPreprocessedImg, setShowPreprocessedImg] = useState(false);

  // Pengaturan lokal untuk tombol "OCR Ulang"
  const [localLang, setLocalLang] = useState<OcrLanguage>(lang);
  const [localVariant, setLocalVariant] =
    useState<OcrModelVariant>(modelVariant);
  const [localOpts, setLocalOpts] =
    useState<OcrPreprocessOptions>(preprocessOpts);

  // State pencarian kata kamus & sorotan rentang karakter yang cocok
  const [highlightedRange, setHighlightedRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [popupState, setPopupState] = useState<{
    anchorRect: { x: number; y: number; bottom: number };
    matchedText: string;
    results: LookupResultItem[];
    extractedSentence: ExtractedSentence;
    candidateSentences?: Array<{
      label: string;
      sentenceHighlightedHtml: string;
    }>;
  } | null>(null);

  useEffect(() => {
    setLocalLang(lang);
  }, [lang]);

  useEffect(() => {
    setLocalVariant(modelVariant);
  }, [modelVariant]);

  useEffect(() => {
    setLocalOpts(preprocessOpts);
  }, [preprocessOpts]);

  useEffect(() => {
    setHighlightedRange(null);
    setPopupState(null);
  }, [confirmedText, pageIndex, bbox]);

  useEffect(() => {
    if (!rawCropBlob) {
      setRawCropUrl(null);
      return;
    }
    const url = URL.createObjectURL(rawCropBlob);
    setRawCropUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [rawCropBlob]);

  useEffect(() => {
    if (!preprocessedBlob) {
      setProcCropUrl(null);
      return;
    }
    const url = URL.createObjectURL(preprocessedBlob);
    setProcCropUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preprocessedBlob]);

  const clickableText = confirmedText.trim() || editedText.trim();
  const chars = Array.from(clickableText);

  const handleCharacterClick = async (
    charIdx: number,
    e: React.MouseEvent<HTMLSpanElement>,
  ) => {
    e.stopPropagation();
    const targetEl = e.currentTarget;
    const rect = targetEl.getBoundingClientRect();

    // Konversi indeks array codepoint (Array.from) ke indeks UTF-16 string untuk `lookup(text, startIndex)`
    const utf16Index = chars.slice(0, charIdx).join("").length;
    const lookupRes = await lookup(clickableText, utf16Index);

    const matchLen =
      lookupRes.matchLength > 0
        ? lookupRes.matchLength
        : (chars[charIdx]?.length ?? 1);
    const matchedText =
      lookupRes.matchedText ||
      clickableText.slice(utf16Index, utf16Index + matchLen);

    setHighlightedRange({
      start: utf16Index,
      end: utf16Index + matchLen,
    });

    const extractedSentence = extractSentenceAround(
      clickableText,
      utf16Index,
      matchLen,
    );

    const bubbleSentences = splitBubbleIntoSentences(clickableText);
    const candidateSentences: Array<{
      label: string;
      sentenceHighlightedHtml: string;
    }> = [];

    if (bubbleSentences.length > 1) {
      // 1. Kalimat spesifik tempat kata target berada
      candidateSentences.push({
        label: "Kalimat Target Saja",
        sentenceHighlightedHtml: extractedSentence.sentenceHighlightedHtml,
      });

      // 2. Seluruh teks dalam gelembung dengan kata target ditandai
      const fullBubbleHighlighted =
        clickableText.slice(0, utf16Index) +
        `<b>${matchedText}</b>` +
        clickableText.slice(utf16Index + matchLen);

      candidateSentences.push({
        label: "Seluruh Gelembung Dialog",
        sentenceHighlightedHtml: fullBubbleHighlighted,
      });

      // 3. Tiap kalimat individual lain yang ada di gelembung tersebut
      bubbleSentences.forEach((s, idx) => {
        if (s !== extractedSentence.sentence) {
          candidateSentences.push({
            label: `Kalimat ${idx + 1}: ${s.length > 16 ? s.slice(0, 16) + "…" : s}`,
            sentenceHighlightedHtml: s,
          });
        }
      });
    }

    setPopupState({
      anchorRect: {
        x: rect.left,
        y: rect.top,
        bottom: rect.bottom,
      },
      matchedText,
      results: lookupRes.items,
      extractedSentence,
      candidateSentences:
        candidateSentences.length > 1 ? candidateSentences : undefined,
    });
  };

  const chapterLabel = bookVolume
    ? `${bookVolume} • Hal. ${pageIndex + 1}${pageFileName ? ` (${pageFileName})` : ""}`
    : `Hal. ${pageIndex + 1}${pageFileName ? ` (${pageFileName})` : ""}`;

  return (
    <section
      aria-label="Panel Hasil OCR Gelembung Manga"
      className="border-t px-4 py-3.5 z-30 flex flex-col gap-3"
      style={{
        background: "#151518",
        borderColor: "rgba(255,255,255,0.14)",
        color: "#f4f1ea",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Baris Header Panel OCR + Daftar Cache Gelembung di Halaman Ini */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#c4543f] text-white">
            OCR Gelembung • Hal. {pageIndex + 1}
          </span>
          {bbox && (
            <span className="text-[11.5px] font-mono text-neutral-400">
              Kotak Asli: {bbox.w}×{bbox.h} px ({bbox.x}, {bbox.y})
            </span>
          )}
          {typeof confidence === "number" && (
            <span className="text-[11.5px] font-mono text-emerald-400">
              Keyakinan: {confidence}%
            </span>
          )}
          {typeof elapsedMs === "number" && (
            <span className="text-[11.5px] font-mono text-neutral-400">
              ({elapsedMs} ms)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {cachedBubbles.length > 0 && (
            <button
              type="button"
              onClick={onClearPageCache}
              className="rounded-lg px-2.5 py-1 text-[11.5px] border border-white/15 text-neutral-300 hover:bg-white/10 transition"
              title="Hapus seluruh cache OCR pada halaman ini"
            >
              Bersihkan Cache Hal. ({cachedBubbles.length})
            </button>
          )}
          <button
            type="button"
            onClick={onClosePanel}
            className="rounded-lg p-1.5 border border-white/15 hover:bg-white/10 transition"
            title="Tutup panel OCR"
            aria-label="Tutup panel OCR"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      </div>

      {/* Daftar Pil Cache Gelembung pada Halaman Ini */}
      {cachedBubbles.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] text-neutral-400 shrink-0 mr-1">
            Tersimpan di halaman ini:
          </span>
          {cachedBubbles.map((item, idx) => {
            const isSelected = activeCacheId === item.id;
            return (
              <div
                key={item.id ?? idx}
                className="inline-flex items-center rounded-lg border text-[11.5px] overflow-hidden shrink-0"
                style={{
                  borderColor: isSelected
                    ? "#c4543f"
                    : "rgba(255,255,255,0.16)",
                  background: isSelected
                    ? "rgba(196, 84, 63, 0.22)"
                    : "rgba(255,255,255,0.05)",
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectCachedBubble(item)}
                  className="px-2.5 py-1 truncate max-w-[180px] text-left hover:bg-white/5"
                  lang="ja"
                  title={item.text || "(Teks kosong)"}
                >
                  #{idx + 1}: {item.text || "(kosong)"}
                </button>
                {item.id !== undefined && (
                  <button
                    type="button"
                    onClick={() => onDeleteCachedBubble(item.id!)}
                    className="px-1.5 py-1 text-neutral-400 hover:text-red-400 border-l border-white/10"
                    title="Hapus cache gelembung ini"
                    aria-label={`Hapus gelembung ${idx + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Indikator Progress Unduhan / Inisialisasi / Pengenalan Tesseract */}
      {ocrRunning && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-amber-200">
              {ocrProgress?.status ?? "Menjalankan OCR pada gelembung..."}
            </span>
            <span className="font-mono text-amber-300">
              {Math.round((ocrProgress?.progress ?? 0) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-150"
              style={{
                width: `${Math.max(6, Math.round((ocrProgress?.progress ?? 0) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Pesan Error OCR (Panel tetap terbuka agar pengguna bisa mengetik manual) */}
      {ocrError && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2 text-[12px] text-red-200">
          {ocrError} — Anda tetap dapat mengetik atau memperbaiki teks secara
          manual di kotak bawah, atau menekan <strong>OCR Ulang</strong>.
        </div>
      )}

      {/* Tampilan Berdampingan: Kiri = Crop Gambar & Pengaturan OCR Ulang, Kanan = Editor & Teks Klik Kamus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Kolom Kiri (4 kolom): Gambar Crop Gelembung + Pengaturan OCR Ulang */}
        <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
          {/* Gambar Crop */}
          <div className="flex flex-col items-center justify-center bg-[#0d0d0f] rounded-lg border border-white/10 p-2 min-h-[130px] sm:w-44 lg:w-full shrink-0">
            {rawCropUrl || procCropUrl ? (
              <>
                <img
                  src={
                    showPreprocessedImg
                      ? (procCropUrl ?? rawCropUrl!)
                      : rawCropUrl!
                  }
                  alt="Hasil crop gelembung dialog"
                  className="max-h-40 w-auto object-contain rounded"
                />
                {procCropUrl && (
                  <button
                    type="button"
                    onClick={() => setShowPreprocessedImg((v) => !v)}
                    className="mt-1.5 text-[10.5px] text-neutral-400 underline hover:text-neutral-200"
                  >
                    {showPreprocessedImg
                      ? "Tampilkan Crop Asli"
                      : "Lihat Citra Pra-pemrosesan OCR"}
                  </button>
                )}
              </>
            ) : (
              <p className="text-[11.5px] text-neutral-400 text-center px-2">
                Seret kotak di atas gelembung dialog pada halaman manga, atau
                ketik manual di sebelah kanan.
              </p>
            )}
          </div>

          {/* Kontrol OCR Ulang (Bahasa jpn_vert/jpn, Varian Data, Pra-pemrosesan) */}
          <div className="flex-1 flex flex-col gap-2 text-[12px]">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">
                  Arah Teks OCR:
                </span>
                <select
                  value={localLang}
                  onChange={(e) => setLocalLang(e.target.value as OcrLanguage)}
                  className="rounded-lg border border-white/15 bg-[#1f1f24] px-2 py-1 text-[12px] text-white"
                >
                  <option value="jpn_vert">Vertikal (jpn_vert)</option>
                  <option value="jpn">Horizontal (jpn)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-neutral-400">
                  Data Bahasa:
                </span>
                <select
                  value={localVariant}
                  onChange={(e) =>
                    setLocalVariant(e.target.value as OcrModelVariant)
                  }
                  className="rounded-lg border border-white/15 bg-[#1f1f24] px-2 py-1 text-[12px] text-white"
                >
                  <option value="best">Best (Akurasi Tinggi)</option>
                  <option value="fast">Fast (Ringan)</option>
                </select>
              </label>
            </div>

            {/* Sakelar Pra-pemrosesan */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11.5px] text-neutral-300">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localOpts.grayscale}
                  onChange={(e) =>
                    setLocalOpts((o) => ({ ...o, grayscale: e.target.checked }))
                  }
                />
                <span>Grayscale</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localOpts.binarize}
                  onChange={(e) =>
                    setLocalOpts((o) => ({ ...o, binarize: e.target.checked }))
                  }
                />
                <span>Binarisasi (Hitam-Putih)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localOpts.upscaleIfSmall}
                  onChange={(e) =>
                    setLocalOpts((o) => ({
                      ...o,
                      upscaleIfSmall: e.target.checked,
                    }))
                  }
                />
                <span>Perbesar Otomatis</span>
              </label>
            </div>

            <button
              type="button"
              disabled={ocrRunning || !rawCropBlob}
              onClick={() => onReOcr(localLang, localVariant, localOpts)}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold bg-white/10 hover:bg-white/15 border border-white/15 disabled:opacity-40 transition"
            >
              <Icon name="refresh" size={14} /> OCR Ulang dengan Pengaturan Ini
            </button>
          </div>
        </div>

        {/* Kolom Kanan (7 kolom): Kotak Edit Teks + Teks Karakter Dapat Diklik */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* 1. Kotak Edit Teks OCR / Input Manual */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="manga-ocr-edit-textarea"
                className="text-[11.5px] font-semibold text-neutral-300"
              >
                1. Edit Teks Hasil OCR / Ketik Manual:
              </label>
              <div className="flex items-center gap-2">
                {editedText.trim() && (
                  <button
                    type="button"
                    onClick={() => speakJapanese(editedText)}
                    className="inline-flex items-center gap-1 text-[11.5px] text-neutral-300 hover:text-white px-2 py-0.5 rounded border border-white/10"
                    title="Dengarkan pengucapan teks gelembung"
                  >
                    <Icon name="volume" size={13} /> Dengarkan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onConfirmText(editedText)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[12px] font-semibold bg-[#c4543f] hover:opacity-95 text-white transition"
                >
                  <Icon name="check" size={14} /> Konfirmasi &amp; Simpan ke Cache
                </button>
              </div>
            </div>

            <textarea
              id="manga-ocr-edit-textarea"
              lang="ja"
              rows={2}
              value={editedText}
              onChange={(e) => onChangeEditedText(e.target.value)}
              placeholder="Hasil OCR akan muncul di sini. Anda juga dapat langsung mengetik atau mengoreksi teks bahasa Jepang di kotak ini..."
              className="w-full rounded-xl border border-white/15 bg-[#1b1b20] px-3 py-2 text-[15px] leading-relaxed text-white focus:outline-none focus:border-[#c4543f]"
            />
          </div>

          {/* 2. Area Teks Karakter Dapat Diklik -> Memanggil lookup(text, startIndex) & ReaderPopup */}
          <div className="rounded-xl border border-white/15 bg-[#1c1b18] p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] font-semibold text-amber-300">
                2. Klik Karakter/Kata di Bawah untuk Membuka Kamus Yomitan &amp;
                Tambah ke Deck:
              </span>
              <span className="text-[11px] text-neutral-400">
                Kamus aktif: {activeDictCount}
              </span>
            </div>

            {chars.length === 0 ? (
              <p className="text-[12.5px] text-neutral-400 py-2">
                Belum ada teks. Seret kotak pada gelembung dialog di halaman
                manga atau ketik teks di kotak atas.
              </p>
            ) : (
              <div
                lang="ja"
                className="flex flex-wrap items-baseline gap-y-1 text-[21px] font-medium leading-relaxed py-1 select-none"
              >
                {(() => {
                  let utf16Cursor = 0;
                  return chars.map((ch, idx) => {
                    const charStart = utf16Cursor;
                    const charEnd = charStart + ch.length;
                    utf16Cursor = charEnd;

                    const isHighlighted =
                      highlightedRange !== null &&
                      charStart >= highlightedRange.start &&
                      charEnd <= highlightedRange.end;

                    return (
                      <span
                        key={`${idx}-${ch}`}
                        onClick={(e) => void handleCharacterClick(idx, e)}
                        className="px-0.5 rounded cursor-pointer transition-colors hover:bg-[#c4543f]/40 hover:text-white"
                        style={{
                          background: isHighlighted
                            ? "#c4543f"
                            : "transparent",
                          color: isHighlighted ? "#ffffff" : "#f7f4ec",
                          borderBottom: isHighlighted
                            ? "2px solid #fbbf24"
                            : "1px dashed rgba(255,255,255,0.18)",
                        }}
                        title={`Klik untuk mencari kata mulai dari "${ch}"`}
                      >
                        {ch}
                      </span>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popup Kamus Yomitan & Sentence Mining yang Sama dengan Pembaca Novel */}
      {popupState && (
        <ReaderPopup
          anchorRect={popupState.anchorRect}
          matchedText={popupState.matchedText}
          results={popupState.results}
          extractedSentence={popupState.extractedSentence}
          bookTitle={bookTitle}
          chapterLabel={chapterLabel}
          activeDictCount={activeDictCount}
          bubbleImageBlob={rawCropBlob}
          candidateSentences={popupState.candidateSentences}
          onCardMined={(word, deckTitle) => {
            onCardMined(word, deckTitle);
          }}
          onOpenDictManager={onOpenDictManager}
          onClose={() => {
            setPopupState(null);
            setHighlightedRange(null);
          }}
        />
      )}
    </section>
  );
}

