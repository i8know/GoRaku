import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../ui";
import { QuestionPack } from "../../lib/questionPack";
import {
  importQuestionPackFromJson,
  deleteQuestionPack
} from "../../lib/questionPackStorage";

interface ExtraMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  packs: QuestionPack[];
  onPackUpdated: () => void;
  notify?: (type: "success" | "error" | "info", msg: string) => void;
}

export default function ExtraMaterialsModal({
  isOpen,
  onClose,
  packs,
  onPackUpdated,
  notify
}: ExtraMaterialsModalProps) {
  const [activeTab, setActiveTab] = useState<"guide" | "packs" | "license">("guide");
  const [jsonText, setJsonText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importQuestionPackFromJson(content);
      if (res.success && res.pack) {
        notify?.("success", `Paket '${res.pack.title}' berhasil diimpor!`);
        onPackUpdated();
        setJsonText("");
      } else {
        notify?.("error", `Impor gagal: ${res.errors?.join(", ")}`);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteSubmit = async () => {
    if (!jsonText.trim()) return;
    const res = await importQuestionPackFromJson(jsonText);
    if (res.success && res.pack) {
      notify?.("success", `Paket '${res.pack.title}' berhasil diimpor!`);
      onPackUpdated();
      setJsonText("");
    } else {
      notify?.("error", `Impor gagal: ${res.errors?.join(", ")}`);
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (confirm("Hapus paket soal ini dari penyimpanan lokal Anda?")) {
      await deleteQuestionPack(packId);
      notify?.("info", "Paket soal berhasil dihapus.");
      onPackUpdated();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-2xl bg-[var(--panel)] rounded-2xl border border-[var(--garis)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[var(--tinta)]">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--garis)] bg-[var(--tsuki)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f1e6df] text-[#bf5b46] flex items-center justify-center">
              <Icon name="book" size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--tinta)] font-['Noto_Serif_JP',serif]">
                Materi Tambahan
              </h3>
              <p className="text-[11px] text-[var(--tinta-2)]">
                Panduan resmi ujian, manajemen bank soal, dan referensi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--tinta-2)] hover:text-[var(--tinta)] hover:bg-[#eee8dd] transition-colors"
            title="Tutup dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-[var(--garis)] px-5 pt-3 gap-3 bg-[var(--tsuki)]/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "guide"
                ? "border-[#d95b43] text-[#bf5b46]"
                : "border-transparent text-[var(--tinta-2)] hover:text-[var(--tinta)]"
            }`}
          >
            Panduan Ujian JLPT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("packs")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "packs"
                ? "border-[#d95b43] text-[#bf5b46]"
                : "border-transparent text-[var(--tinta-2)] hover:text-[var(--tinta)]"
            }`}
          >
            {`Kelola Paket Soal (${packs.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("license")}
            className={`pb-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "license"
                ? "border-[#d95b43] text-[#bf5b46]"
                : "border-transparent text-[var(--tinta-2)] hover:text-[var(--tinta)]"
            }`}
          >
            Lisensi & Atribusi
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[var(--tinta-2)]">
          {activeTab === "guide" && (
            <div className="space-y-4 leading-relaxed">
              <div className="p-4 rounded-xl bg-[#fbf8f2] border border-[#ece7de] text-[var(--tinta)]">
                <h4 className="font-bold text-sm mb-1 font-['Noto_Serif_JP',serif] text-[#a06658]">
                  Standar Format Ujian JLPT N5
                </h4>
                <p className="text-[var(--tinta-2)]">
                  Ujian Kemampuan Bahasa Jepang (JLPT) level N5 dirancang untuk mengukur pemahaman dasar
                  bahasa Jepang yang dipelajari di kelas maupun lingkungan sehari-hari.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-[#ece7de] bg-[#f9f7f2]">
                  <div className="font-bold text-[var(--tinta)] mb-1 font-['Noto_Serif_JP',serif]">1. Kosakata</div>
                  <div className="text-[11px] text-[var(--tinta-2)]">文字・語彙</div>
                  <div className="mt-2 text-[#bf5b46] font-semibold">20 Menit</div>
                  <div className="text-[11px] text-[var(--tinta-2)] mt-0.5">Membaca & Menulis Kanji N5</div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#ece7de] bg-[#f9f7f2]">
                  <div className="font-bold text-[var(--tinta)] mb-1 font-['Noto_Serif_JP',serif]">2. Tata Bahasa & Baca</div>
                  <div className="text-[11px] text-[var(--tinta-2)]">文法・読解</div>
                  <div className="mt-2 text-[#bf5b46] font-semibold">40 Menit</div>
                  <div className="text-[11px] text-[var(--tinta-2)] mt-0.5">Partikel, Pola Kalimat & Bacaan</div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#ece7de] bg-[#f9f7f2]">
                  <div className="font-bold text-[var(--tinta)] mb-1 font-['Noto_Serif_JP',serif]">3. Mendengarkan</div>
                  <div className="text-[11px] text-[var(--tinta-2)]">聴解</div>
                  <div className="mt-2 text-[#bf5b46] font-semibold">30 Menit</div>
                  <div className="text-[11px] text-[var(--tinta-2)] mt-0.5">Audio Percakapan Sehari-hari</div>
                </div>
              </div>

              <div className="space-y-2 border-t border-[#ece7de] pt-3">
                <h5 className="font-bold text-[var(--tinta)]">Kriteria Kelulusan Resmi:</h5>
                <ul className="list-disc list-inside space-y-1 text-[var(--tinta-2)]">
                  <li><strong>Skor Total:</strong> Minimal 80 dari 180 poin (≥ 44.4%).</li>
                  <li><strong>Nilai Minimal per Seksi:</strong> Minimal 19 poin untuk Bagian Pengetahuan Bahasa dan minimal 19 poin untuk Bagian Mendengarkan.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "packs" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#dcd7cc] bg-white text-[#3b3730] font-medium hover:border-[#d95b43] hover:text-[#d95b43] flex items-center justify-center gap-2 transition-colors"
                >
                  <Icon name="upload" size={16} />
                  <span>Unggah Berkas .json</span>
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-[var(--tinta-2)]">
                  Atau Tempel JSON QuestionPack:
                </label>
                <textarea
                  rows={4}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='{ "id": "custom-pack", "level": "N5", ... }'
                  className="w-full p-2.5 font-mono text-[11px] rounded-xl border border-[#dcd7cc] bg-[#f9f7f2] text-[var(--tinta)] focus:outline-none focus:border-[#d95b43]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!jsonText.trim()}
                    onClick={handlePasteSubmit}
                    className="py-1.5 px-4 rounded-xl bg-[var(--kon)] hover:bg-[#1d302a] text-white font-semibold disabled:opacity-40 transition-colors"
                  >
                    Pasang Paket
                  </button>
                </div>
              </div>

              <div className="border-t border-[#ece7de] pt-3 space-y-2">
                <h5 className="font-bold text-[var(--tinta)]">
                  Paket Soal Terpasang:
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {packs.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-[#ece7de] bg-[#f9f7f2] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-[var(--tinta)]">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-[var(--tinta-2)]">
                          ID: <code>{p.id}</code> • Level: {p.level} • {p.stats.totalQuestions} soal
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePack(p.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus paket"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "license" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#fbf6ee] border border-[#e8dfd0] text-[var(--tinta)] space-y-1">
                <div className="font-bold text-sm text-[#a06658]">Pemberitahuan & Penafian Resmi JLPT</div>
                <p className="text-[11px] text-[var(--tinta-2)] leading-relaxed">
                  Soal-soal latihan di dalam aplikasi ini adalah <strong>soal orisinal bergaya JLPT N5</strong>,
                  <strong> BUKAN</strong> soal resmi dari <em>The Japan Foundation</em> maupun <em>JEES</em>.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-[var(--tinta)]">Sumber Korpus Terbuka:</h5>
                <ul className="space-y-2">
                  <li className="p-2.5 rounded-lg border border-[#ece7de] bg-[#f9f7f2]">
                    <strong>JMdict & KANJIDIC2 (EDRDG):</strong> Lisensi Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
                  </li>
                  <li className="p-2.5 rounded-lg border border-[#ece7de] bg-[#f9f7f2]">
                    <strong>Tatoeba Project:</strong> Lisensi Creative Commons Attribution 2.0 France (CC BY 2.0 FR).
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <Link
                  to="/license"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#d95b43] hover:text-[#b0432e] hover:underline"
                >
                  <span>Lihat Dokumentasi Lengkap Lisensi & Atribusi →</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--garis)] flex justify-end bg-[var(--tsuki)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#eee8dd] hover:bg-[#e4ded0] text-[var(--tinta)] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
