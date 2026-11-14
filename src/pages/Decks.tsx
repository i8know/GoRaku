import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, PageHead, Tabs, DyeTile, DyeProgress, Hanko } from "../ui";
import { useAppStore, type DeckItem } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";
import { deckUpdatedLabel, liveDeckStats, type LiveDeckStats } from "../lib/deckStats";
import { aggregateParentStats, getLeafDescendantDecks, extractLevelCode } from "../lib/deckSubdecks";
import { dyeStep, jlptDyeStep } from "../lib/dye";
import { ensureSeeded } from "../lib/deckCards";

const ImportDeckModal = lazy(() => import("../components/ImportDeckModal"));
const DeckFormModal = lazy(() => import("../components/DeckFormModal"));

const kinds = ["Semua", "Core", "Anime", "Novel", "Manga", "YouTube", "Dari Anki"] as const;
const statusFilters = ["Semua", "Perlu diulas", "Selesai hari ini"] as const;
const sorts = ["Jatuh tempo", "Progres", "Ukuran", "Terbaru"] as const;

export default function DecksPage({ notify }: { onCreate?: () => void; notify: (m: string) => void }) {
  const navigate = useNavigate();
  const decks = useAppStore((s) => s.decks);
  const settings = useAppStore((s) => s.settings);
  const deckLimits = useAppStore((s) => s.deckLimits);
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
        m.set(
          d.id,
          aggregateParentStats(d, children, srsCards, newIntroduced, settings, decks, Date.now(), deckLimits),
        );
      } else {
        m.set(d.id, liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings, Date.now(), deckLimits));
      }
    }
    return m;
  }, [decks, subdecksByParent, srsCards, newIntroduced, settings, deckLimits]);
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
  const firstDueDeck = useMemo(
    () => rootDecks.find((d) => st(d).due > 0) ?? rootDecks[0],
    [rootDecks, stats],
  );

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

  // Combined select value for sort + statusFilter
  const combinedSelectValue =
    statusFilter === "Semua" ? `sort:${sort}` : `status:${statusFilter}`;

  const handleCombinedSelectChange = (val: string) => {
    if (val.startsWith("sort:")) {
      const nextSort = val.replace("sort:", "") as (typeof sorts)[number];
      setSort(nextSort);
      setStatusFilter("Semua");
    } else if (val.startsWith("status:")) {
      const nextStatus = val.replace("status:", "") as (typeof statusFilters)[number];
      setStatusFilter(nextStatus);
    } else if ((sorts as readonly string[]).includes(val)) {
      setSort(val as (typeof sorts)[number]);
    }
  };

  const renderTreeRows = (deck: DeckItem, depth = 0, isLast = true): ReactNode => {
    const s = st(deck);
    const imported = deck.source === "apkg";
    const children = subdecksByParent.get(deck.id) ?? [];
    const isExpanded = expandedParents.has(deck.id);
    const isSubdeck = depth > 0;
    const lvlCode = extractLevelCode(deck.title) ?? extractLevelCode(deck.subdeckName || "");
    const tileStep = lvlCode ? jlptDyeStep(lvlCode) : dyeStep(s.progress);

    return (
      <FragmentRow key={deck.id}>
        <tr className={isSubdeck ? "is-subdeck" : ""}>
          {/* 1. Deck */}
          <td style={{ paddingLeft: `${Math.max(16, depth * 24 + 16)}px` }}>
            <div className="flex items-center gap-2.5 min-w-0">
              {isSubdeck && (
                <span className="dk-tree-branch font-mono text-[var(--teks-redup)]" aria-hidden="true">
                  {isLast ? "└─" : "├─"}
                </span>
              )}
              {children.length > 0 ? (
                <button
                  type="button"
                  className="dk-expand-btn mr-0.5"
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
                title={
                  children.length > 0
                    ? isExpanded
                      ? "Tekan untuk menutup sub-deck"
                      : "Tekan untuk melihat sub-deck"
                    : `Buka ${deck.title}`
                }
                onClick={() => {
                  if (children.length > 0) {
                    toggleExpand(deck.id);
                  } else {
                    navigate(s.due > 0 ? `/deck/${deck.id}/review` : `/deck/${deck.id}`);
                  }
                }}
              >
                <DyeTile step={tileStep} kanji={deck.kanji} size={isSubdeck ? 30 : 38} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <strong className="font-serif text-sm text-[var(--tinta)]">
                      {deck.subdeckName || deck.title}
                    </strong>
                    {children.length > 0 && (
                      <span className="dk-subdeck-pill">{children.length} Sub-deck</span>
                    )}
                    {isSubdeck && !deck.subdeckName && (
                      <small className="dk-subdeck-badge-sub">Sub-deck</small>
                    )}
                  </span>
                  <small className="block text-[11px] text-[var(--teks-redup)]">
                    {deck.total.toLocaleString("id-ID")} kartu · {deckUpdatedLabel(deck)}
                  </small>
                </span>
              </button>
            </div>
          </td>

          {/* 2. Level */}
          <td>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-[var(--tinta-2)]">{deck.level}</span>
              {imported && !isSubdeck && <em className="dk-badge-inline">ANKI</em>}
            </div>
          </td>

          {/* 3. Hari ini (新 / 習 / 復 dalam nila) */}
          <td>
            <div className="inline-flex items-center gap-3 font-mono text-xs whitespace-nowrap">
              <span
                className={s.newToday > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                aria-label={`${s.newToday} kartu baru`}
                title={`${s.newToday} kartu baru`}
              >
                新 {s.newToday}
              </span>
              <span
                className={s.learning > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                aria-label={`${s.learning} sedang dipelajari`}
                title={`${s.learning} sedang dipelajari`}
              >
                習 {s.learning}
              </span>
              <span
                className={s.reviewDue > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                aria-label={`${s.reviewDue} ulasan`}
                title={`${s.reviewDue} ulasan`}
              >
                復 {s.reviewDue}
              </span>
            </div>
          </td>

          {/* 4. Penguasaan */}
          <td style={{ minWidth: "150px" }}>
            {s.progress >= 100 ? (
              <Hanko char="済" size={40} title="Deck tuntas 100%" />
            ) : (
              <DyeProgress percent={s.progress} label={`Penguasaan ${deck.subdeckName || deck.title}`} />
            )}
          </td>

          {/* 5. Aksi */}
          <td>
            <div className="dk-list-actions flex items-center justify-end gap-1.5">
              <Button
                className={s.due > 0 ? "btn-kon dk-list-btn" : "outline-button dk-list-btn"}
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
          </td>
        </tr>

        {isExpanded &&
          children.map((child, idx) =>
            renderTreeRows(child, depth + 1, idx === children.length - 1),
          )}
      </FragmentRow>
    );
  };

  const summarySentence = `${decks.length} deck aktif · ${totalCards.toLocaleString("id-ID")} total kartu · ${totalDue.toLocaleString("id-ID")} jatuh tempo hari ini · ${totalCompleted} deck tuntas (${importedCount} Anki).`;

  return (
    <>
      <div className="dk-head-v2">
        <PageHead
          eyebrow="KOLEKSI PRIBADI"
          title="Deck"
          accent="Saya"
          copy={summarySentence}
        >
          <div className="dk-head-actions flex items-center gap-2 flex-wrap">
            {totalDue > 0 && firstDueDeck && (
              <Button
                className="pg-primary"
                onClick={() => navigate(`/deck/${firstDueDeck.id}/review`)}
              >
                Belajar {totalDue} kartu
              </Button>
            )}
            <Button className="outline-button dk-import-btn" onClick={() => openImport()}>
              <Icon name="upload" size={16} /> Impor .apkg
            </Button>
            <Button className="outline-button" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={17} /> Buat deck baru
            </Button>
          </div>
        </PageHead>
      </div>

      {decks.length === 0 ? (
        <section className="dk-hero" aria-labelledby="dk-hero-title">
          <div className="dk-hero-copy">
            <p className="eyebrow light">IMPOR DARI ANKI</p>
            <h2 id="dk-hero-title">Bawa deck Anki-mu ke sini.</h2>
            <p>
              Core 2k/6k, Kaishi 1.5k, atau deck buatanmu sendiri — lengkap dengan audio, gambar, dan jadwal review. Semua tersimpan aman offline di perangkatmu.
            </p>
            <ul>
              <li>
                <Icon name="check" size={14} /> Format lama &amp; baru (.anki21b)
              </li>
              <li>
                <Icon name="check" size={14} /> Deteksi field otomatis &amp; offline
              </li>
              <li>
                <Icon name="check" size={14} /> Ekspor kembali kapan saja (CSV/JSON)
              </li>
            </ul>
          </div>
          <button id="dk-hero-drop" type="button" className="dk-hero-drop" onClick={() => openImport()}>
            <span className="dk-hero-ico">
              <Icon name="upload" size={24} />
            </span>
            <strong>Tarik file .apkg ke mana saja</strong>
            <small>atau klik untuk memilih file</small>
          </button>
        </section>
      ) : (
        <section className="dk-import-compact" aria-label="Impor paket Anki .apkg">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon name="upload" size={16} className="text-[var(--ai)] shrink-0" />
            <span>
              <strong>Impor dari Anki (.apkg / .colpkg):</strong> tarik berkas ke halaman ini kapan saja, atau pilih berkas lokal beserta audio &amp; jadwalnya.
            </span>
          </div>
          <button
            id="dk-hero-drop"
            type="button"
            className="outline-button"
            style={{ padding: "6px 12px", fontSize: "12px" }}
            onClick={() => openImport()}
          >
            Pilih file .apkg
          </button>
        </section>
      )}

      {/* SATU BARIS FILTER */}
      <section className="pg-toolbar">
        <div className="dk-toolbar-filters">
          <Tabs items={kinds} value={kind} onChange={setKind} />
        </div>

        <div className="pg-toolbar-right">
          <label className="pg-search">
            <Icon name="search" size={16} />
            <input
              id="deck-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari deck..."
            />
          </label>
          <label className="pg-select">
            <Icon name="filter" size={15} />
            <select
              id="deck-sort"
              value={combinedSelectValue}
              onChange={(e) => handleCombinedSelectChange(e.target.value)}
              aria-label="Urutkan dan filter status"
            >
              <optgroup label="Urutkan">
                {sorts.map((s) => (
                  <option key={`sort:${s}`} value={`sort:${s}`}>
                    Urut: {s}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Filter Status">
                {statusFilters.map((stOpt) => (
                  <option key={`status:${stOpt}`} value={`status:${stOpt}`}>
                    Status: {stOpt}
                  </option>
                ))}
              </optgroup>
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
                <div className={`deck-art dye-${dyeStep(s.progress)}`}>
                  <button
                    type="button"
                    className="dk-card-cover-btn"
                    aria-expanded={displaySubdecks.length > 0 ? isExpanded : undefined}
                    aria-label={
                      displaySubdecks.length > 0
                        ? `${isExpanded ? "Tutup" : "Buka"} sub-deck ${deck.title}`
                        : `Buka dashboard ${deck.title}`
                    }
                    onClick={() => {
                      if (displaySubdecks.length > 0) {
                        toggleExpand(deck.id);
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
                    <span>{deck.kanji}</span>
                    <i />
                  </button>
                  {imported && <em className="dk-badge">ANKI</em>}
                  {displaySubdecks.length > 0 && (
                    <em className="dk-badge" style={{ right: imported ? "56px" : "14px", background: "var(--kon)" }}>
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
                      className="text-left bg-transparent border-0 p-0 cursor-pointer hover:text-[var(--ai)] transition-colors"
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
                  <div className="deck-meta font-mono text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={s.newToday > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                        aria-label={`${s.newToday} kartu baru`}
                      >
                        新 {s.newToday}
                      </span>
                      <span
                        className={s.learning > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                        aria-label={`${s.learning} sedang dipelajari`}
                      >
                        習 {s.learning}
                      </span>
                      <span
                        className={s.reviewDue > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                        aria-label={`${s.reviewDue} ulasan`}
                      >
                        復 {s.reviewDue}
                      </span>
                    </div>
                    <span className="font-sans text-[var(--teks-redup)]">
                      {deck.total.toLocaleString("id-ID")} kartu
                    </span>
                  </div>
                  <div className="my-2">
                    {s.progress >= 100 ? (
                      <Hanko char="済" size={36} title="Deck tuntas 100%" />
                    ) : (
                      <DyeProgress percent={s.progress} label={`Penguasaan ${deck.title}`} />
                    )}
                  </div>

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
                                className="dk-quick-chip indigo"
                                onClick={() => navigate(cs.due > 0 ? `/deck/${c.id}/review` : `/deck/${c.id}`)}
                                title={`Belajar khusus ${c.subdeckName || c.title} (${cs.due > 0 ? `${cs.due} tugas` : "selesai"})`}
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
                          const cCode = extractLevelCode(c.title) ?? extractLevelCode(c.subdeckName || "") ?? "N3";
                          return (
                            <div key={c.id} className="dk-card-subdeck-item">
                              <button
                                type="button"
                                className="dk-card-subdeck-item-left"
                                onClick={() => navigate(`/deck/${c.id}`)}
                              >
                                <DyeTile step={jlptDyeStep(cCode)} kanji={c.kanji} size={28} />
                                <span>
                                  <strong>{c.subdeckName || c.title}</strong>
                                  <small>{c.total.toLocaleString("id-ID")} kartu</small>
                                </span>
                              </button>
                              <div className="dk-card-subdeck-item-right">
                                <div className="inline-flex items-center gap-2 font-mono text-[11px]">
                                  <span
                                    className={cs.newToday > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                                    aria-label={`${cs.newToday} kartu baru`}
                                  >
                                    新 {cs.newToday}
                                  </span>
                                  <span
                                    className={cs.learning > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                                    aria-label={`${cs.learning} sedang dipelajari`}
                                  >
                                    習 {cs.learning}
                                  </span>
                                  <span
                                    className={cs.reviewDue > 0 ? "text-[var(--kon)] font-bold" : "text-[var(--teks-redup)]"}
                                    aria-label={`${cs.reviewDue} ulasan`}
                                  >
                                    復 {cs.reviewDue}
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
                    <small>
                      {s.progress}% • {deckUpdatedLabel(deck)}
                    </small>
                  </div>
                </div>
              </article>
            );
          })}
          <button id="dk-new-import" type="button" className="pg-newdeck dk-newimport" onClick={() => openImport()}>
            <span>
              <Icon name="upload" size={22} />
            </span>
            <strong>Impor dari Anki</strong>
            <small>File .apkg dengan audio &amp; gambar</small>
          </button>
          <button id="dk-new-deck" type="button" className="pg-newdeck" onClick={() => setCreateOpen(true)}>
            <span>
              <Icon name="plus" size={22} />
            </span>
            <strong>Deck baru</strong>
            <small>Buat manual atau dari hasil mining</small>
          </button>
        </div>
      ) : (
        <div className="dk-table-wrap">
          <table className="dk-semantic-table">
            <thead>
              <tr>
                <th scope="col">Deck</th>
                <th scope="col">Level</th>
                <th scope="col">Hari ini</th>
                <th scope="col">Penguasaan</th>
                <th scope="col" className="text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>{list.map((deck) => renderTreeRows(deck, 0, true))}</tbody>
          </table>
        </div>
      )}

      {list.length === 0 && (
        <p className="pg-empty">
          {q ? `Tidak ada deck yang cocok dengan "${q}".` : "Belum ada deck di kategori/filter ini."}
        </p>
      )}

      {pageDrag && (
        <div className="dk-drag-overlay" aria-hidden="true">
          <div>
            <Icon name="upload" size={34} />
            <strong>Lepaskan untuk mengimpor deck</strong>
            <small>.apkg / .colpkg</small>
          </div>
        </div>
      )}

      {importOpen && (
        <Suspense fallback={null}>
          <ImportDeckModal
            initialFile={importFile}
            onClose={() => {
              setImportOpen(false);
              setImportFile(null);
            }}
            onImported={(_id, title) => notify(`Deck "${title}" berhasil diimpor`)}
            onStudy={(id) => {
              setImportOpen(false);
              navigate(`/deck/${id}/review`);
            }}
          />
        </Suspense>
      )}

      {createOpen && (
        <Suspense fallback={null}>
          <DeckFormModal
            onClose={() => setCreateOpen(false)}
            onCreated={handleCreated}
            onImport={() => {
              setCreateOpen(false);
              openImport();
            }}
          />
        </Suspense>
      )}
    </>
  );
}

function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
