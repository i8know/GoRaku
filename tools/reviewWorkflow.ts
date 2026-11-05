/**
 * Alur Tinjauan Soal (Review Workflow & Decision CLI)
 *
 * Mengelola peninjauan manusia untuk soal-soal hasil generator:
 * 1. Mengekspor laporan tinjauan ke format HTML statis dan CSV
 * 2. Menerapkan keputusan kurator (approved / rejected / draft) ke QuestionPack
 * 3. Menampilkan statistik generasi, penolakan otomatis, dan distribusi tipe soal
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  QuestionPack,
  QuestionItem,
  QuestionReviewStatus,
  validateQuestionPack
} from "../src/lib/questionPack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "tools", "output");

export interface ReviewStats {
  totalQuestions: number;
  byType: Record<string, number>;
  approvedCount: number;
  draftCount: number;
  rejectedCount: number;
  duplicateCount: number;
  rejectionReasons: Record<string, number>;
}

/**
 * Menghitung statistik lengkap dari sebuah QuestionPack.
 */
export function calculateReviewStats(pack: QuestionPack): ReviewStats {
  const byType: Record<string, number> = {
    G1_KANJI_READING: 0,
    G2_KANJI_WRITING: 0,
    G3_PARTICLES: 0,
    G4_CONTEXT_VOCAB: 0
  };

  const rejectionReasons: Record<string, number> = {};
  const seenIds = new Set<string>();
  let duplicateCount = 0;
  let approvedCount = 0;
  let draftCount = 0;
  let rejectedCount = 0;

  for (const q of pack.questions) {
    if (seenIds.has(q.id)) {
      duplicateCount++;
    }
    seenIds.add(q.id);

    byType[q.type] = (byType[q.type] || 0) + 1;

    if (q.review.status === "approved") {
      approvedCount++;
    } else if (q.review.status === "draft") {
      draftCount++;
    } else if (q.review.status === "rejected") {
      rejectedCount++;
      const reason = q.review.notes || "Alasan penolakan tidak dicatat";
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
    }
  }

  return {
    totalQuestions: pack.questions.length,
    byType,
    approvedCount,
    draftCount,
    rejectedCount,
    duplicateCount,
    rejectionReasons
  };
}

/**
 * Mengekspor daftar soal ke format CSV.
 */
