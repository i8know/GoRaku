import { describe, it, expect } from "vitest";
import {
  generateVisualDistractors,
  generateG2WritingQuestions
} from "../generators/g2WritingGenerator";
import { generateG3ParticleQuestions } from "../generators/g3ParticleGenerator";
import { generateG4ContextQuestions } from "../generators/g4ContextVocabGenerator";
import { buildQuestionPack } from "../generateQuestionPack";
import { createPRNG } from "../utils/prng";
import { validateQuestionPack } from "../../src/lib/questionPack";

describe("Tahap 4 - G2 Penulisan Kanji (Hiragana -> Kanji)", () => {
  it("menghasilkan 3 pengecoh kanji mirip secara visual (visual look-alike)", () => {
    const rng = createPRNG(42);
    // Uji kanji tunggal "本"
    const distractorsHon = generateVisualDistractors("本", "ほん", rng);
    expect(distractorsHon).toHaveLength(3);
    expect(distractorsHon).not.toContain("本");
    const uniqueHon = new Set(distractorsHon);
    expect(uniqueHon.size).toBe(3);

    // Uji kanji majemuk "電車"
    const distractorsDensha = generateVisualDistractors("電車", "でんしゃ", rng);
    expect(distractorsDensha).toHaveLength(3);
    expect(distractorsDensha).not.toContain("電車");
    const uniqueDensha = new Set(distractorsDensha);
    expect(uniqueDensha.size).toBe(3);
  });

  it("menghasilkan soal G2 dengan prompt hiragana bergaris bawah <u> dan status 'draft'", () => {
    const questions = generateG2WritingQuestions({ seed: 42, maxQuestions: 5 });
    expect(questions.length).toBe(5);

    for (const q of questions) {
      expect(q.type).toBe("G2_KANJI_WRITING");
      expect(q.level).toBe("N5");
      expect(q.prompt).toContain("<u>");
      expect(q.prompt).toContain("</u>");
      expect(q.options).toHaveLength(4);

      // Kunci jawaban kanji harus ada di options
      expect(q.options[q.correctIndex]).toBe(q.explanation.targetWord);

      // Semua opsi harus unik
      const uniqueOpts = new Set(q.options);
      expect(uniqueOpts.size).toBe(4);

      // Status review wajib 'draft' untuk peninjauan manusia
      expect(q.review.status).toBe("draft");
      expect(q.review.notes).toContain("wajib ditinjau");

      // Provenance
      expect(q.provenance.generator).toBe("G2_KANJI_WRITING_GENERATOR");
      expect(q.provenance.generator_version).toBe("1.0.0");
      expect(q.provenance.seed).toBe(42);
    }
  });

  it("bersifat deterministik: seed sama menghasilkan soal G2 identik", () => {
    const q1 = generateG2WritingQuestions({ seed: 888, maxQuestions: 3 });
    const q2 = generateG2WritingQuestions({ seed: 888, maxQuestions: 3 });
    expect(q1).toEqual(q2);
  });
});

describe("Tahap 4 - G3 Partikel dan Tata Bahasa Dasar (Isian)", () => {
  it("menghasilkan soal partikel dari pola terkurasi dengan rumpang （　★　）", () => {
    const questions = generateG3ParticleQuestions({ seed: 42, maxQuestions: 5 });
    expect(questions.length).toBe(5);

    for (const q of questions) {
      expect(q.type).toBe("G3_PARTICLES");
      expect(q.level).toBe("N5");
      expect(q.prompt).toContain("（　★　）");
      expect(q.options).toHaveLength(4);

      // Kunci jawaban partikel harus ada di options
      const correctParticle = q.options[q.correctIndex];
      expect(correctParticle).toBe(q.explanation.targetWord);

      // Semua 4 pilihan partikel harus unik
      const unique = new Set(q.options);
      expect(unique.size).toBe(4);

      // Grammar point & notes lengkap
      expect(q.explanation.grammarPoint).toBeDefined();
      expect(q.explanation.notes).toBeDefined();

      // Status review wajib 'draft'
      expect(q.review.status).toBe("draft");

      // Provenance
      expect(q.provenance.generator).toBe("G3_PARTICLE_GRAMMAR_GENERATOR");
    }
  });

  it("bersifat deterministik: seed sama menghasilkan soal G3 identik", () => {
    const qA = generateG3ParticleQuestions({ seed: 555, maxQuestions: 3 });
    const qB = generateG3ParticleQuestions({ seed: 555, maxQuestions: 3 });
    expect(qA).toEqual(qB);
  });
});

