import { useEffect, useState } from "react";
import { Icon, Button, PageHead, Tabs } from "../ui";
import { useAppStore } from "../store/useAppStore";
import { addCards, addMinedCardToDeck } from "../lib/deckCards";
import DictionaryManagerModal from "../components/DictionaryManagerModal";
import { listDictionaries, type DictionaryRecord } from "../lib/lexiconDb";
import { lookup, type LookupResultItem } from "../lib/dictionaryLookup";
import { extractSentenceAround } from "../lib/sentenceExtractor";
import { speakJapanese } from "../lib/tts";

type Tok = { t: string; r?: string; m?: string; lv?: string };
type PresetKey = "Novel" | "Manga" | "Anime" | "YouTube";
type Src = { title: string; where: string; tone: string; tr: string; tokens: Tok[]; pos: string; frac: number };

const sources = ["Novel", "Manga", "Anime", "YouTube", "Teks Bebas"] as const;
type SrcKey = (typeof sources)[number];

const data: Record<PresetKey, Src> = {
  Novel: {
    title: "コンビニ人間", where: "Halaman 42", tone: "novel", frac: 0.34, pos: "Kalimat 8 dari 24",
    tr: "Hidup menjadi diri sendiri lebih sulit dari yang dibayangkan.",
    tokens: [
      { t: "自分らしく", r: "じぶんらしく", m: "menjadi diri sendiri", lv: "N3" }, { t: "生きること", r: "いきること", m: "menjalani hidup", lv: "N4" }, { t: "は" }, { t: "、" },
      { t: "思った", r: "おもった", m: "(telah) mengira", lv: "N4" }, { t: "より", m: "daripada", lv: "N5" }, { t: "難しい", r: "むずかしい", m: "sulit", lv: "N4" }, { t: "。" },
    ],
  },
  Manga: {
    title: "ブルーピリオド", where: "Bab 12 • Hal. 18", tone: "manga", frac: 0.5, pos: "Balon 5 dari 11",
    tr: "Kalau tidak menyerah, pasti akan tersampaikan.",
    tokens: [
      { t: "諦めなければ", r: "あきらめなければ", m: "jika tidak menyerah", lv: "N2" }, { t: "、" }, { t: "きっと", r: "きっと", m: "pasti", lv: "N3" }, { t: "届く", r: "とどく", m: "sampai; tersampaikan", lv: "N3" }, { t: "。" },
    ],
  },
  Anime: {
    title: "葬送のフリーレン", where: "Episode 04 • 12:31", tone: "anime", frac: 0.42, pos: "Subtitle 31 dari 74",
    tr: "Umur manusia itu pendek, ya.",
    tokens: [
      { t: "人間", r: "にんげん", m: "manusia", lv: "N4" }, { t: "の" }, { t: "寿命", r: "じゅみょう", m: "umur; masa hidup", lv: "N2" }, { t: "は" },
      { t: "短い", r: "みじかい", m: "pendek", lv: "N4" }, { t: "んだね" }, { t: "。" },
    ],
  },
  YouTube: {
    title: "東京の朝ルーティン", where: "08:24", tone: "video", frac: 0.28, pos: "Subtitle 19 dari 68",
    tr: "Aku suka waktu pagi yang tenang.",
    tokens: [
      { t: "朝", r: "あさ", m: "pagi", lv: "N5" }, { t: "は" }, { t: "静かな", r: "しずかな", m: "tenang", lv: "N4" }, { t: "時間", r: "じかん", m: "waktu", lv: "N5" },
      { t: "が" }, { t: "好き", r: "すき", m: "suka", lv: "N5" }, { t: "です" }, { t: "。" },
    ],
  },
};

const DEFAULT_CUSTOM_TEXT =
  "「今日はとても美味しかったよ！」と先生は笑いながら言った。しかし昨日は野菜を食べさせられなかったので、少し困っていたようだった。日本語学校に通う学生たちは毎日熱心に勉強している。";

