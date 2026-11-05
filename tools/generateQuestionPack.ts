/**
 * CLI Runner & Builder Paket Soal Ujian JLPT N5 Orisinal
 *
 * Menghasilkan paket soal QuestionPack berformat JSON yang tervalidasi skema,
 * deterministik (berdasarkan seed), dan dapat langsung diimpor ke aplikasi web.
 *
 * Contoh penggunaan:
 *   npx tsx tools/generateQuestionPack.ts --seed 42
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QuestionPack, validateQuestionPack } from "../src/lib/questionPack";
import { generateG1ReadingQuestions } from "./generators/g1ReadingGenerator";
import { generateG2WritingQuestions } from "./generators/g2WritingGenerator";
import { generateG3ParticleQuestions } from "./generators/g3ParticleGenerator";
import { generateG4ContextQuestions } from "./generators/g4ContextVocabGenerator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export interface BuildOptions {
  seed: number;
  outputPath?: string;
  maxQuestions?: number;
  approvedOnly?: boolean;
}

/**
 * Membangun objek QuestionPack lengkap dari generator soal N5 (G1, G2, G3, G4).
 */
export function buildQuestionPack(options: BuildOptions): QuestionPack {
  const seed = options.seed;

  // Hasilkan soal G1 (Membaca Kanji)
  const g1Questions = generateG1ReadingQuestions({
    seed,
    maxQuestions: options.maxQuestions
  });

  // Hasilkan soal G2 (Penulisan Kanji)
  const g2Questions = generateG2WritingQuestions({
    seed,
    maxQuestions: options.maxQuestions
  });

  // Hasilkan soal G3 (Partikel & Tata Bahasa)
  const g3Questions = generateG3ParticleQuestions({
    seed,
    maxQuestions: options.maxQuestions
  });

  // Hasilkan soal G4 (Pemilihan Kata Sesuai Konteks)
  const g4Questions = generateG4ContextQuestions({
    seed,
    maxQuestions: options.maxQuestions
  });

  let allQuestions = [
    ...g1Questions,
    ...g2Questions,
    ...g3Questions,
    ...g4Questions
  ];

  if (options.approvedOnly) {
    allQuestions = allQuestions.filter((q) => q.review.status === "approved");
  }

  // Hitung statistik
  const stats = {
    totalQuestions: allQuestions.length,
    byType: {
      G1_KANJI_READING: allQuestions.filter((q) => q.type === "G1_KANJI_READING").length,
      G2_KANJI_WRITING: allQuestions.filter((q) => q.type === "G2_KANJI_WRITING").length,
      G3_PARTICLES: allQuestions.filter((q) => q.type === "G3_PARTICLES").length,
      G4_CONTEXT_VOCAB: allQuestions.filter((q) => q.type === "G4_CONTEXT_VOCAB").length
    },
    approvedCount: allQuestions.filter((q) => q.review.status === "approved").length,
    draftCount: allQuestions.filter((q) => q.review.status === "draft").length,
    rejectedCount: allQuestions.filter((q) => q.review.status === "rejected").length
  };

  const pack: QuestionPack = {
    id: "jlpt-n5-seed-pack-v1",
    version: "1.0.0",
    title: "Latihan Ujian JLPT N5 Orisinal (Paket Bawaan)",
    description:
      "Paket soal latihan orisinal bergaya format JLPT N5 yang dihasilkan secara otomatis dari data terbuka kamus JMdict, KANJIDIC2, dan korpus kalimat Tatoeba. Tingkat N5 merupakan perkiraan berdasarkan tag leksikal terbuka.",
    level: "N5",
    language: "ja",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    license: "CC BY-SA 4.0",
    attribution: {
      sources: [
        {
          name: "JMdict & KANJIDIC2",
          url: "https://www.edrdg.org/",
          license: "CC BY-SA 4.0",
          notes: "Kamus bahasa Jepang-Inggris dan kanji oleh EDRDG (Jim Breen, dkk.)."
        },
        {
          name: "Tatoeba Project",
          url: "https://tatoeba.org/",
          license: "CC BY 2.0 FR",
          notes: "Korpus kalimat contoh multibahasa dengan terjemahan bahasa Indonesia."
        }
      ],
      disclaimer:
        "Paket ini merupakan soal orisinal bergaya JLPT N5, BUKAN soal resmi dari The Japan Foundation atau JEES. JLPT tidak menerbitkan daftar kosakata dan kanji resmi."
    },
    stats,
    questions: allQuestions
  };

  // Validasi ketat paket hasil
  const validation = validateQuestionPack(pack);
  if (!validation.valid) {
    throw new Error(
      `Paket soal tidak valid terhadap skema:\n- ${validation.errors.join("\n- ")}`
    );
  }

  return pack;
}

// Eksekusi jika dipanggil langsung lewat Node/tsx CLI
if (process.argv[1] && process.argv[1].endsWith("generateQuestionPack.ts")) {
  const args = process.argv.slice(2);
  let seed = 42;
  let outputPath = path.join(rootDir, "src", "data", "seedQuestionPack.json");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--seed" && args[i + 1]) {
      seed = parseInt(args[i + 1], 10) || 42;
      i++;
    } else if (args[i] === "--out" || args[i] === "--output") {
      outputPath = path.resolve(args[i + 1]);
      i++;
    }
  }

  console.log(`=== Generator Paket Soal N5 Orisinal (Seed: ${seed}) ===`);

  try {
    const pack = buildQuestionPack({ seed });

    // Pastikan folder tujuan ada
    const targetDir = path.dirname(outputPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(pack, null, 2), "utf-8");

    console.log(`\nBerhasil menghasilkan paket soal:`);
    console.log(`- Berkas: ${outputPath}`);
    console.log(`- ID: ${pack.id} (Versi: ${pack.version})`);
    console.log(`- Total Soal: ${pack.stats.totalQuestions}`);
    console.log(`  * G1 (Membaca Kanji): ${pack.stats.byType.G1_KANJI_READING}`);
    console.log(`  * G2 (Penulisan Kanji): ${pack.stats.byType.G2_KANJI_WRITING}`);
    console.log(`  * G3 (Partikel): ${pack.stats.byType.G3_PARTICLES}`);
    console.log(`  * G4 (Pemilihan Kata): ${pack.stats.byType.G4_CONTEXT_VOCAB}`);
    console.log(`  * Status Disetujui (Approved): ${pack.stats.approvedCount}`);
    console.log(`  * Status Draf (Perlu Tinjauan): ${pack.stats.draftCount}`);
    console.log(`  * Lisensi Paket: ${pack.license}`);
    console.log(`\nPaket valid dan siap diimpor ke aplikasi.`);
    process.exit(0);
  } catch (err) {
    console.error("Kesalahan pembuatan paket soal:", err);
    process.exit(1);
  }
}

