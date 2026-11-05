/**
 * Furigana Generator & Ruby Node Formatter untuk JLPT N5
 *
 * Mengubah token / teks bahasa Jepang menjadi QuestionRubyNode[] sesuai skema,
 * mendukung sakelar furigana (showFurigana: boolean), penyembunyian bacaan
 * pada kata target yang sedang diuji (suppressWord), dan perenderan HTML/teks.
 */

import { QuestionRubyNode } from "../../src/lib/questionPack";
import { tokenizeJapanese, Token } from "./tokenizer";

/**
 * Memeriksa apakah suatu karakter adalah kanji (CJK Unified Ideographs).
 */
export function isKanji(char: string): boolean {
  return /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(char);
}

/**
 * Memeriksa apakah suatu string mengandung minimal satu karakter kanji.
 */
export function containsKanji(str: string): boolean {
  return /[\u4E00-\u9FAF\u3400-\u4DBF]/.test(str);
}

/**
 * Memecah token dengan kanji & okurigana menjadi QuestionRubyNode[] yang rapi.
 *
 * Contoh:
 * - "日本" (にほん) -> [{ text: "日本", rt: "にほん" }]
 * - "食べる" (たべる) -> [{ text: "食", rt: "た" }, { text: "べる" }]
 * - "飲みます" (のみます) -> [{ text: "飲", rt: "の" }, { text: "みます" }]
 * - "新しい" (あたらしい) -> [{ text: "新", rt: "あたら" }, { text: "しい" }]
 * - "お茶" (おちゃ) -> [{ text: "お" }, { text: "茶", rt: "ちゃ" }]
 * - "本" (ほん) -> [{ text: "本", rt: "ほん" }]
 * - "を" (お) -> [{ text: "を" }] (tanpa furigana karena bukan kanji)
 */
export function alignFuriganaForWord(surface: string, reading: string): QuestionRubyNode[] {
  // Jika surface tidak mengandung kanji, furigana tidak diperlukan
  if (!containsKanji(surface)) {
    return [{ text: surface }];
  }

  // Jika surface seluruhnya kanji, seluruh kata diberi bacaan
  if (/^[\u4E00-\u9FAF\u3400-\u4DBF]+$/.test(surface)) {
    return [{ text: surface, rt: reading }];
  }

  // Cek prefix kana (misal: "お茶" dengan reading "おちゃ")
  let leadLen = 0;
  while (
    leadLen < surface.length &&
    leadLen < reading.length &&
    !isKanji(surface[leadLen]) &&
    surface[leadLen] === reading[leadLen]
  ) {
    leadLen++;
  }

  // Cek suffix kana (okurigana, misal: "食べる" reading "たべる", suffix "べる")
  let trailSurf = surface.length - 1;
  let trailRead = reading.length - 1;
  while (
    trailSurf >= leadLen &&
    trailRead >= leadLen &&
    !isKanji(surface[trailSurf]) &&
    surface[trailSurf] === reading[trailRead]
  ) {
    trailSurf--;
    trailRead--;
  }

  const prefixText = surface.substring(0, leadLen);
  const suffixText = surface.substring(trailSurf + 1);
  const midSurf = surface.substring(leadLen, trailSurf + 1);
  const midRead = reading.substring(leadLen, trailRead + 1);

  const nodes: QuestionRubyNode[] = [];

  if (prefixText) {
    nodes.push({ text: prefixText });
  }

  if (midSurf) {
    if (containsKanji(midSurf)) {
      nodes.push({ text: midSurf, rt: midRead });
    } else {
      nodes.push({ text: midSurf });
    }
  }

  if (suffixText) {
    nodes.push({ text: suffixText });
  }

  return nodes.length > 0 ? nodes : [{ text: surface, rt: reading }];
}

export interface FuriganaOptions {
  /** Kata atau lemma yang furigananya disembunyikan (mis. kata target yang sedang diuji di G1) */
  suppressWord?: string;
  /** Sakelar global furigana (default: true) */
  showFurigana?: boolean;
}

