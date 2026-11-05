import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  MockTest,
  MockSection,
  SectionSessionResult,
  JLPTLevel
} from "../components/jlpt/types";
import {
  generateStandardMockTests,
  getQuestionsForMockSection
} from "../components/jlpt/mockTestData";
import AudioCheckModal from "../components/jlpt/AudioCheckModal";
import ExtraMaterialsModal from "../components/jlpt/ExtraMaterialsModal";
import TestDetailsModal from "../components/jlpt/TestDetailsModal";
import TestSessionRunner from "../components/jlpt/TestSessionRunner";
import TestReviewView from "../components/jlpt/TestReviewView";
import { QuestionPack } from "../lib/questionPack";
import {
  ensureSeedPackLoaded,
  listQuestionPacks
} from "../lib/questionPackStorage";
import { Icon } from "../ui";

export interface ExamPageProps {
  notify?: (type: "success" | "error" | "info", msg: string) => void;
}

const STORAGE_KEY_SESSIONS = "jlpt_mock_sessions_v1";

export default function ExamPage({ notify }: ExamPageProps) {
  // Level aktif
  const [activeLevel, setActiveLevel] = useState<JLPTLevel>("N5");

  // Bank paket soal dari database lokal
  const [packs, setPacks] = useState<QuestionPack[]>([]);
  const [seedPack, setSeedPack] = useState<QuestionPack | null>(null);

  // Status Modal
  const [audioModalOpen, setAudioModalOpen] = useState<boolean>(false);
  const [extraMaterialsOpen, setExtraMaterialsOpen] = useState<boolean>(false);
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);

  // Status Sesi Ujian Aktif & Review
  const [activeSession, setActiveSession] = useState<{
    test: MockTest;
    section: MockSection;
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

  // Muat paket bawaan (seed) secara otomatis saat halaman pertama kali dibuka
  const loadPacks = async () => {
    try {
      const seed = await ensureSeedPackLoaded();
      setSeedPack(seed);
      const allPacks = await listQuestionPacks();
      setPacks(allPacks);
    } catch (err) {
      console.error("Gagal memuat paket soal ujian:", err);
      notify?.("error", "Gagal memuat paket soal ujian.");
    }
  };

  useEffect(() => {
    loadPacks();
  }, []);

  // 25 Tes Latihan Resmi Bunpro (N5 - N1)
  const standardTests = useMemo(() => generateStandardMockTests(), []);

  // Tes yang difilter berdasarkan level aktif
  const currentLevelTests = useMemo(() => {
    return standardTests.filter((t) => t.levelLabel === activeLevel);
  }, [standardTests, activeLevel]);

  // Handler Memulai Seksi
  const handleStartSection = (test: MockTest, section: MockSection) => {
    if (!seedPack) {
      notify?.("error", "Paket soal belum siap. Silakan tunggu sebentar.");
      return;
    }

    if (test.levelLabel !== "N5") {
      notify?.(
        "info",
        `Simulasi soal interaktif saat ini terisi penuh untuk N5. Level ${test.levelLabel} sedang disiapkan.`
      );
      return;
    }

    // Ambil soal untuk seksi ini
    const testIndex = test.id; // 1..5
    const questions = getQuestionsForMockSection(
      seedPack,
      testIndex,
      section.category
    );

    if (questions.length === 0) {
      notify?.("error", "Tidak ada soal yang tersedia untuk bagian ini.");
      return;
    }

    // Tutup modal detail dan buka sesi ujian
    setSelectedTest(null);
    setActiveReview(null);
    setActiveSession({
      test,
      section
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

    handleStartSection(test, section);
  };

  // Handler Pengiriman Sesi Jawaban
  const handleSubmitSession = (result: SectionSessionResult) => {
    const sessionKey = `${result.mockTestId}_${result.sectionId}`;
    setSessions((prev) => ({
      ...prev,
      [sessionKey]: result
    }));

    if (activeSession) {
      setActiveReview({
        test: activeSession.test,
        section: activeSession.section,
        result
      });
      setActiveSession(null);
    }
  };

  // Jika sedang berada di sesi ujian aktif
  if (activeSession && seedPack) {
    const questions = getQuestionsForMockSection(
      seedPack,
      activeSession.test.id,
      activeSession.section.category
    );

    return (
      <TestSessionRunner
        test={activeSession.test}
        section={activeSession.section}
        questions={questions}
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
      {/* 1. Header Halaman (Authentic Japanese Immersion Styling) */}
      <header className="rounded-2xl border border-[#e2ded5] bg-[#fffdfa] p-6 sm:p-7 shadow-[0_4px_24px_rgba(62,52,41,0.04)] relative overflow-hidden">
        {/* Subtle Kanji Watermark */}
        <span
          className="absolute right-6 -bottom-6 font-['Noto_Serif_JP',serif] text-[120px] font-bold text-[#f2eee6] pointer-events-none select-none leading-none opacity-60"
          aria-hidden="true"
        >
          験
        </span>

        <div className="relative z-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#f1e6df] text-[#bf5b46]">
                25 Tes Lengkap
              </span>
              <span className="text-xs text-[#88847b]">Format Resmi N5 - N1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#25231f] font-['Noto_Serif_JP',serif]">
              Tes Latihan JLPT
            </h1>
          </div>

          {/* Tombol Header: Cek Audio & Materi Tambahan */}
          <div className="flex items-center gap-2.5">
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
              onClick={() => setExtraMaterialsOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#d95b43]/30 bg-[#f8ede9] hover:bg-[#f1e6df] text-[#bf5b46] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Icon name="book" size={16} />
              <span>Materi Tambahan</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Intro Banner (Refined Washi Heritage Styling) */}
      <aside className="rounded-2xl border border-[#e2ded5] bg-[#fffdf8] p-6 sm:p-7 shadow-[0_4px_20px_rgba(62,52,41,0.03)] border-l-4 border-l-[#d95b43] text-xs sm:text-sm text-[#595750] leading-relaxed space-y-3.5">
        <p>
          Di bawah ini tersedia <strong>25 tes latihan JLPT lengkap</strong>, lima untuk setiap level dan dilengkapi ilustrasi pendukung dan simulasi rekaman audio profesional.
        </p>
        <p>
          Struktur setiap tes, termasuk jumlah serta jenis pertanyaannya, mengikuti pedoman resmi JLPT dan mencerminkan format ujian aslinya.
        </p>
        <p>
          Dengan mengikuti tes ini, kamu dapat menilai seberapa siap dirimu untuk JLPT sesungguhnya, serta memperoleh saran yang disesuaikan untuk meningkatkan skor pada setiap jenis pertanyaan. Kami juga menyediakan penjelasan mendetail untuk membantumu memahami kesalahan, hal-hal yang perlu dipelajari, jebakan umum, dan cara menemukan petunjuk konteks.
        </p>
        <p>
          Kami menyarankan agar kamu memanfaatkan materi ini untuk menilai kemampuanmu secara praktis, lalu meninjau kembali arah belajar saat ini.
        </p>
        <p>
          Setelah menyelesaikan tes, kamu dapat langsung melihat hasil keseluruhan, mengetahui pertanyaan mana yang salah beserta alasannya, serta mengakses penjelasan tata bahasa dan kosakata yang relevan. Kamu juga dapat melihat naskah lengkap untuk bagian mendengarkan.
        </p>
        <p className="font-semibold text-[#bf5b46] pt-1">
          Hasil dan seluruh informasi ini tersedia secara gratis tanpa perlu memasukkan email atau membuat akun.
        </p>

        {/* Disclaimer Resmi JLPT & Tautan Lisensi */}
        <div className="pt-3 border-t border-[#ece7de] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#88847b]">
          <div className="flex items-center gap-2">
            <span className="text-[#bf5b46] font-bold">⚠️ Penafian Resmi:</span>
            <span>Soal latihan ini orisinal bergaya format JLPT, bukan soal resmi JEES / The Japan Foundation.</span>
          </div>
          <Link
            to="/license"
            className="text-[#d95b43] hover:text-[#b0432e] hover:underline font-semibold shrink-0"
          >
            Lisensi & Atribusi Sumber Data →
          </Link>
        </div>
      </aside>

      {/* 3. Level Navigation Tabs (N5, N4, N3, N2, N1) */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        {(["N5", "N4", "N3", "N2", "N1"] as JLPTLevel[]).map((lvl) => {
          const isActive = activeLevel === lvl;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => setActiveLevel(lvl)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? "bg-[#263d36] text-white shadow-[0_4px_12px_rgba(38,61,54,0.22)]"
                  : "bg-[#fffdfa] border border-[#e2ded5] text-[#595750] hover:border-[#d95b43] hover:text-[#25231f]"
              }`}
            >
              <span>{lvl}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isActive
                    ? "bg-white/20 text-[#e5eee9]"
                    : "bg-[#f2eee6] text-[#77736b]"
                }`}
              >
                5 Tes
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Grid Kartu Tes (Authentic Aesthetic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentLevelTests.map((test) => {
          // Hitung total skor yang telah dikerjakan untuk kartu ini
          let cardAnswered = 0;
          let cardCorrect = 0;
          let hasTakenAny = false;

          test.mock_sections.forEach((sec) => {
            const sessionKey = `${test.id}_${sec.id}`;
            const s = sessions[sessionKey];
            if (s) {
              cardAnswered += s.answeredCount;
              cardCorrect += s.correctCount;
              hasTakenAny = true;
            }
          });

          return (
            <div
              key={test.id}
              className="rounded-2xl border border-[#e2ded5] bg-[#fffdfa] overflow-hidden shadow-[0_4px_18px_rgba(62,52,41,0.04)] hover:shadow-[0_12px_32px_rgba(62,52,41,0.08)] hover:border-[#d5cfc4] transition-all flex flex-col justify-between"
            >
              {/* Header Kartu */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-base text-[#25231f] font-['Noto_Serif_JP',serif]">
                    {test.title}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {/* Waktu */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-normal border border-[#dedad1] bg-[#f5f1e8] text-[#686359]">
                      <Icon name="clock" size={12} />
                      <span>{`${test.totalDurationMinutes}mnt`}</span>
                    </span>

                    {/* Standar Tingkat Kesulitan */}
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f1e6df] text-[#bf5b46]"
                      title="Tingkat kesulitan tes ini setara dengan yang biasanya diharapkan pada ujian JLPT di level ini."
                    >
                      {test.difficultyLabel}
                    </span>

                    {/* Level Badge */}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e8efec] text-[#233c35]">
                      {test.levelLabel}
                    </span>
                  </div>
                </div>

                {/* 2x2 Grid Ringkasan Seksi Ujian */}
                <ul className="grid grid-cols-2 gap-2 text-xs">
                  {test.mock_sections.map((sec) => {
                    const sessionKey = `${test.id}_${sec.id}`;
                    const s = sessions[sessionKey];

                    return (
                      <li
                        key={sec.id}
                        className="p-2.5 rounded-xl bg-[#f9f7f2] border border-[#ece7de] flex flex-col justify-between"
                      >
                        <p
                          className="text-[11px] font-medium text-[#77736b] truncate"
                          title={sec.titleId}
                        >
                          {sec.titleId}
                        </p>
                        <p className="mt-1 font-bold text-[#25231f]">
                          {s ? `${s.correctCount} / ${sec.mock_questions_count}` : `ー / ${sec.mock_questions_count}`}
                        </p>
                      </li>
                    );
                  })}

                  {/* Kotak Total */}
                  <li className="p-2.5 rounded-xl bg-[#f9f7f2] border border-[#ece7de] flex flex-col justify-between">
                    <p className="text-[11px] font-bold text-[#494740]">
                      Total
                    </p>
                    <p className="mt-1 font-bold text-[#25231f]">
                      {hasTakenAny ? `${cardCorrect} / ${test.totalQuestions}` : `ー / ${test.totalQuestions}`}
                    </p>
                  </li>
                </ul>
              </div>

              {/* Footer Kartu & Tombol Detail */}
              <div>
                <hr className="border-[#ece7de]" />
                <div className="p-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTest(test)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#d95b43] hover:bg-[#c4543f] text-white shadow-[0_2px_8px_rgba(217,91,67,0.22)] transition-colors text-center"
                  >
                    Detail
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog Detail Tes */}
      <TestDetailsModal
        isOpen={!!selectedTest}
        test={selectedTest}
        onClose={() => setSelectedTest(null)}
        onStartSection={handleStartSection}
        onReviewSection={handleReviewSection}
        onRetakeSection={handleRetakeSection}
        sessions={sessions}
      />

      {/* Modal Cek Audio */}
      <AudioCheckModal
        isOpen={audioModalOpen}
        onClose={() => setAudioModalOpen(false)}
      />

      {/* Modal Materi Tambahan & Kelola Paket */}
      <ExtraMaterialsModal
        isOpen={extraMaterialsOpen}
        onClose={() => setExtraMaterialsOpen(false)}
        packs={packs}
        onPackUpdated={loadPacks}
        notify={notify}
      />
    </div>
  );
}
