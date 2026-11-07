import React, { useEffect, useState, useMemo } from "react";
import {
  MockTest,
  MockSection,
  SectionSessionResult
} from "../components/jlpt/types";
import {
  generateOfficial2018N5MockTest,
  generateOfficial2018N4MockTest,
  getQuestionsForTestAndSection
} from "../components/jlpt/mockTestData";
import { calculateOfficialJLPTScore } from "../components/jlpt/jlpt2018N5Data";
import AudioCheckModal from "../components/jlpt/AudioCheckModal";
import TestDetailsModal from "../components/jlpt/TestDetailsModal";
import TestSessionRunner from "../components/jlpt/TestSessionRunner";
import TestReviewView from "../components/jlpt/TestReviewView";
import { QuestionPack } from "../lib/questionPack";
import seedPackJson from "../data/seedQuestionPack.json";
import { Icon } from "../ui";

export interface ExamPageProps {
  notify?: (type: "success" | "error" | "info", msg: string) => void;
}

const STORAGE_KEY_SESSIONS = "jlpt_mock_sessions_v1";
const FALLBACK_SEED_PACK = seedPackJson as unknown as QuestionPack;

interface MondaiBreakdownItem {
  mondai: number;
  titleJa: string;
  titleId: string;
  count: number;
  rangeLabel: string;
  startIndex: number;
  badge?: string;
}

const SECTION_MONDAI_BREAKDOWN_BY_LEVEL: Record<
  "N5" | "N4",
  Record<string, MondaiBreakdownItem[]>
