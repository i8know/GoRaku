import { MockTest, JLPTLevel, MockSection } from "./types";
import { QuestionPack, QuestionItem } from "../../lib/questionPack";

export const CATEGORY_LABELS: Record<string, { ja: string; id: string }> = {
  vocab: {
    ja: "言語知識（文字・語彙）",
    id: "Kosakata"
  },
  grammar_reading: {
    ja: "言語知識（文法）・読解",
    id: "Tata Bahasa & Membaca"
  },
  listening: {
    ja: "聴解",
    id: "Mendengarkan"
  },
  vocab_grammar_reading: {
    ja: "言語知識（文字・語彙・文法）・読解",
    id: "Kosakata, Tata Bahasa & Membaca"
  }
};

/**
 * Membangun 25 tes latihan standar resmi JLPT bergaya Bunpro
 * (masing-masing 5 tes untuk level N5 hingga N1).
 */
export function generateStandardMockTests(): MockTest[] {
  const tests: MockTest[] = [];
  let sectionIdCounter = 1;

  // N5 (Level 5) - 5 Tes
  for (let i = 1; i <= 5; i++) {
    const testId = i;
    const sections: MockSection[] = [
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 1,
        category: "vocab",
        duration_minutes: 20,
        mock_questions_count: 21,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 40,
        mock_questions_count: 22,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 3,
        category: "listening",
        duration_minutes: 30,
        mock_questions_count: 24,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ];

    tests.push({
      id: testId,
      title: `N5【模擬試験】${i}`,
      level: 5,
      levelLabel: "N5",
      difficulty: "standard",
      difficultyLabel: "Standar",
      totalDurationMinutes: 90,
      totalQuestions: 67,
      mock_sections: sections
    });
  }

  // N4 (Level 4) - 5 Tes
  for (let i = 1; i <= 5; i++) {
    const testId = 5 + i;
    const sections: MockSection[] = [
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 1,
        category: "vocab",
        duration_minutes: 25,
        mock_questions_count: 25,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 55,
        mock_questions_count: 28,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 3,
        category: "listening",
        duration_minutes: 35,
        mock_questions_count: 28,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ];

    tests.push({
      id: testId,
      title: `N4【模擬試験】${i}`,
      level: 4,
      levelLabel: "N4",
      difficulty: "standard",
      difficultyLabel: "Standar",
      totalDurationMinutes: 115,
      totalQuestions: 81,
      mock_sections: sections
    });
  }

  // N3 (Level 3) - 5 Tes
  for (let i = 1; i <= 5; i++) {
    const testId = 10 + i;
    const sections: MockSection[] = [
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 1,
        category: "vocab",
        duration_minutes: 30,
        mock_questions_count: 33,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 70,
        mock_questions_count: 39,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 3,
        category: "listening",
        duration_minutes: 40,
        mock_questions_count: 32,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ];

    tests.push({
      id: testId,
      title: `N3【模擬試験】${i}`,
      level: 3,
      levelLabel: "N3",
      difficulty: "standard",
      difficultyLabel: "Standar",
      totalDurationMinutes: 140,
      totalQuestions: 104,
      mock_sections: sections
    });
  }

  // N2 (Level 2) - 5 Tes
  for (let i = 1; i <= 5; i++) {
    const testId = 15 + i;
    const sections: MockSection[] = [
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 1,
        category: "vocab_grammar_reading",
        duration_minutes: 105,
        mock_questions_count: 75,
        titleJa: CATEGORY_LABELS.vocab_grammar_reading.ja,
        titleId: CATEGORY_LABELS.vocab_grammar_reading.id
      },
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 2,
        category: "listening",
        duration_minutes: 50,
        mock_questions_count: 31,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ];

    tests.push({
      id: testId,
      title: `N2【模擬試験】${i}`,
      level: 2,
      levelLabel: "N2",
      difficulty: "standard",
      difficultyLabel: "Standar",
      totalDurationMinutes: 155,
      totalQuestions: 106,
      mock_sections: sections
    });
  }

  // N1 (Level 1) - 5 Tes
  for (let i = 1; i <= 5; i++) {
    const testId = 20 + i;
    const sections: MockSection[] = [
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 1,
        category: "vocab_grammar_reading",
        duration_minutes: 110,
        mock_questions_count: 71,
        titleJa: CATEGORY_LABELS.vocab_grammar_reading.ja,
        titleId: CATEGORY_LABELS.vocab_grammar_reading.id
      },
      {
        id: sectionIdCounter++,
        mock_test_id: testId,
        position: 2,
        category: "listening",
        duration_minutes: 55,
        mock_questions_count: 34,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ];

    tests.push({
      id: testId,
      title: `N1【模擬試験】${i}`,
      level: 1,
      levelLabel: "N1",
      difficulty: "standard",
      difficultyLabel: "Standar",
      totalDurationMinutes: 165,
      totalQuestions: 105,
      mock_sections: sections
    });
  }

  return tests;
}

