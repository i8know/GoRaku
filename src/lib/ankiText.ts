// Helpers for turning raw Anki field HTML into safe, displayable content.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const SOUND_RE = /\[sound:([^\]]+)\]/g;
const IMG_RE = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi;

function cleanFileName(raw: string): string {
  let name = decodeEntities(raw).trim();
  try {
    if (/%[0-9a-f]{2}/i.test(name)) name = decodeURIComponent(name);
  } catch {
    /* keep as-is */
  }
  return name;
}

export function extractSounds(html: string): string[] {
  return [...html.matchAll(SOUND_RE)].map((m) => cleanFileName(m[1]));
}

export function extractImages(html: string): string[] {
  return [...html.matchAll(IMG_RE)]
    .map((m) => cleanFileName(m[1] ?? m[2] ?? m[3] ?? ""))
    .filter((n) => n && !/^(https?:|data:)/i.test(n));
}

function stripMedia(html: string): string {
  return html.replace(SOUND_RE, "").replace(/<img\b[^>]*>/gi, "");
}

function stripNoise(html: string): string {
  return html.replace(/<(script|style|head|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
}

/** Plain text with all markup, media references and entities removed. */
export function toPlain(html: string): string {
  return decodeEntities(
    stripNoise(stripMedia(html))
      .replace(/<br\s*\/?>|<\/(div|p|li)>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

const ALLOWED = ["b", "strong", "i", "em", "u", "br", "ruby", "rt", "rp", "sub", "sup"];
const ALLOWED_SET = new Set(ALLOWED);
const BLOCK = new Set(["div", "p", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"]);
const STRAY_LT = new RegExp(`<(?!/?(?:${ALLOWED.join("|")})>)`, "g");

/**
 * Whitelist sanitizer: keeps only a handful of attribute-less inline tags.
 * Every surviving `<` is guaranteed to start one of those exact tags, so the
 * result is safe for `dangerouslySetInnerHTML`.
 */
export function sanitizeInline(html: string): string {
  let s = stripNoise(stripMedia(html)).replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (_m, slash: string, tag: string) => {
    const t = tag.toLowerCase();
    if (t === "br") return "<br>";
    if (ALLOWED_SET.has(t)) return `<${slash}${t}>`;
    if (BLOCK.has(t)) return slash ? "<br>" : "";
    return "";
  });
  s = s.replace(STRAY_LT, "&lt;").replace(/&nbsp;/g, " ");
  s = s.replace(/(\s*<br>\s*){2,}/g, "<br>").replace(/^(\s|<br>)+|(\s|<br>)+$/g, "");
  return s.trim();
}

// Anki furigana syntax: ` 漢字[かんじ]` (a leading space separates the base from preceding text).
const FURI_RE = / ?([^ <>[\]]+?)\[([^[\]<>]+?)\]/g;
const HAS_FURI = /[^\s<>[\]]\[[^[\]<>]+\]/;

export const hasFurigana = (s: string) => HAS_FURI.test(s);
export const furiToKanji = (s: string) => s.replace(FURI_RE, "$1");
export const furiToKana = (s: string) => s.replace(FURI_RE, "$2");
export const furiToRuby = (s: string) => s.replace(FURI_RE, "<ruby>$1<rt>$2</rt></ruby>");

/** Render a stored (sanitized) Japanese field, either as ruby furigana or with readings removed. */
export function renderJapanese(html: string, furigana: boolean): string {
  return furigana ? furiToRuby(html) : furiToKanji(html);
}

// ---------------------------------------------------------------------------
// Field mapping
// ---------------------------------------------------------------------------

export const ROLES = ["word", "reading", "meaning", "sentence", "translation", "audio", "sentenceAudio", "image"] as const;
export type Role = (typeof ROLES)[number];
/** Role → field index in the note type (-1 = not used). */
export type FieldMapping = Record<Role, number>;

export const ROLE_LABELS: Record<Role, { label: string; hint: string; required?: boolean }> = {
  word: { label: "Kata / Depan", hint: "Ditampilkan di sisi depan kartu", required: true },
  reading: { label: "Cara baca", hint: "Kana / furigana" },
  meaning: { label: "Arti", hint: "Jawaban utama di belakang kartu" },
  sentence: { label: "Kalimat contoh", hint: "Konteks bahasa Jepang" },
  translation: { label: "Terjemahan kalimat", hint: "Arti kalimat contoh" },
  audio: { label: "Audio kata", hint: "Field berisi [sound:…]" },
  sentenceAudio: { label: "Audio kalimat", hint: "Opsional" },
  image: { label: "Gambar", hint: "Field berisi <img>" },
};

const CJK = /[\u3040-\u30ff\u3400-\u9fff]/;
const LATIN = /[a-z]{2,}/i;

type Rule = { role: Role; test: (n: string) => boolean };

const has = (re: RegExp) => (n: string) => re.test(n);
const SENT = /(sentence|example|例文|文章|context|kalimat|contoh)/;
const MEAN = /(meaning|translation|english|eng\b|gloss|definition|意味|訳|arti|terjemah|makna|definisi|indonesia|indo\b|id\b)/;
const AUD = /(audio|sound|音声|voice|recording|suara)/;
const READ = /(reading|kana|furigana|hiragana|katakana|読み|yomi|pronunciation|bacaan|cara\s*baca)/;

// Order matters: more specific roles claim their field first.
const RULES: Rule[] = [
  { role: "translation", test: (n) => SENT.test(n) && MEAN.test(n) },
  { role: "sentenceAudio", test: (n) => SENT.test(n) && AUD.test(n) },
  { role: "sentence", test: (n) => SENT.test(n) && !MEAN.test(n) && !AUD.test(n) && !READ.test(n) && !/(romaji|translit)/.test(n) },
  { role: "sentence", test: (n) => SENT.test(n) && !MEAN.test(n) && !AUD.test(n) },
  { role: "audio", test: (n) => AUD.test(n) },
  { role: "image", test: has(/(image|picture|pic\b|img|photo|画像|gambar|foto)/) },
  { role: "reading", test: (n) => READ.test(n) && !AUD.test(n) },
  { role: "meaning", test: (n) => MEAN.test(n) },
  { role: "meaning", test: has(/^(back|belakang|keyword|answer|jawaban)$/) },
  { role: "word", test: has(/^(word|expression|vocab|vocabulary|kanji|front|単語|語彙|表現|term|kata|target word|key|vocab kanji|vocabulary kanji|soal|pertanyaan)$/) },
  { role: "word", test: (n) => /(word|expression|vocab|kanji|front|単語|語|kata|soal)/.test(n) && !MEAN.test(n) && !READ.test(n) && !AUD.test(n) },
];

export function emptyMapping(): FieldMapping {
  return { word: -1, reading: -1, meaning: -1, sentence: -1, translation: -1, audio: -1, sentenceAudio: -1, image: -1 };
}

/** Guess a field mapping from field names, falling back to sniffing sample content. */
export function guessMapping(fieldNames: string[], samples: string[][]): FieldMapping {
  const map = emptyMapping();
  const used = new Set<number>();
  const names = fieldNames.map((n) =>
    n
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .toLowerCase()
      .replace(/[_\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  for (const rule of RULES) {
    if (map[rule.role] >= 0) continue;
    const idx = names.findIndex((n, i) => !used.has(i) && rule.test(n));
    if (idx >= 0) {
      map[rule.role] = idx;
      used.add(idx);
    }
  }

  const sampleHas = (i: number, test: (s: string) => boolean) => samples.some((row) => test(row[i] ?? ""));
  const free = (test: (i: number) => boolean) => fieldNames.findIndex((_, i) => !used.has(i) && test(i));
  const claim = (role: Role, idx: number) => {
    if (idx >= 0 && map[role] < 0) {
      map[role] = idx;
      used.add(idx);
    }
  };

  claim("audio", free((i) => sampleHas(i, (s) => /\[sound:/.test(s))));
  claim("image", free((i) => sampleHas(i, (s) => /<img\b/i.test(s))));
  claim("word", free((i) => sampleHas(i, (s) => CJK.test(toPlain(s)))));
  claim("word", free(() => true));
  claim("meaning", free((i) => sampleHas(i, (s) => LATIN.test(toPlain(s)) && !CJK.test(toPlain(s)))));

  return map;
}
