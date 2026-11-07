import { QuestionItem } from "../../lib/questionPack";

export type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type SectionCategory =
  | "vocab"
  | "grammar_reading"
  | "listening"
  | "vocab_grammar_reading";

export interface MockSection {
  id: number;
  mock_test_id: number;
  position: number;
  category: SectionCategory;
  duration_minutes: number;
  mock_questions_count: number;
  titleJa: string;
  titleId: string;
}

export interface MockTest {
  id: number;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  isOfficialPastPaper?: boolean;
  officialYear?: string;
  level: 1 | 2 | 3 | 4 | 5;
  levelLabel: JLPTLevel;
  difficulty: "easy" | "standard" | "hard";
  difficultyLabel: string;
  totalDurationMinutes: number;
  totalQuestions: number;
  passingScoreTotal?: number;
  passingScoreLangReading?: number;
  passingScoreListening?: number;
  mock_sections: MockSection[];
  isCustom?: boolean;
  packId?: string;
}

export interface SectionSessionResult {
  sectionId: number;
  mockTestId: number;
  completedAt: string;
  durationTakenSeconds: number;
  targetDurationSeconds: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  percentageScore: number;
  scaledScore?: number;
  maxScaledScore?: number;
  answers: Record<number, number>; // question index -> selected option index
  flaggedIndices?: number[];
  questions: QuestionItem[];
}

export interface TestSessionState {
  test: MockTest;
  section: MockSection;
  questions: QuestionItem[];
  mode: "taking" | "review";
}

