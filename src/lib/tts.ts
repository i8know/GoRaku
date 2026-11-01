/**
 * Mengucapkan teks bahasa Jepang menggunakan Web Speech API (`speechSynthesis` ja-JP)
 * yang berjalan langsung di browser tanpa memerlukan backend.
 */
export function speakJapanese(text: string, rate = 0.95): boolean {
  const cleaned = text.replace(/<[^>]*>/g, "").trim();
  if (!cleaned) return false;

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = "ja-JP";
      utterance.rate = rate;

      const voices = window.speechSynthesis.getVoices();
      const jpVoice =
        voices.find((v) => v.lang === "ja-JP" || v.lang === "ja_JP") ??
        voices.find((v) => v.lang.toLowerCase().startsWith("ja"));
      if (jpVoice) {
        utterance.voice = jpVoice;
      }

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      // Abaikan bila diblokir oleh kebijakan autoplay browser
    }
  }
  return false;
}

