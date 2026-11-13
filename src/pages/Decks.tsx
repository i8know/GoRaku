import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, PageHead, Tabs } from "../ui";
import { useAppStore, type DeckItem } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";
import { deckUpdatedLabel, liveDeckStats, type LiveDeckStats } from "../lib/deckStats";
import { aggregateParentStats, getLeafDescendantDecks, extractLevelCode } from "../lib/deckSubdecks";
import { ensureSeeded } from "../lib/deckCards";
import ImportDeckModal from "../components/ImportDeckModal";
import DeckFormModal from "../components/DeckFormModal";

const kinds = ["Semua", "Core", "Anime", "Novel", "Manga", "YouTube", "Dari Anki"] as const;
const statusFilters = ["Semua", "Perlu diulas", "Selesai hari ini"] as const;
const sorts = ["Jatuh tempo", "Progres", "Ukuran", "Terbaru"] as const;

export default function DecksPage({ notify }: { onCreate?: () => void; notify: (m: string) => void }) {
  const navigate = useNavigate();
  const decks = useAppStore((s) => s.decks);
  const settings = useAppStore((s) => s.settings);
  const srsCards = useReviewStore((s) => s.srsCards);
  const newIntroduced = useReviewStore((s) => s.newIntroduced);

  const [kind, setKind] = useState<(typeof kinds)[number]>("Semua");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("Semua");
  const [sort, setSort] = useState<(typeof sorts)[number]>("Jatuh tempo");
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set());
  const initialExpandedRef = useRef(false);
  const dragDepth = useRef(0);

  // Ensure starter decks are seeded in IndexedDB on first load
  useEffect(() => {
    void ensureSeeded();
  }, []);

  const subdecksByParent = useMemo(() => {
    const map = new Map<string, DeckItem[]>();
    for (const d of decks) {
      if (d.parentId) {
        const arr = map.get(d.parentId) ?? [];
        arr.push(d);
        map.set(d.parentId, arr);
      }
    }
    return map;
  }, [decks]);

  const stats = useMemo(() => {
    const m = new Map<string, LiveDeckStats>();
    for (const d of decks) {
      const children = subdecksByParent.get(d.id) ?? [];
      if (children.length > 0) {
        m.set(d.id, aggregateParentStats(d, children, srsCards, newIntroduced, settings, decks));
      } else {
        m.set(d.id, liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings));
      }
    }
    return m;
  }, [decks, subdecksByParent, srsCards, newIntroduced, settings]);
  const st = (d: DeckItem) => stats.get(d.id)!;

  // Root decks are top-level decks (no parentId)
  const rootDecks = useMemo(() => decks.filter((d) => !d.parentId), [decks]);

  const allParentIds = useMemo(() => {
    return decks.filter((d) => (subdecksByParent.get(d.id) ?? []).length > 0).map((d) => d.id);
  }, [decks, subdecksByParent]);

  const allExpanded = allParentIds.length > 0 && allParentIds.every((id) => expandedParents.has(id));

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedParents(new Set());
    } else {
      setExpandedParents(new Set(allParentIds));
    }
  };

  const getRootDeckId = (deckId: string): string => {
    let cur = decks.find((d) => d.id === deckId);
    const visited = new Set<string>();
    while (cur?.parentId && !visited.has(cur.id)) {
      visited.add(cur.id);
      const parent = decks.find((d) => d.id === cur!.parentId);
      if (!parent) break;
      cur = parent;
    }
    return cur?.id ?? deckId;
  };

  const isDescendantOf = (candidateId: string, ancestorId: string): boolean => {
    let cur = decks.find((d) => d.id === candidateId);
    const visited = new Set<string>();
    while (cur?.parentId && !visited.has(cur.id)) {
      if (cur.parentId === ancestorId) return true;
      visited.add(cur.id);
      cur = decks.find((d) => d.id === cur!.parentId);
    }
    return false;
  };

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        for (const openId of prev) {
          if (isDescendantOf(openId, id)) next.delete(openId);
        }
        return next;
      }
      // Single-active root deck rule: keep only expansions within the same root deck tree
      const targetRootId = getRootDeckId(id);
      const next = new Set<string>();
      for (const openId of prev) {
        if (getRootDeckId(openId) === targetRootId) {
          next.add(openId);
        }
      }
      next.add(id);
      return next;
    });
  };

  const list = useMemo(() => {
    const s = q.toLowerCase();
    const f = rootDecks.filter((d) => {
      const children = subdecksByParent.get(d.id) ?? [];
      const matchKind =
        kind === "Semua" ||
        (kind === "Dari Anki"
          ? d.source === "apkg" || children.some((c) => c.source === "apkg")
          : d.kind === kind || children.some((c) => c.kind === kind));

      const matchSearch =
        d.title.toLowerCase().includes(s) ||
        d.level.toLowerCase().includes(s) ||
        children.some((c) => c.title.toLowerCase().includes(s) || c.level.toLowerCase().includes(s));

      if (!matchKind || !matchSearch) return false;
      const due = st(d).due;
      if (statusFilter === "Perlu diulas") return due > 0;
      if (statusFilter === "Selesai hari ini") return due === 0 && d.total > 0;
      return true;
    });

    return [...f].sort((a, b) => {
      if (sort === "Jatuh tempo") return st(b).due - st(a).due;
      if (sort === "Progres") return st(b).progress - st(a).progress;
      if (sort === "Ukuran") return b.total - a.total;
      const ts = (d: DeckItem) => d.updatedAt ?? d.meta?.importedAt ?? (Number(d.id) || 0);
      return ts(b) - ts(a);
    });
  }, [rootDecks, subdecksByParent, kind, statusFilter, sort, q, stats]);

  // If search query is active, auto-expand parents whose children matched
  useEffect(() => {
    if (!q.trim()) return;
    const s = q.toLowerCase();
    const toExpand = new Set<string>();
    for (const [parentId, children] of subdecksByParent.entries()) {
      if (children.some((c) => c.title.toLowerCase().includes(s) || c.level.toLowerCase().includes(s))) {
        toExpand.add(parentId);
      }
    }
    if (toExpand.size > 0) {
      setExpandedParents((prev) => new Set([...prev, ...toExpand]));
    }
  }, [q, subdecksByParent]);

  const totalCards = rootDecks.reduce((s, d) => s + d.total, 0);
  const totalDue = rootDecks.reduce((s, d) => s + st(d).due, 0);
  const totalCompleted = rootDecks.filter((d) => d.total > 0 && st(d).due === 0).length;
  const importedCount = rootDecks.filter(
    (d) => d.source === "apkg" || (subdecksByParent.get(d.id)?.some((c) => c.source === "apkg") ?? false),
  ).length;

  const openImport = (file: File | null = null) => {
    setImportFile(file);
    setImportOpen(true);
  };

  // Page-wide drag & drop: dropping an .apkg anywhere opens the wizard with that file.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e) || importOpen) return;
      dragDepth.current++;
      setPageDrag(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setPageDrag(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e) && !importOpen) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e) || importOpen) return;
      e.preventDefault();
      dragDepth.current = 0;
      setPageDrag(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) openImport(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [importOpen]);

  const handleCreated = (id: string, title: string) => {
    setCreateOpen(false);
    notify(`Deck "${title}" berhasil dibuat`);
    navigate(`/deck/${id}?add=1`);
  };

  const renderTreeRow = (deck: DeckItem, depth = 0, isLast = true): ReactNode => {
    const s = st(deck);
    const imported = deck.source === "apkg";
    const children = subdecksByParent.get(deck.id) ?? [];
    const isExpanded = expandedParents.has(deck.id);
    const isSubdeck = depth > 0;

    return (
      <div key={deck.id}>
        <div
          className={`dk-list-row ${isSubdeck ? "dk-list-subdeck-row dk-list-subdeck-row-deep" : ""}`}
        >
          <div className="dk-list-title-cell" style={{ paddingLeft: `${Math.max(12, depth * 24 + 12)}px` }}>
            {isSubdeck && (
              <span className="dk-tree-branch" aria-hidden="true">
                {isLast ? "└─" : "├─"}
              </span>
            )}
            {children.length > 0 ? (
              <button
                type="button"
                className="dk-expand-btn mr-1"
                onClick={() => toggleExpand(deck.id)}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? `Tutup sub-deck ${deck.title}` : `Buka sub-deck ${deck.title}`}
                title={isExpanded ? "Tutup sub-deck" : "Buka sub-deck"}
              >
                <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={14} />
              </button>
            ) : isSubdeck ? (
              <span style={{ width: "16px", display: "inline-block" }} />
            ) : null}
            <button
              type="button"
              className="flex items-center gap-3 text-left bg-transparent border-0 p-0 min-w-0 cursor-pointer hover:text-[var(--ai)]"
              aria-expanded={children.length > 0 ? isExpanded : undefined}
              title={children.length > 0 ? (isExpanded ? "Tekan untuk menutup sub-deck" : "Tekan untuk melihat sub-deck") : `Buka ${deck.title}`}
              onClick={() => {
                if (children.length > 0) {
                  toggleExpand(deck.id);
                } else {
                  navigate(s.due > 0 ? `/deck/${deck.id}/review` : `/deck/${deck.id}`);
                }
              }}
            >
              <span className={`dk-mini-art deck-art ${deck.color} ${isSubdeck ? "dk-subdeck-mini-art" : ""}`}>
                <span>{deck.kanji}</span>
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <strong>{deck.subdeckName || deck.title}</strong>
                  {children.length > 0 && (
                    <span className="dk-subdeck-pill">{children.length} Sub-deck</span>
                  )}
                  {isSubdeck && !deck.subdeckName && (
                    <small className="dk-subdeck-badge-sub">Sub-deck</small>
                  )}
                </span>
                <small>{deckUpdatedLabel(deck)}</small>
              </span>
            </button>
          </div>
          <div className="dk-list-level">
            <span>{deck.level}</span>
            {imported && !isSubdeck && <em className="dk-badge-inline">ANKI</em>}
          </div>
          <div className="dk-list-due">
            <div className="anki-stats-group">
              <span
                className={`anki-num anki-num-new ${s.newToday > 0 ? "has-cards" : "zero"}`}
                title={`${s.newToday} kartu baru hari ini`}
              >
                {s.newToday}
              </span>
              <span
                className={`anki-num anki-num-learn ${s.learning > 0 ? "has-cards" : "zero"}`}
                title={`${s.learning} kartu dalam proses belajar`}
              >
                {s.learning}
              </span>
              <span
                className={`anki-num anki-num-due ${s.reviewDue > 0 ? "has-cards" : "zero"}`}
                title={`${s.reviewDue} kartu jatuh tempo ulasan`}
              >
                {s.reviewDue}
              </span>
            </div>
          </div>
          <div className="dk-list-total">
            <span>{deck.total.toLocaleString("id-ID")}</span>
          </div>
          <div className="dk-list-prog">
            <div className="progress"><i style={{ width: `${s.progress}%` }} /></div>
            <small>{s.progress}%</small>
          </div>
          <div className="dk-list-actions">
            <Button
              className="pg-primary dk-list-btn"
              onClick={() => navigate(s.due > 0 ? `/deck/${deck.id}/review` : `/deck/${deck.id}`)}
              title={
                children.length > 0
                  ? `Belajar semua kartu (${s.due > 0 ? `${s.due} tugas` : "sudah selesai"})`
                  : `Belajar ${deck.subdeckName || deck.title} (${s.due > 0 ? `${s.due} tugas` : "sudah selesai"})`
              }
            >
              {s.due > 0 ? (children.length > 0 ? "Belajar Semua" : "Belajar") : "Buka"}
            </Button>
            <button
              type="button"
              className="dk-action-icon"
              aria-label={`Kelola kartu ${deck.subdeckName || deck.title}`}
              title="Kelola Kartu"
              onClick={() => navigate(`/deck/${deck.id}?tab=kartu`)}
            >
              <Icon name="cards" size={15} />
            </button>
            <button
              type="button"
              className="dk-action-icon"
              aria-label={`Pengaturan ${deck.subdeckName || deck.title}`}
              title="Pengaturan"
              onClick={() => navigate(`/deck/${deck.id}?tab=pengaturan`)}
            >
              <Icon name="settings" size={15} />
            </button>
          </div>
        </div>

        {/* Recursive Sub-decks */}
        {isExpanded &&
          children.map((child, idx) =>
            renderTreeRow(child, depth + 1, idx === children.length - 1),
          )}
      </div>
    );
  };

  return (
    <>
      <PageHead eyebrow="KOLEKSI PRIBADI" title="Deck" accent="Saya" copy="Setiap deck adalah ruang belajar — susun, kelola kartu, dan pantau progres secara teratur.">
        <div className="dk-head-actions">
          <Button className="outline-button dk-import-btn" onClick={() => openImport()}><Icon name="upload" size={16} /> Impor .apkg</Button>
          <Button className="pg-primary" onClick={() => setCreateOpen(true)}><Icon name="plus" size={17} /> Buat deck baru</Button>
        </div>
      </PageHead>

      <section className="pg-stats">
        <div><strong>{decks.length}</strong><span>deck aktif</span></div>
        <div><strong>{totalCards.toLocaleString("id-ID")}</strong><span>total kartu</span></div>
        <div className={totalDue > 0 ? "hot" : ""}><strong>{totalDue.toLocaleString("id-ID")}</strong><span>jatuh tempo hari ini</span></div>
        <div><strong>{totalCompleted}</strong><span>deck tuntas hari ini ({importedCount} Anki)</span></div>
      </section>

      <section className="dk-hero" aria-labelledby="dk-hero-title">
        <div className="dk-hero-copy">
          <p className="eyebrow light">IMPOR DARI ANKI</p>
          <h2 id="dk-hero-title">Bawa deck Anki-mu ke sini.</h2>
          <p>Core 2k/6k, Kaishi 1.5k, atau deck buatanmu sendiri — lengkap dengan audio, gambar, dan jadwal review. Semua tersimpan aman offline di perangkatmu.</p>
          <ul>
            <li><Icon name="check" size={14} /> Format lama &amp; baru (.anki21b)</li>
            <li><Icon name="check" size={14} /> Deteksi field otomatis &amp; offline</li>
            <li><Icon name="check" size={14} /> Ekspor kembali kapan saja (CSV/JSON)</li>
          </ul>
        </div>
        <button id="dk-hero-drop" type="button" className="dk-hero-drop" onClick={() => openImport()}>
          <span className="dk-hero-ico"><Icon name="upload" size={24} /></span>
          <strong>Tarik file .apkg ke mana saja</strong>
          <small>atau klik untuk memilih file</small>
        </button>
      </section>

      <section className="pg-toolbar">
        <div className="dk-toolbar-filters">
          <Tabs items={kinds} value={kind} onChange={setKind} />
          <div className="dk-subfilter" role="tablist" aria-label="Status review">
            {statusFilters.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={statusFilter === s}
                className={`dk-subfilter-btn ${statusFilter === s ? "on" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="pg-toolbar-right">
          <label className="pg-search"><Icon name="search" size={16} /><input id="deck-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari deck..." /></label>
          <label className="pg-select"><Icon name="filter" size={15} />
            <select id="deck-sort" value={sort} onChange={(e) => setSort(e.target.value as (typeof sorts)[number])} aria-label="Urutkan">
              {sorts.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          {viewMode === "list" && allParentIds.length > 0 && (
            <button
              type="button"
              className="dk-tree-toggle-all"
              onClick={toggleAll}
              title={allExpanded ? "Tutup semua cabang sub-deck" : "Buka semua cabang sub-deck"}
            >
              <Icon name={allExpanded ? "chevron-up" : "chevron-down"} size={14} />
              <span>{allExpanded ? "Tutup Sub-deck" : "Buka Sub-deck"}</span>
            </button>
          )}
          <div className="dk-view-toggle" role="group" aria-label="Mode tampilan">
            <button
              type="button"
              aria-pressed={viewMode === "grid"}
              className={viewMode === "grid" ? "on" : ""}
              onClick={() => setViewMode("grid")}
              aria-label="Tampilan grid"
              title="Tampilan Grid"
            >
              <Icon name="grid" size={16} />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              className={viewMode === "list" ? "on" : ""}
              onClick={() => setViewMode("list")}
              aria-label="Tampilan daftar"
              title="Tampilan Daftar"
            >
              <Icon name="list" size={16} />
            </button>
          </div>
        </div>
      </section>

      {viewMode === "grid" ? (
        <div className="deck-grid pg-deck-grid">
          {list.map((deck) => {
            const s = st(deck);
            const imported = deck.source === "apkg";
            const children = subdecksByParent.get(deck.id) ?? [];
            const leaves = getLeafDescendantDecks(deck.id, decks);
            const displaySubdecks = leaves.length > 0 ? leaves : children;
            const sortedSubdecks = [...displaySubdecks].sort((a, b) => {
              const order: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
              const aCode = extractLevelCode(a.title) ?? extractLevelCode(a.subdeckName || "") ?? "Z";
              const bCode = extractLevelCode(b.title) ?? extractLevelCode(b.subdeckName || "") ?? "Z";
              return (order[aCode] ?? 9) - (order[bCode] ?? 9);
            });
            const isExpanded = expandedParents.has(deck.id);

            return (
              <article className={`deck-card dk-card ${isExpanded ? "is-expanded" : ""}`} key={deck.id}>
                <div className={`deck-art ${deck.color}`}>
                  <button
                    type="button"
                    className="dk-card-cover-btn"
                    aria-expanded={displaySubdecks.length > 0 ? isExpanded : undefined}
                    aria-label={displaySubdecks.length > 0 ? `${isExpanded ? "Tutup" : "Buka"} sub-deck ${deck.title}` : `Buka dashboard ${deck.title}`}
                    onClick={() => {
                      if (displaySubdecks.length > 0) {
                        toggleExpand(deck.id);
                      } else {
                        navigate(`/deck/${deck.id}`);
                      }
                    }}
                    title={displaySubdecks.length > 0 ? (isExpanded ? "Tutup sub-deck" : "Tekan untuk melihat sub-deck") : `Buka dashboard ${deck.title}`}
                  >
                    <span>{deck.kanji}</span><i />
                  </button>
                  {imported && <em className="dk-badge">ANKI</em>}
                  {displaySubdecks.length > 0 && (
                    <em className="dk-badge" style={{ right: imported ? "56px" : "14px", background: "rgba(38, 61, 54, 0.85)" }}>
                      {displaySubdecks.length} SUB-DECK
                    </em>
                  )}
                  <div className="dk-card-tools">
                    <button
                      type="button"
                      aria-label={`Buka halaman ${deck.title}`}
                      title="Buka Halaman Deck"
                      onClick={() => navigate(`/deck/${deck.id}`)}
                    >
                      <Icon name="arrow" size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Kelola kartu ${deck.title}`}
                      title="Kelola &amp; Edit Kartu"
                      onClick={() => navigate(`/deck/${deck.id}?tab=kartu`)}
                    >
                      <Icon name="cards" size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Pengaturan ${deck.title}`}
                      title="Pengaturan Deck"
                      onClick={() => navigate(`/deck/${deck.id}?tab=pengaturan`)}
                    >
                      <Icon name="settings" size={15} />
                    </button>
                  </div>
                </div>
                <div className="deck-body">
                  <div className="dk-card-top-meta">
                    <span className="deck-level">{deck.level}</span>
                    {displaySubdecks.length > 0 && (
                      <button
                        type="button"
                        className={`dk-subdeck-inline-toggle ${isExpanded ? "active" : ""}`}
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpand(deck.id)}
                        title={isExpanded ? "Tutup daftar sub-deck" : "Tekan untuk melihat sub-deck"}
                      >
                        <span>{isExpanded ? "Tutup" : `${displaySubdecks.length} Sub-deck`}</span>
                        <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={11} />
                      </button>
                    )}
                  </div>
                  <h3 title={deck.title}>
                    <button
                      type="button"
                      className="text-left bg-transparent border-0 p-0 cursor-pointer hover:text-coral transition-colors"
                      aria-expanded={displaySubdecks.length > 0 ? isExpanded : undefined}
                      onClick={() => {
                        if (displaySubdecks.length > 0) {
                          toggleExpand(deck.id);
                        } else {
                          navigate(`/deck/${deck.id}`);
                        }
                      }}
                    >
                      {deck.title}
                    </button>
                  </h3>
                  <div className="deck-meta">
                    <span>
                      <Icon name="clock" size={15} />{" "}
                      {s.due > 0
                        ? `${s.reviewDue} ulasan • ${s.newToday} baru`
                        : deck.total === 0
                          ? "Belum ada kartu"
                          : "Selesai hari ini"}
                    </span>
                    <span>{deck.total.toLocaleString("id-ID")} kartu</span>
                  </div>
                  <div className="progress"><i style={{ width: `${s.progress}%` }} /></div>

                  {/* Sub-deck Drawer: ONLY appears when pressed/expanded so closed cards stay in normal UI shape! */}
                  {displaySubdecks.length > 0 && isExpanded && (
                    <div className="dk-card-subdecks-wrap">
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
                                title={`Belajar khusus ${c.subdeckName || c.title} (${cs.due > 0 ? `${cs.due} tugas: ${cs.reviewDue} ulas + ${cs.newToday} baru` : "selesai"})`}
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
                            >
                              <button
                                type="button"
                                className="dk-card-subdeck-item-left"
                                onClick={() => navigate(`/deck/${c.id}`)}
                              >
                                <span className={`deck-art ${c.color} dk-subdeck-kanji`}>{c.kanji}</span>
                                <span>
                                  <strong>{c.subdeckName || c.title}</strong>
                                  <small>{c.total.toLocaleString("id-ID")} kartu</small>
                                </span>
                              </button>
                              <div className="dk-card-subdeck-item-right">
                                <div className="anki-stats-group" style={{ fontSize: "11px", padding: "2px 6px" }}>
                                  <span
                                    className={`anki-num anki-num-new ${cs.newToday > 0 ? "has-cards" : "zero"}`}
                                    title={`${cs.newToday} baru`}
                                  >
                                    {cs.newToday}
                                  </span>
                                  <span
                                    className={`anki-num anki-num-learn ${cs.learning > 0 ? "has-cards" : "zero"}`}
                                    title={`${cs.learning} belajar`}
                                  >
                                    {cs.learning}
                                  </span>
                                  <span
                                    className={`anki-num anki-num-due ${cs.reviewDue > 0 ? "has-cards" : "zero"}`}
                                    title={`${cs.reviewDue} ulasan`}
                                  >
                                    {cs.reviewDue}
                                  </span>
                                </div>
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
                  )}

                  <div className="pg-deck-foot">
                    {displaySubdecks.length > 0 && !isExpanded ? (
                      <Button
                        className="deck-open deck-open-ready"
                        ariaExpanded={false}
                        onClick={() => toggleExpand(deck.id)}
                      >
                        Pilih Sub-deck ({displaySubdecks.length}) <Icon name="chevron-down" size={15} />
                      </Button>
                    ) : (
                      <Button
                        className={`deck-open ${s.due > 0 ? "deck-open-ready" : ""}`}
                        onClick={() => navigate(s.due > 0 ? `/deck/${deck.id}/review` : `/deck/${deck.id}`)}
                      >
                        {s.due > 0 ? (
                          <>Belajar {children.length > 0 ? "Semua" : "sekarang"}</>
                        ) : (
                          <>Buka deck</>
                        )}
                      </Button>
                    )}
                    <small>{s.progress}% • {deckUpdatedLabel(deck)}</small>
                  </div>
                </div>
              </article>
            );
          })}
          <button id="dk-new-import" type="button" className="pg-newdeck dk-newimport" onClick={() => openImport()}>
            <span><Icon name="upload" size={22} /></span>
            <strong>Impor dari Anki</strong>
            <small>File .apkg dengan audio &amp; gambar</small>
          </button>
          <button id="dk-new-deck" type="button" className="pg-newdeck" onClick={() => setCreateOpen(true)}>
            <span><Icon name="plus" size={22} /></span>
            <strong>Deck baru</strong>
            <small>Buat manual atau dari hasil mining</small>
          </button>
        </div>
      ) : (
        <div className="dk-list-view">
          <div className="dk-list-view-header">
            <span>Sampul &amp; Deck</span>
            <span>Level / Jenis</span>
            <span style={{ textAlign: "right", paddingRight: "14px" }}>
              <span className="anki-hdr-badge anki-hdr-new" title="Kartu Baru (New)">Baru</span>{" "}
              <span className="anki-hdr-badge anki-hdr-learn" title="Dalam Belajar (Learn)">Belajar</span>{" "}
              <span className="anki-hdr-badge anki-hdr-due" title="Ulasan Jatuh Tempo (Due)">Ulas</span>
            </span>
            <span>Total Kartu</span>
            <span>Progres</span>
            <span>Aksi Belajar</span>
          </div>
          {list.map((deck) => renderTreeRow(deck, 0, true))}
        </div>
      )}

      {list.length === 0 && (
        <p className="pg-empty">
          {q ? `Tidak ada deck yang cocok dengan "${q}".` : "Belum ada deck di kategori/filter ini."}
        </p>
      )}

      {pageDrag && (
        <div className="dk-drag-overlay" aria-hidden="true">
          <div><Icon name="upload" size={34} /><strong>Lepaskan untuk mengimpor deck</strong><small>.apkg / .colpkg</small></div>
        </div>
      )}

      {importOpen && (
        <ImportDeckModal
          initialFile={importFile}
          onClose={() => { setImportOpen(false); setImportFile(null); }}
          onImported={(_id, title) => notify(`Deck "${title}" berhasil diimpor`)}
          onStudy={(id) => { setImportOpen(false); navigate(`/deck/${id}/review`); }}
        />
      )}

      {createOpen && (
        <DeckFormModal
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
          onImport={() => { setCreateOpen(false); openImport(); }}
        />
      )}
    </>
  );
}
