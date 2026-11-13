import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon, Button, Tabs } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { reviewedToday, useReviewStore } from "../store/useReviewStore";
import {
  cardState,
  deckUpdatedLabel,
  estimateMinutes,
  forecast,
  forecastLabels,
  formatBytes,
  liveDeckStats,
  relTime,
  type CardStateKey,
} from "../lib/deckStats";
import { addCards, exportDeck, loadDeckCards, removeCards, splitLevel, updateCard, type CardDraft } from "../lib/deckCards";
import { deleteDeckData, getMedia, type StoredCard } from "../lib/deckDb";
import { aggregateParentStats, getLeafDescendantDecks, extractLevelCode } from "../lib/deckSubdecks";
import { toPlain } from "../lib/ankiText";
import CardEditorModal from "../components/CardEditorModal";
import DeckIdentityFields, { type DeckIdentity } from "../components/DeckIdentityFields";
import "../decks.css";

const TABS = ["Ringkasan", "Kartu", "Pengaturan"] as const;
type Tab = (typeof TABS)[number];
const FILTERS: { key: CardStateKey | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "due", label: "Jatuh tempo" },
  { key: "new", label: "Baru" },
  { key: "learn", label: "Belajar" },
  { key: "known", label: "Dikuasai" },
];
const SORTS = ["Urutan asli", "A–Z", "Jadwal terdekat", "Tersulit"] as const;
const PAGE = 100;

type Editor = { mode: "add" } | { mode: "edit"; card: StoredCard } | null;