export default function MiningPage({ notify }: { notify: (m: string) => void }) {
  const decks = useAppStore((s) => s.decks);
  const queue = useAppStore((s) => s.minedQueue);
  const addMinedCard = useAppStore((s) => s.addMinedCard);
  const removeMinedCard = useAppStore((s) => s.removeMinedCard);
  const clearMinedQueue = useAppStore((s) => s.clearMinedQueue);

  const deckOptions = decks.map((d) => d.title);
  const [src, setSrc] = useState<SrcKey>("Novel");
  const [sel, setSel] = useState<number | null>(0);
  const [deck, setDeck] = useState(deckOptions[0] || "Default");
  const [furigana, setFurigana] = useState(true);
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictionaries, setDictionaries] = useState<DictionaryRecord[]>([]);

  // State khusus mode "Teks Bebas"
  const [customText, setCustomText] = useState(DEFAULT_CUSTOM_TEXT);
  const [customSourceTitle, setCustomSourceTitle] = useState("Catatan / Subtitle");
  const [isEditingCustomText, setIsEditingCustomText] = useState(false);
  const [customMatchRange, setCustomMatchRange] = useState<{ start: number; len: number }>({
    start: 7,
    len: 6,
  });
  const [customLookupResults, setCustomLookupResults] = useState<LookupResultItem[]>([]);
  const [customWord, setCustomWord] = useState("美味しい");
  const [customReading, setCustomReading] = useState("おいしい");
  const [customMeaning, setCustomMeaning] = useState("enak; lezat (delicious)");
  const [customSentenceHtml, setCustomSentenceHtml] = useState(
    "「今日はとても<b>美味しかった</b>よ！」と先生は笑いながら言った。",
  );
  const [customReasons, setCustomReasons] = useState<string[]>([]);

  useEffect(() => {
    void listDictionaries().then(setDictionaries).catch(() => {});
  }, []);

  const activeDictCount = dictionaries.filter((d) => d.enabled).length;

  const isCustomMode = src === "Teks Bebas";
  const cur = !isCustomMode ? data[src] : data.Novel;
  const tok = !isCustomMode && sel !== null ? cur.tokens[sel] : undefined;
  const exists = isCustomMode
    ? queue.some((m) => m.word === customWord.trim())
    : tok
      ? queue.some((m) => m.word === tok.t)
      : false;

  const change = (s: SrcKey) => {
    setSrc(s);
    if (s !== "Teks Bebas") {
      setSel(data[s].tokens.findIndex((t) => t.m));
    }
  };

  const handleCustomCharClick = async (charIndex: number) => {
    if (!customText || charIndex < 0 || charIndex >= customText.length) return;
    const res = await lookup(customText, charIndex);
    const matchLen = res.matchedLength > 0 ? res.matchedLength : 1;
    const surface = res.matchedText || customText.slice(charIndex, charIndex + 1);

    setCustomMatchRange({ start: charIndex, len: matchLen });
    setCustomLookupResults(res.results);

    const extracted = extractSentenceAround(customText, charIndex, matchLen);
    setCustomSentenceHtml(extracted.sentenceHighlightedHtml);

    if (res.results.length > 0) {
      const top = res.results[0];
      setCustomWord(top.expression);
      setCustomReading(top.reading);
      const gloss =
        top.senses
          .map((s) => s.glossary.slice(0, 3).join("; "))
          .slice(0, 2)
          .join(" / ") || "";
      setCustomMeaning(gloss);
      setCustomReasons(top.deinflectReasons);
    } else {
      setCustomWord(surface);
      setCustomReading("");
      setCustomMeaning("");
      setCustomReasons([]);
    }
  };

  const sentenceAnki = cur.tokens.map((t) => (t.r ? ` ${t.t}[${t.r}]` : t.t)).join("");
  const plainPresetSentence = cur.tokens.map((t) => t.t).join("");

  const add = () => {
    const targetDeck = decks.find((d) => d.title === deck) ?? decks[0];
    if (isCustomMode) {
      if (!customWord.trim() || !customMeaning.trim() || exists) return;
      addMinedCard({
        word: customWord.trim(),
        reading: customReading.trim(),
        meaning: customMeaning.trim(),
        src: customSourceTitle.trim() || "Teks Bebas",
        deck,
        deckId: targetDeck?.id,
        sentence: customSentenceHtml,
        translation: `Sumber: ${customSourceTitle.trim() || "Teks Bebas"}`,
      });
      notify(`“${customWord.trim()}” ditambahkan ke antrean (${deck})`);
      return;
    }

    if (!tok || !tok.m || exists) return;
    addMinedCard({
      word: tok.t,
      reading: tok.r ?? "",
      meaning: tok.m,
      src: cur.title,
      deck,
      deckId: targetDeck?.id,
      sentence: sentenceAnki,
      translation: cur.tr,
    });
    notify(`“${tok.t}” ditambahkan ke antrean (${deck})`);
  };

  const handleSaveDirectCustomCard = async () => {
    const targetDeck = decks.find((d) => d.title === deck) ?? decks[0];
    if (!targetDeck || !customWord.trim() || !customMeaning.trim()) return;
    await addMinedCardToDeck(targetDeck.id, {
      word: customWord.trim(),
      reading: customReading.trim(),
      meaning: customMeaning.trim(),
      sentence: customSentenceHtml,
      translation: `Sumber: ${customSourceTitle.trim() || "Teks Bebas"}`,
      subdeck: customSourceTitle.trim() || "Teks Bebas",
      tags: ["mined", "teks-bebas"],
    });
    notify(`Kartu “${customWord.trim()}” langsung disimpan ke deck ${targetDeck.title}!`);
  };

  const saveAllToDeck = async () => {
    if (queue.length === 0) return;
    const byDeck = new Map<string, typeof queue>();
    for (const item of queue) {
      const targetDeck = decks.find((d) => d.id === item.deckId || d.title === item.deck) ?? decks[0];
      if (!targetDeck) continue;
      const list = byDeck.get(targetDeck.id) ?? [];
      list.push(item);
      byDeck.set(targetDeck.id, list);
    }
    for (const [targetDeckId, items] of byDeck.entries()) {
      await addCards(
        targetDeckId,
        items.map((m) => ({
          word: m.word,
          reading: m.reading,
          meaning: m.meaning,
          sentence: m.sentence ?? "",
          translation: m.translation ?? "",
          tags: ["mined", m.src],
        })),
      );
    }
    notify(`${queue.length} kartu berhasil disimpan ke deck!`);
    clearMinedQueue();
  };

  return (
    <>
      <PageHead eyebrow="DARI DUNIA NYATA" title="Sentence" accent="Mining" copy="Klik kata yang belum kamu kenal atau tempel kalimat Jepang sendiri, lalu ubah menjadi kartu belajar.">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button className="outline-button" onClick={() => setDictModalOpen(true)}>
            <Icon name="book" size={16} /> Kelola Kamus ({activeDictCount})
          </Button>
          <Tabs items={sources} value={src} onChange={change} />
        </div>
      </PageHead>

      <DictionaryManagerModal
        open={dictModalOpen}
        onClose={() => setDictModalOpen(false)}
        onDictionariesChanged={setDictionaries}
      />

      <div className="mn-grid">
        {!isCustomMode ? (
          <section className={`mn-stage ${cur.tone}`}>
            <div className="mn-stage-top">
              <div><span className="mn-badge">{src}</span><h2>{cur.title}</h2><small>{cur.where}</small></div>
              <label className="mn-furi"><input type="checkbox" checked={furigana} onChange={(e) => setFurigana(e.target.checked)} /> Furigana</label>
            </div>

            <p className="mn-sentence" lang="ja">
              <span className="mn-quote">「</span>
              {cur.tokens.map((t, i) =>
                t.m ? (
                  <button key={i} className={`mn-tok ${sel === i ? "on" : ""} ${queue.some((m) => m.word === t.t) ? "saved" : ""}`} onClick={() => setSel(i)}>
                    {furigana && <rt>{t.r}</rt>}{t.t}
                  </button>
                ) : <span key={i} className="mn-plain">{t.t}</span>,
              )}
              <span className="mn-quote">」</span>
            </p>
            <p className="mn-trans">{cur.tr}</p>

            <div className="mn-player">
              <Button
                className="mn-play"
                ariaLabel="Putar audio kalimat"
                onClick={() => {
                  speakJapanese(plainPresetSentence);
                  notify("Memutar pengucapan kalimat Jepang");
                }}
              >
                <Icon name="volume" size={18} />
              </Button>
              <div className="mn-track"><i style={{ width: `${cur.frac * 100}%` }} /></div>
              <span>{cur.pos}</span>
            </div>
          </section>
        ) : (
          <section className="mn-stage novel">
            <div className="mn-stage-top">
              <div>
                <span className="mn-badge">TEKS BEBAS + KAMUS YOMITAN</span>
                <h2>Studio Kalimat Kustom</h2>
                <small>
                  Tempel kalimat Jepang apa saja, lalu klik karakter awal kata untuk dicari otomatis di kamus.
                </small>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCustomText((v) => !v)}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                {isEditingCustomText ? "✓ Selesai Edit Teks" : "✎ Ubah / Tempel Teks"}
              </button>
            </div>

            {isEditingCustomText ? (
              <div className="relative z-10 my-4 flex-1 flex flex-col gap-3">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={5}
                  placeholder="Tempel kalimat atau paragraf bahasa Jepang di sini..."
                  className="w-full flex-1 rounded-xl border border-white/25 bg-black/25 p-3.5 text-base leading-relaxed text-white placeholder-white/50 focus:outline-none focus:border-[#d95b43]"
                  lang="ja"
                />
                <div className="flex items-center justify-between gap-2 text-xs text-white/75">
                  <span> panjang teks: {customText.length} karakter</span>
                  <button
                    type="button"
                    onClick={() => setCustomText(DEFAULT_CUSTOM_TEXT)}
                    className="underline hover:text-white"
                  >
                    Reset ke contoh bawaan
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="relative z-10 my-auto py-6 text-[23px] leading-[2.1] font-serif select-none"
                lang="ja"
              >
                {Array.from(customText).map((ch, idx) => {
                  const isHighlighted =
                    idx >= customMatchRange.start &&
                    idx < customMatchRange.start + customMatchRange.len;
                  return (
                    <span
                      key={idx}
                      onClick={() => void handleCustomCharClick(idx)}
                      className={`cursor-pointer rounded-xs px-0.5 transition-colors ${
                        isHighlighted
                          ? "bg-[#f7f3e9] text-[#1c2d28] font-bold border-b-2 border-[#d95b43]"
                          : "hover:bg-white/15"
                      }`}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mn-player">
              <Button
                className="mn-play"
                ariaLabel="Putar audio teks"
                onClick={() => {
                  speakJapanese(customSentenceHtml || customText);
                  notify("Memutar pengucapan kalimat Jepang");
                }}
              >
                <Icon name="volume" size={18} />
              </Button>
              <div className="flex-1 text-xs text-white/80 truncate">
                Klik huruf mana saja pada teks di atas untuk menjalankan deinflection &amp; ekstraksi kalimat.
              </div>
            </div>
          </section>
        )}

        <aside className="mn-card">
          <p className="eyebrow">BUAT KARTU</p>
          {!isCustomMode ? (
            tok && tok.m ? (
              <>
                <div className="mn-word">
                  <small>{tok.r}</small>
                  <div className="flex items-center gap-2">
                    <strong lang="ja">{tok.t}</strong>
                    <button
                      type="button"
                      onClick={() => speakJapanese(tok.r || tok.t)}
                      title="Dengarkan pengucapan kata"
                      className="rounded-lg border border-[#dfd9ce] bg-[#f8f5ef] p-1.5 text-[#c4543f] hover:bg-[#f1e6df] transition-colors"
                    >
                      <Icon name="volume" size={15} />
                    </button>
                  </div>
                  <span>{tok.lv}</span>
                </div>
                <dl className="mn-def">
                  <dt>Arti</dt><dd>{tok.m}</dd>
                  <dt>Konteks</dt><dd>{cur.tr}</dd>
                </dl>
                <label className="field"><span>Deck tujuan</span>
                  <select value={deck} onChange={(e) => setDeck(e.target.value)}>{deckOptions.map((d) => <option key={d}>{d}</option>)}</select>
                </label>
                <Button className="modal-submit" onClick={add} disabled={exists}>
                  <Icon name={exists ? "check" : "plus"} size={18} /> {exists ? "Sudah di antrean" : "Tambah ke antrean"}
                </Button>
              </>
            ) : (
              <p className="mn-hint">Pilih kata bergaris putus pada kalimat untuk melihat detailnya.</p>
            )
          ) : (
            <div className="space-y-2.5">
              {customLookupResults.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {customLookupResults.slice(0, 5).map((item, i) => (
                    <button
                      key={`${item.expression}-${i}`}
                      type="button"
                      onClick={() => {
                        setCustomWord(item.expression);
                        setCustomReading(item.reading);
                        setCustomMeaning(
                          item.senses
                            .map((s) => s.glossary.slice(0, 3).join("; "))
                            .slice(0, 2)
                            .join(" / "),
                        );
                        setCustomReasons(item.deinflectReasons);
                      }}
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold shrink-0 ${
                        customWord === item.expression
                          ? "border-[#d95b43] bg-[#f1e6df] text-[#bf5b46]"
                          : "border-[#e1ddd4] bg-white text-[#494740]"
                      }`}
                    >
                      {item.expression}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#ebe7de]">
                <div>
                  <small className="text-xs text-[#a06658] block">{customReading || "Bacaan (kana)"}</small>
                  <strong lang="ja" className="text-2xl font-serif text-[#25231f]">
                    {customWord || "Pilih kata"}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5">
                  {customReasons.length > 0 && (
                    <span className="rounded-md bg-[#f1e6df] px-2 py-0.5 text-[10px] font-bold text-[#bf5b46]">
                      {customReasons.join(" ← ")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => speakJapanese(customReading || customWord)}
                    title="Dengarkan pengucapan kata"
                    className="rounded-lg border border-[#dfd9ce] bg-[#f8f5ef] p-1.5 text-[#c4543f] hover:bg-[#f1e6df]"
                  >
                    <Icon name="volume" size={15} />
                  </button>
                </div>
              </div>

              <label className="field">
                <span>Kata &amp; Bacaan</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={customWord}
                    onChange={(e) => setCustomWord(e.target.value)}
                    placeholder="Kata (Kanji)"
                    lang="ja"
                  />
                  <input
                    value={customReading}
                    onChange={(e) => setCustomReading(e.target.value)}
                    placeholder="Bacaan (Hiragana)"
                    lang="ja"
                  />
                </div>
              </label>

              <label className="field">
                <span>Arti (otomatis dari kamus Yomitan atau isi manual)</span>
                <input
                  value={customMeaning}
                  onChange={(e) => setCustomMeaning(e.target.value)}
                  placeholder="Masukkan arti kata..."
                />
              </label>

              <label className="field">
                <span>Kalimat Sumber (otomatis diekstrak)</span>
                <input
                  value={customSentenceHtml}
                  onChange={(e) => setCustomSentenceHtml(e.target.value)}
                  lang="ja"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span>Nama Sumber</span>
                  <input
                    value={customSourceTitle}
                    onChange={(e) => setCustomSourceTitle(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Deck Tujuan</span>
                  <select value={deck} onChange={(e) => setDeck(e.target.value)}>
                    {deckOptions.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button className="outline-button justify-center" onClick={add} disabled={exists || !customWord.trim() || !customMeaning.trim()}>
                  <Icon name={exists ? "check" : "plus"} size={15} /> {exists ? "Di Antrean" : "+ Antrean"}
                </Button>
                <Button
                  className="pg-primary justify-center"
                  onClick={() => void handleSaveDirectCustomCard()}
                  disabled={!customWord.trim() || !customMeaning.trim()}
                >
                  <Icon name="check" size={15} /> Simpan ke Deck
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      <section className="section mn-queue">
        <div className="section-heading">
          <div><p className="eyebrow">HASIL TAMBANGAN</p><h2>Antrean hari ini <small className="mn-count">{queue.length}</small></h2></div>
          <Button className="outline-button" onClick={() => void saveAllToDeck()} disabled={queue.length === 0}><Icon name="upload" size={16} /> Simpan semua ke deck</Button>
        </div>
        {queue.length === 0 ? <p className="pg-empty">Antrean kosong — klik kata pada kalimat untuk mulai menambang.</p> : (
          <div className="source-list">
            {queue.map((m) => (
              <article className="mn-row" key={m.id}>
                <strong lang="ja">{m.word}</strong>
                <span className="mn-read">{m.reading}</span>
                <span className="mn-mean">{m.meaning}</span>
                <span className="mn-from">{m.src} → {m.deck}</span>
                <Button className="round-arrow" ariaLabel={`Hapus ${m.word}`} onClick={() => removeMinedCard(m.id)}><Icon name="trash" size={15} /></Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
