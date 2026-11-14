import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, DyeTile, DyeProgress, Hanko } from "./ui";
import { useAppStore, limitsFor, type DeckItem } from "./store/useAppStore";
import { useReviewStore, newCardsLeftToday } from "./store/useReviewStore";
import {
  liveDeckStats,
  estimateMinutes,
  forecast,
  forecastNew,
  forecastKanji,
  forecastLabels,
  formatKanjiDate,
  type LiveDeckStats,
} from "./lib/deckStats";
import { aggregateParentStats, extractLevelCode, getLeafDescendantDecks } from "./lib/deckSubdecks";
import { dyeStep, jlptDyeStep } from "./lib/dye";
import { ensureSeeded } from "./lib/deckCards";
import { listNovels, extractCoverKanji } from "./lib/bookStorage";
import type { BookRecord } from "./lib/lexiconDb";
import { speakJapanese } from "./lib/tts";

const ImportDeckModal = lazy(() => import("./components/ImportDeckModal"));
const DeckFormModal = lazy(() => import("./components/DeckFormModal"));

const defaultSources = [
  {
    id: "sample-novel",
    type: "Novel",
    title: "コンビニ人間",
    detail: "Halaman 42 • 8 kalimat",
    art: "novel",
    kanji: "人間",
    sentence: "「自分らしく生きることは、思ったより難しい。」",
    translation: "Hidup menjadi diri sendiri lebih sulit dari yang dibayangkan.",
    targetPath: "/library",
  },
  {
    id: "sample-manga",
    type: "Manga",
    title: "よつばと！",
    detail: "Volume 01 • Balon dialog",
    art: "novel",
    kanji: "日常",
    sentence: "「いつでも今日が、いちばん楽しい日。」",
    translation: "Hari ini selalu menjadi hari yang paling menyenangkan.",
    targetPath: "/library",
  },
  {
    id: "sample-custom",
    type: "Teks Bebas",
    title: "Catatan Harian",
    detail: "Studio Teks & Kamus",
    art: "novel",
    kanji: "言葉",
    sentence: "「新しい言葉を覚えるのはとても楽しい。」",
    translation: "Mempelajari kosakata baru itu sangat menyenangkan.",
    targetPath: "/mining",
  },
];

