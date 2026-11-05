import React from "react";
import { MockTest, MockSection, SectionSessionResult } from "./types";
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

  test.mock_sections.forEach((sec) => {
    totalQuestionsCount += sec.mock_questions_count;
    const sessionKey = `${test.id}_${sec.id}`;
    const sess = sessions[sessionKey];
    if (sess) {
      totalAnswered += sess.answeredCount;
      totalCorrect += sess.correctCount;
      completedSectionsCount++;
    }
  });

  const hasAnyCompleted = completedSectionsCount > 0;
  const isAllCompleted = completedSectionsCount === test.mock_sections.length;
  const overallPercentage =
    totalQuestionsCount > 0
      ? Math.round((totalCorrect / totalQuestionsCount) * 100)
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-2xl bg-[#fffdf8] rounded-2xl border border-[#e2ded5] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#25231f]">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-[#e2ded5] bg-[#f8f5ef] shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#25231f] font-['Noto_Serif_JP',serif]">
              {test.title}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e8efec] text-[#233c35]">
                {test.levelLabel}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f5f1e8] border border-[#dedad1] text-[#686359]">
                {`${test.totalDurationMinutes}mnt`}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f1e6df] text-[#bf5b46]">
                {test.difficultyLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#77736b] hover:text-[#25231f] hover:bg-[#eee8dd] transition-colors"
            title="Tutup menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Total Score Banner */}
          <div className="p-4 rounded-xl border border-[#ece7de] bg-[#f9f7f2] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#a06658]">
                Total Nilai
              </span>
              <div className="text-2xl font-bold text-[#25231f] mt-0.5 font-['Noto_Serif_JP',serif]">
                {hasAnyCompleted ? `${totalCorrect} / ${totalQuestionsCount}` : `ー / ${test.totalQuestions}`}
              </div>
            </div>

            {hasAnyCompleted ? (
              <div className="text-right">
                <div
                  className={`text-2xl font-extrabold ${
                    overallPercentage >= 70 ? "text-[#263d36]" : "text-[#bf5b46]"
                  }`}
                >
                  {overallPercentage}%
                </div>
                <div className="text-xs font-semibold text-[#77736b]">
                  {overallPercentage >= 70 ? "お疲れ様！ (Bagus Sekali)" : "頑張ってください！ (Semangat)"}
                </div>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-xs text-[#88847b]">Belum ada bagian yang dikerjakan</span>
                <p className="text-xs font-semibold text-[#bf5b46]">頑張ってください！</p>
              </div>
            )}
          </div>

          {/* List of Sections */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#a06658]">
              Bagian Ujian ({test.mock_sections.length} Seksi)
            </h3>

            {test.mock_sections.map((sec, idx) => {
              const sessionKey = `${test.id}_${sec.id}`;
              const sess = sessions[sessionKey];
              const isCompleted = !!sess;

              return (
                <div
                  key={sec.id}
                  className="rounded-xl border border-[#e2ded5] bg-[#fffdfa] p-4 transition-all hover:border-[#d5cfc4] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#f2eee6] text-[#595750] text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-[#25231f] font-['Noto_Serif_JP',serif]">
                          {sec.titleJa}
                        </h4>
                      </div>
                      <p className="text-xs text-[#77736b] ml-7">
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
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#263d36] hover:bg-[#1d302a] text-white shadow-sm transition-colors"
                          >
                            Buka
                          </button>
                          <button
                            type="button"
                            onClick={() => onRetakeSection(test, sec)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#dcd7cc] text-[#494740] hover:border-[#d95b43] hover:text-[#d95b43] bg-white transition-colors"
                          >
                            Ulangi
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartSection(test, sec)}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#d95b43] hover:bg-[#c4543f] text-white shadow-[0_2px_8px_rgba(217,91,67,0.22)] transition-colors flex items-center gap-1.5"
                        >
                          <Icon name="play" size={14} />
                          <span>Mulai</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section Metrics Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[#ece7de] text-xs">
                    <div className="p-2 rounded-lg bg-[#f9f7f2]">
                      <span className="text-[10px] text-[#88847b] block">Waktu Dialokasikan</span>
                      <span className="font-semibold text-[#25231f]">
                        {`${sec.duration_minutes} Menit`}
                      </span>
                    </div>

                    {isCompleted ? (
                      <>
                        <div className="p-2 rounded-lg bg-[#f9f7f2]">
                          <span className="text-[10px] text-[#88847b] block">Waktumu</span>
                          <span
                            className={`font-semibold ${
                              sess.durationTakenSeconds <= sec.duration_minutes * 60
                                ? "text-[#263d36]"
                                : "text-[#bf5b46]"
                            }`}
                          >
                            {`${Math.floor(sess.durationTakenSeconds / 60)}m ${sess.durationTakenSeconds % 60}d`}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-[#f9f7f2] col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-[#88847b] block">Skor Bagian</span>
                          <span className="font-bold text-[#25231f]">
                            {`${sess.correctCount} / ${sec.mock_questions_count} (${sess.percentageScore}%)`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-2 rounded-lg bg-[#f9f7f2]">
                        <span className="text-[10px] text-[#88847b] block">Total Soal</span>
                        <span className="font-semibold text-[#25231f]">
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
        <div className="p-4 border-t border-[#e2ded5] flex justify-end bg-[#f8f5ef] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#eee8dd] hover:bg-[#e4ded0] text-[#33312c] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
