import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addMinedCardToDeck,
  buildCardDuplicateKey,
  getDeckDuplicateKeys,
} from "../lib/deckCards";
import type { LookupResultItem } from "../lib/dictionaryLookup";
import type { ExtractedSentence } from "../lib/sentenceExtractor";
import { speakJapanese } from "../lib/tts";
import { useAppStore } from "../store/useAppStore";
import { Icon } from "../ui";

const LAST_DECK_STORAGE_KEY = "ma-mining-last-deck-id";

export interface ReaderPopupProps {
  /** Koordinat klik pada viewport utama (window) */
  anchorRect: { x: number; y: number; bottom: number };
  /** Substring teks asli yang cocok */
  matchedText: string;
  /** Daftar hasil pencarian kamus yang sudah dikelompokkan per (expression, reading) */
  results: LookupResultItem[];
  /** Kalimat sumber yang diekstrak di sekitar kata klik */
  extractedSentence: ExtractedSentence;
  /** Petunjuk bacaan furigana dari tag <ruby><rt> pada teks novel (jika ada) */
  rubyHint?: string;
  /** Judul buku sumber */
  bookTitle: string;
  /** Bab / bagian sumber */
  chapterLabel: string;
  /** Jumlah kamus aktif saat ini */
  activeDictCount: number;
  /** Gambar hasil crop gelembung manga (opsional, untuk sentence mining manga) */
  bubbleImageBlob?: Blob | null;
  /** Daftar kandidat kalimat bila gelembung manga memuat lebih dari satu kalimat */
  candidateSentences?: Array<{
    label: string;
    sentenceHighlightedHtml: string;
  }>;
  /** Callback saat kartu berhasil ditambahkan ke deck */
  onCardMined: (word: string, deckTitle: string) => void;
  /** Callback untuk membuka modal Kelola Kamus jika belum ada kamus */
  onOpenDictManager: () => void;
  /** Callback tutup popup */
  onClose: () => void;
}

function formatDefaultMeaning(item: LookupResultItem): string {
  const lines: string[] = [];
  for (const sense of item.senses) {
    const joined = sense.glossary.slice(0, 4).join("; ");
    if (joined && !lines.includes(joined)) {
      lines.push(joined);
    }
  }
  return lines.slice(0, 3).join(" / ");
}

