import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import "fake-indexeddb/auto";
import QuestionCard from "../../src/components/QuestionCard";
import {
  generatePhonologicalDistractors,
  katakanaToHiragana,
  isPureHiragana
} from "../generators/phonologicalDistractors";
import { generateG1ReadingQuestions } from "../generators/g1ReadingGenerator";
import { buildQuestionPack } from "../generateQuestionPack";
import { createPRNG } from "../utils/prng";
import { validateQuestionPack } from "../../src/lib/questionPack";
import {
  questionPackDb,
  saveQuestionPack,
  getQuestionPack,
  importQuestionPackFromJson,
  ensureSeedPackLoaded
} from "../../src/lib/questionPackStorage";
import seedPackJson from "../../src/data/seedQuestionPack.json";

describe("Tahap 3 - Pengecoh Fonologis (Phonological Distractors)", () => {
  it("mengonversi katakana ke hiragana dengan benar", () => {
    expect(katakanaToHiragana("ホン")).toBe("ほん");
    expect(katakanaToHiragana("ニチ")).toBe("にち");
    expect(katakanaToHiragana("スイ")).toBe("すい");
    expect(katakanaToHiragana("ガク")).toBe("がく");
  });

  it("memvalidasi string hiragana murni dengan isPureHiragana", () => {
    expect(isPureHiragana("ほん")).toBe(true);
    expect(isPureHiragana("みず")).toBe(true);
    expect(isPureHiragana("がっこう")).toBe(true);
    expect(isPureHiragana("本")).toBe(false); // kanji
    expect(isPureHiragana("パン")).toBe(false); // katakana
    expect(isPureHiragana("hon")).toBe(false); // romaji
    expect(isPureHiragana("")).toBe(false);
  });

  it("menghasilkan 3 pengecoh fonologis unik dan bukan bacaan sah JMdict", () => {
    const rng = createPRNG(42);
    // Uji untuk kata "日本" (bacaan benar: "にほん", bacaan alternatif sah: "にっぽん")
    const distractors = generatePhonologicalDistractors("日本", "にほん", rng);

    expect(distractors).toHaveLength(3);
    // Tidak boleh memuat bacaan benar
    expect(distractors).not.toContain("にほん");
    // Tidak boleh memuat bacaan sah alternatif JMdict
    expect(distractors).not.toContain("にっぽん");
    // Pengecoh harus berupa hiragana valid
    for (const d of distractors) {
      expect(isPureHiragana(d)).toBe(true);
    }
    // Semua pengecoh harus unik
    const unique = new Set(distractors);
    expect(unique.size).toBe(3);
  });

  it("menghasilkan pengecoh untuk kanji tunggal '本' dan '水'", () => {
    const rng = createPRNG(100);
    const distractorsHon = generatePhonologicalDistractors("本", "ほん", rng);
    expect(distractorsHon).toHaveLength(3);
    expect(distractorsHon).not.toContain("ほん");

    const distractorsMizu = generatePhonologicalDistractors("水", "みず", rng);
    expect(distractorsMizu).toHaveLength(3);
    expect(distractorsMizu).not.toContain("みず");
  });
});

describe("Tahap 3 - Generator Soal G1 (Membaca Kanji)", () => {
  it("bersifat deterministik: seed sama menghasilkan soal dan opsi yang identik", () => {
    const questions1 = generateG1ReadingQuestions({ seed: 777, maxQuestions: 5 });
    const questions2 = generateG1ReadingQuestions({ seed: 777, maxQuestions: 5 });

    expect(questions1).toEqual(questions2);
    expect(questions1.length).toBe(5);
  });

  it("menghasilkan opsi acak berbeda untuk seed berbeda", () => {
    const qA = generateG1ReadingQuestions({ seed: 123, maxQuestions: 3 });
    const qB = generateG1ReadingQuestions({ seed: 999, maxQuestions: 3 });

    // Walaupun kata target bisa sama, permutasi opsi atau pengecoh berbeda
    expect(qA[0].options).not.toEqual(qB[0].options);
  });

  it("menghasilkan struktur soal yang lengkap dan valid", () => {
    const questions = generateG1ReadingQuestions({ seed: 42, maxQuestions: 10 });
    expect(questions.length).toBeGreaterThan(0);

    for (const q of questions) {
      expect(q.id).toMatch(/^q-g1-\d{3}$/);
      expect(q.type).toBe("G1_KANJI_READING");
      expect(q.level).toBe("N5");
      expect(q.prompt).toContain("<u>");
      expect(q.prompt).toContain("</u>");
      expect(q.options).toHaveLength(4);

      // Pastikan tidak ada opsi kembar
      const uniqueOpts = new Set(q.options);
      expect(uniqueOpts.size).toBe(4);

      // Pastikan correctIndex valid 0..3
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);

      // Kunci jawaban harus cocok dengan reading di explanation
      const correctOption = q.options[q.correctIndex];
      expect(correctOption).toBe(q.explanation.reading);

      // Provenance lengkap
      expect(q.provenance.generator).toBe("G1_KANJI_READING_GENERATOR");
      expect(q.provenance.generator_version).toBe("1.0.0");
      expect(q.provenance.seed).toBe(42);
      expect(q.provenance.jmdict_ent_seq).toBeDefined();
      expect(q.provenance.tatoeba_jpn_id).toBeGreaterThan(0);
      expect(q.provenance.tatoeba_ind_id).toBeGreaterThan(0);

      // Review status approved
      expect(q.review.status).toBe("approved");

      // Furigana tidak boleh membocorkan jawaban pada kata yang bergaris bawah
      if (q.rubyNodes) {
        const targetWord = q.explanation.targetWord!;
        const targetRubyNode = q.rubyNodes.find((n) => n.text === targetWord);
        if (targetRubyNode) {
          expect(targetRubyNode.rt).toBeUndefined();
        }
      }
    }
  });
});

