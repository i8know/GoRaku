// Card-level operations that keep IndexedDB (card bodies), the deck list (totals)
// and the SRS store (schedules) in sync. UI code should go through these helpers
// instead of calling deckDb directly.

import { deleteCards, getCards, getDeckMediaCount, listStoredDeckIds, putCards, type StoredCard } from "./deckDb";
import { sanitizeInline, toPlain } from "./ankiText";
import { toHiragana } from "./kana";
import { SEED_TOTALS, useAppStore } from "../store/useAppStore";
import { useReviewStore } from "../store/useReviewStore";

export const DECK_LEVELS = ["N5", "N4", "N3", "N2", "N1", "Campuran"] as const;
export const DECK_KINDS = ["Core", "Anime", "Novel", "Manga", "YouTube"] as const;
export const DECK_COLORS = ["coral", "indigo", "sage", "ochre", "plum", "slate"] as const;
export const KANJI_SUGGEST = ["札", "語", "単", "漢", "学", "日", "旅", "夢"];

export const autoKanji = (t: string) => (t.match(/[\u3400-\u9fff]/g) ?? []).slice(0, 2).join("") || "札";

/** "N4 • Core" → { level: "N4", kind: "Core" } (best effort for older free-form labels). */
export function splitLevel(deck: { level: string; kind: string }) {
  const parts = deck.level.split("•").map((s) => s.trim());
  const level = parts.find((p) => (DECK_LEVELS as readonly string[]).includes(p)) ?? "Campuran";
  return { level, kind: deck.kind };
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** User-typed text → the safe inline HTML format cards are stored in. */
export const textToHtml = (s: string) => escapeHtml(s.trim()).replace(/\r?\n/g, "<br>");

/** Stored inline HTML → editable plain text (keeps Anki `漢字[かんじ]` furigana brackets). */
export const htmlToText = (s: string) =>
  s
    .split(/<br\s*\/?>/i)
    .map(toPlain)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// ---------------------------------------------------------------------------
// Starter decks
// ---------------------------------------------------------------------------

type Seed = [word: string, reading: string, meaning: string, sentence: string, translation: string];

const SEEDS: Record<string, Seed[]> = {
  "1": [
    ["大丈夫", "だいじょうぶ", "baik-baik saja; tidak apa-apa", " 大丈夫[だいじょうぶ]？ 怪我[けが]はない？", "Kamu baik-baik saja? Tidak terluka?"],
    ["約束", "やくそく", "janji", " 明日[あした]の 約束[やくそく]、 忘[わす]れないでね。", "Jangan lupa janji besok, ya."],
    ["準備", "じゅんび", "persiapan", "もう 準備[じゅんび]できた？", "Sudah siap?"],
    ["遅刻", "ちこく", "terlambat (datang)", " 電車[でんしゃ]が 止[と]まって 遅刻[ちこく]した。", "Keretanya berhenti, jadi aku terlambat."],
    ["片付ける", "かたづける", "merapikan; membereskan", " 部屋[へや]を 片付[かたづ]けなさい。", "Rapikan kamarmu."],
    ["届く", "とどく", "sampai; tersampaikan", " 諦[あきら]めなければ、きっと 届[とど]く。", "Kalau tidak menyerah, pasti akan tersampaikan."],
    ["自分らしく", "じぶんらしく", "menjadi diri sendiri", " 自分[じぶん]らしく 生[い]きることは、 思[おも]ったより 難[むずか]しい。", "Hidup menjadi diri sendiri lebih sulit dari yang dibayangkan."],
    ["久しぶり", "ひさしぶり", "sudah lama tidak (bertemu)", " 久[ひさ]しぶり！ 元気[げんき]だった？", "Lama tak jumpa! Apa kabar?"],
    ["似合う", "にあう", "cocok (dipakai)", "その 服[ふく]、よく 似合[にあ]ってるね。", "Baju itu cocok sekali untukmu."],
    ["気をつける", "きをつける", "berhati-hati", " 気[き]をつけて 帰[かえ]ってね。", "Hati-hati di jalan pulang, ya."],
    ["迷う", "まよう", "bingung; tersesat", "どっちにするか 迷[まよ]っている。", "Aku bingung mau pilih yang mana."],
    ["楽しみ", "たのしみ", "menantikan; hal yang dinanti", " 週末[しゅうまつ]の 旅行[りょこう]が 楽[たの]しみだ。", "Aku menantikan perjalanan akhir pekan."],
  ],
  "2": [
    ["寿命", "じゅみょう", "umur; masa hidup", " 人間[にんげん]の 寿命[じゅみょう]は 短[みじか]いんだね。", "Umur manusia itu pendek, ya."],
    ["魔法", "まほう", "sihir", " 魔法[まほう]はイメージの 世界[せかい]だ。", "Sihir adalah dunia imajinasi."],
    ["勇者", "ゆうしゃ", "pahlawan", " 勇者[ゆうしゃ]ヒンメルならそうした。", "Pahlawan Himmel pasti akan melakukan itu."],
    ["旅", "たび", "perjalanan; petualangan", "10 年[ねん]の 旅[たび]が 終[お]わった。", "Perjalanan sepuluh tahun telah berakhir."],
    ["弟子", "でし", "murid", " 私[わたし]の 弟子[でし]は 優秀[ゆうしゅう]だよ。", "Muridku sangat berbakat."],
    ["後悔", "こうかい", "penyesalan", "もっと 知[し]ろうとしなかったことを 後悔[こうかい]している。", "Aku menyesal tidak berusaha mengenalnya lebih jauh."],
    ["墓", "はか", "makam", " 仲間[なかま]の 墓[はか]に 花[はな]を 供[そな]える。", "Meletakkan bunga di makam rekan seperjalanan."],
    ["思い出", "おもいで", "kenangan", " 大切[たいせつ]な 思[おも]い 出[で]だ。", "Itu kenangan yang berharga."],
  ],
  "3": [
    ["台所", "だいどころ", "dapur", " 私[わたし]がこの 世[よ]でいちばん 好[す]きな 場所[ばしょ]は 台所[だいどころ]だと 思[おも]う。", "Kurasa tempat yang paling kusukai di dunia ini adalah dapur."],
    ["祖母", "そぼ", "nenek", " 祖母[そぼ]が 死[し]んでしまった。", "Nenekku telah meninggal."],
    ["孤独", "こどく", "kesepian; kesendirian", " 夜[よる]の 孤独[こどく]に 慣[な]れていく。", "Perlahan terbiasa dengan kesepian malam."],
    ["冷蔵庫", "れいぞうこ", "kulkas", " 冷蔵庫[れいぞうこ]の 音[おと]だけが 聞[き]こえる。", "Hanya suara kulkas yang terdengar."],
    ["眠る", "ねむる", "tidur", " 台所[だいどころ]の 床[ゆか]で 眠[ねむ]った。", "Aku tidur di lantai dapur."],
    ["居候", "いそうろう", "menumpang tinggal", " 田辺[たなべ] 家[け]に 居候[いそうろう]することになった。", "Aku jadi menumpang tinggal di rumah keluarga Tanabe."],
    ["不思議", "ふしぎ", "aneh; misterius", " 不思議[ふしぎ]な 人[ひと]たちだった。", "Mereka orang-orang yang misterius."],
    ["料理", "りょうり", "masakan; memasak", " 料理[りょうり]をすると 心[こころ]が 落[お]ち 着[つ]く。", "Memasak membuat hatiku tenang."],
  ],
};

const SEED_FLAG = "ma-seed-v1";

async function seedStarterDecks(): Promise<void> {
  if (localStorage.getItem(SEED_FLAG)) return;
  const decks = useAppStore.getState().decks;
  for (const [deckId, rows] of Object.entries(SEEDS)) {
    if (!decks.some((d) => d.id === deckId && d.source === "manual" && d.total === SEED_TOTALS[deckId])) continue;
    const existing = await getCards(deckId);
    if (existing.length > 0) continue;
    const cards: StoredCard[] = rows.map(([word, reading, meaning, sentence, translation], i) => ({
      id: `s${deckId}-${String(i + 1).padStart(2, "0")}`,
      deckId,
      word,
      reading,
      meaning,
      sentence,
      translation,
      subdeck: "",
      tags: [],
    }));
    await putCards(cards);
    // Older versions stored schedules for demo card ids that no longer exist.
    const valid = new Set(cards.map((c) => c.id));
    const orphans = Object.keys(useReviewStore.getState().srsCards[deckId] ?? {}).filter((id) => !valid.has(id));
    useReviewStore.getState().forgetCards(deckId, orphans);
  }
  localStorage.setItem(SEED_FLAG, "1");
}

function commonSubdeckRoot(subdecks: string[]): string {
  const valid = subdecks.filter(Boolean);
  if (valid.length === 0) return "";
  const parts = valid.map((n) => n.split("::"));
  const root: string[] = [];
  for (let i = 0; i < parts[0].length; i++) {
    const seg = parts[0][i];
    if (parts.every((p) => p[i] === seg)) root.push(seg);
    else break;
  }
  return root.join(" · ") || valid[0].split("::").pop() || "";
}

async function recoverOrphanedDecks(): Promise<void> {
  try {
    const storedIds = await listStoredDeckIds();
    const knownIds = new Set(useAppStore.getState().decks.map((d) => d.id));
    for (const deckId of storedIds) {
      if (knownIds.has(deckId) || !deckId.startsWith("deck-")) continue;
      const cards = await getCards(deckId);
      if (cards.length === 0) continue;
      // Re-check in case an import just finished concurrently
      if (useAppStore.getState().decks.some((d) => d.id === deckId)) continue;
      const subdecks = [...new Set(cards.map((c) => c.subdeck).filter(Boolean))];
      const mediaCount = await getDeckMediaCount(deckId);
      const importedAt = Number(deckId.replace(/^deck-/, "")) || Date.now();
      const title = commonSubdeckRoot(subdecks) || "Deck Impor Anki";
      useAppStore.getState().importDeck({
        id: deckId,
        title,
        level: "Campuran • Core",
        kind: "Core",
        total: cards.length,
        kanji: autoKanji(title),
        color: "indigo",
        meta: {
          fileName: `${title}.apkg`,
          fileSize: 0,
          format: "anki21b",
          importedAt,
          noteTypes: [],
          subdecks,
          mediaCount,
          skipped: 0,
        },
      });
    }
  } catch {
    /* ignore recovery errors */
  }
}

let seedPromise: Promise<void> | null = null;
export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedStarterDecks().catch((e) => console.warn("Seeding skipped", e));
  }
  await seedPromise;
  await recoverOrphanedDecks();
}