> = {
  N5: {
    vocab: [
      {
        mondai: 1,
        titleJa: "もんだい 1：漢字の読み",
        titleId: "Bacaan Kanji dalam Hiragana",
        count: 12,
        rangeLabel: "No. 1–12",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：表記",
        titleId: "Penulisan Kanji & Katakana",
        count: 8,
        rangeLabel: "No. 13–20",
        startIndex: 12
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：文脈規定",
        titleId: "Kosakata Kontekstual Kalimat",
        count: 10,
        rangeLabel: "No. 21–30",
        startIndex: 20
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：言い換え類義",
        titleId: "Sinonim & Parafrasa Kalimat",
        count: 5,
        rangeLabel: "No. 31–35",
        startIndex: 30
      }
    ],
    grammar_reading: [
      {
        mondai: 1,
        titleJa: "もんだい 1：文法形式の判断",
        titleId: "Partikel & Tata Bahasa Kalimat",
        count: 16,
        rangeLabel: "No. 1–16",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：★ 並べ替え",
        titleId: "Menyusun Kalimat Bintang ★",
        count: 5,
        rangeLabel: "No. 17–21",
        startIndex: 16,
        badge: "★ 並べ替え"
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：文章の文法",
        titleId: "Wacana Esai Nin-san & Mei-san",
        count: 5,
        rangeLabel: "No. 22–26",
        startIndex: 21,
        badge: "文章文法"
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：内容理解（短文）",
        titleId: "Bacaan Pendek, Pengumuman & Memo",
        count: 3,
        rangeLabel: "No. 27–29",
        startIndex: 26,
        badge: "短文読解"
      },
      {
        mondai: 5,
        titleJa: "もんだい 5：内容理解（中文）",
        titleId: "Karangan Chin Shun「まちがえました」",
        count: 2,
        rangeLabel: "No. 30–31",
        startIndex: 29,
        badge: "中文読解"
      },
      {
        mondai: 6,
        titleJa: "もんだい 6：情報検索",
        titleId: "Tabel 4 Rute Menuju Universitas Takagi",
        count: 1,
        rangeLabel: "No. 32",
        startIndex: 31,
        badge: "ルート表"
      }
    ],
    listening: [
      {
        mondai: 1,
        titleJa: "もんだい 1：課題理解",
        titleId: "Pemahaman Tugas + Ilustrasi Peta & Denah",
        count: 7,
        rangeLabel: "1番–7番",
        startIndex: 0,
        badge: "イラスト付"
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：ポイント理解",
        titleId: "Pemahaman Poin Kunci Percakapan",
        count: 6,
        rangeLabel: "1番–6番",
        startIndex: 7,
        badge: "会話聴解"
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：発話表現",
        titleId: "Ungkapan Situasional Tanda Panah (➡)",
        count: 5,
        rangeLabel: "1番–5番",
        startIndex: 13,
        badge: "3選択肢"
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：即時応答",
        titleId: "Respons Cepat Tanpa Ilustrasi",
        count: 6,
        rangeLabel: "1番–6番",
        startIndex: 18,
        badge: "3選択肢"
      }
    ]
  },
  N4: {
    vocab: [
      {
        mondai: 1,
        titleJa: "もんだい 1：漢字の読み",
        titleId: "Bacaan Kanji N4 dalam Hiragana",
        count: 9,
        rangeLabel: "No. 1–9",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：表記",
        titleId: "Penulisan Kanji N4",
        count: 6,
        rangeLabel: "No. 10–15",
        startIndex: 9
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：文脈規定",
        titleId: "Kosakata Kontekstual Kalimat",
        count: 10,
        rangeLabel: "No. 16–25",
        startIndex: 15
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：言い換え類義",
        titleId: "Sinonim & Parafrasa Kalimat",
        count: 5,
        rangeLabel: "No. 26–30",
        startIndex: 25
      },
      {
        mondai: 5,
        titleJa: "もんだい 5：用法",
        titleId: "Penggunaan Kata yang Tepat dalam Kalimat",
        count: 5,
        rangeLabel: "No. 31–35",
        startIndex: 30,
        badge: "用法"
      }
    ],
    grammar_reading: [
      {
        mondai: 1,
        titleJa: "もんだい 1：文法形式の判断",
        titleId: "Tata Bahasa, Partikel, Pasif & Kausatif N4",
        count: 15,
        rangeLabel: "No. 1–15",
        startIndex: 0
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：★ 並べ替え",
        titleId: "Menyusun Kalimat Bintang ★ N4",
        count: 5,
        rangeLabel: "No. 16–20",
        startIndex: 15,
        badge: "★ 並べ替え"
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：文章の文法",
        titleId: "Wacana Karangan Chin Meiki「水泳」",
        count: 5,
        rangeLabel: "No. 21–25",
        startIndex: 20,
        badge: "文章文法"
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：内容理解（短文）",
        titleId: "4 Bacaan Pendek (忘れ物・アイス・みそ工場・黒い消しゴム)",
        count: 4,
        rangeLabel: "No. 26–29",
        startIndex: 25,
        badge: "短文4題"
      },
      {
        mondai: 5,
        titleJa: "もんだい 5：内容理解（中文）",
        titleId: "Karangan Katy Wan「東京駅で会った人」",
        count: 4,
        rangeLabel: "No. 30–33",
        startIndex: 29,
        badge: "中文読解"
      },
      {
        mondai: 6,
        titleJa: "もんだい 6：情報検索",
        titleId: "Jadwal Acara 青野市ニュース「春を楽しもう」",
        count: 2,
        rangeLabel: "No. 34–35",
        startIndex: 33,
        badge: "予定表検索"
      }
    ],
    listening: [
      {
        mondai: 1,
        titleJa: "もんだい 1：課題理解",
        titleId: "Pemahaman Tugas & Instruksi Praktis",
        count: 8,
        rangeLabel: "1ばん–8ばん",
        startIndex: 0,
        badge: "課題理解"
      },
      {
        mondai: 2,
        titleJa: "もんだい 2：ポイント理解",
        titleId: "Pemahaman Poin Kunci & Alasan",
        count: 7,
        rangeLabel: "1ばん–7ばん",
        startIndex: 8,
        badge: "ポイント"
      },
      {
        mondai: 3,
        titleJa: "もんだい 3：発話表現",
        titleId: "Ungkapan Situasional Tanda Panah (➡)",
        count: 5,
        rangeLabel: "1ばん–5ばん",
        startIndex: 15,
        badge: "3選択肢"
      },
      {
        mondai: 4,
        titleJa: "もんだい 4：即時応答",
        titleId: "Respons Cepat Percakapan Sehari-hari",
        count: 8,
        rangeLabel: "1ばん–8ばん",
        startIndex: 20,
        badge: "3選択肢"
      }
    ]
  }
};

