/**
 * Skema data & utilitas validasi QuestionPack untuk Latihan/Ujian JLPT N5 Orisinal.
 */

export type QuestionType =
  | "G1_KANJI_READING"
  | "G2_KANJI_WRITING"
  | "G3_PARTICLES"
  | "G4_CONTEXT_VOCAB";

export type QuestionReviewStatus = "draft" | "approved" | "rejected";

export interface QuestionReview {
  status: QuestionReviewStatus;
  notes?: string;
  reviewer?: string;
  reviewedAt?: string;
}

export interface QuestionProvenance {
  jmdict_ent_seq?: string;
  tatoeba_jpn_id?: number;
  tatoeba_ind_id?: number;
  generator: string;
  generator_version: string;
  seed: number;
}

export interface QuestionRubyNode {
  text: string;
  rt?: string;
}

export interface QuestionExplanation {
  targetWord?: string;
  reading?: string;
  meaningEn?: string;
  translationId?: string;
  grammarPoint?: string;
  notes?: string;
}

export interface QuestionDialogueTurn {
  speaker: "男" | "女" | "アナウンス" | "質問";
  text: string;
}

export interface QuestionItem {
  id: string;
  type: QuestionType;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  prompt: string;
  options: string[];
  correctIndex: number;
  rubyNodes?: QuestionRubyNode[];
  explanation: QuestionExplanation;
  provenance: QuestionProvenance;
  review: QuestionReview;
  /** Metadata tambahan untuk soal autentik JLPT (Mondai, Dokkai, Choukai, ★) */
  mondaiNumber?: number;
  mondaiLabelJa?: string;
  mondaiLabelId?: string;
  passageTitle?: string;
  passageHtml?: string;
  dialogueScript?: QuestionDialogueTurn[];
  sceneIllustration?: string;
  isStarQuestion?: boolean;
  starTokens?: string[];
  officialSourceLabel?: string;
}

export interface QuestionPackAttribution {
  sources: Array<{
    name: string;
    url: string;
    license: string;
    notes?: string;
  }>;
  disclaimer: string;
}

export interface QuestionPackStats {
  totalQuestions: number;
  byType: Record<QuestionType, number>;
  approvedCount: number;
  draftCount: number;
  rejectedCount: number;
}

export interface QuestionPack {
  id: string;
  version: string;
  title: string;
  description: string;
  level: "N5";
  language: "ja";
  createdAt: string;
  updatedAt: string;
  license: string;
  attribution: QuestionPackAttribution;
  stats: QuestionPackStats;
  questions: QuestionItem[];
}

/**
 * Validasi ketat terhadap sebuah soal QuestionItem.
 */
export function validateQuestionItem(q: QuestionItem): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!q.id || typeof q.id !== "string") {
    errors.push("Field 'id' wajib diisi berupa string unik.");
  }
  if (!["G1_KANJI_READING", "G2_KANJI_WRITING", "G3_PARTICLES", "G4_CONTEXT_VOCAB"].includes(q.type)) {
    errors.push(`Tipe soal tidak valid: '${q.type}'.`);
  }
  if (q.level !== "N5") {
    errors.push(`Level harus 'N5', diterima: '${q.level}'.`);
  }
  if (!q.prompt || typeof q.prompt !== "string") {
    errors.push("Field 'prompt' wajib berupa kalimat non-kosong.");
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    errors.push(`Options harus berjumlah tepat 4 opsi, ditemukan: ${q.options?.length ?? 0}.`);
  } else {
    const trimmed = q.options.map((o) => (typeof o === "string" ? o.trim() : ""));
    const unique = new Set(trimmed);
    if (unique.size !== 4) {
      errors.push("Terdapat opsi kembar/duplikat dalam daftar options.");
    }
    if (trimmed.some((o) => o.length === 0)) {
      errors.push("Terdapat opsi kosong dalam options.");
    }
  }

  if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) {
    errors.push(`correctIndex harus berupa indeks 0..3, diterima: ${q.correctIndex}.`);
  }

  if (!q.provenance || !q.provenance.generator || typeof q.provenance.seed !== "number") {
    errors.push("Provenance wajib memiliki 'generator' dan 'seed'.");
  }

  if (!q.review || !["draft", "approved", "rejected"].includes(q.review.status)) {
    errors.push(`Status review tidak valid: '${q.review?.status}'.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validasi menyeluruh terhadap QuestionPack.
 */
export function validateQuestionPack(pack: QuestionPack): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!pack.id) errors.push("QuestionPack.id tidak boleh kosong.");
  if (!pack.version) errors.push("QuestionPack.version tidak boleh kosong.");
  if (!pack.title) errors.push("QuestionPack.title tidak boleh kosong.");
  if (!pack.license) errors.push("QuestionPack.license wajib diisi (mis. CC BY-SA 4.0).");
  if (!pack.attribution || !Array.isArray(pack.attribution.sources)) {
    errors.push("QuestionPack.attribution.sources wajib berupa array sumber data.");
  }

  if (!Array.isArray(pack.questions)) {
    errors.push("QuestionPack.questions wajib berupa array soal.");
  } else {
    const seenIds = new Set<string>();
    pack.questions.forEach((q, idx) => {
      if (seenIds.has(q.id)) {
        errors.push(`ID soal duplikat pada indeks ${idx}: '${q.id}'.`);
      }
      seenIds.add(q.id);

      const res = validateQuestionItem(q);
      if (!res.valid) {
        errors.push(`Soal #${idx + 1} (${q.id || "no-id"}): ${res.errors.join("; ")}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

