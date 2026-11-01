/**
 * Mesin Deinflection Bahasa Jepang (Mandiri / Clean-Room Implementation).
 *
 * Mengonversi kata kerja dan adjektiva bahasa Jepang yang terkonjugasi
 * kembali ke bentuk kamus (dictionary form) dengan memvalidasi rantai transisi
 * terhadap tag aturan gramatikal (`v1`, `v5`, `adj-i`, `vs`, `vk`, `vz`).
 */

export type GrammarTag = "v1" | "v5" | "adj-i" | "vs" | "vk" | "vz";

type InternalState = GrammarTag | "surface" | "te" | "masu";

export interface DeinflectRule {
  from: string;
  to: string;
  /** State yang diizinkan pada kata sebelum aturan ini diterapkan */
  allowedFrom: readonly InternalState[];
  /** State yang dihasilkan setelah aturan ini diterapkan */
  nextState: GrammarTag | "te" | "masu";
  /** Label konjugasi dalam bahasa Indonesia */
  reason: string;
  /** Panjang minimum prefix sebelum `from` (default: 1, atau 0 jika kata utuh seperti 来ます -> 来る) */
  minPrefixLength?: number;
}

export interface DeinflectCandidate {
  /** Bentuk hasil deinflection (calon entri kamus) */
  term: string;
  /**
   * Tag aturan kamus yang wajib dimiliki entri kamus.
   * Array kosong `[]` berarti bentuk asli dari teks (tanpa deinflection),
   * sehingga cocok dengan kata benda, partikel, adverbia, maupun kata kerja bentuk kamus.
   */
  requiredTags: GrammarTag[];
  /** Rantai alasan konjugasi dari permukaan ke bentuk dasar */
  reasons: string[];
}

const SURFACE_OR_ADJ: readonly InternalState[] = ["surface", "adj-i"];
const SURFACE_OR_V1: readonly InternalState[] = ["surface", "v1"];
const SURFACE_OR_V5: readonly InternalState[] = ["surface", "v5"];
const SURFACE_OR_VS: readonly InternalState[] = ["surface", "vs"];
const SURFACE_OR_VK: readonly InternalState[] = ["surface", "vk"];
const SURFACE_OR_TE: readonly InternalState[] = ["surface", "te"];
const SURFACE_OR_MASU: readonly InternalState[] = ["surface", "masu"];
const ONLY_SURFACE: readonly InternalState[] = ["surface"];

const GODAN_TABLE: readonly {
  u: string;
  a: string;
  i: string;
  e: string;
  o: string;
  te: string;
  ta: string;
  tara: string;
  tari: string;
}[] = [
  { u: "う", a: "わ", i: "い", e: "え", o: "お", te: "って", ta: "った", tara: "ったら", tari: "ったり" },
  { u: "く", a: "か", i: "き", e: "け", o: "こ", te: "いて", ta: "いた", tara: "いたら", tari: "いたり" },
  { u: "ぐ", a: "が", i: "ぎ", e: "げ", o: "ご", te: "いで", ta: "いだ", tara: "いだら", tari: "いだり" },
  { u: "す", a: "さ", i: "し", e: "せ", o: "そ", te: "して", ta: "した", tara: "したら", tari: "したり" },
  { u: "つ", a: "た", i: "ち", e: "て", o: "と", te: "って", ta: "った", tara: "ったら", tari: "ったり" },
  { u: "ぬ", a: "な", i: "に", e: "ね", o: "の", te: "んで", ta: "んだ", tara: "んだら", tari: "んだり" },
  { u: "ぶ", a: "ば", i: "び", e: "べ", o: "ぼ", te: "んで", ta: "んだ", tara: "んだら", tari: "んだり" },
  { u: "む", a: "ま", i: "み", e: "め", o: "も", te: "んで", ta: "んだ", tara: "んだら", tari: "んだり" },
  { u: "る", a: "ら", i: "り", e: "れ", o: "ろ", te: "って", ta: "った", tara: "ったら", tari: "ったり" },
];

