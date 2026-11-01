import { DECK_COLORS, DECK_KINDS, DECK_LEVELS, KANJI_SUGGEST } from "../lib/deckCards";

export interface DeckIdentity {
  title: string;
  level: string;
  kind: string;
  color: string;
  kanji: string;
}

interface Props {
  value: DeckIdentity;
  onChange: (patch: Partial<DeckIdentity>) => void;
  idPrefix: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/** Shared title / level / category / cover editor used by "create deck" and deck settings. */
export default function DeckIdentityFields({ value, onChange, idPrefix, autoFocus, onSubmit }: Props) {
  return (
    <>
      <label className="field">
        <span>Nama deck</span>
        <input
          id={`${idPrefix}-title`}
          autoFocus={autoFocus}
          value={value.title}
          maxLength={80}
          onChange={(e) => onChange({ title: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
          placeholder="Contoh: Kosakata slice of life"
        />
      </label>
      <div className="imp-row2">
        <label className="field">
          <span>Target level</span>
          <select id={`${idPrefix}-level`} value={value.level} onChange={(e) => onChange({ level: e.target.value })}>
            {DECK_LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Kategori</span>
          <select id={`${idPrefix}-kind`} value={value.kind} onChange={(e) => onChange({ kind: e.target.value })}>
            {DECK_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
      </div>
      <div className="imp-look">
        <div className={`imp-cover deck-art ${value.color}`}><span>{value.kanji || "札"}</span><i /></div>
        <div className="imp-look-ctrl">
          <span className="imp-sub">Warna sampul</span>
          <div className="imp-swatches">
            {DECK_COLORS.map((c) => (
              <button key={c} type="button" className={`deck-art ${c} ${c === value.color ? "on" : ""}`} aria-label={`Warna ${c}`} aria-pressed={c === value.color} onClick={() => onChange({ color: c })} />
            ))}
          </div>
          <span className="imp-sub">Kanji sampul</span>
          <div className="imp-kanji">
            <input id={`${idPrefix}-kanji`} value={value.kanji} maxLength={2} onChange={(e) => onChange({ kanji: e.target.value })} aria-label="Kanji sampul" />
            {KANJI_SUGGEST.map((k) => (
              <button key={k} type="button" className={k === value.kanji ? "on" : ""} onClick={() => onChange({ kanji: k })}>{k}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
