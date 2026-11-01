import { useEffect, useRef, useState } from "react";
import { Icon, Button } from "../ui";
import { draftFromCard, textToHtml, type CardDraft } from "../lib/deckCards";
import { renderJapanese } from "../lib/ankiText";
import type { StoredCard } from "../lib/deckDb";

interface Props {
  deckTitle: string;
  card?: StoredCard;
  onClose: () => void;
  /** Resolve to keep the modal usable; `again` = "save & add another". */
  onSave: (draft: CardDraft, again: boolean) => Promise<void>;
  onDelete?: () => void;
}

export default function CardEditorModal({ deckTitle, card, onClose, onSave, onDelete }: Props) {
  const editing = !!card;
  const [draft, setDraft] = useState<CardDraft>(() => draftFromCard(card));
  const [tagText, setTagText] = useState(() => (card?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wordRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof CardDraft) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const valid = draft.word.trim().length > 0 && (draft.meaning.trim().length > 0 || draft.sentence.trim().length > 0);

  const save = async (again: boolean) => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const tags = tagText.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
      await onSave({ ...draft, tags }, again);
      if (again) {
        setDraft(draftFromCard());
        setAdded((n) => n + 1);
        wordRef.current?.focus();
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void save(!editing);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="ce-modal" role="dialog" aria-modal="true" aria-labelledby="ce-title" onMouseDown={(e) => e.stopPropagation()}>
        <header className="ce-head">
          <div>
            <p className="eyebrow">{deckTitle.toUpperCase()}</p>
            <h2 id="ce-title">{editing ? "Edit kartu" : "Tambah kartu baru"}</h2>
          </div>
          {added > 0 && <span className="ce-added"><Icon name="check" size={13} /> {added} kartu ditambahkan</span>}
          <Button className="modal-close" ariaLabel="Tutup" onClick={onClose}><Icon name="close" /></Button>
        </header>

        <div className="ce-body">
          <div className="ce-form">
            <div className="imp-row2">
              <label className="field">
                <span>Kata / depan kartu <em className="ce-req">*</em></span>
                <input ref={wordRef} id="ce-word" lang="ja" autoFocus value={draft.word} onChange={set("word")} placeholder="例：寿命" />
              </label>
              <label className="field">
                <span>Cara baca</span>
                <input id="ce-reading" lang="ja" value={draft.reading} onChange={set("reading")} placeholder="じゅみょう" />
              </label>
            </div>
            <label className="field">
              <span>Arti <em className="ce-req">*</em></span>
              <textarea id="ce-meaning" rows={2} value={draft.meaning} onChange={set("meaning")} placeholder="umur; masa hidup" />
            </label>
            <label className="field">
              <span>Kalimat contoh <small className="ce-hint">furigana: <code> 漢字[かんじ]</code></small></span>
              <textarea id="ce-sentence" lang="ja" rows={2} value={draft.sentence} onChange={set("sentence")} placeholder=" 人間[にんげん]の 寿命[じゅみょう]は 短[みじか]い。" />
            </label>
            <label className="field">
              <span>Terjemahan kalimat</span>
              <textarea id="ce-translation" rows={2} value={draft.translation} onChange={set("translation")} placeholder="Umur manusia itu pendek." />
            </label>
            <label className="field">
              <span>Tag <small className="ce-hint">pisahkan dengan koma</small></span>
              <input id="ce-tags" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="anime, N3" />
            </label>
          </div>

          <aside className="ce-preview" aria-label="Pratinjau kartu">
            <span className="imp-sub">Pratinjau</span>
            <div className="imp-card">
              <div className="imp-card-front">
                {draft.reading && <small lang="ja">{draft.reading}</small>}
                <strong lang="ja">{draft.word || "—"}</strong>
              </div>
              <div className="imp-card-back">
                {draft.meaning && <p className="imp-mean" dangerouslySetInnerHTML={{ __html: textToHtml(draft.meaning) }} />}
                {draft.sentence && <p className="imp-sent" lang="ja" dangerouslySetInnerHTML={{ __html: renderJapanese(textToHtml(draft.sentence), true) }} />}
                {draft.translation && <p className="imp-trans" dangerouslySetInnerHTML={{ __html: textToHtml(draft.translation) }} />}
                {!draft.meaning && !draft.sentence && <p className="imp-trans">Isi arti atau kalimat untuk sisi belakang.</p>}
              </div>
            </div>
            <p className="ce-tip"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> untuk {editing ? "menyimpan" : "simpan & tambah lagi"}</p>
          </aside>
        </div>

        <footer className="imp-foot">
          <div>
            {editing && onDelete && (
              <Button className={`outline-button warn ${confirmDelete ? "armed" : ""}`} onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}>
                <Icon name="trash" size={14} /> {confirmDelete ? "Klik lagi untuk hapus" : "Hapus"}
              </Button>
            )}
          </div>
          <div>
            <Button className="outline-button" onClick={onClose}>{added > 0 ? "Selesai" : "Batal"}</Button>
            {!editing && (
              <Button className="outline-button" disabled={!valid || saving} onClick={() => void save(false)}>Simpan &amp; tutup</Button>
            )}
            <Button className="pg-primary" disabled={!valid || saving} onClick={() => void save(!editing)}>
              <Icon name={editing ? "check" : "plus"} size={15} /> {editing ? "Simpan perubahan" : "Simpan & tambah lagi"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