export default function App() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<"deck" | "mining" | "import" | null>(null);
  const [notice, setNotice] = useState("");
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null);

  const user = useAppStore((s) => s.user);
  const decks = useAppStore((s) => s.decks);
  const settings = useAppStore((s) => s.settings);
  const deckLimits = useAppStore((s) => s.deckLimits);
  const srsCards = useReviewStore((s) => s.srsCards);
  const newIntroduced = useReviewStore((s) => s.newIntroduced);

  useEffect(() => {
    void ensureSeeded();
    void listNovels().then(setBooks).catch(() => {});
  }, []);

  const now = new Date();
  const jpDateVertical = formatKanjiDate(now);

  const greetingInfo = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 11) {
      return { id: "Selamat pagi", jp: "おはようございます" };
    }
    if (h >= 11 && h < 15) {
      return { id: "Selamat siang", jp: "こんにちは" };
    }
    if (h >= 15 && h < 18) {
      return { id: "Selamat sore", jp: "こんにちは" };
    }
    return { id: "Selamat malam", jp: "こんばんは" };
  }, []);

  const stats = useMemo(() => {
    const m = new Map<string, LiveDeckStats>();
    for (const d of decks) {
      const children = decks.filter((c) => c.parentId === d.id);
      if (children.length > 0) {
        m.set(
          d.id,
          aggregateParentStats(d, children, srsCards, newIntroduced, settings, decks, Date.now(), deckLimits),
        );
      } else {
        m.set(d.id, liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings, Date.now(), deckLimits));
      }
    }
    return m;
  }, [decks, srsCards, newIntroduced, settings, deckLimits]);
  const st = (d: DeckItem) => stats.get(d.id)!;

  const rootDecks = useMemo(() => decks.filter((d) => !d.parentId), [decks]);
  const totalDue = useMemo(
    () => rootDecks.reduce((s, d) => s + (stats.get(d.id)?.due ?? 0), 0),
    [rootDecks, stats],
  );
  const totalReviewDue = useMemo(
    () => rootDecks.reduce((s, d) => s + (stats.get(d.id)?.reviewDue ?? 0), 0),
    [rootDecks, stats],
  );
  const totalNewToday = useMemo(
    () => rootDecks.reduce((s, d) => s + (stats.get(d.id)?.newToday ?? 0), 0),
    [rootDecks, stats],
  );
  const estMinutes = useMemo(
    () => (totalDue > 0 ? estimateMinutes(totalReviewDue, totalNewToday) : 0),
    [totalDue, totalReviewDue, totalNewToday],
  );
  const retentionPercent = Math.round((settings.desiredRetention ?? 0.9) * 100);

  const firstDueDeck = useMemo(
    () => rootDecks.find((d) => (stats.get(d.id)?.due ?? 0) > 0) ?? rootDecks[0],
    [rootDecks, stats],
  );

  // 7-day forecast combining scheduled reviews + projected new cards
  const forecastData = useMemo(() => {
    const rev = forecast(Object.values(srsCards), 7, now, settings.dayStartHour);
    const fresh = forecastNew(decks, srsCards, newIntroduced, settings, 7, now, deckLimits);
    const kanji = forecastKanji(7, now, settings.dayStartHour);
    const labels = forecastLabels(7, now, settings.dayStartHour);
    const totals = rev.map((r, i) => r + (fresh[i] ?? 0));
    const maxVal = Math.max(1, ...totals);
    const barColors = [
      "var(--celup-4)",
      "var(--celup-3)",
      "var(--celup-3)",
      "var(--celup-2)",
      "var(--celup-2)",
      "var(--celup-1)",
      "var(--celup-1)",
    ];
    return totals.map((count, i) => ({
      count,
      reviewCount: rev[i] ?? 0,
      newCount: fresh[i] ?? 0,
      kanji: kanji[i] ?? "日",
      label: labels[i] ?? "",
      heightPct: count === 0 ? 6 : Math.max(12, Math.round((count / maxVal) * 100)),
      color: barColors[i] ?? "var(--celup-1)",
    }));
  }, [decks, srsCards, newIntroduced, settings, deckLimits]);

  // Kuota hari ini (remaining new cards & review limit across active leaf decks)
  const quotaSummary = useMemo(() => {
    const parentIds = new Set(decks.filter((d) => d.parentId).map((d) => d.parentId!));
    const leafDecks = decks.filter((d) => !parentIds.has(d.id));
    let remainingNew = 0;
    let totalNewLimit = 0;
    for (const d of leafDecks) {
      const lim = limitsFor(d.id, settings, deckLimits);
      const left = newCardsLeftToday(newIntroduced[d.id], lim.newCards, now, settings.dayStartHour);
      const unlearned = Math.max(0, d.total - Object.keys(srsCards[d.id] ?? {}).length);
      remainingNew += Math.min(unlearned, left);
      totalNewLimit += lim.newCards;
    }
    return {
      remainingNew,
      totalNewLimit,
      defaultNewLimit: settings.newCards,
      defaultReviewLimit: settings.maxReview,
      reviewDueToday: totalReviewDue,
    };
  }, [decks, settings, deckLimits, newIntroduced, srsCards, totalReviewDue]);

  useEffect(() => {
    if (modal !== "mining") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal]);

  const saveAction = (message: string) => {
    setModal(null);
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const handleStartReview = () => {
    if (firstDueDeck) {
      navigate(`/deck/${firstDueDeck.id}/review`);
    } else {
      navigate("/deck");
    }
  };

  const displaySources = useMemo(() => {
    const userBookRows = books.slice(0, 2).map((b) => {
      const isManga =
        b.type === "manga" ||
        b.format === "cbz" ||
        b.format === "zip" ||
        b.format === "images";
      return {
        id: `book-${b.id}`,
        type: isManga
          ? `Manga (${b.format === "images" ? "GAMBAR" : b.format.toUpperCase()})`
          : `Novel (${b.format.toUpperCase()})`,
        title: b.title,
        detail: isManga
          ? `${b.author || "Manga Lokal"} • Hal. ${(b.currentPage ?? 0) + 1}/${b.pageCount ?? 0} (${b.progress ?? 0}%)`
          : `${b.author || "Tanpa Penulis"} • ${b.progress ?? 0}% dibaca`,
        art: "novel" as const,
        kanji: extractCoverKanji(b.title),
        sentence: isManga
          ? "「マンガの吹き出しをOCRして文脈マイニングを続けましょう。」"
          : "「クリックして読書と文脈マイニングを続けましょう。」",
        translation: isManga
          ? "Klik untuk melanjutkan membaca manga & menambang kalimat dari gelembung dialog."
          : "Klik untuk melanjutkan membaca novel & menambang kalimat baru.",
        targetPath: isManga ? `/manga/${b.id}` : `/library/${b.id}`,
      };
    });
    return [...userBookRows, ...defaultSources].slice(0, 3);
  }, [books]);

  return (
    <>
      <section className="beranda-hero beranda-hero-v2">
        <div className="beranda-hero-v2__seigaiha motif-seigaiha" aria-hidden="true" />
        <div className="relative z-10 flex-1 flex flex-col justify-between gap-5">
          <div>
            <p className="beranda-hero-kicker" lang="ja">
              {greetingInfo.jp}
            </p>
            <h1>
              {greetingInfo.id}, {user?.name || "Pelajar"}
            </h1>
            <p className="beranda-hero-sub mt-2 text-sm text-white/90">
              {totalDue} kartu menunggu, sekitar {estMinutes} menit. Retensi {retentionPercent}%
            </p>
          </div>

          <div>
            <button type="button" className="beranda-seal-cta" onClick={handleStartReview}>
              <span className="beranda-seal-stamp" lang="ja" aria-hidden="true">
                復
              </span>
              <span>Mulai sesi review</span>
            </button>
          </div>
        </div>

        <div className="beranda-hero-v2__tategaki relative z-10" lang="ja" title="Tanggal hari ini">
          {jpDateVertical}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
        {/* KOLOM KIRI: DAFTAR DECK BERBORDER */}
        <section className="lg:col-span-8">
          <div className="section-heading">
            <div>
              <h2>Deck belajarmu</h2>
            </div>
            <div className="dk-head-actions">
              <Button className="outline-button dk-import-btn" onClick={() => setModal("import")}>
                <Icon name="upload" size={16} /> Impor .apkg
              </Button>
              <Button className="outline-button" onClick={() => setModal("deck")}>
                <Icon name="plus" size={17} /> Buat deck baru
              </Button>
            </div>
          </div>

          <div className="beranda-deck-rows beranda-deck-table">
            {rootDecks.map((deck) => {
              const s = st(deck);
              const imported = deck.source === "apkg";
              const leaves = getLeafDescendantDecks(deck.id, decks);
              const children = decks.filter((c) => c.parentId === deck.id);
              const displaySubdecks = leaves.length > 0 ? leaves : children;
              const sortedSubdecks = [...displaySubdecks].sort((a, b) => {
                const order: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
                const aCode = extractLevelCode(a.title) ?? extractLevelCode(a.subdeckName || "") ?? "Z";
                const bCode = extractLevelCode(b.title) ?? extractLevelCode(b.subdeckName || "") ?? "Z";
                return (order[aCode] ?? 9) - (order[bCode] ?? 9);
              });
              const isExpanded = expandedDeckId === deck.id;
              const toggleDeckExpand = () =>
                setExpandedDeckId((prev) => (prev === deck.id ? null : deck.id));

              return (
                <div key={deck.id} className="border-b border-[var(--garis)] last:border-b-0">
                  <article className="beranda-deck-row">
                    <button
                      type="button"
                      className="bg-transparent border-0 p-0 cursor-pointer shrink-0"
                      aria-expanded={displaySubdecks.length > 0 ? isExpanded : undefined}
                      aria-label={
                        displaySubdecks.length > 0
                          ? `${isExpanded ? "Tutup" : "Buka"} sub-deck ${deck.title}`
                          : `Buka deck ${deck.title}`
                      }
                      onClick={() => {
                        if (displaySubdecks.length > 0) toggleDeckExpand();
                        else navigate(`/deck/${deck.id}`);
                      }}
                    >
                      <DyeTile step={dyeStep(s.progress)} kanji={deck.kanji} size={44} />
                    </button>

                    <div className="beranda-deck-info min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] font-bold text-[var(--ai)]">{deck.level}</span>
                        {imported && (
                          <span className="rounded bg-[var(--tsuki)] border border-[var(--garis)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--kon)]">
                            ANKI
                          </span>
                        )}
                      </div>
                      <h3>
                        <button
                          type="button"
                          className="text-left bg-transparent border-0 p-0 cursor-pointer"
                          aria-expanded={displaySubdecks.length > 0 ? isExpanded : undefined}
                          onClick={() => {
                            if (displaySubdecks.length > 0) toggleDeckExpand();
                            else navigate(`/deck/${deck.id}`);
                          }}
                        >
                          {deck.title}
                        </button>
                      </h3>
                      <div className="beranda-deck-counts font-mono text-xs flex items-center gap-3 mt-1">
                        <span
                          className={
                            s.newToday > 0
                              ? "text-[var(--kon)] font-bold"
                              : "text-[var(--teks-redup)]"
                          }
                          aria-label={`${s.newToday} kartu baru`}
                        >
                          新 {s.newToday}
                        </span>
                        <span
                          className={
                            s.reviewDue > 0
                              ? "text-[var(--kon)] font-bold"
                              : "text-[var(--teks-redup)]"
                          }
                          aria-label={`${s.reviewDue} ulasan jatuh tempo`}
                        >
                          復 {s.reviewDue}
                        </span>
                        <span className="font-sans text-[var(--teks-redup)]">
                          {deck.total.toLocaleString("id-ID")} kartu
                        </span>
                      </div>
                    </div>

                    <div className="beranda-deck-row__mastery flex items-center justify-end min-w-[128px]">
                      {s.progress >= 100 ? (
                        <Hanko char="済" size={44} title="Deck tuntas 100%" />
                      ) : (
                        <div className="w-full max-w-[140px]">
                          <DyeProgress percent={s.progress} label={`Penguasaan ${deck.title}`} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {displaySubdecks.length > 0 ? (
                        <Button className="outline-button" ariaExpanded={isExpanded} onClick={toggleDeckExpand}>
                          {isExpanded ? "Tutup" : `Sub-deck (${displaySubdecks.length})`}
                          <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={14} />
                        </Button>
                      ) : (
                        <Button
                          className="outline-button"
                          onClick={() => navigate(s.due > 0 ? `/deck/${deck.id}/review` : `/deck/${deck.id}`)}
                        >
                          {s.due > 0 ? "Belajar" : "Buka"}
                        </Button>
                      )}
                    </div>
                  </article>

                  {displaySubdecks.length > 0 && isExpanded && (
                    <div className="px-5 pb-4 pt-2 bg-[var(--kertas-2)]/60 border-t border-[var(--garis)]">
                      <div className="dk-card-subdecks-wrap" onClick={(e) => e.stopPropagation()}>
                        <div className="dk-quick-levels">
                          <div className="dk-quick-levels-label">
                            <span>Pilih Level Belajar:</span>
                            <small>{displaySubdecks.length} sub-deck</small>
                          </div>
                          <div className="dk-quick-levels-chips">
                            {sortedSubdecks.map((c) => {
                              const cs = st(c);
                              const lvlLabel = c.subdeckName || c.level.split("•")[0].trim() || c.kanji;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="dk-quick-chip indigo"
                                  onClick={() => navigate(cs.due > 0 ? `/deck/${c.id}/review` : `/deck/${c.id}`)}
                                >
                                  <strong>{lvlLabel}</strong>
                                  <small>{cs.due > 0 ? cs.due : "✓"}</small>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="dk-card-subdecks-drawer">
                          {sortedSubdecks.map((c) => {
                            const cs = st(c);
                            const code = extractLevelCode(c.title) ?? extractLevelCode(c.subdeckName || "") ?? "N3";
                            return (
                              <div key={c.id} className="dk-card-subdeck-item">
                                <button
                                  type="button"
                                  className="dk-card-subdeck-item-left"
                                  onClick={() => navigate(`/deck/${c.id}`)}
                                >
                                  <DyeTile step={jlptDyeStep(code)} kanji={c.kanji} size={32} />
                                  <span>
                                    <strong>{c.subdeckName || c.title}</strong>
                                    <small className="font-mono">
                                      新 {cs.newToday} · 復 {cs.reviewDue} · {c.total.toLocaleString("id-ID")} kartu
                                    </small>
                                  </span>
                                </button>
                                <div className="dk-card-subdeck-item-right">
                                  <button
                                    type="button"
                                    className="dk-subdeck-study-btn"
                                    onClick={() => navigate(cs.due > 0 ? `/deck/${c.id}/review` : `/deck/${c.id}`)}
                                  >
                                    Belajar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* KOLOM KANAN: DUA KARTU (TUJUH HARI KE DEPAN & KUOTA HARI INI) */}
        <aside className="lg:col-span-4 space-y-5">
          {/* 1. Tujuh hari ke depan */}
          <article className="rounded-md border border-[var(--garis)] bg-[var(--panel)] p-5">
            <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-[var(--garis)]">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--ai)] m-0">
                  予習と復習
                </p>
                <h2 className="text-base font-serif font-bold text-[var(--tinta)] m-0 mt-0.5">
                  Tujuh hari ke depan
                </h2>
              </div>
              <span className="text-xs font-mono text-[var(--teks-redup)]">
                Ulasan + Baru
              </span>
            </div>

            <div className="beranda-forecast-grid" role="list" aria-label="Proyeksi beban belajar tujuh hari ke depan">
              {forecastData.map((d, idx) => (
                <div
                  key={idx}
                  role="listitem"
                  aria-label={`${d.label}: ${d.count} kartu (${d.reviewCount} ulasan, ${d.newCount} kartu baru)`}
                  className="beranda-forecast-col"
                >
                  <span
                    className={`text-[11px] font-mono ${
                      idx === 0 ? "font-bold text-[var(--kon)]" : "text-[var(--teks-redup)]"
                    }`}
                  >
                    {d.count}
                  </span>
                  <div className="beranda-forecast-bar-wrap">
                    <div
                      className="beranda-forecast-bar"
                      style={{
                        height: `${d.heightPct}%`,
                        backgroundColor: d.color,
                      }}
                    />
                  </div>
                  <span
                    lang="ja"
                    className={`text-xs font-serif ${
                      idx === 0 ? "font-bold text-[var(--kon)]" : "text-[var(--teks-redup)]"
                    }`}
                  >
                    {d.kanji}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* 2. Kuota hari ini */}
          <article className="rounded-md border border-[var(--garis)] bg-[var(--panel)] p-5">
            <div className="flex items-baseline justify-between gap-2 pb-3 border-b border-[var(--garis)]">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--ai)] m-0">
                  本日の割当
                </p>
                <h2 className="text-base font-serif font-bold text-[var(--tinta)] m-0 mt-0.5">
                  Kuota hari ini
                </h2>
              </div>
              <span className="text-xs font-mono text-[var(--kon)] font-semibold">
                {totalDue} aktif
              </span>
            </div>

            <div className="divide-y divide-[var(--garis)] text-xs mt-2">
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[var(--tinta-2)]">Sisa kuota kartu baru (新)</span>
                <strong className="font-mono text-sm text-[var(--kon)]">
                  {quotaSummary.remainingNew} kartu
                </strong>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[var(--tinta-2)]">Ulasan jatuh tempo (復)</span>
                <strong className="font-mono text-sm text-[var(--kon)]">
                  {quotaSummary.reviewDueToday} / {quotaSummary.defaultReviewLimit} maks
                </strong>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[var(--tinta-2)]">Batas bawaan per deck</span>
                <span className="font-mono text-[var(--teks-redup)]">
                  {quotaSummary.defaultNewLimit} baru · {quotaSummary.defaultReviewLimit} ulas
                </span>
              </div>
            </div>
          </article>
        </aside>
      </div>

      <section className="mining-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DARI DUNIA NYATA</p>
            <h2>Immersion &amp; Sentence Mining</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button className="outline-button" onClick={() => navigate("/library")}>
              <Icon name="book" size={16} /> Buka Perpustakaan ({books.length})
            </Button>
            <Button className="outline-button" onClick={() => setModal("mining")}>
              <Icon name="mine" size={17} /> Mulai mining
            </Button>
          </div>
        </div>
        <div className="source-list">
          {displaySources.map((source) => (
            <article className="source-row" key={source.id}>
              <button
                type="button"
                className={`source-art ${source.art}`}
                aria-label={`Buka ${source.title}`}
                onClick={() => navigate(source.targetPath)}
              >
                {source.art === "video" && <Icon name="play" size={22} />}
                {source.art !== "video" && <span>{source.kanji}</span>}
              </button>
              <div className="source-copy">
                <span>{source.type}</span>
                <h3>
                  <button
                    type="button"
                    className="text-left bg-transparent border-0 p-0 py-0.5 min-h-[28px] inline-flex items-center cursor-pointer hover:text-[var(--ai)] transition-colors"
                    onClick={() => navigate(source.targetPath)}
                  >
                    {source.title}
                  </button>
                </h3>
                <p>{source.detail}</p>
              </div>
              <div className="source-sentence">
                <div className="flex items-center gap-2">
                  <p lang="ja" className="mb-1">
                    {source.sentence}
                  </p>
                  <button
                    type="button"
                    onClick={() => speakJapanese(source.sentence)}
                    title="Dengarkan pengucapan kalimat"
                    aria-label="Dengarkan pengucapan kalimat"
                    className="rounded-md p-1.5 min-w-[28px] min-h-[28px] max-sm:min-w-[36px] max-sm:min-h-[36px] inline-flex items-center justify-center text-[var(--tinta-2)] hover:text-[var(--ai)] transition-colors shrink-0"
                  >
                    <Icon name="volume" size={14} />
                  </button>
                </div>
                <small>{source.translation}</small>
              </div>
              <Button
                className="round-arrow"
                ariaLabel={`Buka ${source.title}`}
                onClick={() => navigate(source.targetPath)}
              >
                <Icon name="arrow" size={17} />
              </Button>
            </article>
          ))}
        </div>
      </section>

      {modal === "import" && (
        <Suspense fallback={null}>
          <ImportDeckModal
            onClose={() => setModal(null)}
            onImported={(_id, title) => saveAction(`Deck "${title}" berhasil diimpor`)}
            onStudy={(id) => {
              setModal(null);
              navigate(`/deck/${id}/review`);
            }}
          />
        </Suspense>
      )}

      {modal === "deck" && (
        <Suspense fallback={null}>
          <DeckFormModal
            onClose={() => setModal(null)}
            onCreated={(id, title) => {
              saveAction(`Deck "${title}" berhasil dibuat`);
              navigate(`/deck/${id}?add=1`);
            }}
            onImport={() => setModal("import")}
          />
        </Suspense>
      )}

      {modal === "mining" && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mining-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Button className="modal-close" ariaLabel="Tutup" onClick={() => setModal(null)}>
              <Icon name="close" />
            </Button>
            <span className="modal-kanji">採</span>
            <p className="eyebrow">MULAI MENAMBANG</p>
            <h2 id="mining-modal-title">Pilih sumber immersion</h2>
            <p className="modal-copy">
              Ubah konten Jepang favoritmu menjadi materi belajar kontekstual.
            </p>
            <div className="source-options">
              {[
                { label: "Novel (EPUB & TXT)", path: "/library", icon: "book" as const },
                { label: "Manga & Dialog OCR", path: "/library", icon: "cards" as const },
                { label: "Studio Teks Bebas & Kamus", path: "/mining", icon: "mine" as const },
              ].map((item) => (
                <Button
                  key={item.label}
                  onClick={() => {
                    setModal(null);
                    navigate(item.path);
                  }}
                >
                  <Icon name={item.icon} />
                  {item.label}
                  <Icon name="arrow" size={16} />
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="toast">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
    </>
  );
}
