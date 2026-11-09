import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ExamPage from "../Exam";
import {
  generateOfficial2018N5MockTest,
  generateOfficial2018N4MockTest,
  generateOfficial2022N3MockTest,
  generateOfficial2016N2MockTest,
  generateOfficial2023N1MockTest,
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
import {
  get2022N3VocabQuestions,
  get2022N3GrammarReadingQuestions,
  get2022N3ListeningQuestions
} from "../../components/jlpt/jlpt2022N3Data";
import {
  get2016N2VocabQuestions,
  get2016N2GrammarReadingQuestions,
  get2016N2ListeningQuestions
} from "../../components/jlpt/jlpt2016N2Data";
import {
  get2023N1VocabQuestions,
  get2023N1GrammarReadingQuestions,
  get2023N1ListeningQuestions
} from "../../components/jlpt/jlpt2023N1Data";
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

  describe("3. Dataset Lengkap 2022年12月 日本語能力試験 N3 (101 Soal PDF)", () => {
    it("memuat seluruh 101 soal asli 2022-2 JLPT N3 (35 Kosakata + 38 Grammar/Dokkai + 28 Choukai)", () => {
      const test2022N3 = generateOfficial2022N3MockTest();
      expect(test2022N3.totalQuestions).toBe(101);
      expect(test2022N3.totalDurationMinutes).toBe(140);
      expect(test2022N3.passingScoreTotal).toBe(95);
      expect(test2022N3.mock_sections.length).toBe(3);

      const vocabN3 = get2022N3VocabQuestions();
      const grN3 = get2022N3GrammarReadingQuestions();
      const listenN3 = get2022N3ListeningQuestions();

      expect(vocabN3.length).toBe(35);
      expect(grN3.length).toBe(38);
      expect(listenN3.length).toBe(28);

      // Pastikan Mondai 5 用法 (5 soal), ★ 並べ替え (5 soal), Wacana 京都旅行, 古いラジオ, 眠りと体の中心の温度, serta 秋の日帰りバス旅行 tersedia
      expect(vocabN3.filter((q) => q.mondaiNumber === 5).length).toBe(5);
      expect(grN3.filter((q) => q.isStarQuestion).length).toBe(5);
      expect(grN3.some((q) => q.passageHtml?.includes("京都旅行"))).toBe(true);
      expect(grN3.some((q) => q.passageHtml?.includes("古いラジオ"))).toBe(true);
      expect(grN3.some((q) => q.passageHtml?.includes("体の中心の温度"))).toBe(true);
      expect(grN3.some((q) => q.passageHtml?.includes("秋の日帰りバス旅行のご案内"))).toBe(true);
      expect(listenN3.every((q) => (q.dialogueScript?.length ?? 0) > 0)).toBe(true);

      // Verifikasi pemetaan getQuestionsForTestAndSection untuk N3
      expect(
        getQuestionsForTestAndSection(test2022N3, test2022N3.mock_sections[0], seedPack).length
      ).toBe(35);
      expect(
        getQuestionsForTestAndSection(test2022N3, test2022N3.mock_sections[1], seedPack).length
      ).toBe(38);
      expect(
        getQuestionsForTestAndSection(test2022N3, test2022N3.mock_sections[2], seedPack).length
      ).toBe(28);
    });

    it("menghitung skor skala resmi 0-180 untuk N3 dengan kriteria lulus 95点 dan batas minimum seksi (38/120 & 19/60)", () => {
      const passScoreN3 = calculateOfficialJLPTScore(26, 35, 28, 38, 20, 28, "N3");
      expect(passScoreN3.passThresholdTotal).toBe(95);
      expect(passScoreN3.totalScaled).toBeGreaterThanOrEqual(95);
      expect(passScoreN3.langReadingPassed).toBe(true);
      expect(passScoreN3.listeningPassed).toBe(true);
      expect(passScoreN3.overallPassed).toBe(true);
    });
  });

  describe("4. Dataset Lengkap 2016年12月 日本語能力試験 N2 (106 Soal PDF)", () => {
    it("memuat seluruh 106 soal asli 2016-2 JLPT N2 (32 Kosakata + 43 Grammar/Dokkai + 31 Choukai)", () => {
      const test2016N2 = generateOfficial2016N2MockTest();
      expect(test2016N2.totalQuestions).toBe(106);
      expect(test2016N2.totalDurationMinutes).toBe(155);
      expect(test2016N2.passingScoreTotal).toBe(90);
      expect(test2016N2.mock_sections.length).toBe(3);

      const vocabN2 = get2016N2VocabQuestions();
      const grN2 = get2016N2GrammarReadingQuestions();
      const listenN2 = get2016N2ListeningQuestions();

      expect(vocabN2.length).toBe(32);
      expect(grN2.length).toBe(43);
      expect(listenN2.length).toBe(31);

      // Pastikan Mondai 3 語形成 (5 soal), Mondai 6 用法 (5 soal), ★ 並べ替え (5 soal), トイレマーク, 公立の図書館 A/B, ミハマホテル tersedia
      expect(vocabN2.filter((q) => q.mondaiNumber === 3).length).toBe(5);
      expect(vocabN2.filter((q) => q.mondaiNumber === 6).length).toBe(5);
      expect(grN2.filter((q) => q.isStarQuestion).length).toBe(5);
      expect(grN2.some((q) => q.passageHtml?.includes("日本発のトイレマーク"))).toBe(true);
      expect(grN2.some((q) => q.passageHtml?.includes("公立の図書館"))).toBe(true);
      expect(grN2.some((q) => q.passageHtml?.includes("ミハマホテル"))).toBe(true);
      expect(listenN2.every((q) => (q.dialogueScript?.length ?? 0) > 0)).toBe(true);

      // Verifikasi pemetaan getQuestionsForTestAndSection untuk N2
      expect(
        getQuestionsForTestAndSection(test2016N2, test2016N2.mock_sections[0], seedPack).length
      ).toBe(32);
      expect(
        getQuestionsForTestAndSection(test2016N2, test2016N2.mock_sections[1], seedPack).length
      ).toBe(43);
      expect(
        getQuestionsForTestAndSection(test2016N2, test2016N2.mock_sections[2], seedPack).length
      ).toBe(31);
    });
  });

  describe("5. Dataset Lengkap 2023年7月 日本語能力試験 N1 (96 Soal PDF)", () => {
    it("memuat seluruh 96 soal asli 2023-1 JLPT N1 (25 Kosakata + 41 Grammar/Dokkai + 30 Choukai)", () => {
      const test2023N1 = generateOfficial2023N1MockTest();
      expect(test2023N1.totalQuestions).toBe(96);
      expect(test2023N1.totalDurationMinutes).toBe(165);
      expect(test2023N1.passingScoreTotal).toBe(100);
      expect(test2023N1.mock_sections.length).toBe(3);

      const vocabN1 = get2023N1VocabQuestions();
      const grN1 = get2023N1GrammarReadingQuestions();
      const listenN1 = get2023N1ListeningQuestions();

      expect(vocabN1.length).toBe(25);
      expect(grN1.length).toBe(41);
      expect(listenN1.length).toBe(30);

      // Pastikan Mondai 4 用法 (6 soal), ★ 並べ替え (5 soal), 一生の仕事, カタクリ, ロボピー, メモ魔 A/B, いきいき運動教室 tersedia
      expect(vocabN1.filter((q) => q.mondaiNumber === 4).length).toBe(6);
      expect(grN1.filter((q) => q.isStarQuestion).length).toBe(5);
      expect(grN1.some((q) => q.passageHtml?.includes("一生の仕事"))).toBe(true);
      expect(grN1.some((q) => q.passageHtml?.includes("カタクリ"))).toBe(true);
      expect(grN1.some((q) => q.passageHtml?.includes("ロボピー"))).toBe(true);
      expect(grN1.some((q) => q.passageHtml?.includes("いきいき運動教室のご案内"))).toBe(true);
      expect(listenN1.every((q) => (q.dialogueScript?.length ?? 0) > 0)).toBe(true);

      // Verifikasi pemetaan getQuestionsForTestAndSection untuk N1
      expect(
        getQuestionsForTestAndSection(test2023N1, test2023N1.mock_sections[0], seedPack).length
      ).toBe(25);
      expect(
        getQuestionsForTestAndSection(test2023N1, test2023N1.mock_sections[1], seedPack).length
      ).toBe(41);
      expect(
        getQuestionsForTestAndSection(test2023N1, test2023N1.mock_sections[2], seedPack).length
      ).toBe(30);
    });

    it("menghitung skor skala resmi 0-180 untuk N1 dengan kriteria lulus 100点 dan batas minimum seksi (38/120 & 19/60)", () => {
      const passScoreN1 = calculateOfficialJLPTScore(20, 25, 30, 41, 22, 30, "N1");
      expect(passScoreN1.passThresholdTotal).toBe(100);
      expect(passScoreN1.totalScaled).toBeGreaterThanOrEqual(100);
      expect(passScoreN1.langReadingPassed).toBe(true);
      expect(passScoreN1.listeningPassed).toBe(true);
      expect(passScoreN1.overallPassed).toBe(true);
    });
  });

  describe("6. Render Halaman Utama Ujian Format Baru (ExamPage)", () => {
    it("merender pemilih 5 level JLPT N5, N4, N3, N2 & N1 beserta papan skor 0-180 dan 3 bagian ujian", () => {
      const html = renderToString(
        <MemoryRouter>
          <ExamPage />
        </MemoryRouter>
      );

      expect(html).toContain("JLPT N5");
      expect(html).toContain("JLPT N4");
      expect(html).toContain("JLPT N3");
      expect(html).toContain("JLPT N2");
      expect(html).toContain("JLPT N1");
      expect(html).toContain("2018年 日本語能力試験 N5【完全再現】");
      expect(html).toContain("2018年 日本語能力試験 N4【完全再現】");
      expect(html).toContain("2022年12月 日本語能力試験 N3【完全再現】");
      expect(html).toContain("2016年12月 日本語能力試験 N2【完全再現】");
      expect(html).toContain("2023年7月 日本語能力試験 N1【完全再現】");
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
