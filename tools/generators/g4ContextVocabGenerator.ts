/**
 * Generator Soal G4 - Pemilihan Kata Sesuai Konteks
 *
 * Mengosongkan satu kata isi (kata benda atau kata sifat) pada kalimat Tatoeba,
 * lalu menyediakan pilihan jawaban berupa kata yang benar + 3 kata berkategori
 * kelas kata sama (POS sama dari JMdict) yang tidak cocok secara makna dalam konteks kalimat.
 *
 * Sesuai aturan: Semua soal jenis ini ditandai dengan status 'draft' (wajib ditinjau manusia).
 */

import { QuestionItem } from "../../src/lib/questionPack";
import { PRNG, createPRNG } from "../utils/prng";
import { generateRubyNodes, maskRubyNodes } from "../language/furigana";
import n5VocabList from "../data/n5_vocab_reference.json";
import sampleTatoebaList from "../data/sample_tatoeba_n5.json";

export interface G4GeneratorOptions {
  seed: number;
  maxQuestions?: number;
}

// Kelompokkan kosakata N5 berdasarkan Part of Speech (POS)
const nouns = n5VocabList.filter((v) => v.pos === "noun");
const adjectives = n5VocabList.filter((v) => v.pos === "adj-i");

export function generateG4ContextQuestions(options: G4GeneratorOptions): QuestionItem[] {
  const rng: PRNG = createPRNG(options.seed);
  const questions: QuestionItem[] = [];

  const vocabByKanji = new Map(n5VocabList.map((v) => [v.kanji, v]));
  let qIndex = 1;

  for (const sentenceData of sampleTatoebaList) {
    const jpnText = sentenceData.jpn_text;
    const indText = sentenceData.ind_text;

    for (const targetWord of sentenceData.target_words) {
      const vocab = vocabByKanji.get(targetWord);
      if (!vocab) continue;

      // Fokus pada kata isi yang jelas konteksnya: kata benda atau kata sifat
      if (vocab.pos !== "noun" && vocab.pos !== "adj-i") {
        continue;
      }

      // Pastikan targetWord ada di dalam kalimat
      if (!jpnText.includes(targetWord)) continue;

      const posPool = vocab.pos === "noun" ? nouns : adjectives;

      // Pilih 3 pengecoh dengan kelas kata sama yang berbeda makna
      const candidateDistractors = posPool
        .map((p) => p.kanji)
        .filter((word) => word !== targetWord && !jpnText.includes(word));

      if (candidateDistractors.length < 3) continue;

      const chosenDistractors = rng.pickMultiple(candidateDistractors, 3);
      const rawOptions = [targetWord, chosenDistractors[0], chosenDistractors[1], chosenDistractors[2]];
      const uniqueOptions = Array.from(new Set(rawOptions));
      if (uniqueOptions.length !== 4) continue;

      const shuffledOptions = rng.shuffle(uniqueOptions);
      const correctIndex = shuffledOptions.indexOf(targetWord);

      // Kalimat dengan kata target dikosongkan menjadi （　★　）
      const prompt = jpnText.replace(targetWord, "（　★　）");

      // Node ruby untuk kalimat berfurigana
      const fullRubyNodes = generateRubyNodes(jpnText);
      const rubyNodes = maskRubyNodes(fullRubyNodes, targetWord, "（　★　）");

      const qItem: QuestionItem = {
        id: `q-g4-${String(qIndex).padStart(3, "0")}`,
        type: "G4_CONTEXT_VOCAB",
        level: "N5",
        prompt,
        options: shuffledOptions,
        correctIndex,
        rubyNodes,
        explanation: {
          targetWord,
          reading: vocab.kana,
          meaningEn: vocab.meaningEn,
          translationId: indText,
          notes: `Pemilihan kata sesuai konteks: kata yang paling tepat untuk mengisi kalimat adalah '${targetWord}' (${vocab.meaningId} / ${vocab.meaningEn}).`
        },
        provenance: {
          jmdict_ent_seq: vocab.ent_seq,
          tatoeba_jpn_id: sentenceData.tatoeba_jpn_id,
          tatoeba_ind_id: sentenceData.tatoeba_ind_id,
          generator: "G4_CONTEXT_VOCAB_GENERATOR",
          generator_version: "1.0.0",
          seed: options.seed
        },
        review: {
          status: "draft",
          notes: "Soal pemilihan kata konteks G4: ditandai draft karena keunikan jawaban dalam kalimat terbuka memerlukan tinjauan manusia."
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

