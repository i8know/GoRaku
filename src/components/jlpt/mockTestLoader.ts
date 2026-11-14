import type { QuestionItem } from "../../lib/questionPack";
import type { MockSection, MockTest } from "./types";

/**
 * Memuat soal JLPT untuk tes dan seksi tertentu secara dinamis per level
 * agar bundle awal /exam tidak mengunduh seluruh bank soal N5–N1 sekaligus.
 */
export async function loadQuestionsForTestAndSection(
  test: MockTest,
  section: MockSection
): Promise<QuestionItem[]> {
  if (test.id === 20231 || (test.isOfficialPastPaper && test.levelLabel === "N1")) {
    const mod = await import("./jlpt2023N1Data");
    if (section.category === "vocab") return mod.get2023N1VocabQuestions();
    if (section.category === "grammar_reading") return mod.get2023N1GrammarReadingQuestions();
    if (section.category === "listening") return mod.get2023N1ListeningQuestions();
  }

  if (test.id === 20162 || (test.isOfficialPastPaper && test.levelLabel === "N2")) {
    const mod = await import("./jlpt2016N2Data");
    if (section.category === "vocab") return mod.get2016N2VocabQuestions();
    if (section.category === "grammar_reading") return mod.get2016N2GrammarReadingQuestions();
    if (section.category === "listening") return mod.get2016N2ListeningQuestions();
  }

  if (test.id === 20223 || (test.isOfficialPastPaper && test.levelLabel === "N3")) {
    const mod = await import("./jlpt2022N3Data");
    if (section.category === "vocab") return mod.get2022N3VocabQuestions();
    if (section.category === "grammar_reading") return mod.get2022N3GrammarReadingQuestions();
    if (section.category === "listening") return mod.get2022N3ListeningQuestions();
  }

  if (test.id === 20184 || (test.isOfficialPastPaper && test.levelLabel === "N4")) {
    const mod = await import("./jlpt2018N4Data");
    if (section.category === "vocab") return mod.get2018N4VocabQuestions();
    if (section.category === "grammar_reading") return mod.get2018N4GrammarReadingQuestions();
    if (section.category === "listening") return mod.get2018N4ListeningQuestions();
  }

  if (test.id === 2018 || test.isOfficialPastPaper) {
    const mod = await import("./jlpt2018N5Data");
    if (section.category === "vocab") return mod.get2018N5VocabQuestions();
    if (section.category === "grammar_reading") return mod.get2018N5GrammarReadingQuestions();
    if (section.category === "listening") return mod.get2018N5ListeningQuestions();
  }

  const [{ getQuestionsForTestAndSection }, { ensureSeedPackLoaded }] = await Promise.all([
    import("./mockTestData"),
    import("../../lib/questionPackStorage"),
  ]);
  const pack = await ensureSeedPackLoaded();
  return getQuestionsForTestAndSection(test, section, pack);
}

