import React, { useState } from "react";
import { MockTest, MockSection, SectionSessionResult } from "./types";
import { QuestionItem } from "../../lib/questionPack";
import { renderQuestionPrompt } from "./furiganaHelper";
import ListeningSceneCard from "./ListeningSceneCard";
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
  const [playingQuestionId, setPlayingQuestionId] = useState<string | null>(null);

  const {
    questions,
    answers,
    correctCount,
    totalQuestions,
    percentageScore,
    durationTakenSeconds,
    targetDurationSeconds
  } = result;

  const scaledScore =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 60) : 0;
  const isPassed = percentageScore >= 50 || scaledScore >= 19;

  // Filter soal berdasarkan mode
  const filteredQuestions = questions
    .map((q, idx) => ({ q, idx, isCorrect: answers[idx] === q.correctIndex }))
    .filter(({ isCorrect }) => {
      if (filterMode === "incorrect") return !isCorrect;
      if (filterMode === "correct") return isCorrect;
      return true;
    });

  const incorrectCount = totalQuestions - correctCount;

  const handlePlayQuestionAudio = (q: QuestionItem) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (playingQuestionId === q.id) {
      setPlayingQuestionId(null);
      return;
    }

    setPlayingQuestionId(q.id);
    if (q.dialogueScript && q.dialogueScript.length > 0) {
      q.dialogueScript.forEach((turn, idx) => {
        const u = new SpeechSynthesisUtterance(turn.text);
        u.lang = "ja-JP";
        u.rate = 0.9;
        u.pitch = turn.speaker === "男" ? 0.85 : turn.speaker === "女" ? 1.18 : 1.0;
        if (idx === q.dialogueScript!.length - 1) {
          u.onend = () => setPlayingQuestionId(null);
          u.onerror = () => setPlayingQuestionId(null);
        }
        window.speechSynthesis.speak(u);
      });
      return;
    }

    const clean = q.prompt.replace(/<[^>]+>/g, "").replace(/（　★　）/g, "、");
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "ja-JP";
    u.rate = 0.9;
    u.onend = () => setPlayingQuestionId(null);
    u.onerror = () => setPlayingQuestionId(null);
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-[var(--tinta)]">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToOverview}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--tinta-2)] hover:text-[var(--ai)] transition-colors"
        >
          <Icon name="arrow-left" size={16} />
          <span>Kembali ke Ringkasan Tes</span>
        </button>

        <button
          type="button"
          onClick={() => setShowFurigana((v) => !v)}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
            showFurigana
              ? "bg-[var(--mizu-soft)] border-[var(--ai)]/40 text-[var(--ai)] font-semibold"
              : "bg-[var(--panel)] border-[var(--garis)] text-[var(--tinta-2)]"
          }`}
        >
          振仮名 {showFurigana ? "ON" : "OFF"}
        </button>
      </div>

      {/* Result Score Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[var(--panel)] border border-[var(--garis)] shadow-[0_4px_24px_rgba(16,33,58,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--garis)] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--mizu-soft)] text-[var(--kon)]">
                {test.levelLabel}
              </span>
              <span className="text-xs text-[var(--tinta-2)]">{section.titleId}</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--tinta)] [font-family:var(--font-serif)]">
              {test.title} • {section.titleJa}
            </h1>
            <p className="text-xs text-[var(--tinta-2)] mt-1">
              Hasil pengerjaan seksi ujian JLPT lengkap dengan kunci jawaban, penjelasan, dan naskah Choukai
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span
              className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold ${
                isPassed
                  ? "bg-emerald-50 text-[var(--ok)]"
                  : "bg-[rgba(185,60,34,0.1)] text-[var(--shu)]"
              }`}
            >
              {isPassed ? "お疲れ様！ Lulus Seksi" : "頑張ってください！ Perlu Latihan"}
            </span>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)]">
            <span className="text-[10px] font-bold text-[var(--ai)] block uppercase tracking-wider">
              Skor Pengerjaan & Skala JLPT
            </span>
            <div className="text-3xl font-extrabold text-[var(--tinta)] [font-family:var(--font-serif)] mt-1">
              {correctCount}{" "}
              <span className="text-base font-normal text-[var(--tinta-2)]">
                / {totalQuestions}
              </span>
            </div>
            <div className="text-xs font-semibold text-[var(--ai)] mt-1">
              {percentageScore}% Benar • Skala: {scaledScore} / 60点
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)]">
            <span className="text-[10px] font-bold text-[var(--ai)] block uppercase tracking-wider">
              Waktu yang Digunakan
            </span>
            <div className="text-3xl font-extrabold text-[var(--tinta)] [font-family:var(--font-serif)] mt-1">
              {Math.floor(durationTakenSeconds / 60)}m {durationTakenSeconds % 60}d
            </div>
            <div className="text-xs text-[var(--tinta-2)] mt-1">
              Batas resmi: {Math.floor(targetDurationSeconds / 60)} menit
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-[var(--ai)] block uppercase tracking-wider">
                Aksi Lanjutan
              </span>
              <p className="text-xs text-[var(--tinta-2)] mt-1">
                Ingin mencoba kembali untuk meningkatkan akurasi?
              </p>
            </div>
            <button
              type="button"
              onClick={onRetake}
              className="mt-3 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-[var(--kon)] hover:bg-[var(--ai-tua)] text-white shadow-sm transition-colors"
            >
              Ulangi Seksi Ini
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs for Questions */}
      <div className="flex items-center gap-2 border-b border-[var(--garis)] pb-3">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterMode === "all"
              ? "bg-[var(--kon)] text-white"
              : "text-[var(--tinta-2)] hover:bg-[var(--mizu-soft)]"
          }`}
        >
          Semua Pertanyaan ({totalQuestions})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("incorrect")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filterMode === "incorrect"
              ? "bg-[var(--shu)] text-white"
              : "text-[var(--tinta-2)] hover:bg-[rgba(185,60,34,0.08)] hover:text-[var(--shu)]"
          }`}
        >
          <span>Jawaban Salah</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[rgba(185,60,34,0.12)] text-[var(--shu)]">
            {incorrectCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("correct")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            filterMode === "correct"
              ? "bg-[var(--kon)] text-white"
              : "text-[var(--tinta-2)] hover:bg-[var(--mizu-soft)] hover:text-[var(--kon)]"
          }`}
        >
          <span>Jawaban Benar</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--mizu-soft)] text-[var(--kon)]">
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
                className={`p-6 rounded-2xl bg-[var(--panel)] border transition-all space-y-4 ${
                  isCorrect
                    ? "border-[var(--garis)] shadow-[0_2px_12px_rgba(16,33,58,0.03)]"
                    : "border-[var(--shu)]/35 bg-[rgba(185,60,34,0.03)] shadow-[0_2px_12px_rgba(185,60,34,0.04)]"
                }`}
              >
                {/* Header Card */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--tsuki)] text-[var(--tinta-2)] border border-[var(--garis)]">
                      Soal #{idx + 1}
                    </span>
                    {q.mondaiNumber && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--mizu-soft)] text-[var(--kon)]">
                        もんだい {q.mondaiNumber}
                      </span>
                    )}
                    <span className="text-[11px] text-[var(--tinta-2)]">
                      ID: <code>{q.id}</code>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePlayQuestionAudio(q)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                        playingQuestionId === q.id
                          ? "bg-[var(--ai)] text-white border-[var(--ai)]"
                          : "bg-[var(--panel)] border-[var(--garis)] text-[var(--tinta-2)] hover:border-[var(--ai)]"
                      }`}
                    >
                      <Icon name="volume" size={14} />
                      <span>{playingQuestionId === q.id ? "Berhenti" : "Audio"}</span>
                    </button>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isCorrect
                          ? "bg-emerald-50 text-[var(--ok)]"
                          : "bg-[rgba(185,60,34,0.1)] text-[var(--shu)]"
                      }`}
                    >
                      {isCorrect ? "✓ Benar" : "✗ Salah"}
                    </span>
                  </div>
                </div>

                {/* Wacana Membaca jika ada */}
                {q.passageHtml && (
                  <div
                    className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)]"
                    dangerouslySetInnerHTML={{ __html: q.passageHtml }}
                  />
                )}

                {/* Ilustrasi Choukai jika ada */}
                {q.sceneIllustration && (
                  <ListeningSceneCard sceneKey={q.sceneIllustration} />
                )}

                {/* Prompt Kalimat */}
                <div
                  className="[font-family:var(--font-serif)] text-lg font-medium text-[var(--tinta)] leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderQuestionPrompt(q, showFurigana)
                  }}
                />

                {/* Pilihan Opsi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isKey = optIdx === q.correctIndex;
                    const isUserChoice = optIdx === userPick;

                    let optClass = "border-[var(--garis)] bg-[var(--panel)] text-[var(--tinta-2)]";
                    if (isKey) {
                      optClass =
                        "border-[var(--ok)] bg-emerald-50 text-[var(--ok)] font-bold ring-1 ring-[var(--ok)]";
                    } else if (isUserChoice && !isCorrect) {
                      optClass =
                        "border-[var(--shu)] bg-[rgba(185,60,34,0.08)] text-[var(--shu)] line-through ring-1 ring-[var(--shu)]";
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optClass}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold opacity-70">{optIdx + 1}.</span>
                          <span className="[font-family:var(--font-serif)] text-sm">
                            {opt}
                          </span>
                        </div>
                        {isKey && (
                          <span className="text-[var(--ok)] text-xs font-bold">
                            ✓ Kunci
                          </span>
                        )}
                        {isUserChoice && !isKey && (
                          <span className="text-[var(--shu)] text-xs font-bold">
                            ✗ Pilihanmu
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Naskah Lengkap Choukai (聴解原文) jika ada */}
                {q.dialogueScript && q.dialogueScript.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--garis)] space-y-2 text-xs [font-family:var(--font-serif)]">
                    <div className="font-bold text-[var(--kon)]">
                      🎧 聴解スクリプト（Naskah Lengkap Mendengarkan）:
                    </div>
                    {q.dialogueScript.map((turn, tIdx) => (
                      <div key={tIdx} className="flex items-start gap-2">
                        <span className="font-bold text-[var(--ai)] shrink-0">
                          {turn.speaker}：
                        </span>
                        <span className="text-[var(--tinta)]">{turn.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pembahasan & Penjelasan Detail */}
                <div className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)] space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-bold text-[var(--tinta)]">
                      Target Uji:{" "}
                      <span className="[font-family:var(--font-serif)] text-[var(--ai)] font-semibold">
                        {q.explanation.targetWord}
                      </span>{" "}
                      【{q.explanation.reading}】
                    </div>
                    <span className="text-[10px] text-[var(--tinta-2)]">
                      {q.officialSourceLabel ||
                        `Tatoeba #${q.provenance.tatoeba_jpn_id} • JMdict ${q.provenance.jmdict_ent_seq}`}
                    </span>
                  </div>

                  <div className="text-[var(--tinta-2)]">
                    <strong>Arti / Makna:</strong> {q.explanation.meaningEn || "—"}
                  </div>

                  <div className="text-[var(--tinta-2)]">
                    <strong>Terjemahan Kalimat:</strong> “{q.explanation.translationId || "—"}”
                  </div>

                  {q.explanation.notes && (
                    <div className="text-[11px] text-[var(--tinta-2)] pt-1.5 border-t border-[var(--garis)] leading-relaxed">
                      💡 <strong>Pembahasan:</strong> {q.explanation.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-[var(--panel)] rounded-2xl border border-[var(--garis)]">
            <p className="text-[var(--tinta-2)]">
              Tidak ada pertanyaan dalam kategori filter ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
