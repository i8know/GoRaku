/**
 * Generator Soal G3 - Partikel dan Tata Bahasa Dasar (Isian)
 *
 * Menghasilkan soal partikel N5 tunggal tak ambigu berdasarkan pola terkurasi:
 * 1. Objek penderita (を + transitif)
 * 2. Keberadaan benda/makhluk (に + いる/ある)
 * 3. Tempat berlangsungnya aksi (で + kata kerja aksi)
 * 4. Waktu spesifik (waktu + に)
 * 5. Arah perpindahan (tujuan + へ + pergi/datang/pulang)
 * 6. Penyerta aksi (partner + と)
 * 7. Sarana / alat (kendaraan/alat + で)
 *
 * Sesuai aturan: Semua soal jenis ini ditandai dengan status 'draft' (wajib ditinjau manusia).
 */

import { QuestionItem } from "../../src/lib/questionPack";
import { PRNG, createPRNG } from "../utils/prng";
import { tokenizeJapanese } from "../language/tokenizer";
import { generateRubyNodes, maskRubyNodes } from "../language/furigana";
import sampleTatoebaList from "../data/sample_tatoeba_n5.json";
import g3ParticleRules from "../data/g3_particle_rules.json";

export interface G3GeneratorOptions {
  seed: number;
  maxQuestions?: number;
}

export function generateG3ParticleQuestions(options: G3GeneratorOptions): QuestionItem[] {
  const rng: PRNG = createPRNG(options.seed);
  const questions: QuestionItem[] = [];

  let qIndex = 1;

  for (const sentenceData of sampleTatoebaList) {
    const jpnText = sentenceData.jpn_text;
    const indText = sentenceData.ind_text;
    const tokens = tokenizeJapanese(jpnText);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.pos !== "particle") continue;

      const particle = token.surface;
      const prevToken = tokens[i - 1];
      const nextToken = tokens[i + 1];

      // Cocokkan dengan aturan partikel G3
      let matchedRule = g3ParticleRules.find((rule) => {
        if (rule.particle !== particle) return false;

        // Cek apakah ada kata kunci di sekitar partikel
        const hasKeyword = rule.keywords.some((kw: string) => {
          return (
            jpnText.includes(kw) ||
            prevToken?.surface.includes(kw) ||
            prevToken?.lemma.includes(kw) ||
            nextToken?.surface.includes(kw) ||
            nextToken?.lemma.includes(kw)
          );
        });

        return hasKeyword;
      });

      if (!matchedRule) continue;

      // Bentuk kalimat dengan partikel digantikan bintang rumpang （　★　）
      const promptText =
        jpnText.slice(0, token.start) + "（　★　）" + jpnText.slice(token.end);

      // Node ruby untuk kalimat berfurigana
      const fullRubyNodes = generateRubyNodes(jpnText);
      const rubyNodes = maskRubyNodes(fullRubyNodes, particle, "（　★　）");

      const correctOption = particle;
      const distractors = matchedRule.distractors;
      const rawOptions = [correctOption, distractors[0], distractors[1], distractors[2]];
      const uniqueOptions = Array.from(new Set(rawOptions));
      if (uniqueOptions.length !== 4) continue;

      const shuffledOptions = rng.shuffle(uniqueOptions);
      const correctIndex = shuffledOptions.indexOf(correctOption);

      const qItem: QuestionItem = {
        id: `q-g3-${String(qIndex).padStart(3, "0")}`,
        type: "G3_PARTICLES",
        level: "N5",
        prompt: promptText,
        options: shuffledOptions,
        correctIndex,
        rubyNodes,
        explanation: {
          targetWord: particle,
          reading: particle,
          meaningEn: `Particle '${particle}' (${matchedRule.name})`,
          translationId: indText,
          grammarPoint: matchedRule.name,
          notes: `${matchedRule.description} Contoh: ${matchedRule.example}`
        },
        provenance: {
          tatoeba_jpn_id: sentenceData.tatoeba_jpn_id,
          tatoeba_ind_id: sentenceData.tatoeba_ind_id,
          generator: "G3_PARTICLE_GRAMMAR_GENERATOR",
          generator_version: "1.0.0",
          seed: options.seed
        },
        review: {
          status: "draft",
          notes: "Soal partikel G3 dari pola terkurasi: wajib ditinjau manusia untuk memastikan tidak ada partikel alternatif yang sah."
        }
      };

      questions.push(qItem);
      qIndex++;

      if (options.maxQuestions && questions.length >= options.maxQuestions) {
        return questions;
      }

      // Satu partikel per kalimat cukup untuk menghindari tumpang tindih
      break;
    }
  }

  return questions;
}

