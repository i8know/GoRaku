/**
 * Generator Pengecoh Fonologis (Phonological Distractors) untuk Soal G1 (Membaca Kanji)
 *
 * Menghasilkan pilihan pengecoh yang masuk akal secara linguistik Jepang N5:
 * 1. Perubahan dakuten (濁音) / handakuten (半濁音) / seion (清音)
 * 2. Vokal panjang vs pendek (長音の有無: う, お, い)
 * 3. Ada atau tidaknya sokuon (促音: っ)
 * 4. Pergantian bacaan On/Kun dari KANJIDIC2 untuk kanji yang sama
 *
 * Memiliki validasi ketat:
 * - Tidak boleh sama dengan bacaan benar
 * - Tidak boleh merupakan bacaan sah apa pun dari bentuk tertulis menurut JMdict/KANJIDIC2
 * - Tidak boleh ada opsi kembar
 * - String pengecoh hanya hiragana yang valid
 */

import { PRNG } from "../utils/prng";
import n5KanjiList from "../data/n5_kanji_reference.json";
import n5VocabList from "../data/n5_vocab_reference.json";

// Peta pasangan dakuten / handakuten / seion dalam Hiragana
const VOICING_MAP: Record<string, string[]> = {
  // Ka <-> Ga
  か: ["が"], が: ["か"],
  き: ["ぎ"], ぎ: ["き"],
  く: ["ぐ"], ぐ: ["く"],
  け: ["げ"], げ: ["け"],
  こ: ["ご"], ご: ["こ"],

  // Sa <-> Za
  さ: ["ざ"], ざ: ["さ"],
  し: ["じ"], じ: ["し"],
  す: ["ず"], ず: ["す"],
  せ: ["ぜ"], ぜ: ["せ"],
  そ: ["ぞ"], ぞ: ["そ"],

  // Ta <-> Da
  た: ["だ"], だ: ["た"],
  ち: ["ぢ", "じ"], ぢ: ["ち", "じ"],
  つ: ["づ", "ず"], づ: ["つ", "ず"],
  て: ["で"], で: ["て"],
  と: ["ど"], ど: ["と"],

  // Ha <-> Ba <-> Pa
  は: ["ば", "ぱ"], ば: ["は", "ぱ"], ぱ: ["は", "ば"],
  ひ: ["び", "ぴ"], び: ["ひ", "ぴ"], ぴ: ["ひ", "び"],
  ふ: ["ぶ", "ぷ"], ぶ: ["ふ", "ぷ"], ぷ: ["ふ", "ぶ"],
  へ: ["べ", "ぺ"], べ: ["へ", "ぺ"], ぺ: ["へ", "べ"],
  ほ: ["ぼ", "ぽ"], ぼ: ["ほ", "ぽ"], ぽ: ["ほ", "ぼ"],
};

// Peta bacaan alternatif sah dari JMdict untuk mendeteksi pembacaan ganda
// Contoh: "日本" memiliki bacaan sah "にほん" dan "にっぽん"
const VALID_READINGS_BY_KANJI = new Map<string, Set<string>>();

// Inisialisasi peta bacaan sah dari data kosakata N5
for (const item of n5VocabList) {
  if (!VALID_READINGS_BY_KANJI.has(item.kanji)) {
    VALID_READINGS_BY_KANJI.set(item.kanji, new Set());
  }
  VALID_READINGS_BY_KANJI.get(item.kanji)!.add(item.kana);
}

// Tambahkan bacaan alternatif umum yang sah di JMdict untuk kata N5
const JMDictKnownAltReadings: Record<string, string[]> = {
  日本: ["にほん", "にっぽん"],
  今日: ["きょう", "こんにち"],
  明日: ["あした", "あす", "みょうにち"],
  昨日: ["きのう", "さくじつ"],
  一: ["いち", "ひとつ"],
  二: ["に", "ふたつ"],
  三: ["さん", "みっつ"],
  四: ["よん", "し", "よっつ"],
  七: ["なな", "しち"],
  九: ["きゅう", "く"],
  人: ["ひと", "にん", "じん"],
  何: ["なに", "なん"],
};