/**
 * Menghasilkan QuestionRubyNode[] dari sebuah kalimat Jepang lengkap.
 */
export function generateRubyNodes(
  text: string,
  options?: FuriganaOptions
): QuestionRubyNode[] {
  const tokens: Token[] = tokenizeJapanese(text);
  const nodes: QuestionRubyNode[] = [];
  const suppressTarget = options?.suppressWord?.trim();

  for (const token of tokens) {
    const isSuppressed =
      suppressTarget &&
      (token.surface === suppressTarget ||
        token.lemma === suppressTarget ||
        token.surface.includes(suppressTarget) ||
        suppressTarget.includes(token.surface));

    if (isSuppressed || !containsKanji(token.surface)) {
      nodes.push({ text: token.surface });
    } else {
      const wordNodes = alignFuriganaForWord(token.surface, token.reading);
      nodes.push(...wordNodes);
    }
  }

  // Gabungkan node berurutan yang keduanya tidak memiliki furigana untuk efisiensi
  const compactedNodes: QuestionRubyNode[] = [];
  for (const node of nodes) {
    const prev = compactedNodes[compactedNodes.length - 1];
    if (prev && !prev.rt && !node.rt) {
      prev.text += node.text;
    } else {
      compactedNodes.push({ ...node });
    }
  }

  return compactedNodes;
}

/**
 * Merender QuestionRubyNode[] ke format HTML dengan tag <ruby><rt>...</rt></ruby>.
 * Mematuhi sakelar showFurigana.
 */
export function renderRubyHtml(
  nodes: QuestionRubyNode[],
  showFurigana: boolean = true
): string {
  return nodes
    .map((node) => {
      if (showFurigana && node.rt) {
        return `<ruby>${escapeHtml(node.text)}<rt>${escapeHtml(node.rt)}</rt></ruby>`;
      }
      return escapeHtml(node.text);
    })
    .join("");
}

/**
 * Merender QuestionRubyNode[] ke string teks biasa.
 * Jika showFurigana true: "日本[にほん]語"
 * Jika showFurigana false: "日本語"
 */
export function renderRubyPlainText(
  nodes: QuestionRubyNode[],
  showFurigana: boolean = true
): string {
  return nodes
    .map((node) => {
      if (showFurigana && node.rt) {
        return `${node.text}[${node.rt}]`;
      }
      return node.text;
    })
    .join("");
}

/**
 * Menandai kata target dalam HTML dengan garis bawah <u>...</u>,
 * dengan tetap menghormati sakelar furigana.
 */
export function renderPromptWithUnderline(
  nodes: QuestionRubyNode[],
  targetSurface: string,
  showFurigana: boolean = true
): string {
  // Render HTML penuh terlebih dahulu
  const fullHtml = renderRubyHtml(nodes, showFurigana);

  // Jika kata target ada di dalam HTML, bungkus kemunculan pertama dengan <u>
  // Perhatikan bila target ada di dalam tag <ruby>
  if (fullHtml.includes(targetSurface)) {
    return fullHtml.replace(targetSurface, `<u>${targetSurface}</u>`);
  }

  // Bila kata target terurai dalam ruby node (misal <ruby>読<rt>よ</rt></ruby>みます),
  // bungkus seluruh elemen target
  const targetTokens = tokenizeJapanese(targetSurface);
  const targetMain = targetTokens[0]?.surface || targetSurface;
  if (fullHtml.includes(targetMain)) {
    return fullHtml.replace(targetMain, `<u>${targetMain}</u>`);
  }

  return fullHtml;
}

/**
 * Mengganti kata target dalam node ruby dengan blank "____" (untuk soal G3/G4).
 */
export function maskRubyNodes(
  nodes: QuestionRubyNode[],
  targetText: string,
  mask: string = "____"
): QuestionRubyNode[] {
  const result: QuestionRubyNode[] = [];
  let masked = false;

  for (const node of nodes) {
    if (!masked && (node.text === targetText || node.text.includes(targetText))) {
      result.push({ text: mask });
      masked = true;
    } else {
      result.push({ ...node });
    }
  }

  return result;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