/**
 * Mengambil soal-soal relevan dari QuestionPack untuk bagian tertentu dari suatu tes N5.
 * Menggunakan pengelompokan deterministik agar setiap Tes 1..5 memiliki kombinasi soal yang unik.
 */
export function getQuestionsForMockSection(
  pack: QuestionPack,
  testIndex: number, // 1..5
  category: "vocab" | "grammar_reading" | "listening" | "vocab_grammar_reading"
): QuestionItem[] {
  const allQuestions = pack.questions;

  // Pisahkan bank soal per tipe
  const g1Questions = allQuestions.filter((q) => q.type === "G1_KANJI_READING");
  const g2Questions = allQuestions.filter((q) => q.type === "G2_KANJI_WRITING");
  const g3Questions = allQuestions.filter((q) => q.type === "G3_PARTICLES");
  const g4Questions = allQuestions.filter((q) => q.type === "G4_CONTEXT_VOCAB");

  // Offset per tes untuk menghasilkan variasi soal pada setiap tes 1..5
  const offset = (testIndex - 1) * 7;

  if (category === "vocab") {
    // Gabungan G1 (Membaca Kanji) dan G2 (Penulisan Kanji)
    // Target N5: 21 soal (11 G1 + 10 G2)
    const pickCountG1 = Math.min(11, g1Questions.length);
    const pickCountG2 = Math.min(10, g2Questions.length);

    const pickedG1 = sliceWithWrap(g1Questions, offset, pickCountG1);
    const pickedG2 = sliceWithWrap(g2Questions, offset, pickCountG2);

    return [...pickedG1, ...pickedG2];
  }

  if (category === "grammar_reading") {
    // Gabungan G3 (Partikel) dan G4 (Konteks Kosakata / Tata Bahasa Kalimat)
    // Target N5: 22 soal (10 G3 + 12 G4)
    const pickCountG3 = Math.min(10, g3Questions.length);
    const pickCountG4 = Math.min(12, g4Questions.length);

    const pickedG3 = sliceWithWrap(g3Questions, offset, pickCountG3);
    const pickedG4 = sliceWithWrap(g4Questions, offset, pickCountG4);

    return [...pickedG3, ...pickedG4];
  }

  if (category === "listening") {
    // Untuk tahap generator kalimat terbuka saat ini, kita gunakan kalimat-kalimat Tatoeba
    // dengan pemutaran Web Speech Audio sintetis (TTS Bahasa Jepang)
    const listeningPool = [...g1Questions, ...g4Questions];
    return sliceWithWrap(listeningPool, offset + 15, 20);
  }

  // Default: ambil campuran berurutan
  return sliceWithWrap(allQuestions, offset, 25);
}

function sliceWithWrap<T>(arr: T[], start: number, count: number): T[] {
  if (arr.length === 0) return [];
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (start + i) % arr.length;
    result.push(arr[idx]);
  }
  return result;
}