export default function DeckDetailPage({ notify }: { notify: (m: string) => void }) {
  const { deckId = "" } = useParams<{ deckId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const allDecks = useAppStore((s) => s.decks);
  const deck = allDecks.find((d) => d.id === deckId);
  const childSubdecks = useMemo(() => allDecks.filter((d) => d.parentId === deckId), [allDecks, deckId]);
  const allDescendants = useMemo(() => {
    const res: typeof allDecks = [];
    const walk = (parentId: string) => {
      const children = allDecks.filter((d) => d.parentId === parentId);
      for (const child of children) {
        res.push(child);
        walk(child.id);
      }
    };
    walk(deckId);
    return res;
  }, [allDecks, deckId]);
  const parentDeck = useMemo(
    () => (deck?.parentId ? allDecks.find((d) => d.id === deck.parentId) : undefined),
    [allDecks, deck?.parentId],
  );

  const [subdeckViewMode, setSubdeckViewMode] = useState<"direct" | "all-levels">("direct");

  const ancestorChain = useMemo(() => {
    const chain: typeof allDecks = [];
    let cur = deck?.parentId ? allDecks.find((d) => d.id === deck.parentId) : undefined;
    while (cur) {
      chain.unshift(cur);
      const pid: string | undefined = cur.parentId;
      cur = pid ? allDecks.find((d) => d.id === pid) : undefined;
    }
    return chain;
  }, [allDecks, deck?.parentId]);

  const leafDescendants = useMemo(() => {
    return getLeafDescendantDecks(deckId, allDecks);
  }, [allDecks, deckId]);

  const settings = useAppStore((s) => s.settings);
  const updateDeck = useAppStore((s) => s.updateDeck);
  const removeDeck = useAppStore((s) => s.removeDeck);
  const allSrsCards = useReviewStore((s) => s.srsCards);
  const allIntros = useReviewStore((s) => s.newIntroduced);
  const srsDeck = allSrsCards[deckId];
  const intro = allIntros[deckId];
  const activity = useReviewStore((s) => s.activity[deckId]);
  const forgetCards = useReviewStore((s) => s.forgetCards);
  const resetSrs = useReviewStore((s) => s.removeDeck);

  const initialTab = TABS.find((t) => t.toLowerCase() === params.get("tab")) ?? "Ringkasan";
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [cards, setCards] = useState<StoredCard[] | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<CardStateKey | "all">("all");
  const [subdeckFilter, setSubdeckFilter] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Urutan asli");
  const [page, setPage] = useState(0);
  const plainCacheRef = useRef<Map<string, string>>(new Map());
  const activeAudioRef = useRef<{ audio: HTMLAudioElement; url?: string } | null>(null);

  const getPlainMeaning = useCallback((c: StoredCard): string => {
    const cached = plainCacheRef.current.get(c.id);
    if (cached !== undefined) return cached;
    const computed = toPlain(c.meaning);
    plainCacheRef.current.set(c.id, computed);
    return computed;
  }, []);

  const stopRowAudio = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.audio.pause();
      if (activeAudioRef.current.url) URL.revokeObjectURL(activeAudioRef.current.url);
      activeAudioRef.current = null;
    }
  }, []);

  useEffect(() => stopRowAudio, [stopRowAudio]);

  const playCardAudio = useCallback(
    async (c: StoredCard) => {
      stopRowAudio();
      if (!c.audio) return;
      const blob = await getMedia(deckId, c.audio).catch(() => undefined);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioRef.current = { audio, url };
      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (activeAudioRef.current?.url === url) activeAudioRef.current = null;
      };
      audio.addEventListener("ended", cleanup, { once: true });
      audio.addEventListener("error", cleanup, { once: true });
      void audio.play().catch(cleanup);
    },
    [deckId, stopRowAudio],
  );

  const setTab = (t: Tab) => {
    setTabState(t);
    const next = new URLSearchParams(params);
    if (t === "Ringkasan") next.delete("tab");
    else next.set("tab", t.toLowerCase());
    setParams(next, { replace: true });
  };

  const reload = useCallback(() => {
    loadDeckCards(deckId)
      .then(setCards)
      .catch(() => setCards([]));
  }, [deckId]);

  useEffect(() => {
    setCards(null);
    reload();
  }, [reload]);

  // `?add=1` opens the card editor straight away (used after creating a deck).
  useEffect(() => {
    if (params.get("add") === "1") {
      setEditor({ mode: "add" });
      setTabState("Kartu");
      const next = new URLSearchParams(params);
      next.delete("add");
      next.set("tab", "kartu");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const stats = useMemo(() => {
    if (!deck) return null;
    if (childSubdecks.length > 0) {
      return aggregateParentStats(deck, childSubdecks, allSrsCards, allIntros, settings, allDecks);
    }
    return liveDeckStats(deck, srsDeck, intro, settings);
  }, [deck, childSubdecks, allSrsCards, allIntros, srsDeck, intro, settings]);

  const fc = useMemo(() => {
    if (childSubdecks.length > 0) {
      return forecast(childSubdecks.map((cd) => allSrsCards[cd.id]));
    }
    return forecast([srsDeck]);
  }, [childSubdecks, allSrsCards, srsDeck]);
  const fcLabels = useMemo(() => forecastLabels(), []);

  const getCardSrs = useCallback(
    (c: StoredCard) => allSrsCards[c.deckId]?.[c.id] ?? srsDeck?.[c.id],
    [allSrsCards, srsDeck],
  );

  useEffect(() => {
    plainCacheRef.current.clear();
  }, [cards]);

  const counts = useMemo(() => {
    const out: Record<CardStateKey | "all", number> = { all: 0, new: 0, due: 0, learn: 0, known: 0 };
    for (const c of cards ?? []) {
      out.all++;
      out[cardState(getCardSrs(c)).key]++;
    }
    return out;
  }, [cards, getCardSrs]);

  const visible = useMemo(() => {
    if (!cards) return [];
    const s = q.trim().toLowerCase();
    let list = cards.filter((c) => {
      if (subdeckFilter !== "all" && c.deckId !== subdeckFilter) return false;
      const cSrs = getCardSrs(c);
      if (filter !== "all" && cardState(cSrs).key !== filter) return false;
      if (!s) return true;
      return (
        c.word.toLowerCase().includes(s) ||
        c.reading.includes(s) ||
        getPlainMeaning(c).toLowerCase().includes(s) ||
        c.tags?.some((t) => t.toLowerCase().includes(s))
      );
    });
    if (sort === "A–Z") list = [...list].sort((a, b) => a.reading.localeCompare(b.reading, "ja") || a.word.localeCompare(b.word, "ja"));
    if (sort === "Jadwal terdekat") list = [...list].sort((a, b) => (getCardSrs(a)?.nextReview ?? Infinity) - (getCardSrs(b)?.nextReview ?? Infinity));
    if (sort === "Tersulit") list = [...list].sort((a, b) => (getCardSrs(a)?.easeFactor ?? 9) - (getCardSrs(b)?.easeFactor ?? 9));
    return list;
  }, [cards, q, filter, sort, subdeckFilter, getCardSrs, getPlainMeaning]);

  const hardest = useMemo(() => {
    if (!cards || !srsDeck) return [];
    return cards
      .filter((c) => srsDeck[c.id] && srsDeck[c.id].easeFactor < 2.5)
      .sort((a, b) => srsDeck[a.id].easeFactor - srsDeck[b.id].easeFactor)
      .slice(0, 5);
  }, [cards, srsDeck]);

  useEffect(() => setPage(0), [q, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageSlice = useMemo(
    () => visible.slice(safePage * PAGE, (safePage + 1) * PAGE),
    [visible, safePage],
  );

  if (!deck || !stats) {
    return (
      <div className="dd-missing">
        <span className="dd-missing-kanji" aria-hidden="true">迷</span>
        <h1>Deck tidak ditemukan</h1>
        <p>Deck ini mungkin sudah dihapus.</p>
        <Button className="pg-primary" onClick={() => navigate("/deck")}><Icon name="arrow-left" size={15} /> Kembali ke Deck Saya</Button>
      </div>
    );
  }

  const imported = deck.source === "apkg";
  const canStudy = stats.due > 0;
  const study = () => navigate(`/deck/${deck.id}/review`);
  const fcMax = Math.max(1, ...fc);
  const comp = [
    { key: "known", label: "Dikuasai", n: stats.learned },
    { key: "learn", label: "Sedang dipelajari", n: stats.learning },
    { key: "new", label: "Belum dipelajari", n: stats.newTotal },
  ];

  // ------------------------------------------------------------------ actions
  const saveCard = async (draft: CardDraft, again: boolean) => {
    if (editor?.mode === "edit") {
      const next = await updateCard(editor.card, draft);
      setCards((cs) => cs?.map((c) => (c.id === next.id ? next : c)) ?? cs);
      notify(`Kartu “${next.word}” diperbarui`);
      setEditor(null);
    } else {
      const [created] = await addCards(deck.id, [draft]);
      setCards((cs) => [...(cs ?? []), created]);
      notify(`“${created.word}” ditambahkan`);
      if (!again) setEditor(null);
    }
  };

  const deleteCard = async (card: StoredCard) => {
    await removeCards(deck.id, [card.id]);
    setCards((cs) => cs?.filter((c) => c.id !== card.id) ?? cs);
    setEditor(null);
    notify(`Kartu “${card.word}” dihapus`);
  };

  const resetCard = (card: StoredCard) => {
    forgetCards(deck.id, [card.id]);
    notify(`Progres “${card.word}” direset`);
  };

  return (
    <>
      <section className={`dd-hero deck-art ${deck.color}`}>
        <i />
        <nav className="dd-breadcrumbs" aria-label="Navigasi hirarki deck">
          <button
            type="button"
            className="dd-breadcrumb-item"
            onClick={() => navigate("/deck")}
          >
            <Icon name="arrow-left" size={13} /> Deck Saya
          </button>
          {ancestorChain.map((anc) => (
            <span key={anc.id} className="dd-breadcrumb-step">
              <span className="dd-breadcrumb-sep">›</span>
              <button
                type="button"
                className="dd-breadcrumb-item"
                onClick={() => navigate(`/deck/${anc.id}`)}
              >
                {anc.subdeckName || anc.title}
              </button>
            </span>
          ))}
          {ancestorChain.length > 0 && (
            <span className="dd-breadcrumb-step">
              <span className="dd-breadcrumb-sep">›</span>
              <span className="dd-breadcrumb-current">{deck.subdeckName || deck.title}</span>
            </span>
          )}
        </nav>
        <div className="dd-hero-main">
          <span className="dd-hero-kanji" aria-hidden="true">{deck.kanji}</span>
          <div className="dd-hero-copy">
            <span className="dd-hero-level">
              {parentDeck && <b>SUB-DECK • </b>}
              {deck.level}
              {imported && <em>ANKI</em>}
            </span>
            <h1>{deck.title}</h1>
            <p>
              {deck.total.toLocaleString("id-ID")} kartu • diperbarui {deckUpdatedLabel(deck).toLowerCase()}
              {activity && <> • terakhir belajar {relTime(activity.last).toLowerCase()}</>}
            </p>
          </div>
          <div className="dd-hero-actions">
            <Button className="dd-ghost" onClick={() => setEditor({ mode: "add" })}><Icon name="plus" size={15} /> Tambah kartu</Button>
            <Button className="primary-light" onClick={study} disabled={!canStudy}>
              {canStudy ? <>Belajar sekarang <b className="dd-pill">{stats.due}</b> <Icon name="arrow" size={15} /></> : <>Selesai hari ini <Icon name="check" size={15} /></>}
            </Button>
          </div>
        </div>
      </section>

      <div className="dd-tabs">
        <Tabs items={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Ringkasan" && (
        <div className="dd-overview">
          {childSubdecks.length > 0 && (
            <article className="dd-subdecks" style={{ gridColumn: "1 / -1" }}>
              <div className="dd-panel-head">
                <div>
                  <h3>Pilih Sub-deck untuk Belajar</h3>
                  <span className="goal">Tekan sub-deck di bawah untuk memilih level belajar (misal N5 dulu atau N1)</span>
                </div>
                {leafDescendants.length > childSubdecks.length && (
                  <div className="dd-subdeck-view-switcher">
                    <button
                      type="button"
                      className={`dd-subdeck-view-btn ${subdeckViewMode === "direct" ? "active" : ""}`}
                      onClick={() => setSubdeckViewMode("direct")}
                    >
                      Struktur Folder ({childSubdecks.length})
                    </button>
                    <button
                      type="button"
                      className={`dd-subdeck-view-btn ${subdeckViewMode === "all-levels" ? "active" : ""}`}
                      onClick={() => setSubdeckViewMode("all-levels")}
                    >
                      Pilih Level N5–N1 ({leafDescendants.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="dd-subdeck-grid">
                {(subdeckViewMode === "all-levels" && leafDescendants.length > 0
                  ? [...leafDescendants].sort((a, b) => {
                      const order: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
                      const aCode = extractLevelCode(a.title) ?? extractLevelCode(a.subdeckName || "") ?? "Z";
                      const bCode = extractLevelCode(b.title) ?? extractLevelCode(b.subdeckName || "") ?? "Z";
                      return (order[aCode] ?? 9) - (order[bCode] ?? 9);
                    })
                  : childSubdecks
                ).map((sub) => {
                  const subChildren = allDecks.filter((d) => d.parentId === sub.id);
                  const isContainer = subChildren.length > 0;
                  const subSt = isContainer
                    ? aggregateParentStats(sub, subChildren, allSrsCards, allIntros, settings, allDecks)
                    : liveDeckStats(sub, allSrsCards[sub.id], allIntros[sub.id], settings);

                  return (
                    <div
                      key={sub.id}
                      className="dd-subdeck-card cursor-pointer"
                      onClick={() => {
                        if (isContainer) {
                          navigate(`/deck/${sub.id}`);
                        } else {
                          navigate(subSt.due > 0 ? `/deck/${sub.id}/review` : `/deck/${sub.id}`);
                        }
                      }}
                    >
                      <div className="dd-subdeck-card-top">
                        <div className={`dd-subdeck-card-art ${sub.color}`}>
                          <span>{sub.kanji}</span>
                        </div>
                        <div className="dd-subdeck-card-info">
                          <h4 className="dd-subdeck-card-title">{sub.subdeckName || sub.title}</h4>
                          <div className="dd-subdeck-card-pills">
                            <span className="dk-subdeck-pill">{sub.level}</span>
                            {isContainer && (
                              <span className="dk-badge-inline" style={{ fontSize: "10px" }}>
                                {subChildren.length} Sub-deck
                              </span>
                            )}
                            <small style={{ color: "var(--tinta-2)" }}>{sub.total.toLocaleString("id-ID")} kartu</small>
                          </div>
                        </div>
                      </div>

                      <div className="dd-subdeck-card-stats">
                        <div className="anki-stats-group" style={{ fontSize: "11px", padding: "2px 8px" }}>
                          <span
                            className={`anki-num anki-num-new ${subSt.newToday > 0 ? "has-cards" : "zero"}`}
                            title={`${subSt.newToday} kartu baru`}
                          >
                            {subSt.newToday}
                          </span>
                          <span
                            className={`anki-num anki-num-learn ${subSt.learning > 0 ? "has-cards" : "zero"}`}
                            title={`${subSt.learning} sedang belajar`}
                          >
                            {subSt.learning}
                          </span>
                          <span
                            className={`anki-num anki-num-due ${subSt.reviewDue > 0 ? "has-cards" : "zero"}`}
                            title={`${subSt.reviewDue} ulasan jatuh tempo`}
                          >
                            {subSt.reviewDue}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: subSt.due > 0 ? "var(--shu)" : "var(--tinta-2)" }}>
                          {subSt.due > 0 ? `${subSt.due} tugas` : "✓ Tuntas"}
                        </span>
                      </div>

                      <div className="dd-subdeck-card-actions" onClick={(e) => e.stopPropagation()}>
                        <Button
                          className="primary-light"
                          style={{ flex: 1, padding: "6px 12px", fontSize: "12px", justifyContent: "center" }}
                          onClick={() => navigate(subSt.due > 0 ? `/deck/${sub.id}/review` : `/deck/${sub.id}`)}
                        >
                          {subSt.due > 0 ? (isContainer ? "Belajar Semua" : `Belajar ${sub.subdeckName || sub.title}`) : "Buka Deck"}
                        </Button>
                        {isContainer && (
                          <Button
                            className="outline-button"
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                            onClick={() => navigate(`/deck/${sub.id}`)}
                            title="Buka sub-deck di dalamnya"
                          >
                            Buka Sub-deck
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          )}

          <article className="dd-today">
            <p className="eyebrow light">
              {childSubdecks.length > 0 ? "SESI GABUNGAN SEMUA SUB-DECK" : "SESI HARI INI"}
            </p>
            <h2>
              {canStudy
                ? `${stats.due} kartu menunggu ${childSubdecks.length > 0 ? "di semua sub-deck" : ""}`
                : deck.total === 0
                  ? "Deck masih kosong"
                  : "Semua beres untuk hari ini"}
            </h2>
            <div className="dd-today-stats">
              <div><strong>{stats.reviewDue}</strong><span>ulasan</span></div>
              <div><strong>{stats.newToday}</strong><span>kartu baru</span></div>
              <div><strong>~{canStudy ? estimateMinutes(stats.reviewDue, stats.newToday) : 0}</strong><span>menit</span></div>
              <div><strong>{reviewedToday(activity)}</strong><span>sudah diulas</span></div>
            </div>
            {deck.total === 0 ? (
              <Button className="primary-light" onClick={() => setEditor({ mode: "add" })}><Icon name="plus" size={15} /> Tambah kartu pertama</Button>
            ) : (
              <Button className="primary-light" onClick={study} disabled={!canStudy}>
                {canStudy ? <>Mulai sesi {childSubdecks.length > 0 ? "Semua Sub-deck" : ""} <Icon name="arrow" size={15} /></> : <>Kembali besok <Icon name="check" size={15} /></>}
              </Button>
            )}
          </article>

          <article className="dd-panel dd-comp">
            <div className="dd-panel-head"><h3>Komposisi deck</h3><span className="goal">{stats.progress}% dikuasai</span></div>
            <div className="dd-stack" role="img" aria-label={comp.map((c) => `${c.label} ${c.n}`).join(", ")}>
              {comp.map((c) => c.n > 0 && <i key={c.key} className={c.key} style={{ flexGrow: c.n }} />)}
              {deck.total === 0 && <i className="empty" style={{ flexGrow: 1 }} />}
            </div>
            <ul className="dd-legend">
              {comp.map((c) => (
                <li key={c.key}><i className={c.key} /><span>{c.label}</span><b>{c.n.toLocaleString("id-ID")}</b></li>
              ))}
            </ul>
          </article>

          <article className="dd-panel dd-forecast">
            <div className="dd-panel-head"><h3>Perkiraan 7 hari</h3><small>{fc.reduce((a, b) => a + b, 0)} ulasan terjadwal</small></div>
            <div className="dd-bars">
              {fc.map((n, i) => (
                <div key={i} className={`dd-bar ${i === 0 ? "today" : ""}`}>
                  <b>{n || ""}</b>
                  <span><i style={{ height: `${(n / fcMax) * 100}%` }} /></span>
                  <small>{fcLabels[i]}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="dd-panel dd-hard">
            <div className="dd-panel-head"><h3>Kartu paling sulit</h3><button className="imp-link" onClick={() => { setSort("Tersulit"); setFilter("all"); setTab("Kartu"); }}>Lihat semua</button></div>
            {hardest.length === 0 ? (
              <p className="dd-muted">Belum ada data. Kartu yang sering kamu lupakan akan muncul di sini.</p>
            ) : (
              <ul>
                {hardest.map((c) => (
                  <li key={c.id}>
                    <strong lang="ja">{c.word}</strong>
                    <span>{getPlainMeaning(c)}</span>
                    <em>{Math.round(((srsDeck?.[c.id]?.easeFactor ?? 2.5) / 2.5) * 100)}%</em>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {deck.meta && (
            <dl className="dk-meta dd-meta">
              <div><dt>File sumber</dt><dd title={deck.meta.fileName}>{deck.meta.fileName}</dd></div>
              <div><dt>Ukuran</dt><dd>{formatBytes(deck.meta.fileSize)} • {deck.meta.format}</dd></div>
              <div><dt>Diimpor</dt><dd>{new Date(deck.meta.importedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
              <div><dt>Media</dt><dd>{deck.meta.mediaCount.toLocaleString("id-ID")} file</dd></div>
              {deck.meta.noteTypes.length > 0 && <div className="wide"><dt>Tipe catatan</dt><dd>{deck.meta.noteTypes.join(", ")}</dd></div>}
              {deck.meta.subdecks.length > 1 && (
                <div className="wide"><dt>Sub-deck</dt><dd className="dk-chips">{deck.meta.subdecks.map((s) => <span key={s}>{s.split("::").pop()}</span>)}</dd></div>
              )}
            </dl>
          )}
        </div>
      )}

      {tab === "Kartu" && (
        <section className="dd-cards">
          <div className="dd-cards-bar">
            <div className="dd-filters" role="tablist" aria-label="Filter status kartu">
              {FILTERS.map((f) => (
                <button key={f.key} role="tab" aria-selected={filter === f.key} className={`dd-chip ${f.key} ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
                  {f.label} <b>{counts[f.key]}</b>
                </button>
              ))}
            </div>
            <div className="pg-toolbar-right">
              {childSubdecks.length > 0 && (
                <label className="pg-select">
                  <Icon name="cards" size={14} />
                  <select
                    value={subdeckFilter}
                    onChange={(e) => setSubdeckFilter(e.target.value)}
                    aria-label="Filter sub-deck"
                  >
                    <option value="all">Semua Sub-deck ({childSubdecks.length})</option>
                    {childSubdecks.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subdeckName || sub.title} ({sub.total} kartu)
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="pg-search"><Icon name="search" size={15} /><input id="dd-card-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kata, arti, tag…" /></label>
              <label className="pg-select"><Icon name="filter" size={14} />
                <select id="dd-card-sort" value={sort} onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])} aria-label="Urutkan kartu">
                  {SORTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <Button className="pg-primary" onClick={() => setEditor({ mode: "add" })}><Icon name="plus" size={15} /> Tambah</Button>
            </div>
          </div>

          {cards !== null && cards.length === 0 ? (
            <div className="dd-empty">
              <div className="imp-stack" aria-hidden="true"><span className="c1">語</span><span className="c2">単</span><span className="c3">札</span></div>
              <h3>Deck ini belum punya kartu</h3>
              <p>Tambahkan kosakata secara manual, atau kirim kata dari halaman Sentence Mining.</p>
              <div className="imp-done-actions">
                <Button className="outline-button" onClick={() => navigate("/mining")}><Icon name="mine" size={15} /> Buka Mining</Button>
                <Button className="pg-primary" onClick={() => setEditor({ mode: "add" })}><Icon name="plus" size={15} /> Tambah kartu pertama</Button>
              </div>
            </div>
          ) : (
            <div className="dd-table" role="table" aria-label="Daftar kartu">
              <div className="dd-row dd-row-head" role="row">
                <span>Kata</span><span>Bacaan</span><span>Arti</span><span>Status</span><span />
              </div>
              {cards === null && Array.from({ length: 6 }).map((_, i) => <div key={i} className="dd-row skeleton-row"><i /><i /><i /></div>)}
              {pageSlice.map((c) => {
                const st = cardState(getCardSrs(c));
                return (
                  <div key={c.id} className="dd-row" role="row" tabIndex={0} onClick={() => setEditor({ mode: "edit", card: c })} onKeyDown={(e) => e.key === "Enter" && setEditor({ mode: "edit", card: c })}>
                    <strong lang="ja">
                      {c.word}
                      {c.subdeck && <span className="dk-subdeck-pill ml-1.5">{c.subdeck}</span>}
                      {(c.audio || c.image) && (
                        <span className="dd-media" onClick={(e) => e.stopPropagation()}>
                          {c.audio && (
                            <button
                              type="button"
                              aria-label={`Putar audio ${c.word}`}
                              title={`Putar audio (${c.audio})`}
                              onClick={() => void playCardAudio(c)}
                            >
                              <Icon name="volume" size={12} />
                            </button>
                          )}
                          {c.image && <Icon name="eye" size={12} />}
                        </span>
                      )}
                    </strong>
                    <span className="dk-read" lang="ja">{c.reading}</span>
                    <span className="dk-mean">{getPlainMeaning(c)}{c.tags?.length > 0 && <span className="dd-tags">{c.tags.slice(0, 3).map((t) => <em key={t}>{t}</em>)}</span>}</span>
                    <em className={`dk-state ${st.key}`}>{st.label}</em>
                    <span className="dd-row-actions" onClick={(e) => e.stopPropagation()}>
                      <button aria-label={`Edit ${c.word}`} title="Edit" onClick={() => setEditor({ mode: "edit", card: c })}><Icon name="edit" size={14} /></button>
                      <button aria-label={`Reset progres ${c.word}`} title="Reset progres" disabled={!srsDeck?.[c.id]} onClick={() => resetCard(c)}><Icon name="refresh" size={14} /></button>
                      <button aria-label={`Hapus ${c.word}`} title="Hapus" className="danger" onClick={() => void deleteCard(c)}><Icon name="trash" size={14} /></button>
                    </span>
                  </div>
                );
              })}
              {cards !== null && visible.length === 0 && <p className="pg-empty">Tidak ada kartu yang cocok.</p>}
            </div>
          )}
          {visible.length > PAGE && (
            <div className="dd-more">
              <span>
                Menampilkan {(safePage * PAGE + 1).toLocaleString("id-ID")}–
                {Math.min(visible.length, (safePage + 1) * PAGE).toLocaleString("id-ID")} dari{" "}
                {visible.length.toLocaleString("id-ID")} kartu (Halaman {safePage + 1} / {totalPages})
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  className="outline-button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <Icon name="arrow-left" size={14} /> Sebelumnya
                </Button>
                <Button
                  className="outline-button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  Berikutnya <Icon name="arrow" size={14} />
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "Pengaturan" && (
        <DeckSettings
          key={deck.id}
          deck={deck}
          onSave={(identity) => {
            updateDeck(deck.id, { title: identity.title.trim() || deck.title, level: `${identity.level} • ${identity.kind}`, kind: identity.kind, color: identity.color, kanji: identity.kanji.trim() || deck.kanji });
            notify("Pengaturan deck disimpan");
          }}
          onExport={async (fmt) => {
            const n = await exportDeck(deck.id, deck.title, fmt);
            notify(`${n} kartu diekspor ke ${fmt.toUpperCase()}`);
          }}
          onReset={() => {
            resetSrs(deck.id);
            notify(`Progres “${deck.title}” direset`);
          }}
          onDelete={async () => {
            removeDeck(deck.id);
            resetSrs(deck.id);
            await deleteDeckData(deck.id).catch(() => undefined);
            notify(`Deck “${deck.title}” dihapus`);
            navigate("/deck");
          }}
        />
      )}

      {editor && (
        <CardEditorModal
          key={editor.mode === "edit" ? editor.card.id : "new"}
          deckTitle={deck.title}
          card={editor.mode === "edit" ? editor.card : undefined}
          onClose={() => setEditor(null)}
          onSave={saveCard}
          onDelete={editor.mode === "edit" ? () => void deleteCard(editor.card) : undefined}
        />
      )}
    </>
  );
}

function DeckSettings({
  deck,
  onSave,
  onExport,
  onReset,
  onDelete,
}: {
  deck: { title: string; level: string; kind: string; color: string; kanji: string };
  onSave: (v: DeckIdentity) => void;
  onExport: (fmt: "csv" | "json") => Promise<void>;
  onReset: () => void;
  onDelete: () => Promise<void>;
}) {
  const initial = useMemo<DeckIdentity>(() => ({ title: deck.title, ...splitLevel(deck), color: deck.color, kanji: deck.kanji }), [deck]);
  const [form, setForm] = useState(initial);
  const [armed, setArmed] = useState<"reset" | "delete" | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  useEffect(() => setForm(initial), [initial]);

  return (
    <div className="dd-settings">
      <section className="imp-panel">
        <h4>Identitas deck</h4>
        <DeckIdentityFields value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} idPrefix="dd-set" onSubmit={() => dirty && onSave(form)} />
        <div className="dd-settings-foot">
          <Button className="outline-button" disabled={!dirty} onClick={() => setForm(initial)}>Batalkan</Button>
          <Button className="pg-primary" disabled={!dirty} onClick={() => onSave(form)}><Icon name="check" size={15} /> Simpan perubahan</Button>
        </div>
      </section>

      <div className="dd-settings-side">
        <section className="imp-panel">
          <h4>Ekspor data</h4>
          <p className="dd-muted">Unduh isi deck untuk cadangan atau dipakai di aplikasi lain. Media tidak ikut diekspor.</p>
          <div className="dd-export">
            <Button className="outline-button" onClick={() => void onExport("csv")}><Icon name="download" size={14} /> CSV (Excel / Anki)</Button>
            <Button className="outline-button" onClick={() => void onExport("json")}><Icon name="download" size={14} /> JSON + jadwal</Button>
          </div>
        </section>

        <section className="imp-panel dd-danger">
          <h4>Zona berbahaya</h4>
          <div className="imp-opt">
            <div><strong>Reset progres</strong><small>Semua kartu kembali menjadi kartu baru.</small></div>
            <Button className={`outline-button warn ${armed === "reset" ? "armed" : ""}`} onClick={() => (armed === "reset" ? (onReset(), setArmed(null)) : setArmed("reset"))}>
              <Icon name="refresh" size={14} /> {armed === "reset" ? "Yakin? Klik lagi" : "Reset"}
            </Button>
          </div>
          <div className="imp-opt">
            <div><strong>Hapus deck</strong><small>Kartu, media, dan jadwal dihapus permanen.</small></div>
            <Button className={`outline-button warn ${armed === "delete" ? "armed" : ""}`} onClick={() => (armed === "delete" ? void onDelete() : setArmed("delete"))}>
              <Icon name="trash" size={14} /> {armed === "delete" ? "Yakin? Klik lagi" : "Hapus"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
