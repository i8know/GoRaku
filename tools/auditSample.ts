/**
 * Perintah Audit Sampel Acak untuk Validasi Skripsi
 *
 * Mengambil sampel acak berukuran N (default 50) secara deterministik menggunakan PRNG
 * dari paket soal yang dihasilkan, serta menyusun instrumen audit/evaluasi manual
 * lengkap dengan rubrik akurasi, rincian provenance, dan rekapitulasi data skripsi.
 *
 * Penggunaan:
 *   npx tsx tools/auditSample.ts --sample 50 --seed 42
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QuestionPack, QuestionItem } from "../src/lib/questionPack";
import { createPRNG, PRNG } from "./utils/prng";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "tools", "output");

export interface AuditSampleResult {
  sampleSize: number;
  seed: number;
  generatedAt: string;
  sourcePackId: string;
  sourcePackVersion: string;
  distributionByType: Record<string, number>;
  samples: QuestionItem[];
}

/**
 * Mengambil sampel acak deterministik dari QuestionPack.
 */
export function extractRandomSample(
  pack: QuestionPack,
  sampleSize: number = 50,
  seed: number = 42
): AuditSampleResult {
  const rng: PRNG = createPRNG(seed);
  const actualSize = Math.min(sampleSize, pack.questions.length);
  const picked = rng.pickMultiple(pack.questions, actualSize);

  const distributionByType: Record<string, number> = {
    G1_KANJI_READING: 0,
    G2_KANJI_WRITING: 0,
    G3_PARTICLES: 0,
    G4_CONTEXT_VOCAB: 0
  };

  for (const q of picked) {
    distributionByType[q.type] = (distributionByType[q.type] || 0) + 1;
  }

  return {
    sampleSize: actualSize,
    seed,
    generatedAt: new Date().toISOString(),
    sourcePackId: pack.id,
    sourcePackVersion: pack.version,
    distributionByType,
    samples: picked
  };
}

/**
 * Menghasilkan dokumen laporan instrumen audit manual (Markdown) untuk lampiran skripsi.
 */
