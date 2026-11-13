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
      <div className="border-b border-[var(--garis)] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/exam"
            className="text-xs font-medium text-[var(--ai)] hover:underline inline-flex items-center gap-1 min-h-[28px] py-0.5"
          >
            ← Kembali ke Simulasi Ujian JLPT
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--tinta)]" style={{ fontFamily: "var(--font-serif)" }}>
          Lisensi dan Atribusi Sumber Data
        </h1>
        <p className="text-sm text-[var(--tinta-2)] mt-1">
          Dokumentasi transparansi hak cipta, lisensi terbuka, dan sumber korpus data yang digunakan
          dalam aplikasi dan pembuat soal JLPT N5 Orisinal.
        </p>
      </div>

      {/* Penafian Resmi JLPT */}
      <div className="p-5 rounded-2xl bg-[var(--mizu-soft)] border border-[var(--garis)]">
        <div className="flex items-start gap-3">
          <span className="text-[var(--ai)] mt-0.5 shrink-0" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[var(--tinta)]">
              Pemberitahuan &amp; Penafian Resmi (Official JLPT Disclaimer)
            </h2>
            <p className="text-xs text-[var(--tinta-2)] leading-relaxed">
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
        <div className="p-6 rounded-2xl bg-[var(--panel)] border border-[var(--garis)] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[var(--mizu-soft)] text-[var(--ai)]">
              CC BY-SA 4.0
            </span>
            <span className="text-xs text-[var(--tinta-2)]">Kamus & Kanji</span>
          </div>
          <h2 className="text-base font-bold text-[var(--tinta)]">
            JMdict & KANJIDIC2
          </h2>
          <p className="text-xs text-[var(--tinta-2)] leading-relaxed">
            Basis data kamus elektronik bahasa Jepang-Inggris dan karakter kanji yang dikelola oleh{" "}
            <strong>Electronic Dictionary Research and Development Group (EDRDG)</strong> di bawah pimpinan
            Jim Breen.
          </p>
          <div className="text-xs space-y-1 text-[var(--tinta-2)] pt-2 border-t border-[var(--garis)]">
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
                className="text-[var(--ai)] hover:underline inline-flex items-center min-h-[28px]"
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
        <div className="p-6 rounded-2xl bg-[var(--panel)] border border-[var(--garis)] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[rgba(42,111,91,0.12)] text-[var(--ok)]">
              CC BY 2.0 FR
            </span>
            <span className="text-xs text-[var(--tinta-2)]">Korpus Kalimat</span>
          </div>
          <h2 className="text-base font-bold text-[var(--tinta)]">
            Tatoeba Project
          </h2>
          <p className="text-xs text-[var(--tinta-2)] leading-relaxed">
            Basis data kalimat contoh multibahasa terbuka yang dikembangkan secara kolaboratif oleh komunitas{" "}
            <strong>Tatoeba.org</strong>.
          </p>
          <div className="text-xs space-y-1 text-[var(--tinta-2)] pt-2 border-t border-[var(--garis)]">
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
                className="text-[var(--ai)] hover:underline inline-flex items-center min-h-[28px]"
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
      <div className="p-6 rounded-2xl bg-[var(--panel)] border border-[var(--garis)] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--tinta)]">
            Lisensi Paket Soal Turunan (QuestionPack)
          </h2>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[var(--mizu-soft)] text-[var(--ai)]">
            CC BY-SA 4.0
          </span>
        </div>
        <p className="text-xs text-[var(--tinta-2)] leading-relaxed">
          Sesuai dengan klausul <em>ShareAlike</em> pada lisensi data sumber JMdict dan KANJIDIC2
          (CC BY-SA 4.0), setiap dataset dan paket soal turunan yang dihasilkan oleh alat pembuat soal ini
          dilisensikan di bawah ketentuan{" "}
          <strong>Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)</strong>.
          Lisensi ini sepenuhnya kompatibel dengan ketentuan atribusi CC BY 2.0 FR dari korpus kalimat Tatoeba.
        </p>

        {pack && (
          <div className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)] text-xs space-y-1 font-mono text-[var(--tinta)]">
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
      <div className="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-[var(--garis)] text-xs text-[var(--tinta-2)]">
        <span>Aplikasi Belajar Bahasa Jepang • Modul Simulasi Ujian JLPT Orisinal</span>
        <Link to="/exam" className="text-[var(--ai)] font-semibold hover:underline inline-flex items-center min-h-[28px]">
          Mulai Latihan Sekarang
        </Link>
      </div>
    </div>
  );
}