describe("Tahap 3 - QuestionPack Builder & Schema Validation", () => {
  it("membangun QuestionPack lengkap yang lolos validasi skema ketat", () => {
    const pack = buildQuestionPack({ seed: 42, approvedOnly: true });

    expect(pack.id).toBe("jlpt-n5-seed-pack-v1");
    expect(pack.version).toBe("1.0.0");
    expect(pack.level).toBe("N5");
    expect(pack.language).toBe("ja");
    expect(pack.license).toBe("CC BY-SA 4.0");

    // Atribusi sumber
    expect(pack.attribution.sources.length).toBeGreaterThanOrEqual(2);
    expect(pack.attribution.disclaimer.toLowerCase()).toContain("bukan soal resmi");

    // Statistik
    expect(pack.stats.totalQuestions).toBeGreaterThan(0);
    expect(pack.stats.byType.G1_KANJI_READING).toBe(pack.stats.totalQuestions);
    expect(pack.stats.approvedCount).toBe(pack.stats.totalQuestions);
    expect(pack.stats.draftCount).toBe(0);

    // Validasi skema
    const validation = validateQuestionPack(pack);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});

describe("Tahap 3 - Integrasi Impor & Database Aplikasi (Dexie/IndexedDB)", () => {
  beforeEach(async () => {
    await questionPackDb.packs.clear();
  });

  it("memuat paket bawaan (seed pack) secara otomatis dan idempoten", async () => {
    // Panggilan pertama: paket belum ada, harus dipasang
    const loaded1 = await ensureSeedPackLoaded();
    expect(loaded1).toBeDefined();
    expect(loaded1.id).toBe("jlpt-n5-seed-pack-v1");
    expect(loaded1.questions.length).toBeGreaterThan(0);

    const count1 = await questionPackDb.packs.count();
    expect(count1).toBe(1);

    // Panggilan kedua: idempoten, tidak membuat duplikat
    const loaded2 = await ensureSeedPackLoaded();
    expect(loaded2.id).toBe(loaded1.id);
    const count2 = await questionPackDb.packs.count();
    expect(count2).toBe(1);
  });

  it("mengimpor QuestionPack dari string JSON dan menolak JSON yang tidak valid", async () => {
    const validJson = JSON.stringify(seedPackJson);
    const importRes = await importQuestionPackFromJson(validJson);
    expect(importRes.success).toBe(true);
    expect(importRes.pack).toBeDefined();

    const stored = await getQuestionPack("jlpt-n5-seed-pack-v1");
    expect(stored).toBeDefined();
    expect(stored?.title).toBe(seedPackJson.title);

    // Uji JSON rusak / tidak sesuai skema
    const invalidJson = JSON.stringify({ id: "bad-pack", questions: [] });
    const badRes = await importQuestionPackFromJson(invalidJson);
    expect(badRes.success).toBe(false);
    expect(badRes.errors?.length).toBeGreaterThan(0);
  });

  it("merender kartu soal (QuestionCard) dengan opsi dan sakelar furigana secara benar", () => {
    const sampleQuestion = seedPackJson.questions[0];

    // Render dengan furigana ON
    const htmlWithFurigana = renderToString(
      React.createElement(QuestionCard, {
        question: sampleQuestion as any,
        questionNumber: 1,
        totalQuestions: 10,
        showFurigana: true
      })
    );

    // Memuat garis bawah <u>
    expect(htmlWithFurigana).toContain("decoration-amber-500");
    expect(htmlWithFurigana).toContain("Soal 1 dari 10");
    // Memuat 4 opsi
    for (const opt of sampleQuestion.options) {
      expect(htmlWithFurigana).toContain(opt);
    }

    // Render dengan jawaban terisi (tampilkan pembahasan)
    const htmlAnswered = renderToString(
      React.createElement(QuestionCard, {
        question: sampleQuestion as any,
        questionNumber: 1,
        totalQuestions: 10,
        showFurigana: false,
        userAnswer: sampleQuestion.correctIndex
      })
    );

    expect(htmlAnswered).toContain("Jawaban Anda Benar!");
    expect(htmlAnswered).toContain(sampleQuestion.explanation.meaningEn);
    expect(htmlAnswered).toContain(sampleQuestion.explanation.translationId);
    expect(htmlAnswered).toContain(`JMdict ent_seq: ${sampleQuestion.provenance.jmdict_ent_seq}`);
  });
});