export function exportToCsv(pack: QuestionPack, filePath: string): void {
  const headers = [
    "No",
    "ID",
    "Tipe",
    "Prompt",
    "Opsi 1",
    "Opsi 2",
    "Opsi 3",
    "Opsi 4",
    "Kunci Jawaban",
    "Target Kanji/Kata",
    "Bacaan Target",
    "Arti (Inggris)",
    "Terjemahan (Indonesia)",
    "Tatoeba JPN ID",
    "JMdict Seq",
    "Status Review",
    "Catatan Review",
    "Reviewer"
  ];

  const rows: string[] = [headers.map(escapeCsv).join(",")];

  pack.questions.forEach((q, idx) => {
    const row = [
      String(idx + 1),
      q.id,
      q.type,
      q.prompt.replace(/<[^>]+>/g, ""), // Bersihkan tag HTML untuk CSV
      q.options[0] || "",
      q.options[1] || "",
      q.options[2] || "",
      q.options[3] || "",
      q.options[q.correctIndex] || "",
      q.explanation.targetWord || "",
      q.explanation.reading || "",
      q.explanation.meaningEn || "",
      q.explanation.translationId || "",
      String(q.provenance.tatoeba_jpn_id || ""),
      q.provenance.jmdict_ent_seq || "",
      q.review.status,
      q.review.notes || "",
      q.review.reviewer || ""
    ];
    rows.push(row.map(escapeCsv).join(","));
  });

  const targetDir = path.dirname(filePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(filePath, rows.join("\n"), "utf-8");
}

/**
 * Mengekspor laporan tinjauan ke format HTML interaktif yang mudah dibaca.
 */
export function exportToHtml(pack: QuestionPack, filePath: string): void {
  const stats = calculateReviewStats(pack);

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Tinjauan Soal JLPT N5 Orisinal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; background: #f8fafc; color: #1e293b; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 13px; margin-bottom: 20px; }
    .stats-card { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat-box { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 18px; min-width: 130px; }
    .stat-box .num { font-size: 24px; font-weight: bold; color: #0f172a; }
    .stat-box .lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-approved { background: #dcfce7; color: #15803d; }
    .badge-draft { background: #fef3c7; color: #b45309; }
    .badge-rejected { background: #fee2e2; color: #b91c1c; }
    .key-opt { font-weight: bold; color: #16a34a; }
    .notes { font-size: 11px; color: #64748b; font-style: italic; }
  </style>
</head>
<body>
  <h1>Laporan Tinjauan Soal Latihan JLPT N5 Orisinal</h1>
  <div class="subtitle">Paket: ${pack.id} (Versi: ${pack.version}) • Lisensi: ${pack.license} • Dibuat: ${pack.createdAt}</div>

  <div class="stats-card">
    <div class="stat-box"><div class="num">${stats.totalQuestions}</div><div class="lbl">Total Soal</div></div>
    <div class="stat-box"><div class="num" style="color:#16a34a;">${stats.approvedCount}</div><div class="lbl">Disetujui (Approved)</div></div>
    <div class="stat-box"><div class="num" style="color:#d97706;">${stats.draftCount}</div><div class="lbl">Draf (Draft)</div></div>
    <div class="stat-box"><div class="num" style="color:#dc2626;">${stats.rejectedCount}</div><div class="lbl">Ditolak (Rejected)</div></div>
    <div class="stat-box"><div class="num">${stats.byType.G1_KANJI_READING || 0}</div><div class="lbl">G1 Membaca</div></div>
    <div class="stat-box"><div class="num">${stats.byType.G2_KANJI_WRITING || 0}</div><div class="lbl">G2 Penulisan</div></div>
    <div class="stat-box"><div class="num">${stats.byType.G3_PARTICLES || 0}</div><div class="lbl">G3 Partikel</div></div>
    <div class="stat-box"><div class="num">${stats.byType.G4_CONTEXT_VOCAB || 0}</div><div class="lbl">G4 Konteks</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">No</th>
        <th style="width:70px;">ID</th>
        <th style="width:85px;">Tipe</th>
        <th>Soal (Prompt)</th>
        <th style="width:160px;">Pilihan Jawaban</th>
        <th style="width:70px;">Kunci</th>
        <th>Pembahasan & Terjemahan</th>
        <th style="width:80px;">Status</th>
        <th>Catatan Review</th>
      </tr>
    </thead>
    <tbody>
      ${pack.questions
        .map(
          (q, idx) => `<tr>
        <td>${idx + 1}</td>
        <td><code>${q.id}</code></td>
        <td><span class="badge" style="background:#e0e7ff;color:#3730a3;">${q.type.replace("G1_", "").replace("G2_", "").replace("G3_", "").replace("G4_", "")}</span></td>
        <td>${q.prompt}</td>
        <td>${q.options.map((opt, i) => `${i === q.correctIndex ? `<span class="key-opt">✓ ${opt}</span>` : opt}`).join("<br>")}</td>
        <td><strong>${q.options[q.correctIndex]}</strong></td>
        <td>
          <strong>${q.explanation.targetWord}</strong> (${q.explanation.reading})<br>
          <span style="color:#475569;">${q.explanation.meaningEn || ""}</span><br>
          <span style="color:#64748b;font-style:italic;">“${q.explanation.translationId || ""}”</span>
        </td>
        <td><span class="badge badge-${q.review.status}">${q.review.status.toUpperCase()}</span></td>
        <td><span class="notes">${q.review.notes || "-"}</span></td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

  const targetDir = path.dirname(filePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(filePath, html, "utf-8");
}

export interface ReviewDecision {
  status: QuestionReviewStatus;
  notes?: string;
  reviewer?: string;
}

/**
 * Menerapkan keputusan kurator (approved/rejected) ke dalam berkas QuestionPack.
 */
export function applyReviewDecisions(
  pack: QuestionPack,
  decisions: Record<string, ReviewDecision>
): QuestionPack {
  const updatedQuestions: QuestionItem[] = pack.questions.map((q) => {
    const dec = decisions[q.id];
    if (dec) {
      return {
        ...q,
        review: {
          status: dec.status,
          notes: dec.notes || q.review.notes,
          reviewer: dec.reviewer || "Kurator Manusia",
          reviewedAt: new Date().toISOString()
        }
      };
    }
    return q;
  });

  const updatedPack: QuestionPack = {
    ...pack,
    updatedAt: new Date().toISOString(),
    stats: {
      totalQuestions: updatedQuestions.length,
      byType: {
        G1_KANJI_READING: updatedQuestions.filter((q) => q.type === "G1_KANJI_READING").length,
        G2_KANJI_WRITING: updatedQuestions.filter((q) => q.type === "G2_KANJI_WRITING").length,
        G3_PARTICLES: updatedQuestions.filter((q) => q.type === "G3_PARTICLES").length,
        G4_CONTEXT_VOCAB: updatedQuestions.filter((q) => q.type === "G4_CONTEXT_VOCAB").length
      },
      approvedCount: updatedQuestions.filter((q) => q.review.status === "approved").length,
      draftCount: updatedQuestions.filter((q) => q.review.status === "draft").length,
      rejectedCount: updatedQuestions.filter((q) => q.review.status === "rejected").length
    },
    questions: updatedQuestions
  };

  const validation = validateQuestionPack(updatedPack);
  if (!validation.valid) {
    throw new Error(`Validasi gagal setelah penerapan keputusan: ${validation.errors.join("; ")}`);
  }

  return updatedPack;
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith("reviewWorkflow.ts")) {
  const seedPackPath = path.join(rootDir, "src", "data", "seedQuestionPack.json");
  if (!fs.existsSync(seedPackPath)) {
    console.error("Berkas seedQuestionPack.json belum dibuat. Jalankan generator terlebih dahulu.");
    process.exit(1);
  }

  const raw = fs.readFileSync(seedPackPath, "utf-8");
  const pack = JSON.parse(raw) as QuestionPack;
  const stats = calculateReviewStats(pack);

  console.log("=== Alur Tinjauan & Statistik QuestionPack N5 ===");
  console.log(`- Paket: ${pack.id} (Versi: ${pack.version})`);
  console.log(`- Total Soal: ${stats.totalQuestions}`);
  console.log(`  * Approved: ${stats.approvedCount}`);
  console.log(`  * Draft: ${stats.draftCount}`);
  console.log(`  * Rejected: ${stats.rejectedCount}`);
  console.log(`  * Duplikat: ${stats.duplicateCount}`);
  console.log(`- Distribusi Tipe:`);
  console.log(`  * G1 (Membaca): ${stats.byType.G1_KANJI_READING || 0}`);
  console.log(`  * G2 (Penulisan): ${stats.byType.G2_KANJI_WRITING || 0}`);
  console.log(`  * G3 (Partikel): ${stats.byType.G3_PARTICLES || 0}`);
  console.log(`  * G4 (Konteks): ${stats.byType.G4_CONTEXT_VOCAB || 0}`);

  const csvPath = path.join(outputDir, "review_report.csv");
  const htmlPath = path.join(outputDir, "review_report.html");

  exportToCsv(pack, csvPath);
  exportToHtml(pack, htmlPath);

  console.log(`\nLaporan tinjauan berhasil diekspor:`);
  console.log(`- HTML: ${htmlPath}`);
  console.log(`- CSV:  ${csvPath}`);
}

