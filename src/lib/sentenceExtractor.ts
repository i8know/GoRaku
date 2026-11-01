import {
  extractBlockTextWithoutRt,
  isInsideRtOrRp,
  type RubyHint,
} from "./rubyText";

export interface ExtractedSentence {
  /** Kalimat sumber dalam teks biasa */
  sentencePlain: string;
  /** Kalimat sumber dengan kata target ditandai <b>...</b> */
  sentenceHighlightedHtml: string;
  /** Kata/frasa di dalam teks yang ditandai */
  targetSurface: string;
  /** Offset awal kalimat di dalam blok teks */
  sentenceStart: number;
  /** Offset akhir kalimat di dalam blok teks */
  sentenceEnd: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isSentenceTerminator(ch: string): boolean {
  return ch === "。" || ch === "！" || ch === "？" || ch === "!" || ch === "?";
}

function isOpeningQuote(ch: string): boolean {
  return ch === "「" || ch === "『" || ch === "（" || ch === "(";
}

function isClosingQuote(ch: string): boolean {
  return ch === "」" || ch === "』" || ch === "）" || ch === ")";
}

/**
 * Mengekstrak satu kalimat utuh di sekitar posisi klik (`matchStart` .. `matchStart + matchLength`),
 * berdasarkan tanda baca `。！？` dan batas paragraf, serta memperlakukan tanda kutip dialog
 * `「」` dan `『』` secara kontekstual agar dialog tidak terpotong di tengah.
 */
export function extractSentenceAround(
  blockText: string,
  matchStart: number,
  matchLength: number,
  maxChars = 160,
): ExtractedSentence {
  if (!blockText || matchStart < 0 || matchStart >= blockText.length) {
    return {
      sentencePlain: "",
      sentenceHighlightedHtml: "",
      targetSurface: "",
      sentenceStart: 0,
      sentenceEnd: 0,
    };
  }

  const safeMatchEnd = Math.min(
    blockText.length,
    matchStart + Math.max(1, matchLength),
  );

  // 1. Batasi pada paragraf (baris) tempat klik berada
  let paraStart = matchStart;
  while (
    paraStart > 0 &&
    blockText[paraStart - 1] !== "\n" &&
    blockText[paraStart - 1] !== "\r"
  ) {
    paraStart--;
  }

  let paraEnd = safeMatchEnd;
  while (
    paraEnd < blockText.length &&
    blockText[paraEnd] !== "\n" &&
    blockText[paraEnd] !== "\r"
  ) {
    paraEnd++;
  }

  // 2. Pindai paragraf dari paraStart ke paraEnd untuk menemukan titik potong kalimat
  //    yang berada di luar tanda kutip `「...」` / `『...』`.
  const sentenceSpans: Array<{ start: number; end: number }> = [];
  let currentStart = paraStart;
  let quoteDepth = 0;

  for (let i = paraStart; i < paraEnd; i++) {
    const ch = blockText[i];
    if (isOpeningQuote(ch)) {
      quoteDepth++;
      continue;
    }
    if (isClosingQuote(ch)) {
      if (quoteDepth > 0) quoteDepth--;
      // Jika penutup kutip berdiri sendiri di akhir paragraf setelah tanda baca di dalamnya
      if (
        quoteDepth === 0 &&
        i > currentStart &&
        isSentenceTerminator(blockText[i - 1])
      ) {
        // Cek apakah setelah `」` adalah partikel kutipan seperti `と`, `って`, `と先生は...`
        // Jika diikuti teks narasi (bukan spasi/akhir paragraf/kutip baru), biarkan berlanjut sampai `。` narasi!
        const nextChar = i + 1 < paraEnd ? blockText[i + 1] : "";
        if (!nextChar || isOpeningQuote(nextChar) || /\s/.test(nextChar)) {
          sentenceSpans.push({ start: currentStart, end: i + 1 });
          currentStart = i + 1;
        }
      }
      continue;
    }

    if (isSentenceTerminator(ch)) {
      // Lewati tanda baca beruntun seperti `！？` atau `！！`
      while (i + 1 < paraEnd && isSentenceTerminator(blockText[i + 1])) {
        i++;
      }

      if (quoteDepth === 0) {
        // Sertakan penutup kutip langsung setelahnya jika ada
        while (i + 1 < paraEnd && isClosingQuote(blockText[i + 1])) {
          i++;
        }
        sentenceSpans.push({ start: currentStart, end: i + 1 });
        currentStart = i + 1;
      }
    }
  }

  if (currentStart < paraEnd) {
    sentenceSpans.push({ start: currentStart, end: paraEnd });
  }

  // 3. Cari span kalimat tempat `matchStart` berada
  let chosenSpan =
    sentenceSpans.find(
      (s) => matchStart >= s.start && matchStart < s.end,
    ) ?? { start: paraStart, end: paraEnd };

  // Jika span yang terpilih masih terlalu panjang karena ada banyak kalimat di dalam satu `「...」`,
  // pecah secara halus pada `。！？` internal dengan tetap menjaga kutip jika di tepi.
  if (chosenSpan.end - chosenSpan.start > maxChars) {
    let subStart = matchStart;
    while (subStart > chosenSpan.start) {
      const prev = blockText[subStart - 1];
      if (isSentenceTerminator(prev)) break;
      subStart--;
    }
    let subEnd = safeMatchEnd;
    while (subEnd < chosenSpan.end) {
      const cur = blockText[subEnd];
      if (isSentenceTerminator(cur)) {
        subEnd++;
        while (
          subEnd < chosenSpan.end &&
          (isSentenceTerminator(blockText[subEnd]) ||
            isClosingQuote(blockText[subEnd]))
        ) {
          subEnd++;
        }
        break;
      }
      subEnd++;
    }
    // Jika sub-kalimat dimulai tepat setelah `「`, ikutkan `「` pembukanya agar seimbang
    if (
      subStart > chosenSpan.start &&
      isOpeningQuote(blockText[subStart - 1])
    ) {
      subStart--;
    }
    // Jika sub-kalimat memiliki `「` pembuka tanpa `」` penutup, seimbangkan atau buang `「` pembuka gantung
    chosenSpan = { start: subStart, end: subEnd };
  }

  // Rapikan spasi di awal & akhir kalimat
  let sStart = chosenSpan.start;
  let sEnd = chosenSpan.end;
  while (sStart < matchStart && /\s/.test(blockText[sStart])) sStart++;
  while (sEnd > safeMatchEnd && /\s/.test(blockText[sEnd - 1])) sEnd--;

  // 4. Batasi panjang maksimum yang wajar (maxChars) di sekitar kata target
  let prefixEllipsis = false;
  let suffixEllipsis = false;

  if (sEnd - sStart > maxChars) {
    const targetLen = safeMatchEnd - matchStart;
    const budget = Math.max(20, maxChars - targetLen);
    const half = Math.floor(budget / 2);

    const newStart = Math.max(sStart, matchStart - half);
    const newEnd = Math.min(sEnd, safeMatchEnd + (budget - (matchStart - newStart)));

    if (newStart > sStart) {
      prefixEllipsis = true;
      sStart = newStart;
    }
    if (newEnd < sEnd) {
      suffixEllipsis = true;
      sEnd = newEnd;
    }
  }

  // Pastikan tidak ada kutip pembuka tunggal di paling awal tanpa penutup (atau sebaliknya)
  const rawSlice = blockText.slice(sStart, sEnd);
  if (
    (rawSlice.startsWith("「") && !rawSlice.includes("」")) ||
    (rawSlice.startsWith("『") && !rawSlice.includes("』"))
  ) {
    if (sStart < matchStart) sStart++;
  }
  if (
    (rawSlice.endsWith("」") && !rawSlice.includes("「")) ||
    (rawSlice.endsWith("』") && !rawSlice.includes("『"))
  ) {
    if (sEnd > safeMatchEnd) sEnd--;
  }

  const beforeTarget = blockText.slice(sStart, matchStart);
  const targetSurface = blockText.slice(matchStart, safeMatchEnd);
  const afterTarget = blockText.slice(safeMatchEnd, sEnd);

  const prefix = prefixEllipsis ? "…" : "";
  const suffix = suffixEllipsis ? "…" : "";

  const sentencePlain = `${prefix}${beforeTarget}${targetSurface}${afterTarget}${suffix}`;
  const sentenceHighlightedHtml = `${prefix}${escapeHtml(beforeTarget)}<b>${escapeHtml(targetSurface)}</b>${escapeHtml(afterTarget)}${suffix}`;

  return {
    sentencePlain,
    sentenceHighlightedHtml,
    targetSurface,
    sentenceStart: sStart,
    sentenceEnd: sEnd,
  };
}

export interface ClickCharacterResolution {
  /** Elemen blok tempat teks berada */
  blockElement: Element;
  /** Teks bersih blok tanpa isi <rt> dan <rp> */
  cleanText: string;
  /** Indeks karakter di dalam cleanText tepat di bawah penunjuk klik */
  charIndex: number;
  /** Petunjuk bacaan furigana dari tag <ruby><rt> di dalam blok */
  rubyHints: RubyHint[];
  /** Pemetaan setiap Text node ke rentang offset pada cleanText */
  nodeOffsets: Map<Text, { start: number; end: number }>;
}

interface CaretPositionLike {
  offsetNode: Node | null;
  offset: number;
}

/**
 * Menentukan node teks dan offset karakter tepat di bawah koordinat `(clientX, clientY)`
 * menggunakan `caretPositionFromPoint` (standar W3C: Firefox, Chrome 128+, Safari 18+)
 * atau `caretRangeFromPoint` (fallback WebKit/Blink), sekaligus memverifikasi bahwa
 * klik benar-benar mengenai kotak karakter (bukan ruang kosong di luar baris).
 */
export function resolveClickCharacterPosition(
  doc: Document,
  clientX: number,
  clientY: number,
): ClickCharacterResolution | null {
  let targetNode: Node | null = null;
  let targetOffset = 0;

  const docAny = doc as Document & {
    caretPositionFromPoint?: (x: number, y: number) => CaretPositionLike | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  if (typeof docAny.caretPositionFromPoint === "function") {
    const pos = docAny.caretPositionFromPoint(clientX, clientY);
    if (pos && pos.offsetNode) {
      targetNode = pos.offsetNode;
      targetOffset = pos.offset;
    }
  }

  if (!targetNode && typeof docAny.caretRangeFromPoint === "function") {
    const range = docAny.caretRangeFromPoint(clientX, clientY);
    if (range && range.startContainer) {
      targetNode = range.startContainer;
      targetOffset = range.startOffset;
    }
  }

  if (!targetNode) return null;

  // Jika klik mengenai elemen <rt> atau <rp>, arahkan ke teks dasar di dalam <ruby>
  if (isInsideRtOrRp(targetNode, doc.body)) {
    const parentEl =
      targetNode.nodeType === Node.ELEMENT_NODE
        ? (targetNode as Element)
        : targetNode.parentElement;
    const rubyEl = parentEl?.closest("ruby");
    if (rubyEl) {
      for (let i = 0; i < rubyEl.childNodes.length; i++) {
        const child = rubyEl.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE && child.nodeValue?.trim()) {
          targetNode = child;
          targetOffset = 0;
          break;
        }
      }
    }
  }

  // Jika targetNode adalah Element (bukan Text node), coba ambil child Text node terdekat
  if (targetNode.nodeType === Node.ELEMENT_NODE) {
    const el = targetNode as Element;
    const child = el.childNodes[targetOffset] ?? el.childNodes[0];
    if (child && child.nodeType === Node.TEXT_NODE) {
      targetNode = child;
      targetOffset = 0;
    } else {
      return null;
    }
  }

  if (targetNode.nodeType !== Node.TEXT_NODE) return null;
  const textNode = targetNode as Text;
  const nodeVal = textNode.nodeValue ?? "";
  if (!nodeVal.trim()) return null;

  // Sesuaikan offset jika berada di ujung akhir textNode
  const safeNodeOffset = Math.max(
    0,
    Math.min(nodeVal.length - 1, targetOffset),
  );

  // Verifikasi jarak klik ke kotak karakter agar klik di ruang kosong margin tidak memicu popup
  try {
    const charRange = doc.createRange();
    charRange.setStart(textNode, safeNodeOffset);
    charRange.setEnd(
      textNode,
      Math.min(nodeVal.length, safeNodeOffset + 1),
    );
    const rect = charRange.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      const pad = 28;
      if (
        clientX < rect.left - pad ||
        clientX > rect.right + pad ||
        clientY < rect.top - pad ||
        clientY > rect.bottom + pad
      ) {
        return null;
      }
    }
  } catch {
    // Abaikan jika gagal membuat range
  }

