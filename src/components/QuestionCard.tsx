import React, { useState } from "react";
import { QuestionItem } from "../lib/questionPack";
import { renderRubyHtml } from "../../tools/language/furigana";

export interface QuestionCardProps {
  question: QuestionItem;
  questionNumber: number;
  totalQuestions: number;
  showFurigana: boolean;
  onToggleFurigana?: () => void;
  onAnswer?: (isCorrect: boolean, selectedIndex: number) => void;
  userAnswer?: number | null;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  showFurigana,
  onToggleFurigana,
  onAnswer,
  userAnswer: controlledAnswer
}: QuestionCardProps) {
  const [internalAnswer, setInternalAnswer] = useState<number | null>(null);
  const selectedIndex = controlledAnswer !== undefined ? controlledAnswer : internalAnswer;
  const hasAnswered = selectedIndex !== null && selectedIndex !== undefined;

  const handleSelectOption = (idx: number) => {
    if (hasAnswered) return;
    setInternalAnswer(idx);
    const isCorrect = idx === question.correctIndex;
    onAnswer?.(isCorrect, idx);
  };

  // Render teks prompt dengan dukungan ruby & garis bawah
  const renderPrompt = () => {
    if (question.rubyNodes && question.rubyNodes.length > 0) {
      const htmlContent = renderRubyHtml(question.rubyNodes, showFurigana);
      const target = question.explanation.targetWord;
      const finalHtml =
        target && htmlContent.includes(target)
          ? htmlContent.replace(target, `<u class="underline decoration-2 decoration-amber-500 font-bold">${target}</u>`)
          : htmlContent;

      return (
        <div
          className="text-2xl font-medium tracking-wide leading-relaxed text-zinc-900 dark:text-zinc-100"
          dangerouslySetInnerHTML={{ __html: finalHtml }}
        />
      );
    }

    return (
      <div
        className="text-2xl font-medium tracking-wide leading-relaxed text-zinc-900 dark:text-zinc-100"
        dangerouslySetInnerHTML={{ __html: question.prompt }}
      />
    );
  };

  const typeLabels: Record<string, string> = {
    G1_KANJI_READING: "Membaca Kanji (G1)",
    G2_KANJI_WRITING: "Penulisan Kanji (G2)",
    G3_PARTICLES: "Partikel Tata Bahasa (G3)",
    G4_CONTEXT_VOCAB: "Kosakata Konteks (G4)"
  };

  const instructionLabels: Record<string, string> = {
    G1_KANJI_READING: "Pilihlah cara baca yang benar untuk kata yang bergaris bawah:",
    G2_KANJI_WRITING: "Pilihlah bentuk kanji yang tepat untuk kata yang bergaris bawah:",
    G3_PARTICLES: "Pilihlah partikel yang paling tepat untuk melengkapi bagian rumpang:",
    G4_CONTEXT_VOCAB: "Pilihlah kata yang paling tepat sesuai konteks kalimat:"
  };

  const optionLabels = ["1", "2", "3", "4"];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
            JLPT {question.level} • {typeLabels[question.type] || question.type}
          </span>
          {question.review.status === "draft" && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              Draf
            </span>
          )}
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {`Soal ${questionNumber} dari ${totalQuestions}`}
          </span>
        </div>

        {/* Sakelar Furigana */}
        {onToggleFurigana && (
          <button
            type="button"
            onClick={onToggleFurigana}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors border ${
              showFurigana
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent"
                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
            title="Sembunyikan atau tampilkan furigana pada kalimat"
          >
            <span>あ/A</span>
            <span>Furigana: {showFurigana ? "ON" : "OFF"}</span>
          </button>
        )}
      </div>

      {/* Konten Prompt Kalimat */}
      <div className="mb-8 p-4 bg-zinc-50/70 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider font-semibold">
          {instructionLabels[question.type] || "Pilihlah jawaban yang paling tepat:"}
        </div>
        {renderPrompt()}
      </div>

      {/* Pilihan Jawaban */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {question.options.map((opt, idx) => {
          let btnStyle =
            "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20";
          let badgeStyle = "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300";

          if (hasAnswered) {
            if (idx === question.correctIndex) {
              btnStyle =
                "border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30";
              badgeStyle = "bg-emerald-500 text-white";
            } else if (idx === selectedIndex) {
              btnStyle =
                "border-rose-500 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100";
              badgeStyle = "bg-rose-500 text-white";
            } else {
              btnStyle = "opacity-40 border-zinc-200 dark:border-zinc-800";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={hasAnswered}
              onClick={() => handleSelectOption(idx)}
              className={`flex items-center gap-3.5 p-4 rounded-xl border text-left font-medium transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
            >
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold shrink-0 ${badgeStyle}`}
              >
                {optionLabels[idx]}
              </span>
              <span className="text-lg tracking-wide">{opt}</span>
              {hasAnswered && idx === question.correctIndex && (
                <span className="ml-auto text-emerald-600 dark:text-emerald-400 text-sm font-bold">✓</span>
              )}
              {hasAnswered && idx === selectedIndex && idx !== question.correctIndex && (
                <span className="ml-auto text-rose-600 dark:text-rose-400 text-sm font-bold">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pembahasan & Penjelasan setelah menjawab */}
      {hasAnswered && (
        <div
          data-testid="explanation-panel"
          className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {selectedIndex === question.correctIndex ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ Jawaban Anda Benar!
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  ✗ Belum Tepat. Kunci jawaban: {question.options[question.correctIndex]}
                </span>
              )}
            </span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-xl text-sm space-y-2">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Kata Kunci: </span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {question.explanation.targetWord}
              </span>{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                【{question.explanation.reading}】
              </span>
              {question.explanation.meaningEn && (
                <span className="text-zinc-500 dark:text-zinc-400">
                  {" "}
                  — {question.explanation.meaningEn}
                </span>
              )}
            </div>

            {question.explanation.translationId && (
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                  Terjemahan Kalimat:{" "}
                </span>
                <span className="text-zinc-800 dark:text-zinc-200 italic">
                  “{question.explanation.translationId}”
                </span>
              </div>
            )}

            {/* Asal-usul data (Provenance) */}
            <div className="pt-2 mt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>{`JMdict ent_seq: ${question.provenance.jmdict_ent_seq}`}</span>
              <span>{`Tatoeba JPN #${question.provenance.tatoeba_jpn_id}`}</span>
              <span>{`Seed: ${question.provenance.seed}`}</span>
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Bergaya JLPT N5, bukan soal resmi.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