export default function ExamPage({ notify }: ExamPageProps) {
  // Level ujian resmi aktif (N5 atau N4)
  const [activeExamLevel, setActiveExamLevel] = useState<"N5" | "N4">("N5");

  // Status Modal
  const [audioModalOpen, setAudioModalOpen] = useState<boolean>(false);
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);

  // Status Sesi Ujian Aktif & Review
  const [activeSession, setActiveSession] = useState<{
    test: MockTest;
    section: MockSection;
    initialQuestionIndex?: number;
  } | null>(null);

  const [activeReview, setActiveReview] = useState<{
    test: MockTest;
    section: MockSection;
    result: SectionSessionResult;
  } | null>(null);

  // Riwayat Sesi Tersimpan (di-cache di localStorage)
  const [sessions, setSessions] = useState<Record<string, SectionSessionResult>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Simpan riwayat sesi ke localStorage saat berubah
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (err) {
      console.warn("Gagal menyimpan sesi ujian ke localStorage:", err);
    }
  }, [sessions]);

  // Ujian Resmi 2018年 日本語能力試験 N5 (91 Soal) & N4 (98 Soal)
  const official2018N5Test = useMemo(() => generateOfficial2018N5MockTest(), []);
  const official2018N4Test = useMemo(() => generateOfficial2018N4MockTest(), []);

  const currentExamTest =
    activeExamLevel === "N4" ? official2018N4Test : official2018N5Test;

  // Handler Memulai Seksi (atau langsung melompat ke Mondai tertentu)
  const handleStartSection = (
    test: MockTest,
    section: MockSection,
    initialQuestionIndex: number = 0
  ) => {
    const questions = getQuestionsForTestAndSection(
      test,
      section,
      FALLBACK_SEED_PACK
    );

    if (questions.length === 0) {
      notify?.("error", "Tidak ada soal yang tersedia untuk bagian ini.");
      return;
    }

    setSelectedTest(null);
    setActiveReview(null);
    setActiveSession({
      test,
      section,
      initialQuestionIndex
    });
  };

  // Handler Tinjau Seksi yang Selesai
  const handleReviewSection = (test: MockTest, section: MockSection) => {
    const sessionKey = `${test.id}_${section.id}`;
    const result = sessions[sessionKey];
    if (!result) return;

    setSelectedTest(null);
    setActiveSession(null);
    setActiveReview({
      test,
      section,
      result
    });
  };

  // Handler Ulangi Seksi
  const handleRetakeSection = (test: MockTest, section: MockSection) => {
    const sessionKey = `${test.id}_${section.id}`;
    setSessions((prev) => {
      const next = { ...prev };
      delete next[sessionKey];
      return next;
    });

    handleStartSection(test, section, 0);
  };

  // Handler Reset Skor untuk Level Aktif
  const handleResetCurrentTestSessions = () => {
    setSessions((prev) => {
      const next = { ...prev };
      currentExamTest.mock_sections.forEach((sec) => {
        delete next[`${currentExamTest.id}_${sec.id}`];
      });
      return next;
    });
    notify?.("info", `Riwayat skor ujian ${activeExamLevel} telah direset.`);
  };

  // Handler Pengiriman Sesi Jawaban
  const handleSubmitSession = (result: SectionSessionResult) => {
    const sessionKey = `${result.mockTestId}_${result.sectionId}`;
    setSessions((prev) => ({
      ...prev,
      [sessionKey]: result
    }));

    notify?.(
      "success",
      `Bagian selesai! Skor Anda: ${result.correctCount}/${result.totalQuestions} (${result.percentageScore}%)`
    );

    if (activeSession) {
      setActiveReview({
        test: activeSession.test,
        section: activeSession.section,
        result
      });
      setActiveSession(null);
    }
  };

  // Hitung ringkasan skor skala resmi 0-180 untuk ujian yang sedang aktif (N5 atau N4)
  const currentExamSummary = useMemo(() => {
    const sec0 = currentExamTest.mock_sections[0];
    const sec1 = currentExamTest.mock_sections[1];
    const sec2 = currentExamTest.mock_sections[2];

    const sVocab = sessions[`${currentExamTest.id}_${sec0.id}`];
    const sGr = sessions[`${currentExamTest.id}_${sec1.id}`];
    const sListen = sessions[`${currentExamTest.id}_${sec2.id}`];

    const vocabCorrect = sVocab?.correctCount ?? 0;
    const grCorrect = sGr?.correctCount ?? 0;
    const listenCorrect = sListen?.correctCount ?? 0;
    const completedCount = [sVocab, sGr, sListen].filter(Boolean).length;
    const hasTakenAny = completedCount > 0;
    const rawCorrect = vocabCorrect + grCorrect + listenCorrect;

    const scaled = calculateOfficialJLPTScore(
      vocabCorrect,
      sec0.mock_questions_count,
      grCorrect,
      sec1.mock_questions_count,
      listenCorrect,
      sec2.mock_questions_count,
      currentExamTest.levelLabel
    );

    return {
      hasTakenAny,
      completedCount,
      rawCorrect,
      vocabCorrect,
      vocabTotal: sec0.mock_questions_count,
      grCorrect,
      grTotal: sec1.mock_questions_count,
      listenCorrect,
      listenTotal: sec2.mock_questions_count,
      scaled
    };
  }, [sessions, currentExamTest]);

  // Jika sedang berada di sesi ujian aktif
  if (activeSession) {
    const questions = getQuestionsForTestAndSection(
      activeSession.test,
      activeSession.section,
      FALLBACK_SEED_PACK
    );

    return (
      <TestSessionRunner
        test={activeSession.test}
        section={activeSession.section}
        questions={questions}
        initialQuestionIndex={activeSession.initialQuestionIndex}
        onExit={() => setActiveSession(null)}
        onSubmit={handleSubmitSession}
      />
    );
  }

  // Jika sedang berada di mode review jawaban
  if (activeReview) {
    return (
      <TestReviewView
        test={activeReview.test}
        section={activeReview.section}
        result={activeReview.result}
        onBackToOverview={() => setActiveReview(null)}
        onRetake={() => handleRetakeSection(activeReview.test, activeReview.section)}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-[#25231f]">
      {/* 1. Header Utama Ujian JLPT Format Baru */}
      <header className="rounded-2xl border border-[#e2ded5] bg-[#fffdfa] p-6 sm:p-7 shadow-[0_4px_24px_rgba(62,52,41,0.04)] relative overflow-hidden">
        <span
          className="absolute right-6 -bottom-6 font-['Noto_Serif_JP',serif] text-[120px] font-bold text-[#f2eee6] pointer-events-none select-none leading-none opacity-60"
          aria-hidden="true"
        >
          験
        </span>

        <div className="relative z-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#263d36] text-white">
                {`2018年 日本語能力試験 ${currentExamTest.levelLabel}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f1e6df] text-[#bf5b46]">
                {`全${currentExamTest.totalQuestions}問 • ${currentExamTest.totalDurationMinutes}分 • 180点満点`}
              </span>
              <span className="text-xs text-[#686359]">
                Format Ujian Asli (文字・語彙 / 文法・読解 / 聴解)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#25231f] font-['Noto_Serif_JP',serif]">
              Ujian Kemampuan Bahasa Jepang (JLPT)
            </h1>
            <p className="text-xs sm:text-sm text-[#595750]">
              {currentExamTest.subtitle}
            </p>
          </div>

          {/* Tombol Header: Cek Audio & Lembar Ringkasan */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAudioModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#dcd7cc] bg-[#fffdfa] hover:border-[#d95b43] hover:text-[#d95b43] text-[#3b3730] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Icon name="volume" size={16} />
              <span>Cek Audio</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedTest(currentExamTest)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#263d36] hover:bg-[#1d302a] text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Icon name="book" size={16} />
              <span>Lembar Skor & Detail</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Pemilih Level Ujian Resmi (N5 & N4 2018年 公式過去問) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            lvl: "N5" as const,
            test: official2018N5Test,
            desc: "35 文字・語彙 • 32 文法・読解（高木大学ルート表） • 24 聴解"
          },
          {
            lvl: "N4" as const,
            test: official2018N4Test,
            desc: "35 文字・語彙（用法付） • 35 文法・読解（水泳・東京駅・青野市予定表） • 28 聴解"
          }
        ].map(({ lvl, test, desc }) => {
          const isSelected = activeExamLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => setActiveExamLevel(lvl)}
              className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-4 ${
                isSelected
                  ? "bg-[#263d36] text-white border-[#263d36] shadow-[0_8px_24px_rgba(38,61,54,0.2)]"
                  : "bg-[#fffdfa] text-[#25231f] border-[#e2ded5] hover:border-[#d95b43]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      isSelected
                        ? "bg-white text-[#263d36]"
                        : "bg-[#263d36] text-white"
                    }`}
                  >
                    {`JLPT ${lvl}`}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? "text-[#d8e8e1]" : "text-[#bf5b46]"
                    }`}
                  >
                    {`2018年 公式過去問 • 全${test.totalQuestions}問 (${test.totalDurationMinutes}分)`}
                  </span>
                </div>
                <div className="font-bold text-base font-['Noto_Serif_JP',serif]">
                  {test.title}
                </div>
                <p
                  className={`text-xs ${
                    isSelected ? "text-[#e5eee9]/90" : "text-[#686359]"
                  }`}
                >
                  {desc}
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "border-white bg-white/20" : "border-[#dcd7cc]"
                }`}
              >
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Papan Skor Skala Resmi 0–180 & Standar Kelulusan */}
      <section className="rounded-2xl border border-[#dcd7cc] bg-[#fffdf8] p-6 shadow-[0_4px_20px_rgba(62,52,41,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ece7de] pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a06658]">
              得点範囲・合格点（Standar Penilaian Resmi JLPT {currentExamTest.levelLabel}）
            </span>
            <h2 className="text-lg font-bold text-[#25231f] font-['Noto_Serif_JP',serif] mt-0.5">
              Simulasi Nilai Skala 0〜180 &amp; Ambang Batas Seksi (基準点)
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            {currentExamSummary.hasTakenAny && (
              <button
                type="button"
                onClick={handleResetCurrentTestSessions}
                className="px-3 py-1.5 rounded-lg border border-[#dcd7cc] bg-white text-xs font-medium text-[#595750] hover:border-[#dc6048] hover:text-[#dc6048] transition-colors"
              >
                Reset Skor
              </button>
            )}
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-bold ${
                !currentExamSummary.hasTakenAny
                  ? "bg-[#f2eee6] text-[#595750]"
                  : currentExamSummary.scaled.overallPassed
                  ? "bg-[#e8efec] text-[#233c35]"
                  : "bg-[#fcedea] text-[#943828]"
              }`}
            >
              {!currentExamSummary.hasTakenAny
                ? "未受験 • Siap Mulai Ujian"
                : currentExamSummary.scaled.overallPassed
                ? "合格圏内 • Lulus Standar JLPT"
                : "不合格圏 • Perlu Mencapai 90点 & 基準点"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kategori 1: Bahasa & Membaca (0-120) */}
          <div className="p-4 rounded-xl bg-[#f9f7f2] border border-[#ece7de] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#25231f] font-['Noto_Serif_JP',serif]">
                言語知識（文字・語彙・文法）・読解
              </span>
              <span className="px-2 py-0.5 rounded bg-[#e8efec] text-[#233c35] text-[10px] font-bold">
                基準点: 38点
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#25231f] font-['Noto_Serif_JP',serif]">
              {currentExamSummary.hasTakenAny
                ? `${currentExamSummary.scaled.langReadingScaled} / 120点`
                : "ー / 120点"}
            </div>
            <p className="text-[11px] text-[#77736b]">
              Gabungan Bagian 1 ({currentExamSummary.vocabTotal} soal) + Bagian 2 ({currentExamSummary.grTotal} soal) ={" "}
              <strong>
                {currentExamSummary.vocabCorrect + currentExamSummary.grCorrect} /{" "}
                {currentExamSummary.vocabTotal + currentExamSummary.grTotal}
              </strong>{" "}
              benar
            </p>
          </div>

          {/* Kategori 2: Mendengarkan (0-60) */}
          <div className="p-4 rounded-xl bg-[#f9f7f2] border border-[#ece7de] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#25231f] font-['Noto_Serif_JP',serif]">
                聴解（リスニング）
              </span>
              <span className="px-2 py-0.5 rounded bg-[#e8efec] text-[#233c35] text-[10px] font-bold">
                基準点: 19点
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#25231f] font-['Noto_Serif_JP',serif]">
              {currentExamSummary.hasTakenAny
                ? `${currentExamSummary.scaled.listeningScaled} / 60点`
                : "ー / 60点"}
            </div>
            <p className="text-[11px] text-[#77736b]">
              Bagian 3 Mendengarkan ({currentExamSummary.listenTotal} soal) ={" "}
              <strong>
                {currentExamSummary.listenCorrect} / {currentExamSummary.listenTotal}
              </strong>{" "}
              benar
            </p>
          </div>

          {/* Kategori 3: Skor Total (0-180) */}
          <div className="p-4 rounded-xl bg-[#fffdfa] border-2 border-[#263d36] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#263d36] font-['Noto_Serif_JP',serif]">
                総合得点（Total Nilai Skala）
              </span>
              <span className="px-2 py-0.5 rounded bg-[#f8ede9] text-[#bf5b46] text-[10px] font-bold">
                合格点: 90点
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#263d36] font-['Noto_Serif_JP',serif]">
              {currentExamSummary.hasTakenAny
                ? `${currentExamSummary.scaled.totalScaled} / 180点`
                : "ー / 180点"}
            </div>
            <p className="text-[11px] text-[#595750]">
              Total jawaban benar:{" "}
              <strong>
                {currentExamSummary.rawCorrect} / {currentExamTest.totalQuestions} soal
              </strong>{" "}
              ({currentExamSummary.completedCount}/3 bagian selesai)
            </p>
          </div>
        </div>
      </section>

      {/* 4. Ketiga Buku Soal Ujian (問題冊子 1〜3) beserta Daftar Mondai Interaktif */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#25231f] font-['Noto_Serif_JP',serif]">
              Bagian Ujian &amp; Rincian Mondai {currentExamTest.levelLabel} (全3部 • {currentExamTest.totalQuestions}問)
            </h2>
            <p className="text-xs text-[#686359]">
              Pilih <strong>Mulai Bagian</strong> untuk simulasi penuh per seksi, atau klik salah satu baris <strong>もんだい</strong> untuk langsung berlatih pada nomor soal tersebut.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {currentExamTest.mock_sections.map((sec, idx) => {
            const sessionKey = `${currentExamTest.id}_${sec.id}`;
            const sess = sessions[sessionKey];
            const mondaiList =
              SECTION_MONDAI_BREAKDOWN_BY_LEVEL[activeExamLevel][sec.category] || [];

            return (
              <div
                key={sec.id}
                className="rounded-2xl border border-[#dcd7cc] bg-[#fffdfa] overflow-hidden shadow-[0_6px_22px_rgba(62,52,41,0.04)] flex flex-col justify-between"
              >
                {/* Header Bagian */}
                <div className="p-5 bg-[#f8f5ef] border-b border-[#e2ded5] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#263d36] text-white">
                      第{idx + 1}部 • {sec.duration_minutes}分
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f1e6df] text-[#bf5b46]">
                      {sec.mock_questions_count} Pertanyaan
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-[#25231f] font-['Noto_Serif_JP',serif]">
                    {sec.titleJa}
                  </h3>
                  <p className="text-xs font-medium text-[#595750]">{sec.titleId}</p>
                </div>

                {/* Daftar Mondai di dalam Bagian */}
                <div className="p-5 space-y-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#a06658]">
                    Daftar Mondai ({mondaiList.length} Kategori)
                  </div>

                  <ul className="space-y-2">
                    {mondaiList.map((m) => (
                      <li key={m.mondai}>
                        <button
                          type="button"
                          onClick={() =>
                            handleStartSection(currentExamTest, sec, m.startIndex)
                          }
                          className="w-full p-3 rounded-xl bg-[#f9f7f2] hover:bg-[#f4ece6] border border-[#ece7de] hover:border-[#d95b43] text-left transition-all group"
                          title={`Mulai dari ${m.titleJa} (${m.rangeLabel})`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-[#25231f] font-['Noto_Serif_JP',serif] group-hover:text-[#bf5b46]">
                              {m.titleJa}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fffdfa] border border-[#e2ded5] text-[#595750] shrink-0">
                              {m.count}問 ({m.rangeLabel})
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[11px] text-[#77736b]">
                              {m.titleId}
                            </span>
                            {m.badge && (
                              <span className="text-[10px] font-bold text-[#bf5b46]">
                                {m.badge}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Status Skor & Tombol Aksi */}
                <div className="p-5 pt-3 border-t border-[#ece7de] bg-[#fcfaf5] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#77736b]">Status Pengerjaan:</span>
                    <span className="font-bold text-[#25231f]">
                      {sess
                        ? `${sess.correctCount} / ${sec.mock_questions_count} Benar (${sess.percentageScore}%)`
                        : `ー / ${sec.mock_questions_count} Soal`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {sess && (
                      <button
                        type="button"
                        onClick={() => handleReviewSection(currentExamTest, sec)}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-[#263d36] hover:bg-[#1d302a] text-white transition-colors text-center"
                      >
                        Lihat Pembahasan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartSection(currentExamTest, sec, 0)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#d95b43] hover:bg-[#c4543f] text-white shadow-[0_2px_8px_rgba(217,91,67,0.22)] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Icon name="play" size={14} />
                      <span>
                        {sess ? `Ulangi Bagian ${idx + 1}` : `Mulai Bagian ${idx + 1}`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal Dialog Detail & Lembar Skor */}
      <TestDetailsModal
        isOpen={!!selectedTest}
        test={selectedTest}
        onClose={() => setSelectedTest(null)}
        onStartSection={(t, s) => handleStartSection(t, s, 0)}
        onReviewSection={handleReviewSection}
        onRetakeSection={handleRetakeSection}
        sessions={sessions}
      />

      {/* Modal Cek Audio */}
      <AudioCheckModal
        isOpen={audioModalOpen}
        onClose={() => setAudioModalOpen(false)}
      />
    </div>
  );
}