/** Cards of a deck in insertion order (waits for the starter decks to be seeded on first run). */
export async function loadDeckCards(deckId: string): Promise<StoredCard[]> {
  await ensureSeeded();
  return getCards(deckId);
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export interface CardDraft {
  word: string;
  reading: string;
  meaning: string;
  sentence: string;
  translation: string;
  tags: string[];
}

const newId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function syncTotal(deckId: string) {
  const total = (await getCards(deckId)).length;
  useAppStore.getState().updateDeck(deckId, { total });
  return total;
}

export async function addCards(deckId: string, drafts: CardDraft[]): Promise<StoredCard[]> {
  const cards: StoredCard[] = drafts.map((d) => ({
    id: newId() + Math.random().toString(36).slice(2, 4),
    deckId,
    word: d.word.trim(),
    reading: d.reading.trim(),
    meaning: textToHtml(d.meaning),
    sentence: textToHtml(d.sentence),
    translation: textToHtml(d.translation),
    subdeck: "",
    tags: d.tags,
  }));
  await putCards(cards);
  await syncTotal(deckId);
  return cards;
}

/**
 * Menghasilkan kunci unik `(expression + reading)` yang dinormalisasi ke Hiragana
 * untuk mendeteksi kartu ganda di dalam sebuah deck.
 */
export function buildCardDuplicateKey(word: string, reading: string): string {
  const w = word.trim();
  const r = toHiragana((reading || word).trim());
  return `${w}::${r}`;
}

/**
 * Mengambil himpunan kunci `(expression + reading)` dari seluruh kartu yang sudah ada
 * di dalam deck tujuan agar popup Sentence Mining dapat memberi penanda duplikat.
 */
export async function getDeckDuplicateKeys(deckId: string): Promise<Set<string>> {
  const cards = await loadDeckCards(deckId);
  const set = new Set<string>();
  for (const c of cards) {
    set.add(buildCardDuplicateKey(c.word, c.reading));
    if (c.word.trim()) {
      set.add(`${c.word.trim()}::*`);
    }
  }
  return set;
}

/**
 * Menyimpan kartu hasil Sentence Mining ke deck tujuan menggunakan model `StoredCard`
 * yang sudah ada, dengan mempertahankan tag inline aman (`<b>kata</b>` pada kalimat sumber).
 */
export async function addMinedCardToDeck(
  deckId: string,
  draft: CardDraft & { subdeck?: string },
): Promise<StoredCard> {
  const card: StoredCard = {
    id: newId() + Math.random().toString(36).slice(2, 4),
    deckId,
    word: draft.word.trim(),
    reading: draft.reading.trim(),
    meaning: sanitizeInline(draft.meaning.trim().replace(/\r?\n/g, "<br>")),
    sentence: sanitizeInline(draft.sentence.trim().replace(/\r?\n/g, "<br>")),
    translation: textToHtml(draft.translation),
    subdeck: draft.subdeck?.trim() ?? "",
    tags: draft.tags,
  };
  await putCards([card]);
  await syncTotal(deckId);
  return card;
}

/**
 * Save edits to an existing card. Only fields whose plain-text value actually changed are
 * rewritten, so untouched Anki formatting (bold, line breaks…) is preserved.
 */
export async function updateCard(card: StoredCard, draft: CardDraft): Promise<StoredCard> {
  const pick = (field: "meaning" | "sentence" | "translation") =>
    draft[field].trim() === htmlToText(card[field]).trim() ? card[field] : textToHtml(draft[field]);
  const next: StoredCard = {
    ...card,
    word: draft.word.trim(),
    reading: draft.reading.trim(),
    meaning: pick("meaning"),
    sentence: pick("sentence"),
    translation: pick("translation"),
    tags: draft.tags,
  };
  await putCards([next]);
  useAppStore.getState().updateDeck(card.deckId, {});
  return next;
}

export async function removeCards(deckId: string, ids: string[]): Promise<void> {
  await deleteCards(deckId, ids);
  useReviewStore.getState().forgetCards(deckId, ids);
  await syncTotal(deckId);
}

export function draftFromCard(c?: StoredCard): CardDraft {
  if (!c) return { word: "", reading: "", meaning: "", sentence: "", translation: "", tags: [] };
  return {
    word: c.word,
    reading: c.reading,
    meaning: htmlToText(c.meaning),
    sentence: htmlToText(c.sentence),
    translation: htmlToText(c.translation),
    tags: c.tags ?? [],
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "deck";

export async function exportDeck(deckId: string, title: string, format: "csv" | "json"): Promise<number> {
  const cards = await getCards(deckId);
  const srs = useReviewStore.getState().srsCards[deckId] ?? {};
  if (format === "json") {
    const body = { title, exportedAt: new Date().toISOString(), cards: cards.map(({ deckId: _d, ...c }) => ({ ...c, srs: srs[c.id] ?? null })) };
    download(`${slug(title)}.json`, "application/json", JSON.stringify(body, null, 2));
  } else {
    const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [["word", "reading", "meaning", "sentence", "translation", "tags"].join(",")];
    for (const c of cards) rows.push([c.word, c.reading, toPlain(c.meaning), toPlain(c.sentence), toPlain(c.translation), (c.tags ?? []).join(" ")].map(cell).join(","));
    // BOM so Excel opens Japanese text correctly.
    download(`${slug(title)}.csv`, "text/csv;charset=utf-8", "\ufeff" + rows.join("\n"));
  }
  return cards.length;
}
