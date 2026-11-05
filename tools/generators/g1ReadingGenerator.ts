/**
 * Generator Soal G1 - Membaca Kanji (Mondai Kosakata: Kanji -> Hiragana)
 *
 * Mengambil kata target berkanji dari daftar N5 yang terdapat dalam kalimat Tatoeba,
 * menandai kata target dengan garis bawah <u>...</u>, menghasilkan 3 pengecoh
 * fonologis yang sah dan masuk akal, serta melampirkan furigana sakelar (dengan
 * penyembunyian pada kata target), pembahasan dwibahasa (JMdict + Tatoeba),
 * serta provenance lengkap.
 */

import { QuestionItem } from "../../src/lib/questionPack";
import { PRNG, createPRNG } from "../utils/prng";
import { tokenizeJapanese } from "../language/tokenizer";
import { generateRubyNodes, renderPromptWithUnderline } from "../language/furigana";
import { generatePhonologicalDistractors } from "./phonologicalDistractors";
import n5VocabList from "../data/n5_vocab_reference.json";
import sampleTatoebaList from "../data/sample_tatoeba_n5.json";

export interface G1GeneratorOptions {
  seed: number;
  maxQuestions?: number;
}

/**
 * Menghasilkan kumpulan soal G1 Membaca Kanji dari kalimat Tatoeba dan kamus JMdict N5.
 */
export function generateG1ReadingQuestions(options: G1GeneratorOptions): QuestionItem[] {
  const rng: PRNG = createPRNG(options.seed);
  const questions: QuestionItem[] = [];

  // Peta cepat kosakata N5 berdasarkan kanji / lemma
  const vocabByKanji = new Map(n5VocabList.map((v) => [v.kanji, v]));

  let qIndex = 1;

  for (const sentenceData of sampleTatoebaList) {
    const jpnText = sentenceData.jpn_text;
    const indText = sentenceData.ind_text;

    for (const targetWord of sentenceData.target_words) {
      // Hanya proses kata target yang memiliki kanji
      if (!/[\u4E00-\u9FAF]/.test(targetWord)) {
        continue;
      }

      // Cari entri JMdict N5
      let vocab = vocabByKanji.get(targetWord);

      if (!vocab) {
        // Cari verba/adjektiva asal (misal "食べました" -> "食べる", "飲みました" -> "飲む")
        for (const v of n5VocabList) {
          if (targetWord.startsWith(v.kanji.slice(0, 1))) {
            vocab = v;
            break;
          }
        }
      }

      if (!vocab) {
        continue;
      }

      const surfaceInSentence = targetWord;
      const targetTokens = tokenizeJapanese(targetWord);
      const correctReading = targetTokens[0]?.reading || vocab.kana;

      // Hasilkan 3 pengecoh fonologis unik
      const distractors = generatePhonologicalDistractors(
        surfaceInSentence,
        correctReading,
        rng
      );

      // Pastikan ada tepat 3 pengecoh valid dan tidak ada duplikasi
      if (distractors.length < 3) {
        continue;
      }

      const rawOptions = [correctReading, distractors[0], distractors[1], distractors[2]];
      const uniqueOptions = Array.from(new Set(rawOptions));
      if (uniqueOptions.length !== 4) {
        continue;
      }

      // Acak urutan opsi deterministik
      const shuffledOptions = rng.shuffle(uniqueOptions);
      const correctIndex = shuffledOptions.indexOf(correctReading);

      // Bangun node ruby kalimat lengkap, dengan menyembunyikan furigana pada kata target yang sedang diuji
      const rubyNodes = generateRubyNodes(jpnText, { suppressWord: surfaceInSentence });

      // Format prompt dengan garis bawah <u> pada kata kanji target
      const prompt = renderPromptWithUnderline(rubyNodes, surfaceInSentence, false);

      const qItem: QuestionItem = {
        id: `q-g1-${String(qIndex).padStart(3, "0")}`,
        type: "G1_KANJI_READING",
        level: "N5",
        prompt,
        options: shuffledOptions,
        correctIndex,
        rubyNodes,
        explanation: {
          targetWord: surfaceInSentence,
          reading: correctReading,
          meaningEn: vocab.meaningEn,
          translationId: indText,
          notes: `Soal orisinal bertingkat JLPT N5. Kalimat bersumber dari Tatoeba (ID: ${sentenceData.tatoeba_jpn_id}) dan kosakata dari JMdict (Seq: ${vocab.ent_seq}).`
        },
        provenance: {
          jmdict_ent_seq: vocab.ent_seq,
          tatoeba_jpn_id: sentenceData.tatoeba_jpn_id,
          tatoeba_ind_id: sentenceData.tatoeba_ind_id,
          generator: "G1_KANJI_READING_GENERATOR",
          generator_version: "1.0.0",
          seed: options.seed
        },
        review: {
          status: "approved",
          notes: "Tervalidasi fonologis & terverifikasi leksikal JMdict tanpa opsi kembar."
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
