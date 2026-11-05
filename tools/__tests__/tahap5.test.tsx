import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  QuestionPack,
  QuestionItem,
  validateQuestionPack
} from "../../src/lib/questionPack";
import {
  calculateReviewStats,
  exportToCsv,
  exportToHtml,
  applyReviewDecisions
} from "../reviewWorkflow";
import {
  extractRandomSample,
  generateAuditMarkdown
} from "../auditSample";
import LicenseAttributionPage from "../../src/pages/LicenseAttribution";
import {
  ensureSeedPackLoaded,
  listQuestionPacks,
  saveQuestionPack,
  deleteQuestionPack,
  questionPackDb
} from "../../src/lib/questionPackStorage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testOutputDir = path.join(__dirname, "test_output_tahap5");

// Mock QuestionPack fixture
function createMockPack(): QuestionPack {
  const sampleQuestions: QuestionItem[] = [
    {
      id: "q_g1_001",
      type: "G1_KANJI_READING",
      level: "N5",
      prompt: "<u>水</u>を飲みます。",
      options: ["みず", "すい", "みづ", "みす"],
      correctIndex: 0,
      explanation: {
        targetWord: "水",
        reading: "みず",
        meaningEn: "water",
        translationId: "Saya minum air.",
        notes: "Mondai 1 membaca kanji"
      },
      provenance: {
        generator: "g1ReadingGenerator",
        generator_version: "1.0.0",
        seed: 42,
        jmdict_ent_seq: "1360010",
        tatoeba_jpn_id: 1001,
        tatoeba_ind_id: 2001
      },
      review: {
        status: "approved",
        notes: "Lolos verifikasi otomatis leksikal JMdict"
      }
    },
    {
      id: "q_g2_001",
      type: "G2_KANJI_WRITING",
      level: "N5",
      prompt: "<u>でんしゃ</u>で行きます。",
      options: ["電車", "雷車", "電東", "雪車"],
      correctIndex: 0,
      explanation: {
        targetWord: "電車",
        reading: "でんしゃ",
        meaningEn: "train",
        translationId: "Pergi dengan kereta api.",
        notes: "Mondai 2 penulisan kanji"
      },
      provenance: {
        generator: "g2WritingGenerator",
        generator_version: "1.0.0",
        seed: 42,
        jmdict_ent_seq: "1427510",
        tatoeba_jpn_id: 1002,
        tatoeba_ind_id: 2002
      },
      review: {
        status: "draft",
        notes: "Memerlukan peninjauan visual ortografi kanji"
      }
    },
    {
      id: "q_g3_001",
      type: "G3_PARTICLES",
      level: "N5",
      prompt: "水（　★　）飲みます。",
      options: ["を", "に", "で", "へ"],
      correctIndex: 0,
      explanation: {
        targetWord: "を",
        reading: "を",
        meaningEn: "direct object particle",
        translationId: "Saya minum air.",
        notes: "Pola N + を + V transitif"
      },
      provenance: {
        generator: "g3ParticleGenerator",
        generator_version: "1.0.0",
        seed: 42,
        tatoeba_jpn_id: 1003,
        tatoeba_ind_id: 2003
      },
      review: {
        status: "draft",
        notes: "Pola partikel otomatis, perlu ditinjau konteksnya"
      }
    },
    {
      id: "q_g4_001",
      type: "G4_CONTEXT_VOCAB",
      level: "N5",
      prompt: "（　★　）を飲みます。",
      options: ["水", "本", "車", "駅"],
      correctIndex: 0,
      explanation: {
        targetWord: "水",
        reading: "みず",
        meaningEn: "water",
        translationId: "Saya minum air.",
        notes: "Pemilihan kata isi sesuai konteks predikat"
      },
      provenance: {
        generator: "g4ContextVocabGenerator",
        generator_version: "1.0.0",
        seed: 42,
        jmdict_ent_seq: "1360010",
        tatoeba_jpn_id: 1004,
        tatoeba_ind_id: 2004
      },
      review: {
        status: "rejected",
        notes: "Konteks terlalu ambigu untuk satu jawaban pasti"
      }
    }
  ];

  return {
    id: "test-pack-n5",
    title: "Paket Uji N5",
    description: "Paket soal untuk pengujian sistem tinjauan",
    level: "N5",
    version: "1.0.0",
    language: "ja",
    license: "CC-BY-SA-4.0",
    disclaimer: "bergaya JLPT N5, bukan soal resmi",
    attribution: {
      sources: [
        {
          name: "JMdict",
          license: "CC BY-SA 4.0",
          url: "https://www.edrdg.org/jmdict/j_jmdict.html"
        },
        {
          name: "Tatoeba",
          license: "CC BY 2.0 FR",
          url: "https://tatoeba.org"
        }
      ],
      derivedLicense: "CC BY-SA 4.0"
    },
    createdAt: new Date().toISOString(),
    generator: {
      name: "n5-original-builder",
      version: "1.0.0",
      seed: 42
    },
    stats: {
      totalQuestions: 4,
      byType: {
        G1_KANJI_READING: 1,
        G2_KANJI_WRITING: 1,
        G3_PARTICLES: 1,
        G4_CONTEXT_VOCAB: 1
      },
      approvedCount: 1,
      draftCount: 2,
      rejectedCount: 1
    },
    questions: sampleQuestions
  };
}

