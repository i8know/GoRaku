/**
 * Utilitas normalisasi kana (Katakana <-> Hiragana) dan ekstraksi teks
 * dari struktur glosarium Yomitan v3 (termasuk structured-content).
 */

/**
 * Mengonversi karakter Katakana dalam string menjadi Hiragana.
 * Karakter non-Katakana (Kanji, Hiragana, tanda baca, serta tanda vokal panjang 'ー')
 * dipertahankan apa adanya.
 *
 * Rentang Unicode:
 * - Katakana 'ァ' (U+30A1) .. 'ヶ' (U+30F6) -> Hiragana 'ぁ' (U+3041) .. 'ゖ' (U+3096) (selisih -0x60)
 * - Tanda pengulangan Katakana 'ヽ' (U+30FD), 'ヾ' (U+30FE) -> 'ゝ' (U+309D), 'ゞ' (U+309E)
 */
export function toHiragana(input: string): string {
  if (!input) return "";
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCharCode(code - 0x60);
    } else if (code === 0x30fd || code === 0x30fe) {
      out += String.fromCharCode(code - 0x60);
    } else {
      out += input[i];
    }
  }
  return out;
}

/**
 * Mengonversi karakter Hiragana dalam string menjadi Katakana.
 */
export function toKatakana(input: string): string {
  if (!input) return "";
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0x3041 && code <= 0x3096) {
      out += String.fromCharCode(code + 0x60);
    } else if (code === 0x309d || code === 0x309e) {
      out += String.fromCharCode(code + 0x60);
    } else {
      out += input[i];
    }
  }
  return out;
}

/**
 * Mengecek apakah karakter tunggal adalah Hiragana atau Katakana (termasuk 'ー').
 */
export function isKanaChar(ch: string): boolean {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) || // Katakana + ー
    (code >= 0xff66 && code <= 0xff9f) // Half-width Katakana
  );
}

/**
 * Mengecek apakah seluruh string terdiri dari karakter Kana (Hiragana/Katakana/ー).
 */
export function isKanaOnly(str: string): boolean {
  if (!str) return false;
  for (let i = 0; i < str.length; i++) {
    if (!isKanaChar(str[i])) return false;
  }
  return true;
}

/**
 * Mengecek apakah karakter adalah Kanji CJK atau Kana Jepang.
 */
export function isJapaneseChar(ch: string): boolean {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (
    isKanaChar(ch) ||
    code === 0x3005 || // 々 (Ideographic iteration mark)
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0xf900 && code <= 0xfaff) // CJK Compatibility Ideographs
  );
}

/**
 * Mengekstrak teks yang dapat dibaca dari node structured-content Yomitan v3.
 * Kamus modern seperti Jitendex atau JMdict terbaru sering menyimpan definisi
 * sebagai pohon objek `{ type: "structured-content", content: ... }`.
 */
function extractStructuredNodeText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);

  if (Array.isArray(node)) {
    return node
      .map((child) => extractStructuredNodeText(child))
      .filter(Boolean)
      .join("");
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const tag = typeof obj.tag === "string" ? obj.tag.toLowerCase() : "";
    const data =
      obj.data && typeof obj.data === "object"
        ? (obj.data as Record<string, unknown>)
        : undefined;

    // Abaikan furigana (<rt>, <rp>) atau atribusi internal di dalam struktur glosarium
    if (tag === "rt" || tag === "rp") {
      return "";
    }
    if (data && (data.content === "attribution" || data.content === "pitch-accent-dictionary")) {
      return "";
    }

    if (tag === "br") {
      return "\n";
    }

    const inner = extractStructuredNodeText(obj.content);
    if (!inner.trim()) return "";

    if (tag === "li") {
      return `• ${inner.trim()}\n`;
    }
    if (tag === "div" || tag === "p" || tag === "ol" || tag === "ul") {
      return `${inner.trim()}\n`;
    }
    return inner;
  }

  return "";
}

/**
 * Mengurai elemen `glossary[]` pada `term_bank_N.json` Yomitan v3 menjadi array string bersih.
 * Mendukung:
 * 1. String biasa: `"to eat"`
 * 2. Objek teks: `{ type: "text", text: "to eat" }`
 * 3. Objek structured-content: `{ type: "structured-content", content: ... }`
 * 4. Objek deinflection/uninflected rule (jarang, berupa `[rule, ...]`)
 */
export function extractYomitanGlossary(rawGlossary: unknown): string[] {
  if (!Array.isArray(rawGlossary)) return [];

  const results: string[] = [];

  for (const item of rawGlossary) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed) results.push(trimmed);
      continue;
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      if (obj.type === "text" && typeof obj.text === "string") {
        const trimmed = obj.text.trim();
        if (trimmed) results.push(trimmed);
      } else if (obj.type === "structured-content") {
        const extracted = extractStructuredNodeText(obj.content)
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        if (extracted) {
          // Pisahkan baris bullet jika hanya 1 blok structured-content besar
          const lines = extracted
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          if (lines.length > 0) {
            results.push(lines.join("; "));
          }
        }
      } else if (obj.type === "image" && typeof obj.description === "string") {
        results.push(`[Gambar: ${obj.description}]`);
      }
    }
  }

  return results;
}