describe("Tahap 4 - G4 Pemilihan Kata Sesuai Konteks", () => {
  it("mengosongkan satu kata isi dan memilih 3 pengecoh dengan POS yang sama", () => {
    const questions = generateG4ContextQuestions({ seed: 42, maxQuestions: 5 });
    expect(questions.length).toBe(5);

    for (const q of questions) {
      expect(q.type).toBe("G4_CONTEXT_VOCAB");
      expect(q.level).toBe("N5");
      expect(q.prompt).toContain("（　★　）");
      expect(q.options).toHaveLength(4);

      const targetWord = q.explanation.targetWord;
      expect(q.options[q.correctIndex]).toBe(targetWord);

      // Semua opsi harus unik
      const unique = new Set(q.options);
      expect(unique.size).toBe(4);

      // Status review wajib 'draft'
      expect(q.review.status).toBe("draft");

      // Provenance
      expect(q.provenance.generator).toBe("G4_CONTEXT_VOCAB_GENERATOR");
    }
  });

  it("bersifat deterministik: seed sama menghasilkan soal G4 identik", () => {
    const qA = generateG4ContextQuestions({ seed: 333, maxQuestions: 3 });
    const qB = generateG4ContextQuestions({ seed: 333, maxQuestions: 3 });
    expect(qA).toEqual(qB);
  });
});

describe("Tahap 4 - Integrasi QuestionPack Builder (G1, G2, G3, G4)", () => {
  it("membangun QuestionPack lengkap dengan 4 tipe soal dan statistik yang konsisten", () => {
    const pack = buildQuestionPack({ seed: 42 });

    expect(pack.id).toBe("jlpt-n5-seed-pack-v1");
    expect(pack.stats.totalQuestions).toBeGreaterThan(50);
    expect(pack.stats.byType.G1_KANJI_READING).toBeGreaterThan(0);
    expect(pack.stats.byType.G2_KANJI_WRITING).toBeGreaterThan(0);
    expect(pack.stats.byType.G3_PARTICLES).toBeGreaterThan(0);
    expect(pack.stats.byType.G4_CONTEXT_VOCAB).toBeGreaterThan(0);

    // Total soal harus sama dengan penjumlahan byType
    const sumByType =
      pack.stats.byType.G1_KANJI_READING +
      pack.stats.byType.G2_KANJI_WRITING +
      pack.stats.byType.G3_PARTICLES +
      pack.stats.byType.G4_CONTEXT_VOCAB;
    expect(pack.stats.totalQuestions).toBe(sumByType);

    // Penjumlahan status approved + draft harus sama dengan totalQuestions
    expect(pack.stats.approvedCount + pack.stats.draftCount).toBe(pack.stats.totalQuestions);

    // Validasi ketat terhadap skema QuestionPack
    const res = validateQuestionPack(pack);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("mendukung opsi approvedOnly untuk menghasilkan paket berisi hanya soal approved", () => {
    const approvedPack = buildQuestionPack({ seed: 42, approvedOnly: true });

    expect(approvedPack.stats.draftCount).toBe(0);
    expect(approvedPack.stats.approvedCount).toBe(approvedPack.stats.totalQuestions);
    for (const q of approvedPack.questions) {
      expect(q.review.status).toBe("approved");
    }

    const res = validateQuestionPack(approvedPack);
    expect(res.valid).toBe(true);
  });
});