describe("Tahap 5 — Alur Tinjauan, Audit Sampel, dan Lisensi Atribusi", () => {
  beforeEach(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe("1. Alur Tinjauan & Statistik (reviewWorkflow.ts)", () => {
    it("menghitung statistik paket soal dengan tepat (total, approved, draft, rejected, tipe)", () => {
      const pack = createMockPack();
      const stats = calculateReviewStats(pack);

      expect(stats.totalQuestions).toBe(4);
      expect(stats.approvedCount).toBe(1);
      expect(stats.draftCount).toBe(2);
      expect(stats.rejectedCount).toBe(1);
      expect(stats.duplicateCount).toBe(0);
      expect(stats.byType.G1_KANJI_READING).toBe(1);
      expect(stats.byType.G2_KANJI_WRITING).toBe(1);
      expect(stats.byType.G3_PARTICLES).toBe(1);
      expect(stats.byType.G4_CONTEXT_VOCAB).toBe(1);
      expect(stats.rejectionReasons["Konteks terlalu ambigu untuk satu jawaban pasti"]).toBe(1);
    });

    it("mendeteksi duplikat ID jika terdapat ID soal yang berulang", () => {
      const pack = createMockPack();
      // Gandakan satu soal
      pack.questions.push({ ...pack.questions[0] });
      const stats = calculateReviewStats(pack);

      expect(stats.duplicateCount).toBe(1);
      expect(stats.totalQuestions).toBe(5);
    });

    it("mengekspor laporan tinjauan ke format CSV dengan kolom lengkap", () => {
      const pack = createMockPack();
      const csvPath = path.join(testOutputDir, "test_report.csv");

      exportToCsv(pack, csvPath);

      expect(fs.existsSync(csvPath)).toBe(true);
      const content = fs.readFileSync(csvPath, "utf-8");
      const lines = content.split("\n");

      // Header row
      expect(lines[0]).toContain("No,ID,Tipe,Prompt");
      expect(lines[0]).toContain("Kunci Jawaban");
      expect(lines[0]).toContain("Status Review");

      // Baris soal
      expect(lines.length).toBe(5); // 1 header + 4 rows
      expect(content).toContain("q_g1_001");
      expect(content).toContain("みず");
      expect(content).toContain("approved");
      expect(content).toContain("q_g4_001");
      expect(content).toContain("rejected");
    });

    it("mengekspor laporan tinjauan ke format HTML interaktif yang valid", () => {
      const pack = createMockPack();
      const htmlPath = path.join(testOutputDir, "test_report.html");

      exportToHtml(pack, htmlPath);

      expect(fs.existsSync(htmlPath)).toBe(true);
      const content = fs.readFileSync(htmlPath, "utf-8");

      expect(content).toContain("<!DOCTYPE html>");
      expect(content).toContain("Laporan Tinjauan Soal Latihan JLPT N5 Orisinal");
      expect(content).toContain(pack.id);
      expect(content).toContain("q_g1_001");
      expect(content).toContain("badge-approved");
      expect(content).toContain("badge-draft");
      expect(content).toContain("badge-rejected");
      expect(content).toContain("Konteks terlalu ambigu untuk satu jawaban pasti");
    });

    it("menerapkan keputusan kurator (approved/rejected) dan memperbarui paket secara valid", () => {
      const pack = createMockPack();
      const decisions = {
        q_g2_001: {
          status: "approved" as const,
          notes: "Telah diperiksa manual oleh ahli: pengecoh ortografi kanji valid",
          reviewer: "Sensei Budi"
        },
        q_g3_001: {
          status: "rejected" as const,
          notes: "Terlalu ambigu, dibuang dari paket",
          reviewer: "Sensei Budi"
        }
      };

      const updated = applyReviewDecisions(pack, decisions);

      // Status terupdate
      const qG2 = updated.questions.find((q) => q.id === "q_g2_001");
      expect(qG2?.review.status).toBe("approved");
      expect(qG2?.review.reviewer).toBe("Sensei Budi");
      expect(qG2?.review.notes).toContain("Telah diperiksa manual");

      const qG3 = updated.questions.find((q) => q.id === "q_g3_001");
      expect(qG3?.review.status).toBe("rejected");

      // Stats paket terhitung ulang
      expect(updated.stats.approvedCount).toBe(2); // q_g1_001 + q_g2_001
      expect(updated.stats.draftCount).toBe(0);
      expect(updated.stats.rejectedCount).toBe(2); // q_g3_001 + q_g4_001

      // Paket tetap valid terhadap skema
      const validation = validateQuestionPack(updated);
      expect(validation.valid).toBe(true);
    });
  });

  describe("2. Audit Sampel Acak Deterministik (auditSample.ts)", () => {
    it("menarik sampel acak secara deterministik dengan seed PRNG", () => {
      const pack = createMockPack();
      // Tambah soal hingga 10 untuk uji sampel
      for (let i = 5; i <= 10; i++) {
        pack.questions.push({
          ...pack.questions[0],
          id: `q_extra_${i}`
        });
      }
      pack.stats.totalQuestions = pack.questions.length;

      const sample1 = extractRandomSample(pack, 5, 42);
      const sample2 = extractRandomSample(pack, 5, 42);
      const sampleDiffSeed = extractRandomSample(pack, 5, 999);

      expect(sample1.sampleSize).toBe(5);
      expect(sample1.samples.length).toBe(5);

      // Reproducibilitas PRNG
      const ids1 = sample1.samples.map((s) => s.id);
      const ids2 = sample2.samples.map((s) => s.id);
      expect(ids1).toEqual(ids2);

      // Seed berbeda menghasilkan urutan berbeda
      const idsDiff = sampleDiffSeed.samples.map((s) => s.id);
      expect(ids1).not.toEqual(idsDiff);
    });

    it("menangani kasus ukuran sampel lebih besar dari total soal yang tersedia", () => {
      const pack = createMockPack(); // 4 questions
      const audit = extractRandomSample(pack, 50, 42);

      expect(audit.sampleSize).toBe(4);
      expect(audit.samples.length).toBe(4);
    });

    it("menghasilkan dokumen instrumen Markdown dengan rubrik validasi skripsi", () => {
      const pack = createMockPack();
      const audit = extractRandomSample(pack, 4, 42);
      const md = generateAuditMarkdown(audit);

      expect(md).toContain("# INSTRUMEN AUDIT & VERIFIKASI SAMPEL ACAK SOAL JLPT N5");
      expect(md).toContain("Lampiran Data Validitas Generator Soal Bahasa Jepang Orisinal");
      expect(md).toContain("Seed PRNG");
      expect(md).toContain("1. **Kunci Tepat**");
      expect(md).toContain("2. **Pengecoh Masuk Akal**");
      expect(md).toContain("3. **Alami & Berterima**");
      expect(md).toContain("q_g1_001");
      expect(md).toContain("Tatoeba JPN");
      expect(md).toContain("JMdict Seq");
    });
  });

  describe("3. Halaman Lisensi dan Atribusi (LicenseAttribution.tsx)", () => {
    it("merender penafian resmi JLPT tanpa pelanggaran hak cipta", () => {
      const html = renderToString(
        <MemoryRouter>
          <LicenseAttributionPage />
        </MemoryRouter>
      );

      expect(html).toContain("Lisensi dan Atribusi Sumber Data");
      expect(html).toContain("Pemberitahuan &amp; Penafian Resmi");
      expect(html).toContain("soal orisinal bergaya JLPT N5");
      expect(html).toContain("BUKAN");
      expect(html).toContain("The Japan Foundation");
    });

    it("merender atribusi lengkap untuk EDRDG (JMdict, KANJIDIC2) dan Tatoeba Project", () => {
      const html = renderToString(
        <MemoryRouter>
          <LicenseAttributionPage />
        </MemoryRouter>
      );

      // EDRDG
      expect(html).toContain("JMdict &amp; KANJIDIC2");
      expect(html).toContain("Electronic Dictionary Research and Development Group");
      expect(html).toContain("CC BY-SA 4.0");
      expect(html).toContain("https://www.edrdg.org/");

      // Tatoeba
      expect(html).toContain("Tatoeba Project");
      expect(html).toContain("CC BY 2.0 FR");
      expect(html).toContain("https://tatoeba.org/");

      // Kesesuaian lisensi turunan
      expect(html).toContain("Lisensi Paket Soal Turunan");
      expect(html).toContain("kompatibel");
    });
  });

  describe("4. Pemasangan Otomatis & Manajemen Paket (questionPackStorage.ts)", () => {
    beforeEach(async () => {
      await questionPackDb.packs.clear();
    });

    it("memasang seedQuestionPack otomatis secara idempoten saat database kosong", async () => {
      const initialList = await listQuestionPacks();
      expect(initialList.length).toBe(0);

      const loadedPack = await ensureSeedPackLoaded();
      expect(loadedPack).toBeDefined();
      expect(loadedPack.id).toBe("jlpt-n5-seed-pack-v1");

      const afterList = await listQuestionPacks();
      expect(afterList.length).toBe(1);
      expect(afterList[0].id).toBe("jlpt-n5-seed-pack-v1");
    });

    it("tidak menduplikasi paket jika dipanggil berulang kali (idempoten)", async () => {
      await ensureSeedPackLoaded();
      await ensureSeedPackLoaded();
      await ensureSeedPackLoaded();

      const afterList = await listQuestionPacks();
      expect(afterList.length).toBe(1);
    });

    it("mempertahankan paket pengguna saat paket seed diperbarui", async () => {
      // Pasang seed
      await ensureSeedPackLoaded();

      // Tambahkan paket buatan pengguna
      const userPack = createMockPack();
      userPack.id = "custom-user-pack-1";
      await saveQuestionPack(userPack);

      const listWithUserPack = await listQuestionPacks();
      expect(listWithUserPack.length).toBe(2);

      // Panggil lagi ensureSeedPackLoaded
      await ensureSeedPackLoaded();
      const finalList = await listQuestionPacks();
      expect(finalList.length).toBe(2);
      expect(finalList.some((p) => p.id === "custom-user-pack-1")).toBe(true);

      // Pengguna dapat menghapus paket buatan mereka atau paket seed jika diinginkan
      await deleteQuestionPack("custom-user-pack-1");
      const listAfterDelete = await listQuestionPacks();
      expect(listAfterDelete.length).toBe(1);
      expect(listAfterDelete[0].id).toBe("jlpt-n5-seed-pack-v1");
    });
  });
});
