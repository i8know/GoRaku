import React, { useState } from "react";
import { MockTest, MockSection, SectionSessionResult } from "./types";
import { renderQuestionPrompt } from "./furiganaHelper";
import { Icon } from "../../ui";

interface TestReviewViewProps {
  test: MockTest;
  section: MockSection;
  result: SectionSessionResult;
  onBackToOverview: () => void;
  onRetake: () => void;
}

export default function TestReviewView({
  test,
  section,
  result,
  onBackToOverview,
  onRetake
}: TestReviewViewProps) {
  const [filterMode, setFilterMode] = useState<"all" | "incorrect" | "correct">("all");
  const [showFurigana, setShowFurigana] = useState<boolean>(true);

  const { questions, answers, correctCount, totalQuestions, percentageScore, durationTakenSeconds, targetDurationSeconds } = result;

  const isPassed = percentageScore >= 60;

  // Filter soal berdasarkan mode
  const filteredQuestions = questions
    .map((q, idx) => ({ q, idx, isCorrect: answers[idx] === q.correctIndex }))
    .filter(({ isCorrect }) => {
      if (filterMode === "incorrect") return !isCorrect;
      if (filterMode === "correct") return isCorrect;
      return true;
    });

  const incorrectCount = totalQuestions - correctCount;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-[#25231f]">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToOverview}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#595750] hover:text-[#d95b43] transition-colors"
        >
          <Icon name="arrow-left" size={16} />
          <span>Kembali ke Ringkasan Tes</span>
        </button>

        <button
          type="button"
          onClick={() => setShowFurigana((v) => !v)}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
            showFurigana
              ? "bg-[#f1e6df] border-[#d95b43]/40 text-[#bf5b46] font-semibold"
              : "bg-[#fffdfa] border-[#dedad1] text-[#77736b]"
          }`}
        >
          振仮名 {showFurigana ? "ON" : "OFF"}
        </button>
      </div>

      {/* Result Score Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#fffdf8] border border-[#e2ded5] shadow-[0_4px_24px_rgba(62,52,41,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ece7de] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#e8efec] text-[#233c35]">
                {test.levelLabel}
              </span>
              <span className="text-xs text-[#88847b]">{section.titleId}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#25231f] font-['Noto_Serif_JP',serif]">
              {test.title} • {section.titleJa}
            </h1>
            <p className="text-xs text-[#77736b] mt-1">
              Hasil pengerjaan seksi ujian JLPT bergaya Bunpro
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span
              className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold ${
                isPassed
                  ? "bg-[#e8efec] text-[#233c35]"
                  : "bg-[#f1e6df] text-[#bf5b46]"
              }`}
            >
              {isPassed ? "お疲れ様！ Lulus Seksi" : "頑張ってください！ Perlu Latihan"}
            </span>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#f9f7f2] border border-[#ece7de]">
            <span className="text-[10px] font-bold text-[#a06658] block uppercase tracking-wider">
              Skor Pengerjaan
            </span>
            <div className="text-3xl font-extrabold text-[#25231f] font-['Noto_Serif_JP',serif] mt-1">
              {correctCount} <span className="text-base font-normal text-[#88847b]">/ {totalQuestions}</span>
            </div>
            <div className="text-xs font-semibold text-[#bf5b46] mt-1">
              {percentageScore}% Benar
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#f9f7f2] border border-[#ece7de]">
            <span className="text-[10px] font-bold text-[#a06658] block uppercase tracking-wider">
              Waktu yang Digunakan
            </span>
            <div className="text-3xl font-extrabold text-[#25231f] font-['Noto_Serif_JP',serif] mt-1">
              {Math.floor(durationTakenSeconds / 60)}m {durationTakenSeconds % 60}d
            </div>
            <div className="text-xs text-[#88847b] mt-1">
              Batas resmi: {Math.floor(targetDurationSeconds / 60)} menit
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#f9f7f2] border border-[#ece7de] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#a06658] block uppercase tracking-wider">
                Aksi Lanjutan
              </span>
              <p className="text-xs text-[#77736b] mt-1">
                Ingin mencoba kembali untuk meningkatkan akurasi?
              </p>
            </div>
            <button
              type="button"
              onClick={onRetake}
              className="mt-3 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-[#263d36] hover:bg-[#1d302a] text-white shadow-sm transition-colors"
            >
              Ulangi Seksi Ini
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs for Questions */}
      <div className="flex items-center gap-2 border-b border-[#ece7de] pb-3">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterMode === "all"
              ? "bg-[#263d36] text-white"
              : "text-[#595750] hover:bg-[#f2eee6]"
          }`}
        >
          Semua Pertanyaan ({totalQuestions})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("incorrect")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filterMode === "incorrect"
              ? "bg-[#dc6048] text-white"
              : "text-[#595750] hover:bg-[#fcedea] hover:text-[#dc6048]"
          }`}
        >
          <span>Jawaban Salah</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#fcedea] text-[#943828]">
            {incorrectCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("correct")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filterMode === "correct"
              ? "bg-[#263d36] text-white"
              : "text-[#595750] hover:bg-[#e8efec] hover:text-[#233c35]"
          }`}
        >
          <span>Jawaban Benar</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#e8efec] text-[#233c35]">
            {correctCount}
          </span>
        </button>
      </div>

      {/* Question Review Cards */}
      <div className="space-y-4">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map(({ q, idx, isCorrect }) => {
            const userPick = answers[idx];

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl bg-[#fffdfa] border transition-all ${
                  isCorrect
                    ? "border-[#e2ded5] shadow-[0_2px_12px_rgba(62,52,41,0.03)]"
                    : "border-[#f3d3cb] bg-[#fff9f8] shadow-[0_2px_12px_rgba(217,91,67,0.04)]"
                }`}
              >
                {/* Header Card */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#f2eee6] text-[#494740]">
                      Soal #{idx + 1}
                    </span>
                    <span className="text-[11px] text-[#88847b]">
                      ID: <code>{q.id}</code>
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                      isCorrect
                        ? "bg-[#e8efec] text-[#233c35]"
                        : "bg-[#fcedea] text-[#943828]"
                    }`}
                  >
                    {isCorrect ? "✓ Benar" : "✗ Salah"}
                  </span>
                </div>

                {/* Prompt Kalimat */}
                <div
                  className="font-['Noto_Serif_JP',serif] text-lg font-medium text-[#25231f] leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{
                    __html: renderQuestionPrompt(q, showFurigana)
                  }}
                />

                {/* Pilihan Opsi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {q.options.map((opt, optIdx) => {
                    const isKey = optIdx === q.correctIndex;
                    const isUserChoice = optIdx === userPick;

                    let optClass = "border-[#e2ded5] bg-[#fffdfa] text-[#494740]";
                    if (isKey) {
                      optClass = "border-[#263d36] bg-[#e8efec] text-[#1b3a2e] font-bold ring-1 ring-[#263d36]";
                    } else if (isUserChoice && !isCorrect) {
                      optClass = "border-[#dc6048] bg-[#fcedea] text-[#943828] line-through ring-1 ring-[#dc6048]";
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optClass}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold opacity-70">{optIdx + 1}.</span>
                          <span className="font-['Noto_Serif_JP',serif] text-sm">{opt}</span>
                        </div>
                        {isKey && <span className="text-[#233c35] text-xs font-bold">✓ Kunci</span>}
                        {isUserChoice && !isKey && <span className="text-[#943828] text-xs font-bold">✗ Pilihanmu</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Pembahasan & Penjelasan Detail */}
                <div className="p-4 rounded-xl bg-[#f9f7f2] border border-[#ece7de] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#25231f]">
                      Target Uji: <span className="font-['Noto_Serif_JP',serif] text-[#d95b43] font-semibold">{q.explanation.targetWord}</span> 【{q.explanation.reading}】
                    </div>
                    <span className="text-[10px] text-[#88847b]">
                      Tatoeba #{q.provenance.tatoeba_jpn_id} • JMdict {q.provenance.jmdict_ent_seq}
                    </span>
                  </div>

                  <div className="text-[#595750]">
                    <strong>Arti (JMdict):</strong> {q.explanation.meaningEn || "—"}
                  </div>

                  <div className="text-[#595750]">
                    <strong>Terjemahan (Tatoeba):</strong> “{q.explanation.translationId || "—"}”
                  </div>

                  {q.explanation.notes && (
                    <div className="text-[11px] text-[#77736b] italic pt-1 border-t border-[#ece7de]">
                      💡 {q.explanation.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-[#fffdfa] rounded-2xl border border-[#e2ded5]">
            <p className="text-[#88847b]">Tidak ada pertanyaan dalam kategori filter ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