function buildDeinflectRules(): DeinflectRule[] {
  const rules: DeinflectRule[] = [];

  // =========================================================================
  // 1. Akhiran Sopan (-masu) -> direduksi ke state "masu"
  // =========================================================================
  rules.push(
    {
      from: "ませんでした",
      to: "ます",
      allowedFrom: ONLY_SURFACE,
      nextState: "masu",
      reason: "sopan negatif lampau",
    },
    {
      from: "ました",
      to: "ます",
      allowedFrom: ONLY_SURFACE,
      nextState: "masu",
      reason: "sopan lampau",
    },
    {
      from: "ません",
      to: "ます",
      allowedFrom: ONLY_SURFACE,
      nextState: "masu",
      reason: "sopan negatif",
    },
    {
      from: "ましょう",
      to: "ます",
      allowedFrom: ONLY_SURFACE,
      nextState: "masu",
      reason: "ajakan sopan",
    },
  );

  // =========================================================================
  // 2. Adjektiva -i (adj-i) & Stem Ajektival (-nai, -tai)
  // =========================================================================
  rules.push(
    {
      from: "くなかった",
      to: "い",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "adj-i",
      reason: "negatif lampau",
    },
    {
      from: "くない",
      to: "い",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "adj-i",
      reason: "negatif",
    },
    {
      from: "くなくて",
      to: "い",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "adj-i",
      reason: "negatif -te",
    },
    {
      from: "かった",
      to: "い",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "adj-i",
      reason: "lampau",
    },
    {
      from: "くて",
      to: "い",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "adj-i",
      reason: "bentuk -te",
    },
    {
      from: "ければ",
      to: "い",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "adj-i",
      reason: "kondisional -ba",
    },
    {
      from: "かったら",
      to: "い",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "adj-i",
      reason: "kondisional -tara",
    },
    {
      from: "さそう",
      to: "い",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "adj-i",
      reason: "tampak (-sou)",
    },
    {
      from: "そう",
      to: "い",
      allowedFrom: ONLY_SURFACE,
      nextState: "adj-i",
      reason: "tampak (-sou)",
    },
    {
      from: "く",
      to: "い",
      allowedFrom: ONLY_SURFACE,
      nextState: "adj-i",
      reason: "adverbia",
    },
    // Bentuk khusus いい (dari よく-)
    {
      from: "よくなかった",
      to: "いい",
      allowedFrom: ONLY_SURFACE,
      nextState: "adj-i",
      reason: "negatif lampau",
      minPrefixLength: 0,
    },
    {
      from: "よくない",
      to: "いい",
      allowedFrom: ONLY_SURFACE,
      nextState: "adj-i",
      reason: "negatif",
      minPrefixLength: 0,
    },
    {
      from: "よかった",
      to: "いい",
      allowedFrom: ONLY_SURFACE,
      nextState: "adj-i",
      reason: "lampau",
      minPrefixLength: 0,
    },
    {
      from: "よくて",
      to: "いい",
      allowedFrom: ONLY_SURFACE,
      nextState: "adj-i",
      reason: "bentuk -te",
      minPrefixLength: 0,
    },
  );

  // =========================================================================
  // 3. Konstruksi Progresif & Bantu pada Bentuk -te/-de -> state "te"
  // =========================================================================
  rules.push(
    {
      from: "ている",
      to: "て",
      allowedFrom: SURFACE_OR_V1,
      nextState: "te",
      reason: "progresif (-te iru)",
    },
    {
      from: "ていた",
      to: "て",
      allowedFrom: ONLY_SURFACE,
      nextState: "te",
      reason: "progresif lampau (-te ita)",
    },
    {
      from: "てる",
      to: "て",
      allowedFrom: SURFACE_OR_V1,
      nextState: "te",
      reason: "progresif (-teru)",
    },
    {
      from: "てた",
      to: "て",
      allowedFrom: ONLY_SURFACE,
      nextState: "te",
      reason: "progresif lampau (-teta)",
    },
    {
      from: "でいる",
      to: "で",
      allowedFrom: SURFACE_OR_V1,
      nextState: "te",
      reason: "progresif (-de iru)",
    },
    {
      from: "でいた",
      to: "で",
      allowedFrom: ONLY_SURFACE,
      nextState: "te",
      reason: "progresif lampau (-de ita)",
    },
    {
      from: "でる",
      to: "で",
      allowedFrom: SURFACE_OR_V1,
      nextState: "te",
      reason: "progresif (-deru)",
    },
    {
      from: "でた",
      to: "で",
      allowedFrom: ONLY_SURFACE,
      nextState: "te",
      reason: "progresif lampau (-deta)",
    },
    {
      from: "ておく",
      to: "て",
      allowedFrom: SURFACE_OR_V5,
      nextState: "te",
      reason: "persiapan (-te oku)",
    },
    {
      from: "とく",
      to: "て",
      allowedFrom: SURFACE_OR_V5,
      nextState: "te",
      reason: "persiapan (-toku)",
    },
    {
      from: "てしまう",
      to: "て",
      allowedFrom: SURFACE_OR_V5,
      nextState: "te",
      reason: "selesai (-te shimau)",
    },
    {
      from: "でしまう",
      to: "で",
      allowedFrom: SURFACE_OR_V5,
      nextState: "te",
      reason: "selesai (-de shimau)",
    },
    {
      from: "ちゃう",
      to: "て",
      allowedFrom: SURFACE_OR_V5,
      nextState: "te",
      reason: "selesai (-chau)",
    },
    {
      from: "じゃう",
      to: "で",
      allowedFrom: SURFACE_OR_V5,
      nextState: "te",
      reason: "selesai (-jau)",
    },
  );

  // =========================================================================
  // 4. Verba Ichidan (v1)
  // =========================================================================
  rules.push(
    {
      from: "ます",
      to: "る",
      allowedFrom: SURFACE_OR_MASU,
      nextState: "v1",
      reason: "sopan (-masu)",
    },
    {
      from: "ない",
      to: "る",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "v1",
      reason: "negatif",
    },
    {
      from: "なくて",
      to: "る",
      allowedFrom: ONLY_SURFACE,
      nextState: "v1",
      reason: "negatif -te",
    },
    {
      from: "たい",
      to: "る",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "v1",
      reason: "keinginan (-tai)",
    },
    {
      from: "させる",
      to: "る",
      allowedFrom: SURFACE_OR_V1,
      nextState: "v1",
      reason: "kausatif",
    },
    {
      from: "られる",
      to: "る",
      allowedFrom: SURFACE_OR_V1,
      nextState: "v1",
      reason: "pasif/potensial",
    },
    {
      from: "れる",
      to: "る",
      allowedFrom: SURFACE_OR_V1,
      nextState: "v1",
      reason: "potensial (ra-nuki)",
    },
    {
      from: "て",
      to: "る",
      allowedFrom: SURFACE_OR_TE,
      nextState: "v1",
      reason: "bentuk -te",
    },
    {
      from: "た",
      to: "る",
      allowedFrom: ONLY_SURFACE,
      nextState: "v1",
      reason: "lampau",
    },
    {
      from: "たら",
      to: "る",
      allowedFrom: ONLY_SURFACE,
      nextState: "v1",
      reason: "kondisional -tara",
    },
    {
      from: "たり",
      to: "る",
      allowedFrom: ONLY_SURFACE,
      nextState: "v1",
      reason: "alternatif -tari",
    },
    {
      from: "れば",
      to: "る",
      allowedFrom: ONLY_SURFACE,
      nextState: "v1",
      reason: "kondisional -ba",
    },
    {
      from: "よう",
      to: "る",
      allowedFrom: ONLY_SURFACE,
      nextState: "v1",
      reason: "volisional",
    },
    {
      from: "そう",
      to: "る",
      allowedFrom: ONLY_SURFACE,
      nextState: "v1",
      reason: "tampak (-sou)",
    },
    {
      from: "ろ",
      to: "る",
      allowedFrom: ONLY_SURFACE,
      nextState: "v1",
      reason: "imperatif",
    },
  );

  // =========================================================================
  // 5. Verba Godan (v5) — seluruh 9 akhiran
  // =========================================================================
  for (const row of GODAN_TABLE) {
    rules.push(
      // Sopan (-masu)
      {
        from: `${row.i}ます`,
        to: row.u,
        allowedFrom: SURFACE_OR_MASU,
        nextState: "v5",
        reason: "sopan (-masu)",
      },
      // Negatif (-nai)
      {
        from: `${row.a}ない`,
        to: row.u,
        allowedFrom: SURFACE_OR_ADJ,
        nextState: "v5",
        reason: "negatif",
      },
      // Negatif -te (-nakute)
      {
        from: `${row.a}なくて`,
        to: row.u,
        allowedFrom: ONLY_SURFACE,
        nextState: "v5",
        reason: "negatif -te",
      },
      // Keinginan (-tai)
      {
        from: `${row.i}たい`,
        to: row.u,
        allowedFrom: SURFACE_OR_ADJ,
        nextState: "v5",
        reason: "keinginan (-tai)",
      },
      // Tampak (-sou)
      {
        from: `${row.i}そう`,
        to: row.u,
        allowedFrom: ONLY_SURFACE,
        nextState: "v5",
        reason: "tampak (-sou)",
      },
      // Kausatif (-seru & pendek -su)
      {
        from: `${row.a}せる`,
        to: row.u,
        allowedFrom: SURFACE_OR_V1,
        nextState: "v5",
        reason: "kausatif",
      },
      {
        from: `${row.a}される`,
        to: row.u,
        allowedFrom: SURFACE_OR_V1,
        nextState: "v5",
        reason: "kausatif-pasif",
      },
      // Pasif (-reru)
      {
        from: `${row.a}れる`,
        to: row.u,
        allowedFrom: SURFACE_OR_V1,
        nextState: "v5",
        reason: "pasif",
      },
      // Potensial (-eru)
      {
        from: `${row.e}る`,
        to: row.u,
        allowedFrom: SURFACE_OR_V1,
        nextState: "v5",
        reason: "potensial",
      },
      // Bentuk -te / -de
      {
        from: row.te,
        to: row.u,
        allowedFrom: SURFACE_OR_TE,
        nextState: "v5",
        reason: "bentuk -te",
      },
      // Bentuk lampau -ta / -da
      {
        from: row.ta,
        to: row.u,
        allowedFrom: ONLY_SURFACE,
        nextState: "v5",
        reason: "lampau",
      },
      // Kondisional -tara / -dara
      {
        from: row.tara,
        to: row.u,
        allowedFrom: ONLY_SURFACE,
        nextState: "v5",
        reason: "kondisional -tara",
      },
      // Alternatif -tari / -dari
      {
        from: row.tari,
        to: row.u,
        allowedFrom: ONLY_SURFACE,
        nextState: "v5",
        reason: "alternatif -tari",
      },
      // Kondisional -ba
      {
        from: `${row.e}ば`,
        to: row.u,
        allowedFrom: ONLY_SURFACE,
        nextState: "v5",
        reason: "kondisional -ba",
      },
      // Volisional -ou
      {
        from: `${row.o}う`,
        to: row.u,
        allowedFrom: ONLY_SURFACE,
        nextState: "v5",
        reason: "volisional",
      },
    );
  }

  // Pengecualian Godan: 行く / いく / ゆく (bentuk -te/-ta geminasi っ)
  rules.push(
    {
      from: "行って",
      to: "行く",
      allowedFrom: SURFACE_OR_TE,
      nextState: "v5",
      reason: "bentuk -te",
      minPrefixLength: 0,
    },
    {
      from: "行った",
      to: "行く",
      allowedFrom: ONLY_SURFACE,
      nextState: "v5",
      reason: "lampau",
      minPrefixLength: 0,
    },
    {
      from: "行ったら",
      to: "行く",
      allowedFrom: ONLY_SURFACE,
      nextState: "v5",
      reason: "kondisional -tara",
      minPrefixLength: 0,
    },
    {
      from: "いって",
      to: "いく",
      allowedFrom: SURFACE_OR_TE,
      nextState: "v5",
      reason: "bentuk -te",
      minPrefixLength: 0,
    },
    {
      from: "いった",
      to: "いく",
      allowedFrom: ONLY_SURFACE,
      nextState: "v5",
      reason: "lampau",
      minPrefixLength: 0,
    },
  );

  // =========================================================================
  // 6. Verba Tak Beraturan する (vs) & Konstruksi Nomina + する
  // =========================================================================
  rules.push(
    {
      from: "します",
      to: "する",
      allowedFrom: SURFACE_OR_MASU,
      nextState: "vs",
      reason: "sopan (-masu)",
      minPrefixLength: 0,
    },
    {
      from: "しない",
      to: "する",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "vs",
      reason: "negatif",
      minPrefixLength: 0,
    },
    {
      from: "しなくて",
      to: "する",
      allowedFrom: ONLY_SURFACE,
      nextState: "vs",
      reason: "negatif -te",
      minPrefixLength: 0,
    },
    {
      from: "したい",
      to: "する",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "vs",
      reason: "keinginan (-tai)",
      minPrefixLength: 0,
    },
    {
      from: "しそう",
      to: "する",
      allowedFrom: ONLY_SURFACE,
      nextState: "vs",
      reason: "tampak (-sou)",
      minPrefixLength: 0,
    },
    {
      from: "させる",
      to: "する",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vs",
      reason: "kausatif",
      minPrefixLength: 0,
    },
    {
      from: "される",
      to: "する",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vs",
      reason: "pasif",
      minPrefixLength: 0,
    },
    {
      from: "できる",
      to: "する",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vs",
      reason: "potensial",
      minPrefixLength: 0,
    },
    {
      from: "して",
      to: "する",
      allowedFrom: SURFACE_OR_TE,
      nextState: "vs",
      reason: "bentuk -te",
      minPrefixLength: 0,
    },
    {
      from: "した",
      to: "する",
      allowedFrom: ONLY_SURFACE,
      nextState: "vs",
      reason: "lampau",
      minPrefixLength: 0,
    },
    {
      from: "したら",
      to: "する",
      allowedFrom: ONLY_SURFACE,
      nextState: "vs",
      reason: "kondisional -tara",
      minPrefixLength: 0,
    },
    {
      from: "したり",
      to: "する",
      allowedFrom: ONLY_SURFACE,
      nextState: "vs",
      reason: "alternatif -tari",
      minPrefixLength: 0,
    },
    {
      from: "すれば",
      to: "する",
      allowedFrom: ONLY_SURFACE,
      nextState: "vs",
      reason: "kondisional -ba",
      minPrefixLength: 0,
    },
    {
      from: "しよう",
      to: "する",
      allowedFrom: ONLY_SURFACE,
      nextState: "vs",
      reason: "volisional",
      minPrefixLength: 0,
    },
    // Pelepasan する pada verba majemuk N+する (mis. 勉強する -> 勉強)
    // Hanya berlaku jika ada nomina di depannya (minPrefixLength: 1)
    {
      from: "する",
      to: "",
      allowedFrom: SURFACE_OR_VS,
      nextState: "vs",
      reason: "verba-suru",
      minPrefixLength: 1,
    },
  );

  // =========================================================================
  // 7. Verba Tak Beraturan 来る / くる (vk)
  // =========================================================================
  rules.push(
    // Bentuk Kanji (来-)
    {
      from: "来ます",
      to: "来る",
      allowedFrom: SURFACE_OR_MASU,
      nextState: "vk",
      reason: "sopan (-masu)",
      minPrefixLength: 0,
    },
    {
      from: "来ない",
      to: "来る",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "vk",
      reason: "negatif",
      minPrefixLength: 0,
    },
    {
      from: "来なくて",
      to: "来る",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "negatif -te",
      minPrefixLength: 0,
    },
    {
      from: "来たい",
      to: "来る",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "vk",
      reason: "keinginan (-tai)",
      minPrefixLength: 0,
    },
    {
      from: "来そう",
      to: "来る",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "tampak (-sou)",
      minPrefixLength: 0,
    },
    {
      from: "来させる",
      to: "来る",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vk",
      reason: "kausatif",
      minPrefixLength: 0,
    },
    {
      from: "来られる",
      to: "来る",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vk",
      reason: "pasif/potensial",
      minPrefixLength: 0,
    },
    {
      from: "来れる",
      to: "来る",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vk",
      reason: "potensial",
      minPrefixLength: 0,
    },
    {
      from: "来て",
      to: "来る",
      allowedFrom: SURFACE_OR_TE,
      nextState: "vk",
      reason: "bentuk -te",
      minPrefixLength: 0,
    },
    {
      from: "来た",
      to: "来る",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "lampau",
      minPrefixLength: 0,
    },
    {
      from: "来たら",
      to: "来る",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "kondisional -tara",
      minPrefixLength: 0,
    },
    {
      from: "来れば",
      to: "来る",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "kondisional -ba",
      minPrefixLength: 0,
    },
    {
      from: "来よう",
      to: "来る",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "volisional",
      minPrefixLength: 0,
    },
    // Bentuk Kana (き- / こ- / くれ- -> くる)
    {
      from: "きます",
      to: "くる",
      allowedFrom: SURFACE_OR_MASU,
      nextState: "vk",
      reason: "sopan (-masu)",
      minPrefixLength: 0,
    },
    {
      from: "こない",
      to: "くる",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "vk",
      reason: "negatif",
      minPrefixLength: 0,
    },
    {
      from: "こなくて",
      to: "くる",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "negatif -te",
      minPrefixLength: 0,
    },
    {
      from: "きたい",
      to: "くる",
      allowedFrom: SURFACE_OR_ADJ,
      nextState: "vk",
      reason: "keinginan (-tai)",
      minPrefixLength: 0,
    },
    {
      from: "きそう",
      to: "くる",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "tampak (-sou)",
      minPrefixLength: 0,
    },
    {
      from: "こさせる",
      to: "くる",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vk",
      reason: "kausatif",
      minPrefixLength: 0,
    },
    {
      from: "こられる",
      to: "くる",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vk",
      reason: "pasif/potensial",
      minPrefixLength: 0,
    },
    {
      from: "これる",
      to: "くる",
      allowedFrom: SURFACE_OR_V1,
      nextState: "vk",
      reason: "potensial",
      minPrefixLength: 0,
    },
    {
      from: "きて",
      to: "くる",
      allowedFrom: SURFACE_OR_TE,
      nextState: "vk",
      reason: "bentuk -te",
      minPrefixLength: 0,
    },
    {
      from: "きた",
      to: "くる",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "lampau",
      minPrefixLength: 0,
    },
    {
      from: "きたら",
      to: "くる",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "kondisional -tara",
      minPrefixLength: 0,
    },
    {
      from: "くれば",
      to: "くる",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "kondisional -ba",
      minPrefixLength: 0,
    },
    {
      from: "こよう",
      to: "くる",
      allowedFrom: ONLY_SURFACE,
      nextState: "vk",
      reason: "volisional",
      minPrefixLength: 0,
    },
  );

  return rules;
}