for (const [k, altList] of Object.entries(JMDictKnownAltReadings)) {
  if (!VALID_READINGS_BY_KANJI.has(k)) {
    VALID_READINGS_BY_KANJI.set(k, new Set());
  }
  for (const alt of altList) {
    VALID_READINGS_BY_KANJI.get(k)!.add(alt);
  }
}

// Peta bacaan On/Kun per Kanji dari KANJIDIC2
const KANJI_READINGS = new Map<string, { on: string[]; kun: string[] }>();
for (const k of n5KanjiList) {
  const onList = (k.on as string[])?.map((r) => katakanaToHiragana(r)) || [];
  const kunList =
    (k.kun as string[])?.map((r) =>
      r.split("・")[0].split(".")[0].replace(/^-/, "")
    ) || [];
  KANJI_READINGS.set(k.kanji, { on: onList, kun: kunList });
}

/**
 * Konversi Katakana ke Hiragana untuk komparasi fonologis seragam.
 */
export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

/**
 * Memeriksa apakah suatu string hanya memuat karakter Hiragana yang valid.
 */
export function isPureHiragana(str: string): boolean {
  return /^[\u3041-\u3096ー]+$/.test(str);
}

/**
 * Menghasilkan kandidat variasi dakuten/handakuten dari bacaan asal.
 */
function generateVoicingVariants(reading: string): string[] {
  const results: string[] = [];
  const chars = Array.from(reading);

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const alternates = VOICING_MAP[char];
    if (alternates) {
      for (const alt of alternates) {
        const variant = chars.slice(0, i).join("") + alt + chars.slice(i + 1).join("");
        results.push(variant);
      }
    }
  }

  return results;
}

/**
 * Menghasilkan kandidat variasi vokal panjang (長音) vs pendek.
 */
function generateVowelLengthVariants(reading: string): string[] {
  const results: string[] = [];

  // 1. Memendekkan: Hapus 'う' setelah bunyi o/u (mis. こう -> こ, とう -> と, じかん, dll.)
  if (reading.includes("う") && reading.length > 2) {
    const shortened = reading.replace("う", "");
    if (shortened.length >= 2) results.push(shortened);
  }

  // 2. Memanjangkan: Tambahkan 'う' setelah mora berkonsonan (mis. がこ -> がっこう, ほん -> ほうん, dst)
  if (!reading.includes("う") && reading.length >= 2) {
    // Tambahkan 'う' di tengah atau di akhir
    results.push(reading.slice(0, -1) + "う" + reading.slice(-1));
    results.push(reading + "う");
  }

  // 3. Menghapus atau menambah 'い' (mis. えいが -> えが, せんせい -> せんせ)
  if (reading.endsWith("い") && reading.length > 2) {
    results.push(reading.slice(0, -1));
  } else if (!reading.endsWith("い") && reading.length >= 2) {
    results.push(reading + "い");
  }

  return results;
}

/**
 * Menghasilkan kandidat variasi sokuon (促音: っ).
 */
function generateSokuonVariants(reading: string): string[] {
  const results: string[] = [];

  // Jika memuat 'っ', hilangkan (mis. がっこう -> がこう)
  if (reading.includes("っ")) {
    results.push(reading.replace(/っ/g, ""));
  } else if (reading.length >= 3) {
    // Sisipkan 'っ' di antara suku kata kedua
    const withSokuon = reading[0] + "っ" + reading.slice(1);
    results.push(withSokuon);
  }

  return results;
}

/**
 * Menghasilkan variasi bacaan on/kun kanji untuk kata bersangkutan dari KANJIDIC2.
 */
