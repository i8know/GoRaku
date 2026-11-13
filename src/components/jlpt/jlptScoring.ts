import type { JLPTLevel } from "./types";

/**
 * Standar skala nilai simulasi JLPT (Halaman 2 PDF):
 * - 言語知識（文字・語彙・文法）・読解: 0 ~ 120 poin (基準点 / Batas minimum seksi: 38 poin)
 * - 聴解: 0 ~ 60 poin (基準点 / Batas minimum seksi: 19 poin)
 * - 総合得点 (Total): 0 ~ 180 poin (合格点 / Batas lulus total: 90 poin untuk N5/N4/N2, 95 N3, 100 N1)
 */
export interface OfficialJLPTScoreSummary {
  langReadingScaled: number; // 0..120
  langReadingPassed: boolean; // >= 38
  listeningScaled: number; // 0..60
  listeningPassed: boolean; // >= 19
  totalScaled: number; // 0..180
  overallPassed: boolean; // total >= target && langReading >= 38 && listening >= 19
  passThresholdTotal: number;
  passThresholdLangReading: number;
  passThresholdListening: number;
}

export function calculateOfficialJLPTScore(
  vocabCorrect: number,
  vocabTotal: number,
  grCorrect: number,
  grTotal: number,
  listenCorrect: number,
  listenTotal: number,
  levelLabel: JLPTLevel = "N5"
): OfficialJLPTScoreSummary {
  const langTotalQ = Math.max(1, vocabTotal + grTotal);
  const langCorrectQ = vocabCorrect + grCorrect;
  const langReadingScaled = Math.round((langCorrectQ / langTotalQ) * 120);
  const listeningScaled =
    listenTotal > 0 ? Math.round((listenCorrect / listenTotal) * 60) : 0;
  const totalScaled = langReadingScaled + listeningScaled;

  const passThresholdTotal =
    levelLabel === "N1"
      ? 100
      : levelLabel === "N2"
      ? 90
      : levelLabel === "N3"
      ? 95
      : levelLabel === "N4"
      ? 90
      : 90;

  const passThresholdLangReading = 38;
  const passThresholdListening = 19;

  const langReadingPassed = langReadingScaled >= passThresholdLangReading;
  const listeningPassed = listeningScaled >= passThresholdListening;
  const overallPassed =
    totalScaled >= passThresholdTotal && langReadingPassed && listeningPassed;

  return {
    langReadingScaled,
    langReadingPassed,
    listeningScaled,
    listeningPassed,
    totalScaled,
    overallPassed,
    passThresholdTotal,
    passThresholdLangReading,
    passThresholdListening
  };
}