export default function ReaderPopup({
  anchorRect,
  matchedText,
  results,
  extractedSentence,
  rubyHint,
  bookTitle,
  chapterLabel,
  activeDictCount,
  bubbleImageBlob,
  candidateSentences,
  onCardMined,
  onOpenDictManager,
  onClose,
}: ReaderPopupProps) {
  const decks = useAppStore((s) => s.decks);
  const addMinedCardToQueue = useAppStore((s) => s.addMinedCard);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeItem: LookupResultItem | undefined = results[selectedIndex] ?? results[0];

  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => {
    const saved = localStorage.getItem(LAST_DECK_STORAGE_KEY);
    if (saved && decks.some((d) => d.id === saved)) return saved;
    return decks[0]?.id ?? "1";
  });

  // State daftar kunci duplikat (expression::reading) pada deck terpilih
  const [duplicateKeys, setDuplicateKeys] = useState<Set<string>>(new Set());
  // Kunci yang baru saja ditambahkan pada sesi popup ini
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // State lipatan per kamus (default terbuka semua)
  const [collapsedDicts, setCollapsedDicts] = useState<Record<number, boolean>>(
    {},
  );

  // State edit kalimat & arti sebelum disimpan
  const [editingFields, setEditingFields] = useState(false);
  const [customMeaning, setCustomMeaning] = useState("");
  const [customSentenceHtml, setCustomSentenceHtml] = useState(
    extractedSentence.sentenceHighlightedHtml,
  );
  const [selectedCandidateIdx, setSelectedCandidateIdx] = useState(0);
  const [includeBubbleImage, setIncludeBubbleImage] = useState(true);
  const [bubblePreviewUrl, setBubblePreviewUrl] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState(
    chapterLabel && chapterLabel !== bookTitle
      ? `${bookTitle} • ${chapterLabel}`
      : bookTitle,
  );

  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!bubbleImageBlob) {
      setBubblePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(bubbleImageBlob);
    setBubblePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bubbleImageBlob]);

  // Sinkronkan arti default saat pengguna berpindah tab entri hasil kamus
  useEffect(() => {
    if (activeItem) {
      setCustomMeaning(formatDefaultMeaning(activeItem));
    }
  }, [activeItem]);

  useEffect(() => {
    setCustomSentenceHtml(extractedSentence.sentenceHighlightedHtml);
    setSelectedCandidateIdx(0);
  }, [extractedSentence.sentenceHighlightedHtml]);

  useEffect(() => {
    if (selectedDeckId) {
      localStorage.setItem(LAST_DECK_STORAGE_KEY, selectedDeckId);
      void getDeckDuplicateKeys(selectedDeckId)
        .then(setDuplicateKeys)
        .catch(() => setDuplicateKeys(new Set()));
    }
  }, [selectedDeckId]);

  // Tutup dengan tombol Escape atau klik di luar popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const handlePointerDown = (e: MouseEvent) => {
      if (
        popupRef.current &&
        e.target instanceof Node &&
        !popupRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Gunakan timeout singkat agar event klik pembuka tidak langsung menutup popup
    const timer = window.setTimeout(() => {
      window.addEventListener("mousedown", handlePointerDown);
    }, 30);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose]);

  const currentKey = activeItem
    ? buildCardDuplicateKey(activeItem.expression, activeItem.reading)
    : "";
  const isJustAdded = currentKey ? addedKeys.has(currentKey) : false;
  const isAlreadyInDeck =
    currentKey && !isJustAdded ? duplicateKeys.has(currentKey) : false;

  const handleAddToDeck = async () => {
    if (!activeItem || !selectedDeckId || saving) return;
    setSaving(true);
    try {
      const targetDeck =
        decks.find((d) => d.id === selectedDeckId) ?? decks[0];
      const deckTitle = targetDeck?.title ?? "Deck";

      const finalMeaning =
        customMeaning.trim() || formatDefaultMeaning(activeItem);
      const finalSentence =
        customSentenceHtml.trim() || extractedSentence.sentenceHighlightedHtml;
      const sourceLabel =
        customNote.trim() ||
        (chapterLabel && chapterLabel !== bookTitle
          ? `${bookTitle} • ${chapterLabel}`
          : bookTitle);

      await addMinedCardToDeck(selectedDeckId, {
        word: activeItem.expression,
        reading: activeItem.reading,
        meaning: finalMeaning,
        sentence: finalSentence,
        translation: `Sumber: ${sourceLabel}`,
        subdeck: bookTitle,
        tags: ["mined", bookTitle],
        imageBlob:
          includeBubbleImage && bubbleImageBlob ? bubbleImageBlob : undefined,
      });

      // Catat juga ke riwayat di halaman Sentence Mining
      addMinedCardToQueue({
        word: activeItem.expression,
        reading: activeItem.reading,
        meaning: finalMeaning,
        src: sourceLabel,
        deck: deckTitle,
        deckId: selectedDeckId,
        sentence: finalSentence,
        translation: `Sumber: ${sourceLabel}`,
      });

      const key = buildCardDuplicateKey(
        activeItem.expression,
        activeItem.reading,
      );
      setAddedKeys((prev) => new Set(prev).add(key));
      setDuplicateKeys((prev) => new Set(prev).add(key));
      onCardMined(activeItem.expression, deckTitle);
    } finally {
      setSaving(false);
    }
  };

  // Hitung posisi popup di layar desktop agar tidak keluar dari viewport
  const desktopPositionStyle = useMemo<React.CSSProperties>(() => {
    if (typeof window === "undefined") return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 640) {
      // Pada layar ponsel, gunakan bottom-sheet penuh
      return {
        left: "8px",
        right: "8px",
        bottom: "8px",
        maxHeight: "76vh",
      };
    }

    const popupWidth = 420;
    const estimatedHeight = 430;
    const left = Math.max(12, Math.min(vw - popupWidth - 12, anchorRect.x - 40));
    const spaceBelow = vh - anchorRect.bottom;
    const placeAbove = spaceBelow < estimatedHeight && anchorRect.y > estimatedHeight;
    const top = placeAbove
      ? Math.max(12, anchorRect.y - estimatedHeight - 10)
      : Math.min(vh - estimatedHeight - 12, anchorRect.bottom + 10);

    return {
      left: `${left}px`,
      top: `${ Math.max(12, top) }px`,
      width: `${popupWidth}px`,
      maxHeight: "460px",
    };
  }, [anchorRect]);

  const toggleDictCollapse = (dictId: number) => {
    setCollapsedDicts((prev) => ({
      ...prev,
      [dictId]: !prev[dictId],
    }));
  };

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-label="Popup Kamus & Sentence Mining"
      className="fixed z-50 rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
      style={{
        ...desktopPositionStyle,
        background: "var(--bg-canvas, #faf7f2)",
        borderColor: "var(--line-strong, #d5cec2)",
        color: "var(--ink, #1d1b18)",
      }}
    >
      {/* Header Popup */}
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
        style={{
          background: "var(--surface, #ffffff)",
          borderColor: "var(--line, #e6e0d6)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded font-semibold"
            style={{
              background: "rgba(194, 78, 52, 0.12)",
              color: "var(--accent, #c24e34)",
            }}
          >
            {matchedText}
          </span>
          {rubyHint && (
            <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
              (furigana teks: {rubyHint})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 cursor-pointer"
          title="Tutup (Esc)"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Isi Popup */}
      <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-[13px]">
        {results.length === 0 ? (
          <div className="py-4 text-center space-y-2.5">
            <div className="font-semibold text-[14px]">
              {activeDictCount === 0
                ? "Belum ada kamus aktif"
                : `Kata "${matchedText}" tidak ditemukan di kamus`}
            </div>
            <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>
              {activeDictCount === 0
                ? "Impor kamus ZIP berformat Yomitan (mis. JMdict_english.zip) terlebih dahulu agar arti kata dapat ditampilkan."
                : "Coba klik tepat pada awal kata kerja, kata benda, atau sifat berbahasa Jepang."}
            </p>
            {activeDictCount === 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDictManager();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-medium text-white cursor-pointer"
                style={{ background: "var(--accent, #c24e34)" }}
              >
                <Icon name="book" size={15} /> Buka Kelola Kamus
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Tab Pemilih Entri jika ada >1 kandidat (expression, reading) */}
            {results.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {results.slice(0, 8).map((item, idx) => {
                  const dup = duplicateKeys.has(
                    buildCardDuplicateKey(item.expression, item.reading),
                  );
                  return (
                    <button
                      key={`${item.expression}-${item.reading}-${idx}`}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className="px-2.5 py-1 rounded-lg border text-[12px] font-medium shrink-0 flex items-center gap-1 cursor-pointer"
                      style={{
                        borderColor:
                          selectedIndex === idx
                            ? "var(--accent, #c24e34)"
                            : "var(--line, #e6e0d6)",
                        background:
                          selectedIndex === idx
                            ? "rgba(194, 78, 52, 0.12)"
                            : "var(--surface, #fff)",
                      }}
                    >
                      <span lang="ja">{item.expression}</span>
                      {dup && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "var(--sage, #2f6b4f)" }}
                          title="Sudah ada di deck"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Kepala Kata Aktif */}
            {activeItem && (
              <div>
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2" lang="ja">
                    <div>
                      {activeItem.reading &&
                        activeItem.reading !== activeItem.expression && (
                          <div
                            className="text-[12px] font-medium mb-0.5"
                            style={{ color: "var(--accent, #c24e34)" }}
                          >
                            {activeItem.reading}
                          </div>
                        )}
                      <span className="text-[22px] font-bold leading-tight">
                        {activeItem.expression}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        speakJapanese(
                          activeItem.reading || activeItem.expression,
                        )
                      }
                      title="Dengarkan pengucapan kata"
                      className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-black/5 cursor-pointer"
                      style={{
                        borderColor: "var(--line, #e6e0d6)",
                        color: "var(--accent, #c24e34)",
                      }}
                    >
                      <Icon name="volume" size={14} />
                    </button>
                  </div>

                  {/* Badge Status Duplikat di Deck */}
                  {isJustAdded ? (
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: "rgba(47, 107, 79, 0.15)",
                        color: "var(--sage, #2f6b4f)",
                      }}
                    >
                      ✓ Sudah ditambahkan
                    </span>
                  ) : isAlreadyInDeck ? (
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: "rgba(181, 121, 31, 0.16)",
                        color: "#9a6312",
                      }}
                    >
                      Sudah ada di deck
                    </span>
                  ) : null}
                </div>

                {/* Tag jenis kata & rantai deinflection */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {activeItem.deinflectReasons.length > 0 && (
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-medium"
                      style={{
                        background: "rgba(194, 78, 52, 0.1)",
                        color: "var(--accent, #c24e34)",
                      }}
                    >
                      {matchedText} ← {activeItem.deinflectReasons.join(" ← ")}
                    </span>
                  )}
                  {activeItem.tags.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded text-[10.5px] font-mono"
                      style={{
                        background: "rgba(0,0,0,0.06)",
                        color: "var(--ink-2)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Daftar Arti Dikelompokkan per Kamus (Dapat Dilipat) */}
                <div className="mt-3 space-y-2">
                  {activeItem.senses.map((sense, sIdx) => {
                    const isCollapsed = !!collapsedDicts[sense.dictId];
                    return (
                      <div
                        key={`${sense.dictId}-${sIdx}`}
                        className="rounded-xl border overflow-hidden"
                        style={{
                          background: "var(--surface, #fff)",
                          borderColor: "var(--line, #e6e0d6)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleDictCollapse(sense.dictId)}
                          className="w-full px-3 py-1.5 flex items-center justify-between text-left text-[11.5px] font-semibold cursor-pointer"
                          style={{
                            background: "rgba(0,0,0,0.025)",
                            color: "var(--ink-2)",
                          }}
                        >
                          <span>{sense.dictTitle}</span>
                          <span>{isCollapsed ? "▸ Buka" : "▾ Lipat"}</span>
                        </button>
                        {!isCollapsed && (
                          <ol className="px-3.5 py-2 space-y-1 list-decimal list-inside text-[12.5px] leading-relaxed">
                            {sense.glossary.map((g, gIdx) => (
                              <li key={gIdx}>{g}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pratinjau & Editor Kalimat Sumber */}
                <div
                  className="mt-3 rounded-xl border p-3 space-y-2"
                  style={{
                    background: "var(--surface, #fff)",
                    borderColor: "var(--line, #e6e0d6)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--ink-3)" }}
                      >
                        Kalimat Sumber (Kata Target Ditandai)
                      </span>
                      <button
                        type="button"
                        onClick={() => speakJapanese(customSentenceHtml)}
                        title="Dengarkan kalimat sumber"
                        className="p-1 rounded hover:bg-black/5 cursor-pointer"
                        style={{ color: "var(--accent, #c24e34)" }}
                      >
                        <Icon name="volume" size={13} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingFields((v) => !v)}
                      className="text-[11.5px] underline font-medium cursor-pointer"
                      style={{ color: "var(--accent, #c24e34)" }}
                    >
                      {editingFields ? "Selesai Edit" : "Edit Kartu"}
                    </button>
                  </div>

                  {/* Pilihan kalimat jika gelembung memuat lebih dari satu kalimat */}
                  {candidateSentences && candidateSentences.length > 1 && (
                    <div className="space-y-1.5 pt-1 border-t border-black/5">
                      <span
                        className="text-[11px] font-semibold block"
                        style={{ color: "var(--ink-3)" }}
                      >
                        Pilih Kalimat dari Gelembung Dialog:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {candidateSentences.map((c, idx) => {
                          const isSelected = selectedCandidateIdx === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedCandidateIdx(idx);
                                setCustomSentenceHtml(
                                  c.sentenceHighlightedHtml,
                                );
                              }}
                              className="px-2.5 py-1 rounded-lg border text-[11.5px] text-left transition cursor-pointer max-w-full truncate"
                              style={{
                                borderColor: isSelected
                                  ? "var(--accent, #c24e34)"
                                  : "var(--line, #e6e0d6)",
                                background: isSelected
                                  ? "rgba(194, 78, 52, 0.12)"
                                  : "var(--bg-canvas, #faf7f2)",
                                color: isSelected
                                  ? "var(--accent, #c24e34)"
                                  : "var(--ink)",
                                fontWeight: isSelected ? 600 : 400,
                              }}
                              title={c.label}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!editingFields ? (
                    <p
                      lang="ja"
                      className="text-[13px] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: customSentenceHtml }}
                    />
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="block">
                        <span
                          className="text-[11px] font-medium block mb-0.5"
                          style={{ color: "var(--ink-3)" }}
                        >
                          Arti Kartu (bisa diubah ke Bahasa Indonesia/Inggris):
                        </span>
                        <input
                          type="text"
                          value={customMeaning}
                          onChange={(e) => setCustomMeaning(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-[12.5px]"
                          style={{
                            borderColor: "var(--line-strong)",
                            background: "var(--bg-canvas)",
                          }}
                        />
                      </label>

                      <label className="block">
                        <span
                          className="text-[11px] font-medium block mb-0.5"
                          style={{ color: "var(--ink-3)" }}
                        >
                          Kalimat Sumber (gunakan <code>&lt;b&gt;...&lt;/b&gt;</code> untuk menandai kata):
                        </span>
                        <textarea
                          rows={2}
                          value={customSentenceHtml}
                          onChange={(e) =>
                            setCustomSentenceHtml(e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border text-[12.5px]"
                          style={{
                            borderColor: "var(--line-strong)",
                            background: "var(--bg-canvas)",
                          }}
                        />
                      </label>

                      <label className="block">
                        <span
                          className="text-[11px] font-medium block mb-0.5"
                          style={{ color: "var(--ink-3)" }}
                        >
                          Sumber (Judul Buku &amp; Bab):
                        </span>
                        <input
                          type="text"
                          value={customNote}
                          onChange={(e) => setCustomNote(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border text-[12px]"
                          style={{
                            borderColor: "var(--line-strong)",
                            background: "var(--bg-canvas)",
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Pratinjau Gambar Gelembung Dialog & Opsi Sertakan Gambar */}
                {bubblePreviewUrl && (
                  <div
                    className="mt-3 rounded-xl border p-3 space-y-2"
                    style={{
                      background: "var(--surface, #fff)",
                      borderColor: "var(--line, #e6e0d6)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[12px] font-medium">
                        <input
                          type="checkbox"
                          checked={includeBubbleImage}
                          onChange={(e) =>
                            setIncludeBubbleImage(e.target.checked)
                          }
                          className="rounded accent-[#c24e34] cursor-pointer"
                        />
                        <span>Sertakan gambar gelembung dialog pada kartu</span>
                      </label>
                      <span
                        className="text-[11px] font-mono"
                        style={{ color: "var(--ink-3)" }}
                      >
                        WebP ~800px
                      </span>
                    </div>

                    {includeBubbleImage && (
                      <div className="max-h-36 overflow-hidden rounded-lg border border-black/10 bg-black/5 flex items-center justify-center p-1.5">
                        <img
                          src={bubblePreviewUrl}
                          alt="Crop gelembung dialog manga"
                          className="max-h-32 object-contain rounded"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer: Pemilih Deck & Tombol Tambah ke Deck */}
      {activeItem && (
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between gap-2.5 shrink-0"
          style={{
            background: "var(--surface, #fff)",
            borderColor: "var(--line, #e6e0d6)",
          }}
        >
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            aria-label="Pilih deck tujuan"
            className="px-2.5 py-1.5 rounded-xl border text-[12px] font-medium max-w-[180px] truncate"
            style={{
              borderColor: "var(--line-strong, #d5cec2)",
              background: "var(--bg-canvas, #faf7f2)",
              color: "var(--ink)",
            }}
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={saving || isJustAdded}
            onClick={() => void handleAddToDeck()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold text-white transition-opacity disabled:opacity-65 cursor-pointer shrink-0"
            style={{
              background: isJustAdded
                ? "var(--sage, #2f6b4f)"
                : "var(--accent, #c24e34)",
            }}
          >
            <Icon name={isJustAdded ? "check" : "plus"} size={15} />
            {saving
              ? "Menyimpan..."
              : isJustAdded
                ? "Sudah ditambahkan"
                : isAlreadyInDeck
                  ? "Tambah Lagi ke Deck"
                  : "Tambah ke Deck"}
          </button>
        </div>
      )}
    </div>
  );
}