export const DEINFLECT_RULES: readonly DeinflectRule[] = buildDeinflectRules();

const GRAMMAR_TAGS = new Set<string>(["v1", "v5", "adj-i", "vs", "vk", "vz"]);

function isGrammarTag(state: InternalState): state is GrammarTag {
  return GRAMMAR_TAGS.has(state);
}

/**
 * Menghasilkan daftar calon kata dasar dari sebuah string terkonjugasi
 * menggunakan pencarian melebar (BFS) dengan batas kedalaman (`maxDepth`).
 *
 * Contoh rantai:
 * `食べさせられなかった`
 * -> `食べさせられない` (lampau)
 * -> `食べさせられる` (negatif)
 * -> `食べさせる` (pasif/potensial)
 * -> `食べる` (kausatif, requiredTags: ["v1"])
 */
export function deinflect(
  source: string,
  maxDepth = 7,
): DeinflectCandidate[] {
  const trimmed = source.trim();
  if (!trimmed) return [];

  const results = new Map<string, DeinflectCandidate>();
  // Kandidat pertama selalu bentuk asli tanpa syarat tag
  results.set(`${trimmed}::raw`, {
    term: trimmed,
    requiredTags: [],
    reasons: [],
  });

  interface QueueNode {
    term: string;
    state: InternalState;
    reasons: string[];
    depth: number;
  }

  const queue: QueueNode[] = [
    { term: trimmed, state: "surface", reasons: [], depth: 0 },
  ];
  const visitedStates = new Set<string>([`${trimmed}@surface`]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    for (const rule of DEINFLECT_RULES) {
      if (!rule.allowedFrom.includes(current.state)) continue;
      if (!current.term.endsWith(rule.from)) continue;

      const prefixLen = current.term.length - rule.from.length;
      const minPrefix = rule.minPrefixLength ?? 1;
      if (prefixLen < minPrefix) continue;

      const nextTerm = current.term.slice(0, prefixLen) + rule.to;
      if (!nextTerm) continue;

      const stateKey = `${nextTerm}@${rule.nextState}`;
      if (visitedStates.has(stateKey)) continue;
      visitedStates.add(stateKey);

      const nextReasons = [...current.reasons, rule.reason];

      if (isGrammarTag(rule.nextState)) {
        const resultKey = `${nextTerm}::${rule.nextState}`;
        const existing = results.get(resultKey);
        if (!existing) {
          results.set(resultKey, {
            term: nextTerm,
            requiredTags: [rule.nextState],
            reasons: nextReasons,
          });
        }
      }

      queue.push({
        term: nextTerm,
        state: rule.nextState,
        reasons: nextReasons,
        depth: current.depth + 1,
      });
    }
  }

  return Array.from(results.values());
}

/**
 * Memvalidasi apakah entri kamus (`rules` dan `tags`) memenuhi syarat `requiredTags`
 * dari hasil deinflection.
 *
 * Jika `requiredTags` kosong (kecocokan langsung tanpa deinflection), selalu valid.
 */
export function matchesDeinflectRule(
  requiredTags: readonly GrammarTag[],
  entryRules: string,
  entryTags = "",
): boolean {
  if (requiredTags.length === 0) return true;

  const combined = `${entryRules} ${entryTags}`.toLowerCase();
  const tokens = combined.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  for (const req of requiredTags) {
    for (const tok of tokens) {
      if (tok === req) return true;
      // Di JMdict, tag bisa lebih spesifik seperti v5k, v5k-s, v5r-i, v1-s, vs-i, vs-s, vs-c, adj-ix
      if (req === "v5" && tok.startsWith("v5")) return true;
      if (req === "v1" && tok.startsWith("v1")) return true;
      if (req === "vs" && tok.startsWith("vs")) return true;
      if (req === "vk" && tok.startsWith("vk")) return true;
      if (req === "adj-i" && (tok === "adj-i" || tok === "adj-ix")) return true;
    }
  }

  return false;
}