  // Temukan elemen blok induk terdekat
  const parentEl = textNode.parentElement;
  if (!parentEl) return null;
  const blockElement =
    parentEl.closest("p, li, blockquote, h1, h2, h3, h4, h5, h6, dd, dt, div") ??
    doc.body;

  const { cleanText, rubyHints, nodeOffsets } =
    extractBlockTextWithoutRt(blockElement);
  const mapped = nodeOffsets.get(textNode);
  if (!mapped) return null;

  const charIndex = mapped.start + safeNodeOffset;
  if (charIndex < 0 || charIndex >= cleanText.length) return null;

  return {
    blockElement,
    cleanText,
    charIndex,
    rubyHints,
    nodeOffsets,
  };
}

/**
 * Membuat DOM `Range` yang menyorot substring `[startOffset, endOffset)` pada `cleanText`
 * meskipun rentang tersebut melintasi beberapa `Text` node atau elemen `<ruby><rt>...</rt></ruby>`.
 */
export function createDomRangeForCleanOffsets(
  doc: Document,
  nodeOffsets: Map<Text, { start: number; end: number }>,
  startOffset: number,
  endOffset: number,
): Range | null {
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  for (const [textNode, span] of nodeOffsets.entries()) {
    if (span.end <= span.start) continue;
    if (!startNode && startOffset >= span.start && startOffset < span.end) {
      startNode = textNode;
      startNodeOffset = startOffset - span.start;
    }
    if (endOffset > span.start && endOffset <= span.end) {
      endNode = textNode;
      endNodeOffset = endOffset - span.start;
      break;
    }
  }

  if (!startNode || !endNode) return null;

  try {
    const range = doc.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  } catch {
    return null;
  }
}