export function generateAuditMarkdown(audit: AuditSampleResult): string {
  const lines: string[] = [];

  lines.push("# INSTRUMEN AUDIT & VERIFIKASI SAMPEL ACAK SOAL JLPT N5");
  lines.push("## Lampiran Data Validitas Generator Soal Bahasa Jepang Orisinal");
  lines.push("");
  lines.push(`- **Tanggal Penarikan Sampel**: ${audit.generatedAt}`);
  lines.push(`- **Paket Sumber**: \`${audit.sourcePackId}\` (Versi ${audit.sourcePackVersion})`);
  lines.push(`- **Ukuran Sampel**: ${audit.sampleSize} soal (dipilih acak tanpa penggantian)`);
  lines.push(`- **Seed PRNG**: \`${audit.seed}\` (deterministik & dapat diulang)`);
  lines.push("");
  lines.push("### Distribusi Sampel per Jenis Soal");
  lines.push(`- **G1 (Membaca Kanji)**: ${audit.distributionByType.G1_KANJI_READING || 0} soal`);
  lines.push(`- **G2 (Penulisan Kanji)**: ${audit.distributionByType.G2_KANJI_WRITING || 0} soal`);
  lines.push(`- **G3 (Partikel Tata Bahasa)**: ${audit.distributionByType.G3_PARTICLES || 0} soal`);
  lines.push(`- **G4 (Pemilihan Kata Konteks)**: ${audit.distributionByType.G4_CONTEXT_VOCAB || 0} soal`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("### Petunjuk Pengisian Verifikasi Manual (Oleh Ahli / Peneliti):");
  lines.push("Beri tanda centang `[x]` pada kriteria yang terpenuhi:");
  lines.push("1. **Kunci Tepat**: Kunci jawaban 100% benar menurut kaidah bahasa Jepang standar.");
  lines.push("2. **Pengecoh Masuk Akal**: Tiga pilihan pengecoh tidak ambigu dan tidak memuat jawaban sah alternatif.");
  lines.push("3. **Alami & Berterima**: Kalimat contoh alami dan sesuai standar kecakapan JLPT N5.");
  lines.push("");
  lines.push("---");
  lines.push("");

  audit.samples.forEach((q, idx) => {
    const num = idx + 1;
    const cleanPrompt = q.prompt.replace(/<[^>]+>/g, "");
    const correctOpt = q.options[q.correctIndex];

    lines.push(`### Sampel #${num} [ID: \`${q.id}\` • Tipe: ${q.type}]`);
    lines.push(`- **Kalimat Soal**: ${cleanPrompt}`);
    lines.push(
      `- **Pilihan Opsi**: 1) \`${q.options[0]}\` | 2) \`${q.options[1]}\` | 3) \`${q.options[2]}\` | 4) \`${q.options[3]}\``
    );
    lines.push(`- **Kunci Jawaban**: **${correctOpt}** (Opsi indeks ke-${q.correctIndex + 1})`);
    lines.push(`- **Target Uji**: ${q.explanation.targetWord} 【${q.explanation.reading}】`);
    if (q.explanation.meaningEn) {
      lines.push(`- **Arti (JMdict)**: ${q.explanation.meaningEn}`);
    }
    if (q.explanation.translationId) {
      lines.push(`- **Terjemahan (Tatoeba)**: “${q.explanation.translationId}”`);
    }
    lines.push(
      `- **Provenance**: Tatoeba JPN #${q.provenance.tatoeba_jpn_id} | JMdict Seq: \`${q.provenance.jmdict_ent_seq || "N/A"}\``
    );
    lines.push("");
    lines.push("  **Lembar Penilaian Evaluator:**");
    lines.push("  - [ ] Kunci jawaban tepat");
    lines.push("  - [ ] Pengecoh tidak ambigu");
    lines.push("  - [ ] Kalimat alami berterima");
    lines.push("  - **Kesimpulan**: [ ] SAH / BENAR    [ ] KELIRU / AMBIGU");
    lines.push("  - **Catatan Evaluator**: ____________________________________________________");
    lines.push("");
  });

  lines.push("---");
  lines.push("");
  lines.push("## LEMBAR REKAPITULASI HASIL AUDIT (UNTUK SKRIPSI)");
  lines.push("");
  lines.push("| Parameter | Formula / Target | Hasil Audit Aktual |");
  lines.push("| :--- | :--- | :--- |");
  lines.push(`| **Jumlah Sampel Diperiksa (N)** | ${audit.sampleSize} soal | ________ soal |`);
  lines.push("| **Jumlah Soal Sah (Benar)** | $N - \\text{Keliru}$ | ________ soal |");
  lines.push("| **Jumlah Soal Keliru / Ambigu** | Kesalahan teridentifikasi | ________ soal |");
  lines.push("| **Tingkat Akurasi / Validitas** | $(\\text{Benar} / N) \\times 100\\%$ | ________ % |");
  lines.push("");
  lines.push("### Ringkasan Temuan & Keterbatasan:");
  lines.push("1. __________________________________________________________________________");
  lines.push("2. __________________________________________________________________________");
  lines.push("3. __________________________________________________________________________");
  lines.push("");
  lines.push("Tanda Tangan Penguji / Verifikator: ______________________  Tanggal: __________");

  return lines.join("\n");
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith("auditSample.ts")) {
  const args = process.argv.slice(2);
  let sampleSize = 50;
  let seed = 42;
  let inputPath = path.join(rootDir, "src", "data", "seedQuestionPack.json");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sample" && args[i + 1]) {
      sampleSize = parseInt(args[i + 1], 10) || 50;
      i++;
    } else if (args[i] === "--seed" && args[i + 1]) {
      seed = parseInt(args[i + 1], 10) || 42;
      i++;
    } else if (args[i] === "--input" && args[i + 1]) {
      inputPath = path.resolve(args[i + 1]);
      i++;
    }
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Berkas masukan tidak ditemukan: ${inputPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as QuestionPack;
  const auditResult = extractRandomSample(pack, sampleSize, seed);

  const mdContent = generateAuditMarkdown(auditResult);
  const mdPath = path.join(outputDir, `sample_audit_${sampleSize}.md`);
  const jsonPath = path.join(outputDir, `sample_audit_${sampleSize}.json`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(mdPath, mdContent, "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify(auditResult, null, 2), "utf-8");

  console.log(`=== Audit Sampel Acak Selesai (N = ${auditResult.sampleSize}, Seed = ${seed}) ===`);
  console.log(`- Berkas Laporan Markdown: ${mdPath}`);
  console.log(`- Berkas Data Sampel JSON: ${jsonPath}`);
  console.log(`- Distribusi Sampel:`);
  console.log(`  * G1 (Membaca):   ${auditResult.distributionByType.G1_KANJI_READING || 0}`);
  console.log(`  * G2 (Penulisan): ${auditResult.distributionByType.G2_KANJI_WRITING || 0}`);
  console.log(`  * G3 (Partikel):  ${auditResult.distributionByType.G3_PARTICLES || 0}`);
  console.log(`  * G4 (Konteks):   ${auditResult.distributionByType.G4_CONTEXT_VOCAB || 0}`);
  console.log(`\nDokumen audit siap dicetak/dipakai untuk evaluasi skripsi.`);
}

