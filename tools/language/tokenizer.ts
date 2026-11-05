/**
 * Tokenizer & Morphological Segmenter Bahasa Jepang N5
 *
 * Dirancang khusus untuk membedah kalimat bertingkat N5 secara deterministik,
 * cepat (<1ms), dan murni TypeScript tanpa dependensi biner/native.
 * Menggunakan pencocokan leksikal maksimal (maximal matching) berdasarkan:
 * - Entri kosakata N5 (JMdict terkurasi)
 * - Tabel infleksi verba (v1, v5, vk, vs) dan adjektiva (adj-i)
 * - Partikel dan kata bantu tata bahasa N5
 */

import n5VocabList from "../data/n5_vocab_reference.json";
import n5KanjiList from "../data/n5_kanji_reference.json";

export type TokenType =
  | "noun"
  | "verb"
  | "adj-i"
  | "adj-na"
  | "particle"
  | "auxiliary"
  | "adverb"
  | "pronoun"
  | "numeral"
  | "symbol"
  | "other";

export interface Token {
  surface: string;
  reading: string;
  lemma: string;
  pos: TokenType;
  ent_seq?: string;
  start: number;
  end: number;
}

export interface LexiconEntry {
  surface: string;
  reading: string;
  lemma: string;
  pos: TokenType;
  ent_seq?: string;
}

// 1. Partikel bahasa Jepang standar N5
const PARTICLES: Array<{ surface: string; reading: string }> = [
  { surface: "から", reading: "から" },
  { surface: "まで", reading: "まで" },
  { surface: "より", reading: "より" },
  { surface: "など", reading: "など" },
  { surface: "だけ", reading: "だけ" },
  { surface: "しか", reading: "しか" },
  { surface: "では", reading: "では" },
  { surface: "には", reading: "には" },
  { surface: "とは", reading: "とは" },
  { surface: "は", reading: "わ" }, // pembacaan partikel は adalah wa
  { surface: "が", reading: "が" },
  { surface: "を", reading: "お" }, // pembacaan partikel を adalah o
  { surface: "に", reading: "に" },
  { surface: "で", reading: "で" },
  { surface: "へ", reading: "え" }, // pembacaan partikel へ adalah e
  { surface: "と", reading: "と" },
  { surface: "も", reading: "も" },
  { surface: "の", reading: "の" },
  { surface: "か", reading: "か" },
  { surface: "ね", reading: "ね" },
  { surface: "よ", reading: "よ" }
];

// 2. Kopula dan kata bantu
const COPULAS: Array<{ surface: string; reading: string; lemma: string }> = [
  { surface: "でした", reading: "でした", lemma: "だ" },
  { surface: "ではない", reading: "ではない", lemma: "だ" },
  { surface: "じゃありません", reading: "じゃありません", lemma: "だ" },
  { surface: "じゃありませんでした", reading: "じゃありませんでした", lemma: "だ" },
  { surface: "です", reading: "です", lemma: "だ" },
  { surface: "だった", reading: "だった", lemma: "だ" },
  { surface: "だ", reading: "だ", lemma: "だ" }
];

// 3. Kata ganti demonstratif / N5 dasar
const DEMONSTRATIVES: Array<{ surface: string; reading: string; pos: TokenType }> = [
  { surface: "これ", reading: "これ", pos: "pronoun" },
  { surface: "それ", reading: "それ", pos: "pronoun" },
  { surface: "あれ", reading: "あれ", pos: "pronoun" },
  { surface: "どれ", reading: "どれ", pos: "pronoun" },
  { surface: "この", reading: "この", pos: "pronoun" },
  { surface: "その", reading: "その", pos: "pronoun" },
  { surface: "あの", reading: "あの", pos: "pronoun" },
  { surface: "どの", reading: "どの", pos: "pronoun" },
  { surface: "ここ", reading: "ここ", pos: "pronoun" },
  { surface: "そこ", reading: "そこ", pos: "pronoun" },
  { surface: "あそこ", reading: "あそこ", pos: "pronoun" },
  { surface: "どこ", reading: "どこ", pos: "pronoun" },
  { surface: "だれ", reading: "だれ", pos: "pronoun" },
  { surface: "何", reading: "なに", pos: "pronoun" },
  { surface: "よく", reading: "よく", pos: "adverb" },
  { surface: "とても", reading: "とても", pos: "adverb" },
  { surface: "いつも", reading: "いつも", pos: "adverb" }
];

