import React from "react";
import { MockTest, MockSection, SectionSessionResult } from "./types";
import { calculateOfficialJLPTScore } from "./jlpt2018N5Data";
import { Icon } from "../../ui";

interface TestDetailsModalProps {
  isOpen: boolean;
  test: MockTest | null;
  onClose: () => void;
  onStartSection: (test: MockTest, section: MockSection) => void;
  onReviewSection: (test: MockTest, section: MockSection) => void;
  onRetakeSection: (test: MockTest, section: MockSection) => void;
  sessions: Record<string, SectionSessionResult>;
}

export default function TestDetailsModal({
  isOpen,
  test,
  onClose,
  onStartSection,
  onReviewSection,
  onRetakeSection,
  sessions
}: TestDetailsModalProps) {
  if (!isOpen || !test) return null;

  // Hitung total skor dari sesi yang telah selesai
  let totalAnswered = 0;
  let totalCorrect = 0;
  let totalQuestionsCount = 0;
  let completedSectionsCount = 0;

  let vocabCorrect = 0;
  let vocabTotal = 0;
  let grCorrect = 0;
  let grTotal = 0;
  let listenCorrect = 0;
  let listenTotal = 0;

  test.mock_sections.forEach((sec) => {
    totalQuestionsCount += sec.mock_questions_count;
    const sessionKey = `${test.id}_${sec.id}`;
    const sess = sessions[sessionKey];

    if (sec.category === "vocab") {
      vocabTotal += sec.mock_questions_count;
      if (sess) vocabCorrect += sess.correctCount;
    } else if (sec.category === "grammar_reading" || sec.category === "vocab_grammar_reading") {
      grTotal += sec.mock_questions_count;
      if (sess) grCorrect += sess.correctCount;
    } else if (sec.category === "listening") {
      listenTotal += sec.mock_questions_count;
      if (sess) listenCorrect += sess.correctCount;
    }

    if (sess) {
      totalAnswered += sess.answeredCount;
      totalCorrect += sess.correctCount;
      completedSectionsCount++;
    }
  });

  const hasAnyCompleted = completedSectionsCount > 0;
  const overallPercentage =
    totalQuestionsCount > 0
      ? Math.round((totalCorrect / totalQuestionsCount) * 100)
      : 0;

  const officialScore = calculateOfficialJLPTScore(
    vocabCorrect,
    vocabTotal,
    grCorrect,
    grTotal,
    listenCorrect,
    listenTotal,
    test.levelLabel
  );

  // Cari seksi pertama yang belum selesai untuk tombol mulai cepat
  const nextPendingSection =
    test.mock_sections.find((sec) => !sessions[`${test.id}_${sec.id}`]) ||
    test.mock_sections[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-2xl bg-[var(--panel)] rounded-2xl border border-[var(--garis)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[var(--tinta)]">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--garis)] bg-[var(--tsuki)] shrink-0">
          <div className="space-y-1">
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold text-[var(--tinta)] [font-family:var(--font-serif)]">
                {test.title}
              </h2>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--mizu-soft)] text-[var(--kon)]">
                  {test.levelLabel}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--panel)] border border-[var(--garis)] text-[var(--tinta-2)]">
                  {`${test.totalDurationMinutes}mnt`}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--mizu-soft)] text-[var(--ai)]">
                  {test.difficultyLabel}
                </span>
              </div>
            </div>
            {test.subtitle && (
              <p className="text-xs text-[var(--tinta-2)]">{test.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--tinta-2)] hover:text-[var(--tinta)] hover:bg-[var(--mizu-soft)] transition-colors"
            title="Tutup menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Total Score Banner + Official 0-180 Scale */}
          <div className="p-4 rounded-xl border border-[var(--garis)] bg-[var(--tsuki)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--ai)]">
                  Total Nilai
                </span>
                <div className="text-2xl font-bold text-[var(--tinta)] mt-0.5 [font-family:var(--font-serif)]">
                  {hasAnyCompleted
                    ? `${totalCorrect} / ${totalQuestionsCount}`
                    : `ー / ${test.totalQuestions}`}
                </div>
              </div>

              {hasAnyCompleted ? (
                <div className="text-right">
                  <div
                    className={`text-2xl font-extrabold ${
                      officialScore.overallPassed
                        ? "text-[var(--ok)]"
                        : "text-[var(--shu)]"
                    }`}
                  >
                    {officialScore.totalScaled} / 180点 ({overallPercentage}%)
                  </div>
                  <div className="text-xs font-semibold text-[var(--tinta-2)]">
                    {officialScore.overallPassed
                      ? "合格圏内！ お疲れ様！ (Mencapai Target Simulasi)"
                      : "頑張ってください！ (Belum Mencapai Ambang Lulus)"}
                  </div>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-xs text-[var(--tinta-2)]">
                    Belum ada bagian yang dikerjakan
                  </span>
                  <p className="text-xs font-semibold text-[var(--ai)]">
                    頑張ってください！
                  </p>
                </div>
              )}
            </div>

            {/* Tabel Standar Penilaian Resmi 0-180 (Sesuai Halaman 2 PDF 2018 N5) */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--garis)] text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--garis)]">
                <span className="text-[10px] text-[var(--tinta-2)] block">
                  言語知識・読解 (0〜120)
                </span>
                <span className="font-bold text-[var(--tinta)]">
                  {hasAnyCompleted ? `${officialScore.langReadingScaled} / 120点` : "基準点: 38点"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--garis)]">
                <span className="text-[10px] text-[var(--tinta-2)] block">
                  聴解 (0〜60)
                </span>
                <span className="font-bold text-[var(--tinta)]">
                  {hasAnyCompleted ? `${officialScore.listeningScaled} / 60点` : "基準点: 19点"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--panel)] border border-[var(--garis)]">
                <span className="text-[10px] text-[var(--tinta-2)] block">
                  総合得点 (0〜180)
                </span>
                <span className="font-bold text-[var(--ai)]">
                  合格点: {officialScore.passThresholdTotal}点
                </span>
              </div>
            </div>
          </div>

          {/* List of Sections */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--ai)]">
              Bagian Ujian ({test.mock_sections.length} Seksi)
            </h3>

            {test.mock_sections.map((sec, idx) => {
              const sessionKey = `${test.id}_${sec.id}`;
              const sess = sessions[sessionKey];
              const isCompleted = !!sess;

              return (
                <div
                  key={sec.id}
                  className="rounded-xl border border-[var(--garis)] bg-[var(--panel)] p-4 transition-all hover:border-[var(--ai)] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--mizu-soft)] text-[var(--kon)] text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-[var(--tinta)] [font-family:var(--font-serif)]">
                          {sec.titleJa}
                        </h4>
                      </div>
                      <p className="text-xs text-[var(--tinta-2)] ml-7">
                        {`${sec.titleId} • ${sec.mock_questions_count} Pertanyaan`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isCompleted ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onReviewSection(test, sec)}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--kon)] hover:bg-[var(--ai-tua)] text-white shadow-sm transition-colors"
                          >
                            Buka
                          </button>
                          <button
                            type="button"
                            onClick={() => onRetakeSection(test, sec)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--garis)] text-[var(--tinta-2)] hover:border-[var(--ai)] hover:text-[var(--ai)] bg-[var(--panel)] transition-colors"
                          >
                            Ulangi
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartSection(test, sec)}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[var(--shu)] hover:bg-[#9E321B] text-white shadow-[0_2px_8px_rgba(185,60,34,0.22)] transition-colors flex items-center gap-1.5"
                        >
                          <Icon name="play" size={14} />
                          <span>Mulai</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section Metrics Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--garis)] text-xs">
                    <div className="p-2 rounded-lg bg-[var(--tsuki)]">
                      <span className="text-[10px] text-[var(--tinta-2)] block">
                        Waktu Dialokasikan
                      </span>
                      <span className="font-semibold text-[var(--tinta)]">
                        {`${sec.duration_minutes} Menit`}
                      </span>
                    </div>

                    {isCompleted ? (
                      <>
                        <div className="p-2 rounded-lg bg-[var(--tsuki)]">
                          <span className="text-[10px] text-[var(--tinta-2)] block">
                            Waktumu
                          </span>
                          <span
                            className={`font-semibold ${
                              sess.durationTakenSeconds <=
                              sec.duration_minutes * 60
                                ? "text-[var(--ok)]"
                                : "text-[var(--shu)]"
                            }`}
                          >
                            {`${Math.floor(sess.durationTakenSeconds / 60)}m ${
                              sess.durationTakenSeconds % 60
                            }d`}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-[var(--tsuki)] col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-[var(--tinta-2)] block">
                            Skor Bagian
                          </span>
                          <span className="font-bold text-[var(--tinta)]">
                            {`${sess.correctCount} / ${sec.mock_questions_count} (${sess.percentageScore}%)`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-2 rounded-lg bg-[var(--tsuki)]">
                        <span className="text-[10px] text-[var(--tinta-2)] block">
                          Total Soal
                        </span>
                        <span className="font-semibold text-[var(--tinta)]">
                          {`${sec.mock_questions_count} Soal`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--garis)] flex items-center justify-between gap-3 bg-[var(--tsuki)] shrink-0">
          {nextPendingSection && (
            <button
              type="button"
              onClick={() => onStartSection(test, nextPendingSection)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--kon)] hover:bg-[var(--ai-tua)] text-white transition-colors flex items-center gap-1.5"
            >
              <Icon name="play" size={14} />
              <span>Kerjakan {nextPendingSection.titleId} Sekarang</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--mizu-soft)] hover:bg-[var(--garis)] text-[var(--tinta)] transition-colors ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
