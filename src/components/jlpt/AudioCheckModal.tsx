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
      <div className="w-full max-w-md bg-[#fffdf8] rounded-2xl border border-[#e2ded5] shadow-2xl overflow-hidden text-[#25231f]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e2ded5] bg-[#f8f5ef]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f1e6df] text-[#bf5b46] flex items-center justify-center">
              <Icon name="volume" size={18} />
            </div>
            <h3 className="font-bold text-base text-[#25231f] font-['Noto_Serif_JP',serif]">Cek Audio</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#77736b] hover:text-[#25231f] hover:bg-[#eee8dd] transition-colors"
            title="Tutup dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-[#595750] leading-relaxed">
            Gunakan contoh ini untuk memastikan audionya berfungsi dengan baik di perangkat Anda sebelum memulai tes mendengarkan!
          </p>

          <div className="p-4 rounded-xl bg-[#f9f7f2] border border-[#ece7de] text-center space-y-3">
            <p className="font-['Noto_Serif_JP',serif] text-sm text-[#25231f] font-medium leading-relaxed">
              「{sampleText}」
            </p>
            <p className="text-[11px] text-[#77736b] italic">
              "Ini adalah tes audio latihan bahasa Jepang. Apakah suaranya terdengar jelas?"
            </p>

            <button
              type="button"
              onClick={handlePlay}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                isPlaying
                  ? "bg-[#d95b43] text-white shadow-sm"
                  : "bg-[#263d36] hover:bg-[#1d302a] text-white shadow-sm"
              }`}
            >
              <Icon name={isPlaying ? "bell" : "play"} size={16} />
              <span>{isPlaying ? "Sedang Memutar Audio..." : "Putar Contoh Audio"}</span>
            </button>
          </div>

          <div className="text-[11px] text-[#595750] space-y-1 bg-[#fbf6ee] p-3.5 rounded-xl border border-[#e8dfd0]">
            <div className="font-bold text-[#a06658]">💡 Tips Mendengarkan:</div>
            <div>
              Gunakan headphone untuk kejernihan suara maksimal. Pastikan volume sistem Anda tidak dalam mode senyap.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e2ded5] flex justify-end bg-[#f8f5ef]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#eee8dd] hover:bg-[#e4ded0] text-[#33312c] transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