function generateKanjiReadingSubstitutions(targetKanji: string): string[] {
  const results: string[] = [];
  const kanjiChars = Array.from(targetKanji).filter((c) =>
    /[\u4E00-\u9FAF]/.test(c)
  );

  if (kanjiChars.length === 1) {
    const kData = KANJI_READINGS.get(kanjiChars[0]);
    if (kData) {
      results.push(...kData.on);
      results.push(...kData.kun);
    }
  } else if (kanjiChars.length === 2) {
    const k1 = KANJI_READINGS.get(kanjiChars[0]);
    const k2 = KANJI_READINGS.get(kanjiChars[1]);
    if (k1 && k2) {
      // Kombinasi On1 + Kun2 atau Kun1 + On2
      for (const on1 of k1.on.slice(0, 2)) {
        for (const kun2 of k2.kun.slice(0, 2)) {
          results.push(on1 + kun2);
        }
      }
      for (const kun1 of k1.kun.slice(0, 2)) {
        for (const on2 of k2.on.slice(0, 2)) {
          results.push(kun1 + on2);
        }
      }
    }
  }

  return results;
}

/**
 * Menghasilkan 3 pengecoh fonologis unik yang valid untuk sebuah kata target berkanji.
 *
 * @param targetKanji Bentuk tertulis kanji (misal: "本", "水", "電車", "学校")
 * @param correctReading Bacaan kana yang benar (misal: "ほん", "みず", "でんしゃ")
 * @param rng Instance PRNG untuk pemilihan acak deterministik
 */
export function generatePhonologicalDistractors(
  targetKanji: string,
  correctReading: string,
  rng: PRNG
): string[] {
  const validLegitReadings =
    VALID_READINGS_BY_KANJI.get(targetKanji) || new Set([correctReading]);

  // Kumpulkan seluruh kandidat dari berbagai transformasi fonologis
  const pool = new Set<string>();

  // 1. Variasi Dakuten / Handakuten
  for (const v of generateVoicingVariants(correctReading)) {
    pool.add(v);
  }

  // 2. Variasi Vokal Panjang / Pendek
  for (const v of generateVowelLengthVariants(correctReading)) {
    pool.add(v);
  }

  // 3. Variasi Sokuon
  for (const v of generateSokuonVariants(correctReading)) {
    pool.add(v);
  }

  // 4. Substitusi On/Kun KANJIDIC2
  for (const v of generateKanjiReadingSubstitutions(targetKanji)) {
    pool.add(v);
  }

  // 5. Tambahkan mutasi kombinasi bila kandidat masih kurang
  const firstPool = Array.from(pool);
  for (const p of firstPool) {
    for (const v of generateVoicingVariants(p)) {
      pool.add(v);
    }
  }

  // Saring ketat kandidat pengecoh:
  // - Hanya kana valid
  // - Tidak boleh sama dengan bacaan benar
  // - Tidak boleh merupakan bacaan sah JMdict untuk kanji tersebut
  // - Panjang masuk akal (antara 1 s.d. panjang bacaan benar + 2)
  const validCandidates = Array.from(pool).filter((cand) => {
    if (!cand || cand === correctReading) return false;
    if (validLegitReadings.has(cand)) return false;
    if (!isPureHiragana(cand)) return false;
    if (cand.length < 1 || cand.length > correctReading.length + 3) return false;
    return true;
  });

  // Jika kandidat valid >= 3, gunakan PRNG deterministik untuk mengocok dan mengambil 3
  if (validCandidates.length >= 3) {
    const shuffled = rng.shuffle(validCandidates);
    return shuffled.slice(0, 3);
  }

  // Fallback cadangan fonologis bila sangat sedikit: ubah mora terakhir dengan kana vokal senada
  const fallbackChars = ["あ", "い", "う", "え", "お", "ん", "か", "さ", "た", "な"];
  for (const fc of fallbackChars) {
    const alt = correctReading.slice(0, -1) + fc;
    if (
      alt !== correctReading &&
      !validLegitReadings.has(alt) &&
      isPureHiragana(alt) &&
      !validCandidates.includes(alt)
    ) {
      validCandidates.push(alt);
      if (validCandidates.length >= 3) break;
    }
  }

  const shuffled = rng.shuffle(validCandidates);
  return shuffled.slice(0, 3);
}

