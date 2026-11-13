import { MockTest, JLPTLevel, MockSection } from "./types";
import { QuestionPack, QuestionItem } from "../../lib/questionPack";
import {
  CATEGORY_LABELS,
  generateOfficial2018N5MockTest,
  generateOfficial2018N4MockTest,
  generateOfficial2022N3MockTest,
  generateOfficial2016N2MockTest,
  generateOfficial2023N1MockTest
} from "./mockTestCatalog";
import {
  get2018N5VocabQuestions,
  get2018N5GrammarReadingQuestions,
  get2018N5ListeningQuestions,
  getCuratedQuestionsForLevel
} from "./jlpt2018N5Data";
import {
  get2018N4VocabQuestions,
  get2018N4GrammarReadingQuestions,
  get2018N4ListeningQuestions
} from "./jlpt2018N4Data";
import {
  get2022N3VocabQuestions,
  get2022N3GrammarReadingQuestions,
  get2022N3ListeningQuestions
} from "./jlpt2022N3Data";
import {
  get2016N2VocabQuestions,
  get2016N2GrammarReadingQuestions,
  get2016N2ListeningQuestions
} from "./jlpt2016N2Data";
import {
  get2023N1VocabQuestions,
  get2023N1GrammarReadingQuestions,
  get2023N1ListeningQuestions
} from "./jlpt2023N1Data";

export {
  CATEGORY_LABELS,
  generateOfficial2018N5MockTest,
  generateOfficial2018N4MockTest,
  generateOfficial2022N3MockTest,
  generateOfficial2016N2MockTest,
  generateOfficial2023N1MockTest
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

/**
 * Mengambil soal lengkap untuk suatu kartu MockTest dan MockSection (mendukung penuh
 * 2018 N5 91 Soal, N5【模擬試験】1..5, serta Level N4, N3, N2, dan N1).
 */
export function getQuestionsForTestAndSection(
  test: MockTest,
  section: MockSection,
  pack: QuestionPack
): QuestionItem[] {
  // 0a. Jika tes adalah 2023年7月 日本語能力試験 N1 (96 soal lengkap dari PDF N1)
  if (test.id === 20231 || (test.isOfficialPastPaper && test.levelLabel === "N1")) {
    if (section.category === "vocab") return get2023N1VocabQuestions();
    if (section.category === "grammar_reading") return get2023N1GrammarReadingQuestions();
    if (section.category === "listening") return get2023N1ListeningQuestions();
  }

  // 0b. Jika tes adalah 2016年12月 日本語能力試験 N2 (106 soal lengkap dari PDF N2)
  if (test.id === 20162 || (test.isOfficialPastPaper && test.levelLabel === "N2")) {
    if (section.category === "vocab") return get2016N2VocabQuestions();
    if (section.category === "grammar_reading") return get2016N2GrammarReadingQuestions();
    if (section.category === "listening") return get2016N2ListeningQuestions();
  }

  // 0c. Jika tes adalah 2022年12月 日本語能力試験 N3 (101 soal lengkap dari PDF N3)
  if (test.id === 20223 || (test.isOfficialPastPaper && test.levelLabel === "N3")) {
    if (section.category === "vocab") return get2022N3VocabQuestions();
    if (section.category === "grammar_reading") return get2022N3GrammarReadingQuestions();
    if (section.category === "listening") return get2022N3ListeningQuestions();
  }

  // 0c. Jika tes adalah 2018年 日本語能力試験 N4 (98 soal lengkap dari PDF N4)
  if (test.id === 20184 || (test.isOfficialPastPaper && test.levelLabel === "N4")) {
    if (section.category === "vocab") return get2018N4VocabQuestions();
    if (section.category === "grammar_reading") return get2018N4GrammarReadingQuestions();
    if (section.category === "listening") return get2018N4ListeningQuestions();
  }

  const officialVocab = get2018N5VocabQuestions();
  const officialGr = get2018N5GrammarReadingQuestions();
  const officialListen = get2018N5ListeningQuestions();

  // 1. Jika tes adalah 2018年 日本語能力試験 N5 (91 soal lengkap dari PDF)
  if (test.id === 2018 || test.isOfficialPastPaper) {
    if (section.category === "vocab") return officialVocab;
    if (section.category === "grammar_reading") return officialGr;
    if (section.category === "listening") return officialListen;
  }

  // 2. Jika level N5 (N5【模擬試験】1..5):
  //    Tes #1 mengutamakan soal autentik 2018 N5; Tes #2..5 mengombinasikan soal 2018 N5 + bank QuestionPack
  if (test.levelLabel === "N5") {
    const offset = (test.id - 1) * 7;
    if (section.category === "vocab") {
      if (test.id === 1) {
        return officialVocab.slice(0, section.mock_questions_count);
      }
      const combined = [...officialVocab, ...getQuestionsForMockSection(pack, test.id, "vocab")];
      return sliceWithWrap(combined, offset, section.mock_questions_count);
    }
    if (section.category === "grammar_reading") {
      if (test.id === 1) {
        // Sertakan perwakilan dari setiap Mondai 1..6 (termasuk ★, Dokkai, dan Tabel Rute 高木大学)
        const m1 = officialGr.filter((q) => q.mondaiNumber === 1).slice(0, 6);
        const m2 = officialGr.filter((q) => q.mondaiNumber === 2); // 5 soal ★
        const m3 = officialGr.filter((q) => q.mondaiNumber === 3); // 5 soal wacana
        const m4 = officialGr.filter((q) => q.mondaiNumber === 4); // 3 soal短文
        const m5 = officialGr.filter((q) => q.mondaiNumber === 5); // 2 soal中文
        const m6 = officialGr.filter((q) => q.mondaiNumber === 6); // 1 soal情報検索
        return [...m1, ...m2, ...m3, ...m4, ...m5, ...m6].slice(0, section.mock_questions_count);
      }
      const combined = [...officialGr, ...getQuestionsForMockSection(pack, test.id, "grammar_reading")];
      return sliceWithWrap(combined, offset, section.mock_questions_count);
    }
    if (section.category === "listening") {
      if (test.id === 1) {
        return officialListen.slice(0, section.mock_questions_count);
      }
      return sliceWithWrap(officialListen, (test.id - 1) * 4, section.mock_questions_count);
    }
  }

  // 3. Level N4, N3, N2, N1
  return getCuratedQuestionsForLevel(
    test.levelLabel as Exclude<JLPTLevel, "N5">,
    section.category,
    section.mock_questions_count
  );
}


