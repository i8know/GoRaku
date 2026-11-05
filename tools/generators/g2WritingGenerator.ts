/**
 * Generator Soal G2 - Penulisan Kanji (Hiragana -> Kanji)
 *
 * Mengambil kata target berkanji dari daftar N5, menampilkannya dalam Hiragana
 * bergaris bawah <u>...</u> pada kalimat Tatoeba, serta menghasilkan 3 opsi pengecoh
 * kanji yang mirip secara visual (visual look-alike) yang bukan merupakan kata sah
 * dengan bacaan yang sama di JMdict.
 *
 * Sesuai aturan: Semua soal jenis ini ditandai dengan status 'draft' (perlu ditinjau manusia).
 */

import { QuestionItem } from "../../src/lib/questionPack";
import { PRNG, createPRNG } from "../utils/prng";
import { tokenizeJapanese } from "../language/tokenizer";
import { generateRubyNodes, renderPromptWithUnderline } from "../language/furigana";
import n5VocabList from "../data/n5_vocab_reference.json";
import sampleTatoebaList from "../data/sample_tatoeba_n5.json";
import visualDistractorsData from "../data/visual_distractors.json";

const VISUAL_MAP: Record<string, string[]> = visualDistractorsData;

// Peta bacaan sah per bentuk kanji untuk memvalidasi bahwa pengecoh visual
// tidak kebetulan merupakan kata sah dengan pembacaan yang sama di JMdict
const JMDictKanjiToReadings = new Map<string, Set<string>>();
for (const v of n5VocabList) {
  if (!JMDictKanjiToReadings.has(v.kanji)) {
    JMDictKanjiToReadings.set(v.kanji, new Set());
  }
  JMDictKanjiToReadings.get(v.kanji)!.add(v.kana);
}

export interface G2GeneratorOptions {
  seed: number;
  maxQuestions?: number;
}

/**
 * Menghasilkan 3 pengecoh kanji yang mirip secara visual.
 */
export function generateVisualDistractors(
  targetKanjiWord: string,
  targetReading: string,
  rng: PRNG
): string[] {
  const chars = Array.from(targetKanjiWord);
  const candidates: string[] = [];

  if (chars.length === 1) {
    // Kanji tunggal: ambil langsung dari visual map
    const lookalikes = VISUAL_MAP[chars[0]] || [];
    candidates.push(...lookalikes);
  } else {
    // Kanji majemuk (2+ kanji): ganti salah satu kanji dengan kembaran visualnya
    for (let pos = 0; pos < chars.length; pos++) {
      const char = chars[pos];
      const lookalikes = VISUAL_MAP[char] || [];
      for (const sim of lookalikes) {
        const variant = chars.slice(0, pos).join("") + sim + chars.slice(pos + 1).join("");
        candidates.push(variant);
      }
    }
  }

  // Filter ketat:
  // 1. Tidak sama dengan kata target
  // 2. Tidak boleh merupakan kata sah di JMdict dengan bacaan yang sama (ambiguitas ortografis)
  const validDistractors = candidates.filter((cand) => {
    if (!cand || cand === targetKanjiWord) return false;
    const readings = JMDictKanjiToReadings.get(cand);
    if (readings && readings.has(targetReading)) return false;
    return true;
  });

  const unique = Array.from(new Set(validDistractors));
  if (unique.length >= 3) {
    return rng.shuffle(unique).slice(0, 3);
  }

  // Fallback cadangan jika kembaran visual spesifik < 3
  const fallbackKanji = ["木", "大", "日", "人", "白", "田", "目", "左", "右", "車"];
  for (const fb of fallbackKanji) {
    if (fb !== targetKanjiWord && !unique.includes(fb)) {
      unique.push(fb);
      if (unique.length >= 3) break;
    }
  }

  return rng.shuffle(unique).slice(0, 3);
}

/**
 * Menghasilkan kumpulan soal G2 Penulisan Kanji dari kalimat Tatoeba.
 */
export function generateG2WritingQuestions(options: G2GeneratorOptions): QuestionItem[] {
  const rng: PRNG = createPRNG(options.seed);
  const questions: QuestionItem[] = [];

  const vocabByKanji = new Map(n5VocabList.map((v) => [v.kanji, v]));
  let qIndex = 1;

  for (const sentenceData of sampleTatoebaList) {
    const jpnText = sentenceData.jpn_text;
    const indText = sentenceData.ind_text;

    for (const targetWord of sentenceData.target_words) {
      if (!/[\u4E00-\u9FAF]/.test(targetWord)) {
        continue;
      }

      let vocab = vocabByKanji.get(targetWord);
      if (!vocab) {
        for (const v of n5VocabList) {
          if (targetWord.startsWith(v.kanji.slice(0, 1))) {
            vocab = v;
            break;
          }
        }
      }

      if (!vocab) continue;

      const kanjiAnswer = targetWord;
      const targetTokens = tokenizeJapanese(targetWord);
      const hiraganaPromptWord = targetTokens[0]?.reading || vocab.kana;

      // Hasilkan 3 pengecoh visual
      const distractors = generateVisualDistractors(kanjiAnswer, hiraganaPromptWord, rng);
      if (distractors.length < 3) continue;

      const rawOptions = [kanjiAnswer, distractors[0], distractors[1], distractors[2]];
      const uniqueOptions = Array.from(new Set(rawOptions));
      if (uniqueOptions.length !== 4) continue;

      const shuffledOptions = rng.shuffle(uniqueOptions);
      const correctIndex = shuffledOptions.indexOf(kanjiAnswer);

      // Gantikan kata target kanji pada kalimat menjadi bentuk hiragana
      const hiraganaSentence = jpnText.replace(kanjiAnswer, hiraganaPromptWord);

      // Node ruby untuk kalimat
      const rubyNodes = generateRubyNodes(hiraganaSentence);

      // Format prompt dengan garis bawah pada bentuk hiragana yang diuji
      const prompt = renderPromptWithUnderline(rubyNodes, hiraganaPromptWord, false);

      const qItem: QuestionItem = {
        id: `q-g2-${String(qIndex).padStart(3, "0")}`,
        type: "G2_KANJI_WRITING",
        level: "N5",
        prompt,
        options: shuffledOptions,
        correctIndex,
        rubyNodes,
        explanation: {
          targetWord: kanjiAnswer,
          reading: hiraganaPromptWord,
          meaningEn: vocab.meaningEn,
          translationId: indText,
          notes: `Soal penulisan kanji N5: memilih bentuk kanji yang tepat untuk '${hiraganaPromptWord}'.`
        },
        provenance: {
          jmdict_ent_seq: vocab.ent_seq,
          tatoeba_jpn_id: sentenceData.tatoeba_jpn_id,
          tatoeba_ind_id: sentenceData.tatoeba_ind_id,
          generator: "G2_KANJI_WRITING_GENERATOR",
          generator_version: "1.0.0",
          seed: options.seed
        },
        review: {
          status: "draft",
          notes: "Soal penulisan kanji G2 dari visual look-alike: wajib ditinjau manusia."
        }
      };

      questions.push(qItem);
      qIndex++;

      if (options.maxQuestions && questions.length >= options.maxQuestions) {
        return questions;
      }
    }
  }

  return questions;
}

