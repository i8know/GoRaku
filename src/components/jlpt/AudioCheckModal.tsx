import React, { useState } from "react";
import { Icon } from "../../ui";

interface AudioCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AudioCheckModal({ isOpen, onClose }: AudioCheckModalProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const sampleText = "これは日本語のリスニング音声テストです。音量はちょうどいいですか？";

  if (!isOpen) return null;

  const handlePlay = () => {
    if (!("speechSynthesis" in window)) {
      alert("Browser Anda belum mendukung Speech Synthesis audio.");
      return;
    }

    window.speechSynthesis.cancel();
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-[var(--panel)] rounded-2xl border border-[var(--garis)] shadow-2xl overflow-hidden text-[var(--tinta)]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--garis)] bg-[var(--tsuki)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--mizu-soft)] text-[var(--ai)] flex items-center justify-center">
              <Icon name="volume" size={18} />
            </div>
            <h3 className="font-bold text-base text-[var(--tinta)] [font-family:var(--font-serif)]">Cek Audio</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--tinta-2)] hover:text-[var(--tinta)] hover:bg-[var(--mizu-soft)] transition-colors"
            title="Tutup dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-[var(--tinta-2)] leading-relaxed">
            Gunakan contoh ini untuk memastikan audionya berfungsi dengan baik di perangkat Anda sebelum memulai tes mendengarkan!
          </p>

          <div className="p-4 rounded-xl bg-[var(--tsuki)] border border-[var(--garis)] text-center space-y-3">
            <p className="[font-family:var(--font-serif)] text-sm text-[var(--tinta)] font-medium leading-relaxed">
              「{sampleText}」
            </p>
            <p className="text-[11px] text-[var(--tinta-2)] italic">
              "Ini adalah tes audio latihan bahasa Jepang. Apakah suaranya terdengar jelas?"
            </p>

            <button
              type="button"
              onClick={handlePlay}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                isPlaying
                  ? "bg-[var(--shu)] text-white shadow-sm"
                  : "bg-[var(--kon)] hover:bg-[var(--ai-tua)] text-white shadow-sm"
              }`}
            >
              <Icon name={isPlaying ? "bell" : "play"} size={16} />
              <span>{isPlaying ? "Sedang Memutar Audio..." : "Putar Contoh Audio"}</span>
            </button>
          </div>

          <div className="text-[11px] text-[var(--tinta-2)] space-y-1 bg-[var(--mizu-soft)] p-3.5 rounded-xl border border-[var(--garis)]">
            <div className="font-bold text-[var(--ai)]">💡 Tips Mendengarkan:</div>
            <div>
              Gunakan headphone untuk kejernihan suara maksimal. Pastikan volume sistem Anda tidak dalam mode senyap.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--garis)] flex justify-end bg-[var(--tsuki)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--mizu-soft)] hover:bg-[var(--garis)] text-[var(--tinta)] transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

