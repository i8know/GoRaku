import { useEffect, useMemo, useState } from "react";
import { Icon, Button } from "../ui";
import { getCards, type StoredCard } from "../lib/deckDb";
import { formatBytes, type LiveDeckStats } from "../lib/deckStats";
import { toPlain } from "../lib/ankiText";
import { isDue, type SRSCard } from "../lib/srs";
import type { DeckItem } from "../store/useAppStore";

const LIMIT = 80;

interface Props {
  deck: DeckItem;
  stats: LiveDeckStats;
  srsDeck?: Record<string, SRSCard>;
  onClose: () => void;
  onStudy: () => void;
  onDelete: () => void;
}

function cardState(c: SRSCard | undefined): { label: string; cls: string } {
  if (!c) return { label: "Baru", cls: "new" };
  if (isDue(c)) return { label: "Jatuh tempo", cls: "due" };
  if (c.repetitions >= 3 || c.interval >= 21) return { label: "Dikuasai", cls: "known" };
  return { label: `${c.interval} hari`, cls: "learn" };
}

export default function DeckDetailModal({ deck, stats, srsDeck, onClose, onStudy, onDelete }: Props) {
  const [cards, setCards] = useState<StoredCard[] | null>(deck.source === "apkg" ? null : []);
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (deck.source !== "apkg") return;
    let alive = true;
    getCards(deck.id)
      .then((c) => alive && setCards(c))
      .catch(() => alive && setCards([]));
    return () => {
      alive = false;
    };
  }, [deck.id, deck.source]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!cards) return [];
    const s = q.trim().toLowerCase();
    if (!s) return cards;
    return cards.filter((c) => c.word.toLowerCase().includes(s) || c.reading.includes(s) || toPlain(c.meaning).toLowerCase().includes(s));
  }, [cards, q]);

  const meta = deck.meta;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="dk-detail" role="dialog" aria-modal="true" aria-labelledby="dk-detail-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className={`dk-detail-art deck-art ${deck.color}`}>
          <span>{deck.kanji}</span><i />
          <Button className="dk-detail-close" ariaLabel="Tutup" onClick={onClose}><Icon name="close" size={18} /></Button>
        </div>
        <div className="dk-detail-body">
          <div className="dk-detail-title">
            <div>
              <span className="deck-level">{deck.level}{deck.source === "apkg" && <em className="dk-tag">Anki</em>}</span>
              <h2 id="dk-detail-title">{deck.title}</h2>
            </div>
            <Button className="pg-primary" onClick={onStudy} disabled={stats.due === 0 && deck.source === "apkg"}>
              {stats.due > 0 || deck.source !== "apkg" ? <>Belajar sekarang <Icon name="arrow" size={15} /></> : <>Selesai hari ini <Icon name="check" size={15} /></>}
            </Button>
          </div>

          <div className="dk-detail-stats">
            <div><strong>{deck.total.toLocaleString("id-ID")}</strong><span>total kartu</span></div>
            <div className="hot"><strong>{stats.due}</strong><span>tugas hari ini</span></div>
            <div><strong>{(deck.source === "apkg" ? stats.newTotal : 0).toLocaleString("id-ID")}</strong><span>belum dipelajari</span></div>
            <div><strong>{stats.learned.toLocaleString("id-ID")}</strong><span>dikuasai</span></div>
          </div>
          <div className="progress dk-detail-prog"><i style={{ width: `${stats.progress}%` }} /></div>

          {meta && (
            <dl className="dk-meta">
              <div><dt>File sumber</dt><dd title={meta.fileName}>{meta.fileName}</dd></div>
              <div><dt>Ukuran</dt><dd>{formatBytes(meta.fileSize)} • {meta.format}</dd></div>
              <div><dt>Diimpor</dt><dd>{new Date(meta.importedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
              <div><dt>Media</dt><dd>{meta.mediaCount.toLocaleString("id-ID")} file</dd></div>
              {meta.noteTypes.length > 0 && <div className="wide"><dt>Tipe catatan</dt><dd>{meta.noteTypes.join(", ")}</dd></div>}
              {meta.subdecks.length > 1 && (
                <div className="wide"><dt>Sub-deck</dt><dd className="dk-chips">{meta.subdecks.map((s) => <span key={s}>{s.split("::").pop()}</span>)}</dd></div>
              )}
            </dl>
          )}

          {deck.source === "apkg" && (
            <section className="dk-browser">
              <div className="dk-browser-head">
                <h3>Isi deck</h3>
                <label className="pg-search"><Icon name="search" size={15} /><input id="dk-card-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kata, bacaan, arti…" /></label>
              </div>
              <div className="dk-list">
                {cards === null &&
                  Array.from({ length: 6 }).map((_, i) => <div key={i} className="dk-row skeleton-row"><i /><i /><i /></div>)}
                {cards !== null && filtered.slice(0, LIMIT).map((c) => {
                  const st = cardState(srsDeck?.[c.id]);
                  return (
                    <div key={c.id} className="dk-row">
                      <strong lang="ja">{c.word}</strong>
                      <span className="dk-read" lang="ja">{c.reading}</span>
                      <span className="dk-mean">{toPlain(c.meaning)}</span>
                      <span className="dk-icons">
                        {c.audio && <Icon name="volume" size={13} />}
                        {c.image && <Icon name="eye" size={13} />}
                      </span>
                      <em className={`dk-state ${st.cls}`}>{st.label}</em>
                    </div>
                  );
                })}
                {cards !== null && filtered.length === 0 && <p className="pg-empty">Tidak ada kartu yang cocok.</p>}
              </div>
              {filtered.length > LIMIT && <p className="dk-more">Menampilkan {LIMIT} dari {filtered.length.toLocaleString("id-ID")} kartu</p>}
            </section>
          )}

          <footer className="dk-detail-foot">
            <small>Diperbarui {deck.updated.toLowerCase()}</small>
            <Button className={`outline-button warn ${confirmDelete ? "armed" : ""}`} onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}>
              <Icon name="trash" size={15} /> {confirmDelete ? "Klik lagi untuk menghapus" : "Hapus deck"}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}
