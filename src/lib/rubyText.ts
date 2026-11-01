/**
 * Utilitas penanganan Furigana (<ruby><rt>...</rt></ruby>) untuk Pembaca Novel
 * dan Sentence Mining.
 *
 * Saat mengambil teks untuk pencarian kamus (`lookup`), isi elemen `<rt>` dan `<rp>`
 * harus diabaikan agar kata dasar (kanji) tidak tercampur dengan bacaan furigananya
 * (mis. `<ruby>私<rt>わたし</rt></ruby>は` -> `"私は"`, bukan `"私わたしは"`),
 * namun bacaan `<rt>` tetap disimpan sebagai petunjuk (`RubyHint`).
 */

export interface RubyHint {
  /** Offset awal kata ber-furigana pada `cleanText` */
  startOffset: number;
  /** Offset akhir kata ber-furigana pada `cleanText` */
  endOffset: number;
  /** Teks dasar (kanji) */
  base: string;
  /** Bacaan furigana dari elemen <rt> */
  reading: string;
}

export interface DOMTextExtraction {
  /** Teks bersih tanpa isi <rt> dan <rp> */
  cleanText: string;
  /** Daftar petunjuk bacaan furigana beserta posisinya pada cleanText */
  rubyHints: RubyHint[];
  /** Pemetaan tiap Text node (di luar <rt>/<rp>) ke rentang indeks pada cleanText */
  nodeOffsets: Map<Text, { start: number; end: number }>;
}

/**
 * Mengecek apakah sebuah node berada di dalam elemen `<rt>` atau `<rp>`.
 */
export function isInsideRtOrRp(node: Node | null, stopAt?: Node | null): boolean {
  let cur: Node | null = node;
  while (cur && cur !== stopAt) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const tag = (cur as Element).tagName.toLowerCase();
      if (tag === "rt" || tag === "rp") return true;
    }
    cur = cur.parentNode;
  }
  return false;
}

/**
 * Mengekstrak teks pencarian bersih (`cleanText`) dari sebuah elemen DOM blok
 * (mis. `<p>`, `<div>`, `<li>`), membuang isi `<rt>` dan `<rp>`, menyimpan
 * petunjuk bacaan furigana (`rubyHints`), serta mencatat offset tiap `Text` node.
 */
export function extractBlockTextWithoutRt(root: Node): DOMTextExtraction {
  let cleanText = "";
  const rubyHints: RubyHint[] = [];
  const nodeOffsets = new Map<Text, { start: number; end: number }>();

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const val = textNode.nodeValue ?? "";
      const start = cleanText.length;
      cleanText += val;
      const end = cleanText.length;
      nodeOffsets.set(textNode, { start, end });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === "rt" || tag === "rp" || tag === "script" || tag === "style") {
      return;
    }

    if (tag === "ruby") {
      const rubyStart = cleanText.length;
      let baseAccum = "";
      let rtAccum = "";

      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childTag = (child as Element).tagName.toLowerCase();
          if (childTag === "rt") {
            rtAccum += child.textContent ?? "";
            continue;
          }
          if (childTag === "rp") {
            continue;
          }
        }
        const beforeLen = cleanText.length;
        walk(child);
        baseAccum += cleanText.slice(beforeLen);
      }

      const rubyEnd = cleanText.length;
      if (baseAccum.trim() && rtAccum.trim()) {
        rubyHints.push({
          startOffset: rubyStart,
          endOffset: rubyEnd,
          base: baseAccum.trim(),
          reading: rtAccum.trim(),
        });
      }
      return;
    }

    for (let i = 0; i < el.childNodes.length; i++) {
      walk(el.childNodes[i]);
    }
  }

  walk(root);
  return { cleanText, rubyHints, nodeOffsets };
}

/**
 * Mengurai string HTML yang mengandung tag `<ruby>...<rt>...</rt></ruby>`
 * secara murni (tanpa bergantung pada browser DOM, sehingga dapat diuji di Node/Vitest)
 * menjadi `cleanText` (tanpa isi `<rt>`/`<rp>`) dan daftar `rubyHints`.
 */
export function parseRubyHtmlToSearchText(html: string): {
  cleanText: string;
  rubyHints: RubyHint[];
} {
  const rubyHints: RubyHint[] = [];
  let cleanText = "";

  // Tokenisasi sederhana untuk tag <ruby>...</ruby> dan tag lainnya
  const rubyBlockRegex = /<ruby\b[^>]*>([\s\S]*?)<\/ruby>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const stripTags = (fragment: string) =>
    fragment
      .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, "")
      .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, "")
      .replace(/<[^>]+>/g, "");

  while ((match = rubyBlockRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      cleanText += stripTags(html.slice(lastIndex, match.index));
    }

    const innerRuby = match[1];
    const rtMatches = Array.from(
      innerRuby.matchAll(/<rt\b[^>]*>([\s\S]*?)<\/rt>/gi),
    );
    const reading = rtMatches
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .join("");

    const base = stripTags(innerRuby);
    const startOffset = cleanText.length;
    cleanText += base;
    const endOffset = cleanText.length;

    if (base.trim() && reading) {
      rubyHints.push({
        startOffset,
        endOffset,
        base: base.trim(),
        reading,
      });
    }

    lastIndex = rubyBlockRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    cleanText += stripTags(html.slice(lastIndex));
  }

  return { cleanText, rubyHints };
}

/**
 * Mengonversi notasi furigana novel TXT Jepang (Aozora Bunko / Narou):
 * - `｜漢字《かんじ》` atau `|漢字《かんじ》` -> `<ruby>漢字<rt>かんじ</rt></ruby>`
 * - `漢字《かんじ》` (runtutan Kanji diikuti `《...》`) -> `<ruby>漢字<rt>かんじ</rt></ruby>`
 */
export function convertAozoraRubyToHtml(escapedLine: string): string {
  return escapedLine
    .replace(
      /[｜|]([^｜|《》\n]+?)《([^《》\n]+?)》/g,
      "<ruby>$1<rt>$2</rt></ruby>",
    )
    .replace(
      /([\u4e00-\u9fff\u3005\u3400-\u4dbf]+)《([^《》\n]+?)》/g,
      "<ruby>$1<rt>$2</rt></ruby>",
    );
}

