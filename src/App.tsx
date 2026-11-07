import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button } from "./ui";
import { useAppStore, type DeckItem } from "./store/useAppStore";
import { useReviewStore } from "./store/useReviewStore";
import { liveDeckStats, type LiveDeckStats } from "./lib/deckStats";
import { aggregateParentStats, extractLevelCode, getLeafDescendantDecks } from "./lib/deckSubdecks";
import { ensureSeeded } from "./lib/deckCards";
import { ensureSeedPackLoaded } from "./lib/questionPackStorage";
import { listNovels, extractCoverKanji } from "./lib/bookStorage";
import type { BookRecord } from "./lib/lexiconDb";
import { speakJapanese } from "./lib/tts";
import ImportDeckModal from "./components/ImportDeckModal";
import DeckFormModal from "./components/DeckFormModal";
import "./pages.css";
import "./decks.css";

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

const JP_MONTHS = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
] as const;

const ID_DAYS = [
  "MINGGU",
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
] as const;

const WEEK_DATA = [
  { label: "S", full: "Senin", pct: 62, mins: 28, cards: 34 },
  { label: "S", full: "Selasa", pct: 40, mins: 18, cards: 22 },
  { label: "R", full: "Rabu", pct: 82, mins: 38, cards: 49 },
  { label: "K", full: "Kamis", pct: 52, mins: 24, cards: 29 },
  { label: "J", full: "Jumat", pct: 94, mins: 45, cards: 61 },
  { label: "S", full: "Sabtu", pct: 32, mins: 15, cards: 19 },
  { label: "M", full: "Minggu", pct: 68, mins: 32, cards: 40 },
] as const;

