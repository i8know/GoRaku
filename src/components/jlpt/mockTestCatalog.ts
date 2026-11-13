import type { MockTest } from "./types";

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

/** Membangun metadata simulasi JLPT N5 (91 soal, 90 menit). */
export function generateOfficial2018N5MockTest(): MockTest {
  return {
    id: 2018,
    title: "日本語能力試験 N5 模擬テスト (Simulasi 2018)",
    subtitle: "35 文字・語彙 • 32 文法・読解（★並べ替え・長文・高木大学ルート表） • 24 聴解（イラスト・会話音声付）",
    badgeLabel: "Simulasi N5 • 91問",
    isOfficialPastPaper: true,
    officialYear: "2018",
    level: 5,
    levelLabel: "N5",
    difficulty: "standard",
    difficultyLabel: "Standar",
    totalDurationMinutes: 90,
    totalQuestions: 91,
    passingScoreTotal: 90,
    passingScoreLangReading: 38,
    passingScoreListening: 19,
    mock_sections: [
      {
        id: 201801,
        mock_test_id: 2018,
        position: 1,
        category: "vocab",
        duration_minutes: 20,
        mock_questions_count: 35,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: 201802,
        mock_test_id: 2018,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 40,
        mock_questions_count: 32,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: 201803,
        mock_test_id: 2018,
        position: 3,
        category: "listening",
        duration_minutes: 30,
        mock_questions_count: 24,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ]
  };
}

/** Membangun metadata simulasi JLPT N4 (98 soal, 115 menit). */
export function generateOfficial2018N4MockTest(): MockTest {
  return {
    id: 20184,
    title: "日本語能力試験 N4 模擬テスト (Simulasi 2018)",
    subtitle: "35 文字・語彙（用法付） • 35 文法・読解（★並べ替え・水泳・東京駅・青野市予定表） • 28 聴解（会話原文付）",
    badgeLabel: "Simulasi N4 • 98問",
    isOfficialPastPaper: true,
    officialYear: "2018",
    level: 4,
    levelLabel: "N4",
    difficulty: "standard",
    difficultyLabel: "Standar",
    totalDurationMinutes: 115,
    totalQuestions: 98,
    passingScoreTotal: 90,
    passingScoreLangReading: 38,
    passingScoreListening: 19,
    mock_sections: [
      {
        id: 2018401,
        mock_test_id: 20184,
        position: 1,
        category: "vocab",
        duration_minutes: 30,
        mock_questions_count: 35,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: 2018402,
        mock_test_id: 20184,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 60,
        mock_questions_count: 35,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: 2018403,
        mock_test_id: 20184,
        position: 3,
        category: "listening",
        duration_minutes: 35,
        mock_questions_count: 28,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ]
  };
}

/** Membangun metadata simulasi JLPT N3 (101 soal, 140 menit). */
export function generateOfficial2022N3MockTest(): MockTest {
  return {
    id: 20223,
    title: "日本語能力試験 N3 模擬テスト (Simulasi 2022)",
    subtitle: "35 文字・語彙（30分） • 38 文法・読解（70分：京都旅行・短文4題・中文2題・長文・日帰りバス旅行案内） • 28 聴解（40分）",
    badgeLabel: "Simulasi N3 • 101問",
    isOfficialPastPaper: true,
    officialYear: "2022-12",
    level: 3,
    levelLabel: "N3",
    difficulty: "standard",
    difficultyLabel: "Standar",
    totalDurationMinutes: 140,
    totalQuestions: 101,
    passingScoreTotal: 95,
    passingScoreLangReading: 38,
    passingScoreListening: 19,
    mock_sections: [
      {
        id: 2022301,
        mock_test_id: 20223,
        position: 1,
        category: "vocab",
        duration_minutes: 30,
        mock_questions_count: 35,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: 2022302,
        mock_test_id: 20223,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 70,
        mock_questions_count: 38,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: 2022303,
        mock_test_id: 20223,
        position: 3,
        category: "listening",
        duration_minutes: 40,
        mock_questions_count: 28,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ]
  };
}

/** Membangun metadata simulasi JLPT N2 (106 soal, 155 menit). */
export function generateOfficial2016N2MockTest(): MockTest {
  return {
    id: 20162,
    title: "日本語能力試験 N2 模擬テスト (Simulasi 2016)",
    subtitle:
      "32 文字・語彙（語形成・用法付） • 43 文法・読解（トイレマーク・個性・話し言葉と書き言葉・公立図書館A/B・ミハマホテルビュッフェ） • 31 聴解（統合理解付）",
    badgeLabel: "Simulasi N2 • 106問",
    isOfficialPastPaper: true,
    officialYear: "2016年12月",
    level: 2,
    levelLabel: "N2",
    difficulty: "standard",
    difficultyLabel: "Standar",
    totalDurationMinutes: 155,
    totalQuestions: 106,
    passingScoreTotal: 90,
    passingScoreLangReading: 38,
    passingScoreListening: 19,
    mock_sections: [
      {
        id: 2016201,
        mock_test_id: 20162,
        position: 1,
        category: "vocab",
        duration_minutes: 30,
        mock_questions_count: 32,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: 2016202,
        mock_test_id: 20162,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 75,
        mock_questions_count: 43,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: 2016203,
        mock_test_id: 20162,
        position: 3,
        category: "listening",
        duration_minutes: 50,
        mock_questions_count: 31,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ]
  };
}

/** Membangun metadata simulasi JLPT N1 (96 soal, 165 menit). */
export function generateOfficial2023N1MockTest(): MockTest {
  return {
    id: 20231,
    title: "日本語能力試験 N1 模擬テスト (Simulasi 2023)",
    subtitle:
      "25 文字・語彙（用法付） • 41 文法・読解（一生の仕事・カタクリとアリ・ロボピーと心・メモA/B・教育論・木原市運動教室） • 30 聴解（統合理解付）",
    badgeLabel: "Simulasi N1 • 96問",
    isOfficialPastPaper: true,
    officialYear: "2023年7月",
    level: 1,
    levelLabel: "N1",
    difficulty: "standard",
    difficultyLabel: "Standar",
    totalDurationMinutes: 165,
    totalQuestions: 96,
    passingScoreTotal: 100,
    passingScoreLangReading: 38,
    passingScoreListening: 19,
    mock_sections: [
      {
        id: 2023101,
        mock_test_id: 20231,
        position: 1,
        category: "vocab",
        duration_minutes: 30,
        mock_questions_count: 25,
        titleJa: CATEGORY_LABELS.vocab.ja,
        titleId: CATEGORY_LABELS.vocab.id
      },
      {
        id: 2023102,
        mock_test_id: 20231,
        position: 2,
        category: "grammar_reading",
        duration_minutes: 80,
        mock_questions_count: 41,
        titleJa: CATEGORY_LABELS.grammar_reading.ja,
        titleId: CATEGORY_LABELS.grammar_reading.id
      },
      {
        id: 2023103,
        mock_test_id: 20231,
        position: 3,
        category: "listening",
        duration_minutes: 55,
        mock_questions_count: 30,
        titleJa: CATEGORY_LABELS.listening.ja,
        titleId: CATEGORY_LABELS.listening.id
      }
    ]
  };
}

