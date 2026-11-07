import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ExamPage from "../Exam";
import {
  generateOfficial2018N5MockTest,
  generateOfficial2018N4MockTest,
  getQuestionsForTestAndSection
} from "../../components/jlpt/mockTestData";
import {
  get2018N5VocabQuestions,
  get2018N5GrammarReadingQuestions,
  get2018N5ListeningQuestions,
  calculateOfficialJLPTScore
} from "../../components/jlpt/jlpt2018N5Data";
import {
  get2018N4VocabQuestions,
  get2018N4GrammarReadingQuestions,
  get2018N4ListeningQuestions
} from "../../components/jlpt/jlpt2018N4Data";
import AudioCheckModal from "../../components/jlpt/AudioCheckModal";
import TestDetailsModal from "../../components/jlpt/TestDetailsModal";
import seedPackData from "../../data/seedQuestionPack.json";
import { QuestionPack } from "../../lib/questionPack";

describe("Ujian JLPT Format Baru — 2018年 日本語能力試験 N5 (91問) & N4 (98問)", () => {
  const seedPack = seedPackData as unknown as QuestionPack;

  describe("1. Dataset Lengkap 2018年 日本語能力試験 N5 (91 Soal PDF)", () => {
    it("memuat seluruh 91 soal asli 2018 JLPT N5 (35 Kosakata + 32 Grammar/Dokkai + 24 Choukai)", () => {
      const test2018 = generateOfficial2018N5MockTest();
      expect(test2018.totalQuestions).toBe(91);
      expect(test2018.totalDurationMinutes).toBe(90);
      expect(test2018.mock_sections.length).toBe(3);

      const vocab = get2018N5VocabQuestions();
      const gr = get2018N5GrammarReadingQuestions();
      const listen = get2018N5ListeningQuestions();

      expect(vocab.length).toBe(35);
      expect(gr.length).toBe(32);
      expect(listen.length).toBe(24);

      expect(gr.filter((q) => q.isStarQuestion).length).toBe(5);
      expect(gr.some((q) => q.passageHtml?.includes("高木大学"))).toBe(true);
      expect(listen.every((q) => (q.dialogueScript?.length ?? 0) > 0)).toBe(true);
    });
  });

  describe("2. Dataset Lengkap 2018年 日本語能力試験 N4 (98 Soal PDF)", () => {
    it("memuat seluruh 98 soal asli 2018 JLPT N4 (35 Kosakata + 35 Grammar/Dokkai + 28 Choukai)", () => {
      const test2018N4 = generateOfficial2018N4MockTest();
      expect(test2018N4.totalQuestions).toBe(98);
      expect(test2018N4.totalDurationMinutes).toBe(115);
      expect(test2018N4.mock_sections.length).toBe(3);

      const vocabN4 = get2018N4VocabQuestions();
      const grN4 = get2018N4GrammarReadingQuestions();
      const listenN4 = get2018N4ListeningQuestions();

      expect(vocabN4.length).toBe(35);
      expect(grN4.length).toBe(35);
      expect(listenN4.length).toBe(28);

      // Pastikan Mondai 5 用法 (5 soal), ★ 並べ替え (5 soal), Wacana 水泳 & 東京駅で会った人, serta 青野市ニュース tersedia
      expect(vocabN4.filter((q) => q.mondaiNumber === 5).length).toBe(5);
      expect(grN4.filter((q) => q.isStarQuestion).length).toBe(5);
      expect(grN4.some((q) => q.passageHtml?.includes("東京駅で会った人"))).toBe(true);
      expect(grN4.some((q) => q.passageHtml?.includes("青野市ニュース"))).toBe(true);
      expect(listenN4.every((q) => (q.dialogueScript?.length ?? 0) > 0)).toBe(true);

      // Verifikasi pemetaan getQuestionsForTestAndSection untuk N4
      expect(
        getQuestionsForTestAndSection(test2018N4, test2018N4.mock_sections[0], seedPack).length
      ).toBe(35);
      expect(
        getQuestionsForTestAndSection(test2018N4, test2018N4.mock_sections[1], seedPack).length
      ).toBe(35);
      expect(
        getQuestionsForTestAndSection(test2018N4, test2018N4.mock_sections[2], seedPack).length
      ).toBe(28);
    });

    it("menghitung skor skala resmi 0-180 dengan kriteria lulus 90点 dan batas minimum seksi (38/120 & 19/60)", () => {
      const passScore = calculateOfficialJLPTScore(28, 35, 25, 35, 20, 28, "N4");
      expect(passScore.totalScaled).toBeGreaterThanOrEqual(90);
      expect(passScore.langReadingPassed).toBe(true);
      expect(passScore.listeningPassed).toBe(true);
      expect(passScore.overallPassed).toBe(true);
    });
  });

  describe("3. Render Halaman Utama Ujian Format Baru (ExamPage)", () => {
    it("merender pemilih level JLPT N5 & JLPT N4 beserta papan skor 0-180 dan 3 bagian ujian", () => {
      const html = renderToString(
        <MemoryRouter>
          <ExamPage />
        </MemoryRouter>
      );

      expect(html).toContain("JLPT N5");
      expect(html).toContain("JLPT N4");
      expect(html).toContain("2018年 日本語能力試験 N5【完全再現】");
      expect(html).toContain("2018年 日本語能力試験 N4【完全再現】");
      expect(html).toContain("基準点: 38点");
      expect(html).toContain("基準点: 19点");
      expect(html).toContain("合格点: 90点");
    });
  });

  describe("4. Modal Cek Audio & Detail Lembar Skor", () => {
    it("merender dialog Cek Audio lengkap dengan kalimat tes bahasa Jepang", () => {
      const html = renderToString(
        <AudioCheckModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain("Cek Audio");
      expect(html).toContain("これは日本語のリスニング音声テストです");
    });

    it("merender TestDetailsModal untuk 2018 N4 dengan 35, 35, dan 28 pertanyaan", () => {
      const test2018N4 = generateOfficial2018N4MockTest();

      const html = renderToString(
        <TestDetailsModal
          isOpen={true}
          test={test2018N4}
          onClose={() => {}}
          onStartSection={() => {}}
          onReviewSection={() => {}}
          onRetakeSection={() => {}}
          sessions={{}}
        />
      );

      expect(html).toContain("2018年 日本語能力試験 N4【完全再現】");
      expect(html).toContain("35 Pertanyaan");
      expect(html).toContain("28 Pertanyaan");
      expect(html).toContain("Mulai");
    });
  });
});