export default function App() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<"deck" | "mining" | "import" | null>(null);
  const [notice, setNotice] = useState("");
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>(null);

  const user = useAppStore((s) => s.user);
  const decks = useAppStore((s) => s.decks);
  const settings = useAppStore((s) => s.settings);
  const srsCards = useReviewStore((s) => s.srsCards);
  const newIntroduced = useReviewStore((s) => s.newIntroduced);

  useEffect(() => {
    void ensureSeeded();
    void ensureSeedPackLoaded().catch(() => { });
    void listNovels().then(setBooks).catch(() => { });
  }, []);

  const now = new Date();
  const jpMonth = JP_MONTHS[now.getMonth()];
  const dayNumber = now.getDate();
  const idDayName = ID_DAYS[now.getDay()];
  const todayWeekIdx = (now.getDay() + 6) % 7; // 0 = Senin .. 6 = Minggu

  const greetingInfo = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 11) {
      return { id: "SELAMAT PAGI", jp: "おはようございます" };
    }
    if (h >= 11 && h < 15) {
      return { id: "SELAMAT SIANG", jp: "こんにちは" };
    }
    if (h >= 15 && h < 18) {
      return { id: "SELAMAT SORE", jp: "こんにちは" };
    }
    return { id: "SELAMAT MALAM", jp: "こんばんは" };
  }, []);

  const stats = useMemo(() => {
    const m = new Map<string, LiveDeckStats>();
    for (const d of decks) {
      const children = decks.filter((c) => c.parentId === d.id);
      if (children.length > 0) {
        m.set(d.id, aggregateParentStats(d, children, srsCards, newIntroduced, settings, decks));
      } else {
        m.set(d.id, liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings));
      }
    }
    return m;
  }, [decks, srsCards, newIntroduced, settings]);
  const st = (d: DeckItem) => stats.get(d.id)!;

  const rootDecks = useMemo(() => decks.filter((d) => !d.parentId), [decks]);
  const totalDue = useMemo(() => rootDecks.reduce((s, d) => s + (stats.get(d.id)?.due ?? 0), 0), [rootDecks, stats]);
  const firstDueDeck = useMemo(
    () => rootDecks.find((d) => (stats.get(d.id)?.due ?? 0) > 0) ?? rootDecks[0],
    [rootDecks, stats],
  );

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

  // Combine user's real uploaded novels & mangas with sample immersion sources
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

  const activeDayStat = WEEK_DATA[hoveredDay ?? todayWeekIdx];

  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">
            {greetingInfo.id}, {user?.name.toUpperCase()} • {greetingInfo.jp}
          </p>
          <h1>Lanjutkan perjalananmu,<br /><span>一歩ずつ。</span></h1>
          <p className="welcome-copy">Sedikit setiap hari, lebih dekat menuju kefasihan.</p>
        </div>
        <div className="date-stamp" title="Tanggal hari ini">
          <span>{jpMonth}</span>
          <strong>{dayNumber}</strong>
          <small>{idDayName}</small>
        </div>
      </section>

      <section className="overview-grid">
        <article className="review-card">
          <div className="review-top">
            <div><p className="eyebrow light">SESI HARI INI</p><h2>Siap untuk mengingat?</h2></div>
            <div className="ensō">復</div>
          </div>
          <div className="review-stats">
            <div><strong>{totalDue > 0 ? totalDue : 0}</strong><span>kartu menunggu</span></div>
            <div><strong>~{Math.max(5, Math.round(totalDue * 0.4))}</strong><span>menit estimasi</span></div>
            <div><strong>87%</strong><span>retensi</span></div>
          </div>
          <Button className="primary-light" onClick={handleStartReview}>
            Mulai sesi review <Icon name="arrow" size={18} />
          </Button>
        </article>

        <article className="week-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">RITME BELAJAR</p>
              <h3>Minggu ini</h3>
            </div>
            <span className="goal">
              {activeDayStat.full}: {activeDayStat.cards} kartu
            </span>
          </div>
          <div className="week-bars">
            {WEEK_DATA.map((d, i) => {
              const isSelected = (hoveredDay ?? todayWeekIdx) === i;
              return (
                <div
                  className="day cursor-pointer"
                  key={i}
                  onMouseEnter={() => setHoveredDay(i)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => setHoveredDay(i)}
                  title={`${d.full}: ${d.mins} menit • ${d.cards} kartu`}
                >
                  <div className="bar">
                    <i
                      style={{
                        height: `${d.pct}%`,
                        background: isSelected ? "#233c35" : undefined,
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: isSelected ? 700 : 400, color: isSelected ? "#233c35" : undefined }}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="week-note">
            <Icon name="flame" size={16} />{" "}
            <span>
              {activeDayStat.full}: belajar <strong>{activeDayStat.mins} menit</strong> ({activeDayStat.cards} kartu diulas)
            </span>
          </p>
        </article>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">KOLEKSI PRIBADI</p><h2>Deck belajarmu</h2></div>
          <div className="dk-head-actions">
            <Button className="outline-button dk-import-btn" onClick={() => setModal("import")}><Icon name="upload" size={15} /> Impor .apkg</Button>
            <Button className="text-button" onClick={() => setModal("deck")}><Icon name="plus" size={17} /> Buat deck baru</Button>
          </div>
        </div>
        <div className="deck-grid">
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
              <article className={`deck-card dk-card ${isExpanded ? "is-expanded" : ""}`} key={deck.id}>
                <div
                  className={`deck-art ${deck.color} cursor-pointer`}
                  onClick={() => {
                    if (displaySubdecks.length > 0) {
                      toggleDeckExpand();
                    } else {
                      navigate(`/deck/${deck.id}`);
                    }
                  }}
                  title={
                    displaySubdecks.length > 0
                      ? isExpanded
                        ? "Tutup sub-deck"
                        : "Tekan untuk melihat sub-deck"
                      : `Buka dashboard ${deck.title}`
                  }
                >
                  <span>{deck.kanji}</span><i />
                  {imported && <em className="dk-badge">ANKI</em>}
                  {displaySubdecks.length > 0 && (
                    <em
                      className="dk-badge"
                      style={{ right: imported ? "56px" : "14px", background: "rgba(38, 61, 54, 0.85)" }}
                    >
                      {displaySubdecks.length} SUB-DECK
                    </em>
                  )}
                </div>
                <div className="deck-body">
                  <div className="dk-card-top-meta">
                    <span className="deck-level">{deck.level}</span>
                    {displaySubdecks.length > 0 && (
                      <button
                        type="button"
                        className={`dk-subdeck-inline-toggle ${isExpanded ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDeckExpand();
                        }}
                        title={isExpanded ? "Tutup daftar sub-deck" : "Tekan untuk melihat sub-deck"}
                      >
                        <span>{isExpanded ? "Tutup" : `${displaySubdecks.length} Sub-deck`}</span>
                        <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={11} />
                      </button>
                    )}
                  </div>
                  <h3
                    className="cursor-pointer hover:text-coral transition-colors"
                    onClick={() => {
                      if (displaySubdecks.length > 0) {
                        toggleDeckExpand();
                      } else {
                        navigate(`/deck/${deck.id}`);
                      }
                    }}
                  >
                    {deck.title}
                  </h3>
                  <div className="deck-meta">
                    <span><Icon name="clock" size={15} /> {s.due > 0 ? (imported || displaySubdecks.length > 0 ? `${s.reviewDue} ulasan • ${s.newToday} baru` : `${s.due} jatuh tempo`) : "Selesai hari ini"}</span>
                    <span>{deck.total.toLocaleString("id-ID")} kartu</span>
                  </div>
                  <div className="progress"><i style={{ width: `${s.progress}%` }} /></div>

                  {displaySubdecks.length > 0 && isExpanded && (
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
                                className={`dk-quick-chip ${c.color}`}
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
                          return (
                            <div
                              key={c.id}
                              className="dk-card-subdeck-item"
                              onClick={() => navigate(`/deck/${c.id}`)}
                            >
                              <div className="dk-card-subdeck-item-left">
                                <span className={`deck-art ${c.color} dk-subdeck-kanji`}>{c.kanji}</span>
                                <div>
                                  <strong>{c.subdeckName || c.title}</strong>
                                  <small>{c.total.toLocaleString("id-ID")} kartu</small>
                                </div>
                              </div>
                              <div className="dk-card-subdeck-item-right">
                                <button
                                  type="button"
                                  className="dk-subdeck-study-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(cs.due > 0 ? `/deck/${c.id}/review` : `/deck/${c.id}`);
                                  }}
                                >
                                  Belajar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {displaySubdecks.length > 0 && !isExpanded ? (
                    <Button
                      className="deck-open deck-open-ready"
                      onClick={toggleDeckExpand}
                    >
                      Pilih Sub-deck ({displaySubdecks.length}) <Icon name="chevron-down" size={15} />
                    </Button>
                  ) : (
                    <Button
                      className={`deck-open ${s.due > 0 ? "deck-open-ready" : ""}`}
                      onClick={() => navigate(s.due > 0 ? `/deck/${deck.id}/review` : `/deck/${deck.id}`)}
                    >
                      {s.due > 0 ? <>Belajar {displaySubdecks.length > 0 ? "Semua" : "sekarang"} <Icon name="arrow" size={16} /></> : <>Buka deck <Icon name="arrow" size={16} /></>}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mining-section">
        <div className="section-heading">
          <div><p className="eyebrow">DARI DUNIA NYATA</p><h2>Immersion &amp; Sentence Mining</h2></div>
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
              <div
                className={`source-art ${source.art} cursor-pointer`}
                onClick={() => navigate(source.targetPath)}
              >
                {source.art === "video" && <Icon name="play" size={22} />}
                {source.art !== "video" && <span>{source.kanji}</span>}
              </div>
              <div className="source-copy">
                <span>{source.type}</span>
                <h3
                  className="cursor-pointer hover:text-[#c4543f] transition-colors"
                  onClick={() => navigate(source.targetPath)}
                >
                  {source.title}
                </h3>
                <p>{source.detail}</p>
              </div>
              <div className="source-sentence">
                <div className="flex items-center gap-2">
                  <p lang="ja" className="mb-1">{source.sentence}</p>
                  <button
                    type="button"
                    onClick={() => speakJapanese(source.sentence)}
                    title="Dengarkan pengucapan kalimat"
                    className="rounded-md p-1 text-[#88847b] hover:text-[#c4543f] transition-colors shrink-0"
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
        <ImportDeckModal
          onClose={() => setModal(null)}
          onImported={(_id, title) => saveAction(`Deck "${title}" berhasil diimpor`)}
          onStudy={(id) => { setModal(null); navigate(`/deck/${id}/review`); }}
        />
      )}

      {modal === "deck" && (
        <DeckFormModal
          onClose={() => setModal(null)}
          onCreated={(id, title) => {
            saveAction(`Deck "${title}" berhasil dibuat`);
            navigate(`/deck/${id}?add=1`);
          }}
          onImport={() => setModal("import")}
        />
      )}

      {modal === "mining" && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <Button className="modal-close" ariaLabel="Tutup" onClick={() => setModal(null)}><Icon name="close" /></Button>
            <span className="modal-kanji">採</span>
            <p className="eyebrow">MULAI MENAMBANG</p>
            <h2>Pilih sumber immersion</h2>
            <p className="modal-copy">Ubah konten Jepang favoritmu menjadi materi belajar kontekstual.</p>
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

      {notice && <div className="toast"><Icon name="check" size={18} />{notice}</div>}
    </>
  );
}
