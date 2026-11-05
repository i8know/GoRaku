import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ExamPage from "../Exam";
import {
  generateStandardMockTests,
  getQuestionsForMockSection
} from "../../components/jlpt/mockTestData";
import AudioCheckModal from "../../components/jlpt/AudioCheckModal";
import ExtraMaterialsModal from "../../components/jlpt/ExtraMaterialsModal";
import TestDetailsModal from "../../components/jlpt/TestDetailsModal";
import seedPackData from "../../data/seedQuestionPack.json";
import { QuestionPack } from "../../lib/questionPack";

describe("Ujian JLPT — Struktur & Tata Letak Bergaya Bunpro (bunpro.jp/id/jlpt_practice_tests)", () => {
  const seedPack = seedPackData as unknown as QuestionPack;

  describe("1. Dataset & Spesifikasi 25 Tes Standar (mockTestData.ts)", () => {
    it("menghasilkan tepat 25 tes latihan lengkap (5 tes per level dari N5 hingga N1)", () => {
      const tests = generateStandardMockTests();
      expect(tests.length).toBe(25);

      const n5Tests = tests.filter((t) => t.levelLabel === "N5");
      const n4Tests = tests.filter((t) => t.levelLabel === "N4");
      const n3Tests = tests.filter((t) => t.levelLabel === "N3");
      const n2Tests = tests.filter((t) => t.levelLabel === "N2");
      const n1Tests = tests.filter((t) => t.levelLabel === "N1");

      expect(n5Tests.length).toBe(5);
      expect(n4Tests.length).toBe(5);
      expect(n3Tests.length).toBe(5);
      expect(n2Tests.length).toBe(5);
      expect(n1Tests.length).toBe(5);
    });

    it("memiliki struktur seksi dan durasi N5 yang autentik sesuai standar JLPT & Bunpro", () => {
      const tests = generateStandardMockTests();
      const n5_1 = tests.find((t) => t.title === "N5【模擬試験】1");
      expect(n5_1).toBeDefined();

      expect(n5_1?.totalDurationMinutes).toBe(90);
      expect(n5_1?.totalQuestions).toBe(67);
      expect(n5_1?.mock_sections.length).toBe(3);

      // Seksi 1: Kosakata (20 menit, 21 soal)
      const sec1 = n5_1?.mock_sections[0];
      expect(sec1?.category).toBe("vocab");
      expect(sec1?.duration_minutes).toBe(20);
      expect(sec1?.mock_questions_count).toBe(21);
      expect(sec1?.titleId).toBe("Kosakata");

      // Seksi 2: Tata Bahasa & Membaca (40 menit, 22 soal)
      const sec2 = n5_1?.mock_sections[1];
      expect(sec2?.category).toBe("grammar_reading");
      expect(sec2?.duration_minutes).toBe(40);
      expect(sec2?.mock_questions_count).toBe(22);
      expect(sec2?.titleId).toBe("Tata Bahasa & Membaca");

      // Seksi 3: Mendengarkan (30 menit, 24 soal)
      const sec3 = n5_1?.mock_sections[2];
      expect(sec3?.category).toBe("listening");
      expect(sec3?.duration_minutes).toBe(30);
      expect(sec3?.mock_questions_count).toBe(24);
      expect(sec3?.titleId).toBe("Mendengarkan");
    });

    it("mengelompokkan soal leksikal N5 secara akurat (G1+G2 untuk vocab, G3+G4 untuk grammar)", () => {
      const vocabQuestions = getQuestionsForMockSection(seedPack, 1, "vocab");
      expect(vocabQuestions.length).toBe(21);
      // Seluruh soal di seksi vocab adalah G1 (membaca) atau G2 (penulisan)
      expect(vocabQuestions.every((q) => q.type === "G1_KANJI_READING" || q.type === "G2_KANJI_WRITING")).toBe(true);

      const grammarQuestions = getQuestionsForMockSection(seedPack, 1, "grammar_reading");
      expect(grammarQuestions.length).toBe(22);
      // Seluruh soal di seksi grammar adalah G3 (partikel) atau G4 (konteks kalimat)
      expect(grammarQuestions.every((q) => q.type === "G3_PARTICLES" || q.type === "G4_CONTEXT_VOCAB")).toBe(true);
    });

    it("menghasilkan kombinasi soal berbeda antar Tes 1 dan Tes 2 melalui variasi offset", () => {
      const test1Vocab = getQuestionsForMockSection(seedPack, 1, "vocab");
      const test2Vocab = getQuestionsForMockSection(seedPack, 2, "vocab");

      const test1Ids = test1Vocab.map((q) => q.id);
      const test2Ids = test2Vocab.map((q) => q.id);

      // Urutan / kombinasi soal tidak sama persis
      expect(test1Ids).not.toEqual(test2Ids);
    });
  });

  describe("2. Render Halaman Utama Ujian (ExamPage)", () => {
    it("merender judul utama 'Tes Latihan JLPT' dan tombol aksi header", () => {
      const html = renderToString(
        <MemoryRouter>
          <ExamPage />
        </MemoryRouter>
      );

      expect(html).toContain("Tes Latihan JLPT");
      expect(html).toContain("25 Tes Lengkap");
      expect(html).toContain("Format Resmi N5 - N1");
      expect(html).toContain("Cek Audio");
      expect(html).toContain("Materi Tambahan");
    });

    it("merender banner pengantar persis teks resmi Bunpro Indonesia beserta penafian", () => {
      const html = renderToString(
        <MemoryRouter>
          <ExamPage />
        </MemoryRouter>
      );

      // Teks pengantar Bunpro
      expect(html).toContain("Di bawah ini tersedia");
      expect(html).toContain("25 tes latihan JLPT lengkap");
      expect(html).toContain("mengikuti pedoman resmi JLPT dan mencerminkan format ujian aslinya");
      expect(html).toContain("tersedia secara gratis tanpa perlu memasukkan email atau membuat akun");

      // Penafian & Atribusi
      expect(html).toContain("Penafian Resmi");
      expect(html).toContain("bukan soal resmi JEES / The Japan Foundation");
      expect(html).toContain("Lisensi &amp; Atribusi Sumber Data");
    });

    it("merender tab level N5 hingga N1 dan kartu tes N5【模擬試験】1..5", () => {
      const html = renderToString(
        <MemoryRouter>
          <ExamPage />
        </MemoryRouter>
      );

      // Level Tabs
      expect(html).toContain("N5");
      expect(html).toContain("N4");
      expect(html).toContain("N3");
      expect(html).toContain("N2");
      expect(html).toContain("N1");

      // Kartu Tes Default (N5)
      expect(html).toContain("N5【模擬試験】1");
      expect(html).toContain("N5【模擬試験】2");
      expect(html).toContain("N5【模擬試験】3");
      expect(html).toContain("N5【模擬試験】4");
      expect(html).toContain("N5【模擬試験】5");

      // Elemen kartu
      expect(html).toContain("90mnt");
      expect(html).toContain("Standar");
      expect(html).toContain("Kosakata");
      expect(html).toContain("Tata Bahasa &amp; Membaca");
      expect(html).toContain("Mendengarkan");
      expect(html).toContain("Total");
      expect(html).toContain("Detail");
    });
  });

  describe("3. Modal Cek Audio & Materi Tambahan", () => {
    it("merender dialog Cek Audio lengkap dengan kalimat tes bahasa Jepang", () => {
      const html = renderToString(
        <AudioCheckModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain("Cek Audio");
      expect(html).toContain("Gunakan contoh ini untuk memastikan audionya berfungsi dengan baik");
      expect(html).toContain("これは日本語のリスニング音声テストです");
      expect(html).toContain("Putar Contoh Audio");
    });

    it("merender dialog Materi Tambahan dengan tab panduan, kelola paket, dan lisensi", () => {
      const html = renderToString(
        <MemoryRouter>
          <ExtraMaterialsModal
            isOpen={true}
            onClose={() => {}}
            packs={[seedPack]}
            onPackUpdated={() => {}}
          />
        </MemoryRouter>
      );

      expect(html).toContain("Materi Tambahan");
      expect(html).toContain("Panduan Ujian JLPT");
      expect(html).toContain("Kelola Paket Soal (1)");
      expect(html).toContain("Lisensi &amp; Atribusi");
      expect(html).toContain("Standar Format Ujian JLPT N5");
      expect(html).toContain("Kriteria Kelulusan Resmi");
    });

    it("merender TestDetailsModal dengan daftar seksi dan tombol aksi Mulai", () => {
      const tests = generateStandardMockTests();
      const test1 = tests[0];

      const html = renderToString(
        <TestDetailsModal
          isOpen={true}
          test={test1}
          onClose={() => {}}
          onStartSection={() => {}}
          onReviewSection={() => {}}
          onRetakeSection={() => {}}
          sessions={{}}
        />
      );

      expect(html).toContain("N5【模擬試験】1");
      expect(html).toContain("90mnt");
      expect(html).toContain("Standar");
      expect(html).toContain("Total Nilai");
      expect(html).toContain("言語知識（文字・語彙）");
      expect(html).toContain("20 Menit");
      expect(html).toContain("21 Pertanyaan");
      expect(html).toContain("Mulai");
    });
  });
});
