import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MockTest, MockSection, SectionSessionResult } from "./types";
import { QuestionItem } from "../../lib/questionPack";
import { renderQuestionPrompt } from "./furiganaHelper";
import ListeningSceneCard from "./ListeningSceneCard";
import { Icon } from "../../ui";

interface TestSessionRunnerProps {
  test: MockTest;
  section: MockSection;
  questions: QuestionItem[];
  initialQuestionIndex?: number;
  onExit: () => void;
  onSubmit: (result: SectionSessionResult) => void;
}

export default function TestSessionRunner({
  test,
  section,
  questions,
  initialQuestionIndex = 0,
  onExit,
  onSubmit
}: TestSessionRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialQuestionIndex);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [flaggedSet, setFlaggedSet] = useState<Record<number, boolean>>({});
  const [showFurigana, setShowFurigana] = useState<boolean>(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(0.9);
  const [showScriptPreview, setShowScriptPreview] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);

  // Timer: waktu dalam detik
  const targetDurationSeconds = section.duration_minutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(targetDurationSeconds);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // Countdown timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Hentikan audio saat berpindah soal atau keluar
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  }, [currentIndex]);

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = questions.length - answeredCount;
  const isCurrentFlagged = !!flaggedSet[currentIndex];

  // Kelompokkan indeks soal pertama untuk setiap Mondai agar pengguna bisa melompat antar-Mondai
  const mondaiGroups = useMemo(() => {
    const map = new Map<number, { mondai: number; firstIndex: number; count: number }>();
    questions.forEach((q, idx) => {
      const m = q.mondaiNumber || 1;
      const existing = map.get(m);
      if (!existing) {
        map.set(m, { mondai: m, firstIndex: idx, count: 1 });
      } else {
        existing.count += 1;
      }
    });
    return Array.from(map.values());
  }, [questions]);

  // Pilih jawaban
  const handleSelectOption = useCallback(
    (optionIdx: number) => {
      if (!currentQ || optionIdx >= currentQ.options.length) return;
      setUserAnswers((prev) => ({
        ...prev,
        [currentIndex]: optionIdx
      }));
    },
    [currentIndex, currentQ]
  );

  // Tandai soal untuk ditinjau ulang (Flag)
  const handleToggleFlag = useCallback(() => {
    setFlaggedSet((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex]
    }));
  }, [currentIndex]);

  // Navigasi
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions.length]);

  // Hotkeys: tombol 1, 2, 3, 4, Panah Kiri, Panah Kanan, F (Flag)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "1") handleSelectOption(0);
      else if (e.key === "2") handleSelectOption(1);
      else if (e.key === "3") handleSelectOption(2);
      else if (e.key === "4") handleSelectOption(3);
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
      else if (e.key === "f" || e.key === "F") handleToggleFlag();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelectOption, handlePrev, handleNext, handleToggleFlag]);

  // Audio TTS untuk soal (mendukung multi-turn dialogueScript untuk Choukai)
  const handlePlayAudio = () => {
    if (!("speechSynthesis" in window) || !currentQ) return;
    window.speechSynthesis.cancel();

    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }

    if (currentQ.dialogueScript && currentQ.dialogueScript.length > 0) {
      setIsPlayingAudio(true);
      const turns = currentQ.dialogueScript;
      turns.forEach((turn, idx) => {
        const u = new SpeechSynthesisUtterance(turn.text);
        u.lang = "ja-JP";
        u.rate = audioSpeed;
        // Variasikan pitch sedikit antara pembicara 男 dan 女 agar dialog terasa hidup
        u.pitch = turn.speaker === "男" ? 0.85 : turn.speaker === "女" ? 1.18 : 1.0;
        if (idx === turns.length - 1) {
          u.onend = () => setIsPlayingAudio(false);
          u.onerror = () => setIsPlayingAudio(false);
        }
        window.speechSynthesis.speak(u);
      });
      return;
    }

    const cleanText = currentQ.prompt
      .replace(/<[^>]+>/g, "")
      .replace(/（　★　）/g, "、")
      .replace(/＿＿＿/g, "、");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ja-JP";
    utterance.rate = audioSpeed;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // Konfirmasi Keluar
  const handleRequestExit = () => {
    if (answeredCount > 0 && unansweredCount > 0) {
      setShowExitConfirm(true);
    } else {
      onExit();
    }
  };

  // Pengiriman Sesi Jawaban
  const handleFinalSubmit = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const percentageScore =
      questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    const maxScaledScore = section.category === "listening" ? 60 : 60;
    const scaledScore =
      questions.length > 0
        ? Math.round((correctCount / questions.length) * maxScaledScore)
        : 0;

    const flaggedIndices = Object.entries(flaggedSet)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));

    const result: SectionSessionResult = {
      sectionId: section.id,
      mockTestId: test.id,
      completedAt: new Date().toISOString(),
      durationTakenSeconds: secondsElapsed,
      targetDurationSeconds,
      totalQuestions: questions.length,
      answeredCount,
      correctCount,
      percentageScore,
      scaledScore,
      maxScaledScore,
      answers: userAnswers,
      flaggedIndices,
      questions
    };

    onSubmit(result);
  };

  const handleRequestSubmit = () => {
    if (unansweredCount > 0) {
      setShowSubmitConfirm(true);
    } else {
      handleFinalSubmit();
    }
  };

  // Format durasi MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isLowTime = secondsRemaining < 180 && secondsRemaining > 0;
  const isTimeUp = secondsRemaining === 0;

  // Header instruksi berdasarkan metadata autentik 2018 atau tipe soal JLPT
  const getMondaiHeader = (q: QuestionItem) => {
    if (q.mondaiLabelJa) return q.mondaiLabelJa;
    switch (q.type) {
      case "G1_KANJI_READING":
        return "問題 1：下線の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。";
      case "G2_KANJI_WRITING":
        return "問題 2：下線の言葉を漢字で書くとき、最もよいものを、1・2・3・4から一つ選びなさい。";
      case "G3_PARTICLES":
        return "問題 3：（　★　）に入る最もよいものを、1・2・3・4から一つ選びなさい。";
      case "G4_CONTEXT_VOCAB":
        return "問題 4：（　★　）に入る文の意味として最もよいものを、1・2・3・4から一つ選びなさい。";
      default:
        return "最もよいものを、1・2・3・4から一つ選びなさい。";
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#25231f] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#fffdfa] border-b border-[#e2ded5] px-4 py-3 shadow-[0_2px_12px_rgba(62,52,41,0.03)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Tombol Keluar */}
          <button
            type="button"
            onClick={handleRequestExit}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#595750] hover:text-[#d95b43] transition-colors"
          >
            <Icon name="arrow-left" size={16} />
            <span className="hidden sm:inline">Keluar ke Ringkasan Tes</span>
            <span className="sm:hidden">Keluar</span>
          </button>

          {/* Judul Seksi */}
          <div className="text-center">
            <h1 className="text-xs font-bold text-[#25231f] font-['Noto_Serif_JP',serif]">
              {test.title} • {section.titleJa}
            </h1>
            <span className="text-[10px] text-[#77736b]">{section.titleId}</span>
          </div>

          {/* Timer & Aksi Cepat */}
          <div className="flex items-center gap-2">
            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider transition-colors ${
                isTimeUp
                  ? "bg-[#fcedea] text-[#943828] border border-[#dc6048]"
                  : isLowTime
                  ? "bg-[#f8ede9] text-[#bf5b46] border border-[#d95b43]/40 animate-pulse"
                  : "bg-[#f4f0e6] text-[#686359] border border-[#dedad1]"
              }`}
              title="Sisa waktu ujian"
            >
              <Icon name="clock" size={14} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>

            {/* Toggle Furigana */}
            <button
              type="button"
              onClick={() => setShowFurigana((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showFurigana
                  ? "bg-[#f1e6df] border-[#d95b43]/40 text-[#bf5b46] font-semibold"
                  : "bg-[#fffdfa] border-[#dedad1] text-[#77736b]"
              }`}
              title="Tampilkan / Sembunyikan Furigana"
            >
              振仮名
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between">
        {questions.length > 0 && currentQ ? (
          <div className="space-y-5">
            {/* Mondai Quick-Jump Tabs (jika tersedia lebih dari 1 Mondai) */}
            {mondaiGroups.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {mondaiGroups.map((g) => {
                  const isActiveMondai = (currentQ.mondaiNumber || 1) === g.mondai;
                  return (
                    <button
                      key={g.mondai}
                      type="button"
                      onClick={() => setCurrentIndex(g.firstIndex)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                        isActiveMondai
                          ? "bg-[#263d36] text-white shadow-sm"
                          : "bg-[#fffdfa] border border-[#e2ded5] text-[#595750] hover:border-[#d95b43]"
                      }`}
                    >
                      <span>もんだい {g.mondai}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          isActiveMondai ? "bg-white/20 text-white" : "bg-[#f2eee6] text-[#77736b]"
                        }`}
                      >
                        {g.count}問
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mondai Instruction Banner */}
            <div className="p-4 rounded-2xl bg-[#fffdfa] border border-[#e2ded5] shadow-[0_2px_12px_rgba(62,52,41,0.03)] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#263d36] text-white">
                    Soal {currentIndex + 1} dari {questions.length}
                  </span>
                  {currentQ.isStarQuestion && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#f8ede9] text-[#bf5b46] border border-[#d95b43]/30">
                      ★ 並べ替え（Menyusun Kalimat Bintang）
                    </span>
                  )}
                  <span className="text-[11px] text-[#88847b]">
                    Sisa: {unansweredCount} belum dijawab
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#25231f] font-['Noto_Serif_JP',serif] leading-relaxed pt-1">
                  {getMondaiHeader(currentQ)}
                </p>
                {currentQ.mondaiLabelId && (
                  <p className="text-[11px] text-[#77736b]">{currentQ.mondaiLabelId}</p>
                )}
              </div>

              {/* Aksi Audio, Kecepatan, dan Tandai Soal */}
              <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                <button
                  type="button"
                  onClick={handleToggleFlag}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                    isCurrentFlagged
                      ? "bg-[#fff4d6] border-[#d49b27] text-[#8a5d07]"
                      : "bg-white border-[#dcd7cc] text-[#595750] hover:border-[#d49b27]"
                  }`}
                  title="Tandai soal untuk diperiksa kembali (Tombol F)"
                >
                  {isCurrentFlagged ? "⚑ Ditandai" : "⚐ Tandai"}
                </button>

                <button
                  type="button"
                  onClick={() => setAudioSpeed((s) => (s === 0.9 ? 0.75 : 0.9))}
                  className="px-2.5 py-1.5 rounded-xl border border-[#dcd7cc] bg-white text-[11px] font-bold text-[#595750] hover:border-[#d95b43]"
                  title="Ubah kecepatan suara TTS Jepang"
                >
                  {audioSpeed === 0.9 ? "1.0x" : "0.8x"}
                </button>

                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                    isPlayingAudio
                      ? "bg-[#d95b43] text-white border-[#d95b43]"
                      : "border-[#dcd7cc] text-[#25231f] hover:text-[#d95b43] hover:border-[#d95b43] bg-white"
                  }`}
                  title="Dengarkan percakapan / kalimat (Audio TTS)"
                >
                  <Icon name="volume" size={16} />
                  <span>{isPlayingAudio ? "Berhenti" : "Putar Audio"}</span>
                </button>
              </div>
            </div>

            {/* Kotak Wacana Membaca / Dokkai / Tabel Informasi (jika soal memiliki passageHtml) */}
            {currentQ.passageHtml && (
              <div className="p-5 sm:p-6 rounded-2xl bg-[#f9f6ee] border-2 border-[#dcd6c8] shadow-sm space-y-2">
                {currentQ.passageTitle && (
                  <div className="flex items-center justify-between border-b border-[#e2ded5] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#263d36]">
                      📖 読解テキスト • {currentQ.passageTitle}
                    </span>
                    <span className="text-[11px] text-[#77736b]">
                      Baca wacana di bawah sebelum menjawab
                    </span>
                  </div>
                )}
                <div
                  dangerouslySetInnerHTML={{ __html: currentQ.passageHtml }}
                />
              </div>
            )}

            {/* Ilustrasi Visual Choukai (Peta, Majalah, Kalender, Ruangan, Situasi ➡) */}
            {currentQ.sceneIllustration && (
              <ListeningSceneCard sceneKey={currentQ.sceneIllustration} />
            )}

            {/* Panel Naskah Percakapan Choukai (Opsional untuk Belajar / Simulasi Audio) */}
            {currentQ.dialogueScript && currentQ.dialogueScript.length > 0 && (
              <div className="rounded-2xl bg-[#fffdfa] border border-[#e2ded5] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#263d36]">
                      🎧 聴解オーディオ（Percakapan Multi-Suara Jepang）
                    </span>
                    <span className="text-[11px] text-[#77736b]">
                      Klik &ldquo;Putar Audio&rdquo; untuk mendengarkan dialog
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScriptPreview((v) => !v)}
                    className="text-xs font-semibold text-[#bf5b46] hover:underline"
                  >
                    {showScriptPreview ? "Sembunyikan Naskah" : "Lihat Naskah (スクリプト)"}
                  </button>
                </div>

                {showScriptPreview && (
                  <div className="p-3.5 rounded-xl bg-[#f9f7f2] border border-[#ece7de] space-y-2 text-xs sm:text-sm font-['Noto_Serif_JP',serif]">
                    {currentQ.dialogueScript.map((turn, tIdx) => (
                      <div key={tIdx} className="flex items-start gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                            turn.speaker === "男"
                              ? "bg-[#e8efec] text-[#233c35]"
                              : turn.speaker === "女"
                              ? "bg-[#f8ede9] text-[#bf5b46]"
                              : "bg-[#eee8dd] text-[#494740]"
                          }`}
                        >
                          {turn.speaker}
                        </span>
                        <span className="text-[#25231f] leading-relaxed">{turn.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prompt Kalimat */}
            <div className="p-7 sm:p-9 rounded-2xl bg-[#fffdf8] border border-[#e2ded5] shadow-[0_4px_24px_rgba(62,52,41,0.04)] text-center">
              <div
                className="font-['Noto_Serif_JP',serif] text-xl sm:text-2xl font-medium text-[#25231f] leading-loose"
                dangerouslySetInnerHTML={{
                  __html: renderQuestionPrompt(currentQ, showFurigana)
                }}
              />
            </div>

            {/* Pilihan Jawaban (Mendukung 3 Opsi untuk Choukai Mondai 3-4 maupun 4 Opsi Standar) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = userAnswers[currentIndex] === optIdx;
                const hotkeyLabel = optIdx + 1;

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    className={`group p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-[#f8ede9] border-[#d95b43] ring-2 ring-[#d95b43]/20 text-[#25231f]"
                        : "bg-[#fffdfa] border-[#e2ded5] hover:border-[#d95b43] hover:bg-[#fff9f7] text-[#25231f]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-[#d95b43] text-white"
                            : "bg-[#f2eee6] text-[#595750] group-hover:bg-[#eae4d8]"
                        }`}
                      >
                        {hotkeyLabel}
                      </span>
                      <span className="font-['Noto_Serif_JP',serif] text-base font-semibold">
                        {opt}
                      </span>
                    </div>

                    {/* Radio Indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "border-[#d95b43] bg-[#d95b43] text-white"
                          : "border-[#dedad1]"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <span className="text-[11px] text-[#88847b]">
                💡 Pintasan Keyboard: angka <code>1</code>–<code>{currentQ.options.length}</code> untuk memilih jawaban, <code>←</code> / <code>→</code> untuk berpindah soal, <code>F</code> untuk menandai soal.
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-[#fffdfa] rounded-2xl border border-[#e2ded5]">
            <p className="text-[#88847b]">Tidak ada pertanyaan pada seksi ini.</p>
          </div>
        )}

        {/* Bottom Navigation & Question Palette */}
        <div className="pt-8 space-y-4">
          {/* Question Palette / Pills */}
          <div className="p-3 rounded-2xl bg-[#fffdfa] border border-[#e2ded5] shadow-sm overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max justify-center">
              {questions.map((_, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = userAnswers[idx] !== undefined;
                const isFlagged = !!flaggedSet[idx];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                      isCurrent
                        ? "bg-[#d95b43] text-white ring-2 ring-[#d95b43]/40"
                        : isAnswered
                        ? "bg-[#263d36] text-white"
                        : "bg-[#f2eee6] text-[#686359] hover:bg-[#eae4d8]"
                    }`}
                    title={`Soal ${idx + 1}${isFlagged ? " (Ditandai)" : ""}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#d49b27] border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[#dcd7cc] bg-[#fffdfa] disabled:opacity-30 disabled:cursor-not-allowed text-[#494740] hover:border-[#d95b43] hover:text-[#d95b43] transition-colors"
            >
              ← Sebelumnya
            </button>

            <div className="flex items-center gap-2">
              {answeredCount > 0 && currentIndex < questions.length - 1 && (
                <button
                  type="button"
                  onClick={handleRequestSubmit}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-[#d95b43]/40 bg-[#f8ede9] hover:bg-[#f1e6df] text-[#bf5b46] transition-colors"
                >
                  Selesai & Nilai ({answeredCount}/{questions.length})
                </button>
              )}

              {currentIndex === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleRequestSubmit}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#d95b43] hover:bg-[#c4543f] text-white shadow-[0_2px_8px_rgba(217,91,67,0.25)] transition-colors flex items-center gap-1.5"
                >
                  <Icon name="check" size={16} />
                  <span>Kirim Jawaban</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#263d36] hover:bg-[#1d302a] text-white shadow-sm transition-colors"
                >
                  Berikutnya →
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Konfirmasi Keluar */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-sm bg-[#fffdf8] rounded-2xl border border-[#e2ded5] p-6 space-y-4 shadow-xl text-[#25231f]">
            <h3 className="font-bold text-base text-[#25231f] font-['Noto_Serif_JP',serif]">
              Akhiri sesi tanpa mengirim jawaban?
            </h3>
            <p className="text-xs text-[#595750] leading-relaxed">
              Masih ada <strong>{unansweredCount}</strong> pertanyaan yang belum dijawab. Jawaban Anda saat ini tidak akan disimpan jika Anda keluar sekarang.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-[#dcd7cc] bg-white text-[#494740] hover:bg-[#f8f5ef]"
              >
                Tidak, kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#dc6048] text-white hover:bg-[#b0432e]"
              >
                Ya, akhiri sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kirim Jawaban */}
      {showSubmitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-sm bg-[#fffdf8] rounded-2xl border border-[#e2ded5] p-6 space-y-4 shadow-xl text-[#25231f]">
            <h3 className="font-bold text-base text-[#25231f] font-['Noto_Serif_JP',serif]">
              Kirim jawabanmu sekarang?
            </h3>
            <p className="text-xs text-[#595750] leading-relaxed">
              Masih ada <strong>{unansweredCount}</strong> pertanyaan yang belum dijawab. Apakah Anda yakin ingin mengakhiri dan melihat nilai?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-[#dcd7cc] bg-white text-[#494740] hover:bg-[#f8f5ef]"
              >
                Tidak, periksa lagi
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleFinalSubmit();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#d95b43] text-white hover:bg-[#c4543f]"
              >
                Ya, kirim jawaban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