// 4. Penghitung dan Angka N5
const NUMERALS: Array<{ surface: string; reading: string }> = [
  { surface: "一", reading: "いち" },
  { surface: "二", reading: "に" },
  { surface: "三", reading: "さん" },
  { surface: "四", reading: "よん" },
  { surface: "五", reading: "ご" },
  { surface: "六", reading: "ろく" },
  { surface: "七", reading: "しち" },
  { surface: "八", reading: "はち" },
  { surface: "九", reading: "きゅう" },
  { surface: "十", reading: "じゅう" }
];

const COUNTERS: Array<{ surface: string; reading: string }> = [
  { surface: "時", reading: "じ" },
  { surface: "分", reading: "ふん" },
  { surface: "日", reading: "にち" },
  { surface: "月", reading: "がつ" },
  { surface: "年", reading: "ねん" },
  { surface: "人", reading: "にん" },
  { surface: "本", reading: "ほん" },
  { surface: "枚", reading: "まい" }
];

/**
 * Membangun kamus leksikal yang diperluas dengan bentuk-bentuk konjugasi N5.
 */
function buildExpandedLexicon(): LexiconEntry[] {
  const entries: LexiconEntry[] = [];

  // Tambahkan kosakata dasar N5 dari file referensi
  for (const item of n5VocabList) {
    const baseEntry: LexiconEntry = {
      surface: item.kanji,
      reading: item.kana,
      lemma: item.kanji,
      pos: item.pos as TokenType,
      ent_seq: item.ent_seq
    };
    entries.push(baseEntry);

    // Bila kanji berbeda dari kana, tambahkan juga bentuk kana-nya sebagai alias
    if (item.kanji !== item.kana) {
      entries.push({
        surface: item.kana,
        reading: item.kana,
        lemma: item.kanji,
        pos: item.pos as TokenType,
        ent_seq: item.ent_seq
      });
    }

    // Perluasan konjugasi verba N5
    if (item.pos === "v1") {
      // Ichidan (misal: 食べる -> stem: 食べ / たべ)
      const stemSurface = item.kanji.slice(0, -1);
      const stemReading = item.kana.slice(0, -1);
      const inflections: Array<{ sfx: string; sfxReading: string }> = [
        { sfx: "ます", sfxReading: "ます" },
        { sfx: "ました", sfxReading: "ました" },
        { sfx: "ません", sfxReading: "ません" },
        { sfx: "ませんでした", sfxReading: "ませんでした" },
        { sfx: "て", sfxReading: "て" },
        { sfx: "た", sfxReading: "た" },
        { sfx: "ない", sfxReading: "ない" },
        { sfx: "たい", sfxReading: "たい" }
      ];
      for (const inf of inflections) {
        entries.push({
          surface: stemSurface + inf.sfx,
          reading: stemReading + inf.sfxReading,
          lemma: item.kanji,
          pos: "verb",
          ent_seq: item.ent_seq
        });
      }
    } else if (item.pos === "v5") {
      // Godan (misal: 飲む, 行く, 買う, 帰る, 書く, 聞く, 話す, 読む, 会う, ある)
      const lastChar = item.kanji.slice(-1);
      const rootSurface = item.kanji.slice(0, -1);
      const rootReading = item.kana.slice(0, -1);

      // Bentuk stem -i (polite stem)
      let stemI = "";
      let teTa = { te: "", ta: "" };
      let neg = "";

      if (lastChar === "む" || lastChar === "ぶ") {
        stemI = "み";
        teTa = { te: "んで", ta: "んだ" };
        neg = "まない";
      } else if (lastChar === "く") {
        stemI = "き";
        if (item.kanji === "行く") {
          teTa = { te: "って", ta: "った" };
        } else {
          teTa = { te: "いて", ta: "いた" };
        }
        neg = "かない";
      } else if (lastChar === "す") {
        stemI = "し";
        teTa = { te: "して", ta: "した" };
        neg = "さない";
      } else if (lastChar === "う" || lastChar === "つ" || lastChar === "る") {
        if (lastChar === "う") {
          stemI = "い";
          neg = "わない";
        } else if (lastChar === "つ") {
          stemI = "ち";
          neg = "たない";
        } else {
          stemI = "り";
          neg = "らない";
        }
        teTa = { te: "って", ta: "った" };
      }

      if (stemI) {
        const politeSfx = [
          { sfx: "ます", r: "ます" },
          { sfx: "ました", r: "ました" },
          { sfx: "ません", r: "ません" },
          { sfx: "ませんでした", r: "ませんでした" },
          { sfx: "たい", r: "たい" }
        ];
        for (const p of politeSfx) {
          entries.push({
            surface: rootSurface + stemI + p.sfx,
            reading: rootReading + stemI + p.r,
            lemma: item.kanji,
            pos: "verb",
            ent_seq: item.ent_seq
          });
        }
      }

      if (teTa.te) {
        entries.push({
          surface: rootSurface + teTa.te,
          reading: rootReading + teTa.te,
          lemma: item.kanji,
          pos: "verb",
          ent_seq: item.ent_seq
        });
        entries.push({
          surface: rootSurface + teTa.ta,
          reading: rootReading + teTa.ta,
          lemma: item.kanji,
          pos: "verb",
          ent_seq: item.ent_seq
        });
      }

      if (neg && item.kanji !== "ある") {
        entries.push({
          surface: rootSurface + neg,
          reading: rootReading + neg,
          lemma: item.kanji,
          pos: "verb",
          ent_seq: item.ent_seq
        });
      }
    } else if (item.pos === "vk") {
      // 来る (kuru)
      entries.push(
        { surface: "来ます", reading: "きます", lemma: "来る", pos: "verb", ent_seq: item.ent_seq },
        { surface: "来ました", reading: "きました", lemma: "来る", pos: "verb", ent_seq: item.ent_seq },
        { surface: "来ません", reading: "きません", lemma: "来る", pos: "verb", ent_seq: item.ent_seq },
        { surface: "来て", reading: "きて", lemma: "来る", pos: "verb", ent_seq: item.ent_seq },
        { surface: "来た", reading: "きた", lemma: "来る", pos: "verb", ent_seq: item.ent_seq },
        { surface: "来ない", reading: "こない", lemma: "来る", pos: "verb", ent_seq: item.ent_seq }
      );
    } else if (item.pos === "adj-i") {
      // i-adjective (misal: 赤い -> 赤いです, 赤かった, 赤くない)
      const stemSurface = item.kanji.slice(0, -1);
      const stemReading = item.kana.slice(0, -1);
      entries.push(
        { surface: item.kanji + "です", reading: item.kana + "です", lemma: item.kanji, pos: "adj-i", ent_seq: item.ent_seq },
        { surface: stemSurface + "く", reading: stemReading + "く", lemma: item.kanji, pos: "adj-i", ent_seq: item.ent_seq },
        { surface: stemSurface + "かった", reading: stemReading + "かった", lemma: item.kanji, pos: "adj-i", ent_seq: item.ent_seq }
      );
    }

    // Kasus khusus kata benda majemuk suru: 勉強します, 勉強しました
    if (item.kanji === "勉強") {
      entries.push(
        { surface: "勉強します", reading: "べんきょうします", lemma: "勉強する", pos: "verb", ent_seq: item.ent_seq },
        { surface: "勉強しました", reading: "べんきょうしました", lemma: "勉強する", pos: "verb", ent_seq: item.ent_seq },
        { surface: "勉強して", reading: "べんきょうして", lemma: "勉強する", pos: "verb", ent_seq: item.ent_seq },
        { surface: "勉強する", reading: "べんきょうする", lemma: "勉強する", pos: "verb", ent_seq: item.ent_seq }
      );
    }
  }

  // Tambahkan partikel
  for (const p of PARTICLES) {
    entries.push({
      surface: p.surface,
      reading: p.reading,
      lemma: p.surface,
      pos: "particle"
    });
  }

  // Tambahkan kopula
  for (const c of COPULAS) {
    entries.push({
      surface: c.surface,
      reading: c.reading,
      lemma: c.lemma,
      pos: "auxiliary"
    });
  }

  // Tambahkan demonstratif
  for (const d of DEMONSTRATIVES) {
    entries.push({
      surface: d.surface,
      reading: d.reading,
      lemma: d.surface,
      pos: d.pos
    });
  }

  // Tambahkan angka & counter
  for (const num of NUMERALS) {
    entries.push({
      surface: num.surface,
      reading: num.reading,
      lemma: num.surface,
      pos: "numeral"
    });
  }
  for (const cnt of COUNTERS) {
    entries.push({
      surface: cnt.surface,
      reading: cnt.reading,
      lemma: cnt.surface,
      pos: "noun"
    });
  }

  // Tambahkan entri kanji individual dari KANJIDIC2 sebagai fallback jika kanji berdiri sendiri
  for (const k of n5KanjiList) {
    // Pilih bacaan kun utama jika ada (dibersihkan dari tanda baca/titik), atau on utama
    const kun = (k.kun as string[])?.[0]?.split("・")[0]?.split(".")[0]?.replace(/^-/, "") || "";
    const on = (k.on as string[])?.[0] || "";
    const defaultReading = kun || on || "";
    entries.push({
      surface: k.kanji,
      reading: defaultReading,
      lemma: k.kanji,
      pos: "noun"
    });
  }

  // Urutkan kamus berdasarkan panjang string surface menurun (longest matching first)
  // Bila panjang sama, urutkan berdasarkan surface deterministik
  entries.sort((a, b) => {
    if (b.surface.length !== a.surface.length) {
      return b.surface.length - a.surface.length;
    }
    return a.surface.localeCompare(b.surface);
  });

  return entries;
}

