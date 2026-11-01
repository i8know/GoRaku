import { useEffect, useState } from "react";
import { Icon, Button } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { autoKanji } from "../lib/deckCards";
import DeckIdentityFields, { type DeckIdentity } from "./DeckIdentityFields";

interface Props {
  onClose: () => void;
  onCreated: (id: string, title: string) => void;
  onImport?: () => void;
}

export default function DeckFormModal({ onClose, onCreated, onImport }: Props) {
  const addDeck = useAppStore((s) => s.addDeck);
  const userLevel = useAppStore((s) => s.user?.level ?? "N4");
  const [form, setForm] = useState<DeckIdentity>({ title: "", level: userLevel, kind: "Core", color: "sage", kanji: "" });
  const [kanjiTouched, setKanjiTouched] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = (p: Partial<DeckIdentity>) => {
    if (p.kanji !== undefined) setKanjiTouched(true);
    setForm((f) => {
      const next = { ...f, ...p };
      // Suggest a cover kanji from the title until the user picks one.
      if (p.title !== undefined && !kanjiTouched) next.kanji = p.title.match(/[\u3400-\u9fff]/) ? autoKanji(p.title) : "";
      return next;
    });
  };

  const submit = () => {
    const title = form.title.trim() || "Deck Baru";
    const id = addDeck({
      title,
      level: `${form.level} • ${form.kind}`,
      kind: form.kind,
      due: 0,
      total: 0,
      kanji: form.kanji.trim() || "新",
      color: form.color,
    });
    onCreated(id, title);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal dk-form-modal" role="dialog" aria-modal="true" aria-labelledby="dk-form-title" onMouseDown={(e) => e.stopPropagation()}>
        <Button className="modal-close" ariaLabel="Tutup" onClick={onClose}><Icon name="close" /></Button>
        <span className="modal-kanji">札</span>
        <p className="eyebrow">KOLEKSI BARU</p>
        <h2 id="dk-form-title">Buat deck belajarmu</h2>
        <p className="modal-copy">Beri nama, pilih level, lalu mulai isi dengan kartu.</p>
        <DeckIdentityFields value={form} onChange={patch} idPrefix="new-deck" autoFocus onSubmit={submit} />
        <Button className="modal-submit" onClick={submit}><Icon name="check" size={18} /> Buat &amp; isi kartu</Button>
        {onImport && (
          <button className="dk-alt-link" onClick={onImport}>Punya deck Anki? <u>Impor file .apkg</u></button>
        )}
      </div>
    </div>
  );
}
