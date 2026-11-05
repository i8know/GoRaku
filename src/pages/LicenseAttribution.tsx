import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QuestionPack } from "../lib/questionPack";
import { ensureSeedPackLoaded } from "../lib/questionPackStorage";
import { Icon } from "../ui";

export default function LicenseAttributionPage() {
  const [pack, setPack] = useState<QuestionPack | null>(null);

  useEffect(() => {
    ensureSeedPackLoaded()
      .then((p) => setPack(p))
      .catch((err) => console.error("Gagal memuat metadata paket:", err));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header Halaman */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/exam"
            className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            ← Kembali ke Ujian JLPT
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Lisensi dan Atribusi Sumber Data
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Dokumentasi transparansi hak cipta, lisensi terbuka, dan sumber korpus data yang digunakan
          dalam aplikasi dan pembuat soal JLPT N5 Orisinal.
        </p>
      </div>

      {/* Penafian Resmi JLPT */}
      <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg mt-0.5">⚠️</span>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Pemberitahuan & Penafian Resmi (Official JLPT Disclaimer)
            </h3>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Seluruh soal latihan di dalam aplikasi ini adalah <strong>soal orisinal bergaya JLPT N5</strong>,{" "}
              <strong>BUKAN</strong> soal resmi dari <em>The Japan Foundation</em> maupun{" "}
              <em>Japan Educational Exchanges and Services (JEES)</em>. Penyelenggara resmi JLPT tidak
              menerbitkan daftar kosakata, kanji, atau tata bahasa resmi sejak revisi format tahun 2010.
              Tingkat N5 dalam aplikasi ini merupakan <strong>perkiraan leksikal</strong> berdasarkan data
              terbuka yang dapat diverifikasi.
            </p>
          </div>
        </div>
      </div>

      {/* Kartu Sumber Data Terbuka */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. JMdict & KANJIDIC2 */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              CC BY-SA 4.0
            </span>
            <span className="text-xs text-zinc-400">Kamus & Kanji</span>
          </div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            JMdict & KANJIDIC2
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Basis data kamus elektronik bahasa Jepang-Inggris dan karakter kanji yang dikelola oleh{" "}
            <strong>Electronic Dictionary Research and Development Group (EDRDG)</strong> di bawah pimpinan
            Jim Breen.
          </p>
          <div className="text-xs space-y-1 text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <strong>Penggunaan:</strong> Referensi leksikal kosakata N5, definisi arti bahasa Inggris,
              kelas kata (POS), bacaan On/Kun, dan nomor urut entri (<code>ent_seq</code>).
            </div>
            <div>
              <strong>Situs Resmi:</strong>{" "}
              <a
                href="https://www.edrdg.org/"
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 dark:text-amber-400 hover:underline"
              >
                https://www.edrdg.org/
              </a>
            </div>
            <div>
              <strong>Ketentuan Lisensi:</strong> Creative Commons Attribution-ShareAlike 4.0 International
              (CC BY-SA 4.0).
            </div>
          </div>
        </div>

        {/* 2. Tatoeba Project */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              CC BY 2.0 FR
            </span>
            <span className="text-xs text-zinc-400">Korpus Kalimat</span>
          </div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Tatoeba Project
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Basis data kalimat contoh multibahasa terbuka yang dikembangkan secara kolaboratif oleh komunitas{" "}
            <strong>Tatoeba.org</strong>.
          </p>
          <div className="text-xs space-y-1 text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <strong>Penggunaan:</strong> Kalimat contoh alami bahasa Jepang untuk kalimat soal dan
              terjemahan bahasa Indonesia yang terverifikasi.
            </div>
            <div>
              <strong>Situs Resmi:</strong>{" "}
              <a
                href="https://tatoeba.org/"
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 dark:text-amber-400 hover:underline"
              >
                https://tatoeba.org/
              </a>
            </div>
            <div>
              <strong>Ketentuan Lisensi:</strong> Creative Commons Attribution 2.0 France (CC BY 2.0 FR).
            </div>
          </div>
        </div>
      </div>

      {/* Lisensi Paket Turunan */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Lisensi Paket Soal Turunan (QuestionPack)
          </h2>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            CC BY-SA 4.0
          </span>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Sesuai dengan klausul <em>ShareAlike</em> pada lisensi data sumber JMdict dan KANJIDIC2
          (CC BY-SA 4.0), setiap dataset dan paket soal turunan yang dihasilkan oleh alat pembuat soal ini
          dilisensikan di bawah ketentuan{" "}
          <strong>Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)</strong>.
          Lisensi ini sepenuhnya kompatibel dengan ketentuan atribusi CC BY 2.0 FR dari korpus kalimat Tatoeba.
        </p>

        {pack && (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1 font-mono">
            <div><strong>ID Paket:</strong> {pack.id}</div>
            <div><strong>Versi Paket:</strong> {pack.version}</div>
            <div><strong>Total Soal:</strong> {pack.stats.totalQuestions} soal</div>
            <div><strong>Distribusi:</strong> G1: {pack.stats.byType.G1_KANJI_READING} | G2: {pack.stats.byType.G2_KANJI_WRITING} | G3: {pack.stats.byType.G3_PARTICLES} | G4: {pack.stats.byType.G4_CONTEXT_VOCAB}</div>
            <div><strong>Lisensi:</strong> {pack.license}</div>
            <div><strong>Tanggal Rilis:</strong> {new Date(pack.createdAt).toLocaleString("id-ID")}</div>
          </div>
        )}
      </div>

      {/* Navigasi Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
        <span>Aplikasi Belajar Bahasa Jepang • Modul Ujian JLPT Orisinal</span>
        <Link to="/exam" className="text-amber-600 dark:text-amber-400 font-medium hover:underline">
          Mulai Latihan Sekarang →
        </Link>
      </div>
    </div>
  );
}

