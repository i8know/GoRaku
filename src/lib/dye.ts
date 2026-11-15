export type DyeStep = 0 | 1 | 2 | 3 | 4;
export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

/**
 * Memetakan persentase penguasaan (0–100) ke langkah celupan indigo (0–4):
 * - [0, 20)   -> 0 (kamenozoki #D9E8EF)
 * - [20, 40)  -> 1 (asagi      #93BBD0)
 * - [40, 60)  -> 2 (hanada     #3C7AA3)
 * - [60, 80)  -> 3 (ai         #1F5C85)
 * - [80, 100] -> 4 (kon        #12284A)
 * Nilai di luar [0, 100] atau NaN dijepit dengan aman.
 */
export function dyeStep(percent: number): DyeStep {
  if (!Number.isFinite(percent)) return 0;
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped < 20) return 0;
  if (clamped < 40) return 1;
  if (clamped < 60) return 2;
  if (clamped < 80) return 3;
  return 4;
}

const JLPT_MAP: Record<JlptLevel, DyeStep> = {
  N5: 0,
  N4: 1,
  N3: 2,
  N2: 3,
  N1: 4,
};

/**
 * Memetakan level JLPT ("N5" .. "N1", atau string yang memuat kode N5..N1)
 * ke langkah celupan indigo (N5 -> 0 .. N1 -> 4).
 */
export function jlptDyeStep(level: JlptLevel | string): DyeStep {
  if (level in JLPT_MAP) {
    return JLPT_MAP[level as JlptLevel];
  }
  const match = String(level).toUpperCase().match(/\bN([1-5])\b/);
  if (match) {
    const code = `N${match[1]}` as JlptLevel;
    return JLPT_MAP[code];
  }
  return 2;
}

/**
 * Menghasilkan langkah celupan (0–4) secara deterministik dari judul karya
 * untuk sampul tipografis buku tanpa gambar sampul.
 */
export function titleDyeStep(title: string): DyeStep {
  const clean = (title || "").trim();
  if (!clean) return 2;
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash % 5) as DyeStep;
}
