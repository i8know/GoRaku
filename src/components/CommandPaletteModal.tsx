import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listNovels } from "../lib/bookStorage";
import { lookup, type LookupResultItem } from "../lib/dictionaryLookup";
import type { BookRecord } from "../lib/lexiconDb";
import { speakJapanese } from "../lib/tts";
import { useAppStore } from "../store/useAppStore";
import { Icon, type IconName } from "../ui";

interface CommandPaletteModalProps {
  open: boolean;
  onClose: () => void;
}

interface PaletteActionItem {
  id: string;
  group: "Navigasi" | "Deck" | "Perpustakaan Novel";
  title: string;
  subtitle: string;
  badge?: string;
  icon: IconName;
  onSelect: () => void;
}

export default function CommandPaletteModal({
  open,
  onClose,
}: CommandPaletteModalProps) {
  const navigate = useNavigate();
  const decks = useAppStore((s) => s.decks);

  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [dictResults, setDictResults] = useState<LookupResultItem[]>([]);
  const [dictSearching, setDictSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    void listNovels().then(setBooks).catch(() => {});
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Live dictionary lookup when query changes
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setDictResults([]);
      setDictSearching(false);
      return;
    }

    let cancelled = false;
    setDictSearching(true);
    const timer = window.setTimeout(() => {
      void lookup(trimmed, 0)
        .then((res) => {
          if (!cancelled) {
            setDictResults(res.results.slice(0, 4));
            setDictSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDictResults([]);
            setDictSearching(false);
          }
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const actions = useMemo<PaletteActionItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteActionItem[] = [];

    // 1. Decks
    for (const d of decks) {
      if (
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.level.toLowerCase().includes(q) ||
        d.kind.toLowerCase().includes(q)
      ) {
        list.push({
          id: `deck-${d.id}`,
          group: "Deck",
          title: d.title,
          subtitle: `${d.total.toLocaleString("id-ID")} kartu • Level ${d.level}`,
          badge: d.due > 0 ? `${d.due} jatuh tempo` : "Tuntas",
          icon: "cards",
          onSelect: () => {
            onClose();
            navigate(`/deck/${d.id}`);
          },
        });
      }
    }

    // 2. Books in Library
    for (const b of books) {
      if (
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.format.toLowerCase().includes(q)
      ) {
        list.push({
          id: `book-${b.id}`,
          group: "Perpustakaan Novel",
          title: b.title,
          subtitle: `${b.author || "Tanpa Penulis"} • ${b.format.toUpperCase()}`,
          badge: `${Math.round((b.progress || 0) * 100)}% dibaca`,
          icon: "book",
          onSelect: () => {
            onClose();
            navigate(`/library/${b.id}`);
          },
        });
      }
    }

    // 3. Navigation shortcuts
    const navShortcuts: Omit<PaletteActionItem, "group">[] = [
      {
        id: "nav-beranda",
        title: "Beranda Dashboard",
        subtitle: "Ringkasan belajar harian & sesi review cepat",
        icon: "home",
        onSelect: () => {
          onClose();
          navigate("/beranda");
        },
      },
      {
        id: "nav-library",
        title: "Perpustakaan Novel (EPUB & TXT)",
        subtitle: "Baca novel Jepang & Sentence Mining langsung",
        icon: "book",
        onSelect: () => {
          onClose();
          navigate("/library");
        },
      },
      {
        id: "nav-mining",
        title: "Sentence Mining Studio",
        subtitle: "Tambang kalimat dari berbagai sumber & teks bebas",
        icon: "mine",
        onSelect: () => {
          onClose();
          navigate("/mining");
        },
      },
      {
        id: "nav-decks",
        title: "Deck Saya & Impor Anki (.apkg)",
        subtitle: "Kelola koleksi kartu flashcard FSRS",
        icon: "cards",
        onSelect: () => {
          onClose();
          navigate("/deck");
        },
      },
      {
        id: "nav-progress",
        title: "Statistik & Progres Belajar",
        subtitle: "Grafik kosakata, target JLPT, dan heatmap konsistensi",
        icon: "chart",
        onSelect: () => {
          onClose();
          navigate("/progress");
        },
      },
      {
        id: "nav-settings",
        title: "Pengaturan & Kelola Kamus Yomitan",
        subtitle: "Atur target harian, furigana, dan kamus offline",
        icon: "settings",
        onSelect: () => {
          onClose();
          navigate("/settings");
        },
      },
    ];

    for (const n of navShortcuts) {
      if (
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.subtitle.toLowerCase().includes(q)
      ) {
        list.push({ ...n, group: "Navigasi" });
      }
    }

    return list.slice(0, 10);
  }, [query, decks, books, navigate, onClose]);

  useEffect(() => {
    setActiveIndex(0);
  }, [actions.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          actions.length > 0 ? (prev + 1) % actions.length : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          actions.length > 0
            ? (prev - 1 + actions.length) % actions.length
            : 0,
        );
      } else if (e.key === "Enter" && actions[activeIndex]) {
        e.preventDefault();
        actions[activeIndex].onSelect();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, actions, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center bg-black/55 backdrop-blur-xs p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian Cepat 語楽"
        className="w-full max-w-2xl rounded-2xl border border-[var(--garis)] bg-[var(--panel)] shadow-2xl overflow-hidden animate-[modal-in_0.18s_ease]"
      >
        {/* Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--garis)] bg-[var(--tsuki)]">
          <span className="text-[var(--ai)]">
            <Icon name="search" size={19} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik kata Jepang (mis. 食べました), nama deck, novel, atau menu..."
            className="w-full border-0 bg-transparent text-sm text-[var(--tinta)] placeholder-[var(--tinta-2)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs text-[var(--tinta-2)] hover:text-[var(--tinta)] px-1.5 py-0.5"
            >
              Hapus
            </button>
          )}
          <kbd className="rounded border border-[var(--garis)] bg-[var(--panel)] px-2 py-0.5 text-[10px] font-semibold text-[var(--tinta-2)]">
            ESC
          </kbd>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-3 space-y-4">
          {/* Live Yomitan Dictionary Results */}
          {query.trim().length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ai)]">
                  Kamus Jepang Offline (Yomitan + Deinflection)
                </span>
                {dictSearching && (
                  <span className="text-[10px] text-[var(--tinta-2)]">Mencari...</span>
                )}
              </div>

              {dictResults.length > 0 ? (
                <div className="grid gap-2">
                  {dictResults.map((entry) => {
                    const firstGlossary =
                      entry.senses[0]?.glossary.slice(0, 3).join("; ") ?? "";
                    return (
                      <div
                        key={`${entry.expression}-${entry.reading}`}
                        className="flex items-start justify-between gap-3 rounded-xl border border-[var(--garis)] bg-[var(--tsuki)] px-3.5 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <strong
                              lang="ja"
                              className="text-lg font-bold text-[var(--tinta)] [font-family:var(--font-serif)]"
                            >
                              {entry.expression}
                            </strong>
                            {entry.reading &&
                              entry.reading !== entry.expression && (
                                <span
                                  lang="ja"
                                  className="text-xs font-medium text-[var(--ai)]"
                                >
                                  【{entry.reading}】
                                </span>
                              )}
                            {entry.deinflectReasons.length > 0 && (
                              <span className="rounded-md bg-[var(--mizu-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ai)]">
                                {entry.matchedText} → {entry.expression} (
                                {entry.deinflectReasons.join(" ← ")})
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[var(--tinta-2)] line-clamp-2">
                            {firstGlossary}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              speakJapanese(entry.reading || entry.expression)
                            }
                            title="Dengarkan pengucapan bahasa Jepang"
                            className="rounded-lg border border-[var(--garis)] bg-[var(--panel)] p-1.5 text-[var(--tinta-2)] hover:border-[var(--ai)] hover:text-[var(--ai)] transition-colors"
                          >
                            <Icon name="volume" size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !dictSearching && (
                  <p className="px-2 py-1.5 text-xs text-[var(--tinta-2)]">
                    Tidak ada kecocokan langsung di kamus Yomitan untuk &ldquo;
                    {query.trim()}&rdquo;.
                  </p>
                )
              )}
            </div>
          )}

          {/* Filtered Decks, Books & Navigation */}
          <div>
            <div className="px-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--tinta-2)]">
                Deck, Novel &amp; Pintasan Menu
              </span>
            </div>
            {actions.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-[var(--tinta-2)]">
                Tidak ada hasil yang cocok.
              </p>
            ) : (
              <div className="space-y-1">
                {actions.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={item.onSelect}
                      className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-[var(--kon)] text-white"
                          : "hover:bg-[var(--mizu-soft)] text-[var(--tinta)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                            isActive
                              ? "bg-white/15 text-white"
                              : "bg-[var(--mizu-soft)] text-[var(--ai)]"
                          }`}
                        >
                          <Icon name={item.icon} size={16} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold truncate">
                              {item.title}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                isActive
                                  ? "bg-white/15 text-white/90"
                                  : "bg-[var(--garis)] text-[var(--tinta-2)]"
                              }`}
                            >
                              {item.group}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] truncate ${
                              isActive ? "text-white/75" : "text-[var(--tinta-2)]"
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      {item.badge && (
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isActive
                              ? "bg-[var(--shu)] text-white"
                              : "bg-[var(--mizu-soft)] text-[var(--ai)]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-[var(--garis)] bg-[var(--tsuki)] px-4 py-2 text-[10px] text-[var(--tinta-2)]">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-[var(--tinta-2)]">↑↓</strong> Navigasi
            </span>
            <span>
              <strong className="text-[var(--tinta-2)]">↵ Enter</strong> Buka
            </span>
            <span>
              <strong className="text-[var(--tinta-2)]">ESC</strong> Tutup
            </span>
          </div>
          <span>語楽 Quick Search</span>
        </div>
      </div>
    </div>
  );
}

