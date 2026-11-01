import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Button, PageHead, Tabs } from "../ui";
import { useAppStore, type DeckItem } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";
import { deckUpdatedLabel, liveDeckStats, type LiveDeckStats } from "../lib/deckStats";
import { ensureSeeded } from "../lib/deckCards";
import ImportDeckModal from "../components/ImportDeckModal";
import DeckFormModal from "../components/DeckFormModal";
import "../decks.css";

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const dragDepth = useRef(0);

  // Ensure starter decks are seeded in IndexedDB on first load
  useEffect(() => {
    void ensureSeeded();
  }, []);

  const stats = useMemo(() => {
    const m = new Map<string, LiveDeckStats>();
    for (const d of decks) m.set(d.id, liveDeckStats(d, srsCards[d.id], newIntroduced[d.id], settings));
    return m;
  }, [decks, srsCards, newIntroduced, settings]);
  const st = (d: DeckItem) => stats.get(d.id)!;

  const list = useMemo(() => {
    const s = q.toLowerCase();
    const f = decks.filter((d) => {
      const matchKind = kind === "Semua" || (kind === "Dari Anki" ? d.source === "apkg" : d.kind === kind);
      const matchSearch = d.title.toLowerCase().includes(s) || d.level.toLowerCase().includes(s);
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
  }, [decks, kind, statusFilter, sort, q, stats]);

  const totalCards = decks.reduce((s, d) => s + d.total, 0);
  const totalDue = decks.reduce((s, d) => s + st(d).due, 0);
  const totalCompleted = decks.filter((d) => d.total > 0 && st(d).due === 0).length;
  const importedCount = decks.filter((d) => d.source === "apkg").length;

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
        <button id="dk-hero-drop" className="dk-hero-drop" onClick={() => openImport()}>
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
          <div className="dk-view-toggle" role="group" aria-label="Mode tampilan">
            <button
              className={viewMode === "grid" ? "on" : ""}
              onClick={() => setViewMode("grid")}
              aria-label="Tampilan grid"
              title="Tampilan Grid"
            >
              <Icon name="grid" size={16} />
            </button>
            <button
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
            return (
              <article className="deck-card dk-card" key={deck.id}>
                <div
                  className={`deck-art ${deck.color} cursor-pointer`}
                  onClick={() => navigate(`/deck/${deck.id}`)}
                  title={`Buka dashboard ${deck.title}`}
                >
                  <span>{deck.kanji}</span><i />
                  {imported && <em className="dk-badge">ANKI</em>}
                  <div className="dk-card-tools" onClick={(e) => e.stopPropagation()}>
                    <button
                      aria-label={`Kelola kartu ${deck.title}`}
                      title="Kelola &amp; Edit Kartu"
                      onClick={() => navigate(`/deck/${deck.id}?tab=kartu`)}
                    >
                      <Icon name="cards" size={15} />
                    </button>
                    <button
                      aria-label={`Pengaturan ${deck.title}`}
                      title="Pengaturan Deck"
                      onClick={() => navigate(`/deck/${deck.id}?tab=pengaturan`)}
                    >
                      <Icon name="settings" size={15} />
                    </button>
                  </div>
                </div>
                <div className="deck-body">
                  <span className="deck-level">{deck.level}</span>
                  <h3
                    title={deck.title}
                    className="cursor-pointer hover:text-coral transition-colors"
                    onClick={() => navigate(`/deck/${deck.id}`)}
                  >
                    {deck.title}
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
                  <div className="pg-deck-foot">
                    <Button
                      className={`deck-open ${s.due > 0 ? "deck-open-ready" : ""}`}
                      onClick={() => navigate(s.due > 0 ? `/deck/${deck.id}/review` : `/deck/${deck.id}`)}
                    >
                      {s.due > 0 ? <>Belajar sekarang <Icon name="arrow" size={16} /></> : <>Buka deck <Icon name="arrow" size={16} /></>}
                    </Button>
                    <small>{s.progress}% • {deckUpdatedLabel(deck)}</small>
                  </div>
                </div>
              </article>
            );
          })}
          <button id="dk-new-import" className="pg-newdeck dk-newimport" onClick={() => openImport()}>
            <span><Icon name="upload" size={22} /></span>
            <strong>Impor dari Anki</strong>
            <small>File .apkg dengan audio &amp; gambar</small>
          </button>
          <button id="dk-new-deck" className="pg-newdeck" onClick={() => setCreateOpen(true)}>
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
            <span>Tugas Hari Ini</span>
            <span>Total Kartu</span>
            <span>Progres</span>
            <span>Aksi</span>
          </div>
          {list.map((deck) => {
            const s = st(deck);
            const imported = deck.source === "apkg";
            return (
              <div
                className="dk-list-row cursor-pointer"
                key={deck.id}
                onClick={() => navigate(`/deck/${deck.id}`)}
              >
                <div className="dk-list-title-cell">
                  <div className={`dk-mini-art deck-art ${deck.color}`}>
                    <span>{deck.kanji}</span>
                  </div>
                  <div>
                    <strong>{deck.title}</strong>
                    <small>{deckUpdatedLabel(deck)}</small>
                  </div>
                </div>
                <div className="dk-list-level">
                  <span>{deck.level}</span>
                  {imported && <em className="dk-badge-inline">ANKI</em>}
                </div>
                <div className="dk-list-due">
                  {s.due > 0 ? (
                    <span className="dk-due-pill">{s.due} kartu</span>
                  ) : deck.total === 0 ? (
                    <span className="dk-empty-pill">Kosong</span>
                  ) : (
                    <span className="dk-done-pill"><Icon name="check" size={12} /> Selesai</span>
                  )}
                </div>
                <div className="dk-list-total">
                  <span>{deck.total.toLocaleString("id-ID")}</span>
                </div>
                <div className="dk-list-prog">
                  <div className="progress"><i style={{ width: `${s.progress}%` }} /></div>
                  <small>{s.progress}%</small>
                </div>
                <div className="dk-list-actions" onClick={(e) => e.stopPropagation()}>
                  <Button
                    className="pg-primary dk-list-btn"
                    onClick={() => navigate(s.due > 0 ? `/deck/${deck.id}/review` : `/deck/${deck.id}`)}
                  >
                    {s.due > 0 ? "Belajar" : "Buka"}
                  </Button>
                  <button
                    className="dk-action-icon"
                    title="Tambah Kartu"
                    onClick={() => navigate(`/deck/${deck.id}?add=1`)}
                  >
                    <Icon name="plus" size={15} />
                  </button>
                  <button
                    className="dk-action-icon"
                    title="Pengaturan"
                    onClick={() => navigate(`/deck/${deck.id}?tab=pengaturan`)}
                  >
                    <Icon name="settings" size={15} />
                  </button>
                </div>
              </div>
            );
          })}
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