// Singleton kamus terurut
const LEXICON = buildExpandedLexicon();

// Peta cepat kanji ke bacaan dari KANJIDIC2
const KANJI_MAP = new Map(n5KanjiList.map((k) => [k.kanji, k]));

/**
 * Tokenize teks Jepang N5 menjadi array Token.
 */
export function tokenizeJapanese(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    // Cek simbol atau tanda baca Jepang / standar
    if (/[。、！？「」『』（）\s.,!?:;~]/.test(char)) {
      tokens.push({
        surface: char,
        reading: char,
        lemma: char,
        pos: "symbol",
        start: i,
        end: i + 1
      });
      i += 1;
      continue;
    }

    // Cek digit angka latin (mis. 7, 5)
    if (/[0-9]/.test(char)) {
      let numStr = char;
      let j = i + 1;
      while (j < len && /[0-9]/.test(text[j])) {
        numStr += text[j];
        j++;
      }
      tokens.push({
        surface: numStr,
        reading: numStr,
        lemma: numStr,
        pos: "numeral",
        start: i,
        end: j
      });
      i = j;
      continue;
    }

    // Maximal matching dari kamus leksikal terurut
    let matched = false;
    for (const entry of LEXICON) {
      const entryLen = entry.surface.length;
      if (entryLen <= len - i && text.startsWith(entry.surface, i)) {
        tokens.push({
          surface: entry.surface,
          reading: entry.reading,
          lemma: entry.lemma,
          pos: entry.pos,
          ent_seq: entry.ent_seq,
          start: i,
          end: i + entryLen
        });
        i += entryLen;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Jika belum cocok, cek apakah blok katakana beruntun
    if (/[\u30A0-\u30FF]/.test(char)) {
      let kataStr = char;
      let j = i + 1;
      while (j < len && /[\u30A0-\u30FF]/.test(text[j])) {
        kataStr += text[j];
        j++;
      }
      tokens.push({
        surface: kataStr,
        reading: kataStr,
        lemma: kataStr,
        pos: "noun",
        start: i,
        end: j
      });
      i = j;
      continue;
    }

    // Fallback: karakter tunggal (mis. kanji tak dikenal atau hiragana sisa)
    const kanjiInfo = KANJI_MAP.get(char);
    const reading =
      (kanjiInfo?.kun as string[])?.[0]?.split("・")[0]?.split(".")[0]?.replace(/^-/, "") ||
      (kanjiInfo?.on as string[])?.[0] ||
      char;
    tokens.push({
      surface: char,
      reading,
      lemma: char,
      pos: kanjiInfo ? "noun" : "other",
      start: i,
      end: i + 1
    });
    i += 1;
  }

  return tokens;
}

/**
 * Mencari token kata target dalam kalimat berdasarkan teks target.
 */
export function findTargetToken(tokens: Token[], targetText: string): Token | undefined {
  return tokens.find((t) => t.surface === targetText || t.lemma === targetText);
}
