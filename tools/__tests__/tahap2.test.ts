import { describe, it, expect } from "vitest";
import { Mulberry32 } from "../utils/prng";
import { tokenizeJapanese, findTargetToken } from "../language/tokenizer";
import {
  alignFuriganaForWord,
  generateRubyNodes,
  renderRubyHtml,
  renderRubyPlainText,
  maskRubyNodes,
  renderPromptWithUnderline,
  containsKanji,
  isKanji
} from "../language/furigana";
import {
  validateQuestionItem,
  validateQuestionPack,
  QuestionItem,
  QuestionPack
} from "../../src/lib/questionPack";

import n5KanjiData from "../data/n5_kanji_reference.json";
import n5VocabData from "../data/n5_vocab_reference.json";
import sampleTatoebaData from "../data/sample_tatoeba_n5.json";
import g3ParticleRules from "../data/g3_particle_rules.json";
import visualDistractors from "../data/visual_distractors.json";
import checksums from "../checksums.json";

describe("Tahap 2 - PRNG Determinism (Mulberry32)", () => {
  it("menghasilkan deret angka pseudo-random yang identik untuk seed yang sama", () => {
    const rng1 = new Mulberry32(12345);
    const rng2 = new Mulberry32(12345);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it("menghasilkan deret berbeda untuk seed berbeda", () => {
    const rngA = new Mulberry32(42);
    const rngB = new Mulberry32(999);

    const seqA = Array.from({ length: 5 }, () => rngA.next());
    const seqB = Array.from({ length: 5 }, () => rngB.next());

    expect(seqA).not.toEqual(seqB);
  });

  it("mengocok array secara deterministik dengan seed tetap", () => {
    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const rng1 = new Mulberry32(777);
    const rng2 = new Mulberry32(777);

    const shuffled1 = rng1.shuffle(arr1);
    const shuffled2 = rng2.shuffle(arr2);

    expect(shuffled1).toEqual(shuffled2);
    // Tidak memodifikasi array asal
    expect(arr1).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("memilih beberapa item tanpa penggantian (pickMultiple) secara deterministik", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    const rng1 = new Mulberry32(555);
    const rng2 = new Mulberry32(555);

    const picked1 = rng1.pickMultiple(items, 3);
    const picked2 = rng2.pickMultiple(items, 3);

    expect(picked1).toEqual(picked2);
    expect(picked1.length).toBe(3);
    // Pastikan semua item unik
    const unique = new Set(picked1);
    expect(unique.size).toBe(3);
  });
});

describe("Tahap 2 - Integritas Data Referensi N5", () => {
  it("memiliki daftar kanji N5 dengan field lengkap dari KANJIDIC2", () => {
    expect(Array.isArray(n5KanjiData)).toBe(true);
    expect(n5KanjiData.length).toBeGreaterThanOrEqual(80);

    for (const item of n5KanjiData) {
      expect(item.kanji).toBeDefined();
      expect(item.grade).toBeDefined();
      expect(item.jlpt).toBe(4); // JLPT 4 lama = setara N5
      expect(typeof item.meaning).toBe("string");
      expect(item.meaning.length).toBeGreaterThan(0);
      expect(Array.isArray(item.on)).toBe(true);
      expect(Array.isArray(item.kun)).toBe(true);
    }
  });

  it("memiliki daftar kosakata N5 dengan ent_seq JMdict dan tanpa ID duplikat", () => {
    expect(Array.isArray(n5VocabData)).toBe(true);
    expect(n5VocabData.length).toBeGreaterThanOrEqual(80);

    const ids = new Set<string>();
    for (const item of n5VocabData) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.ent_seq).toMatch(/^\d+$/);
      expect(item.kanji).toBeDefined();
      expect(item.kana).toBeDefined();
      expect(item.pos).toBeDefined();
      expect(item.meaningEn).toBeDefined();
      expect(item.meaningId).toBeDefined();
    }
  });

  it("memiliki 20 kalimat contoh Tatoeba N5 dengan atribusi CC BY 2.0 FR", () => {
    expect(Array.isArray(sampleTatoebaData)).toBe(true);
    expect(sampleTatoebaData.length).toBe(20);

    for (const item of sampleTatoebaData) {
      expect(item.tatoeba_jpn_id).toBeGreaterThan(0);
      expect(item.jpn_text.length).toBeGreaterThan(0);
      expect(item.tatoeba_ind_id).toBeGreaterThan(0);
      expect(item.ind_text.length).toBeGreaterThan(0);
      expect(item.license).toBe("CC BY 2.0 FR");
      expect(Array.isArray(item.target_words)).toBe(true);
      expect(item.target_words.length).toBeGreaterThan(0);
    }
  });

  it("memiliki aturan partikel tata bahasa G3 yang valid", () => {
    expect(Array.isArray(g3ParticleRules)).toBe(true);
    expect(g3ParticleRules.length).toBeGreaterThanOrEqual(6);

    for (const rule of g3ParticleRules) {
      expect(rule.id).toBeDefined();
      expect(rule.particle).toBeDefined();
      expect(rule.distractors.length).toBe(3);
      expect(rule.distractors).not.toContain(rule.particle);
      expect(rule.keywords.length).toBeGreaterThan(0);
    }
  });

  it("memiliki kamus visual look-alike kanji untuk pengecoh G2", () => {
    expect(typeof visualDistractors).toBe("object");
    const keys = Object.keys(visualDistractors);
    expect(keys.length).toBeGreaterThan(30);

    for (const kanji of keys) {
      const distractors = (visualDistractors as Record<string, string[]>)[kanji];
      expect(Array.isArray(distractors)).toBe(true);
      expect(distractors.length).toBeGreaterThanOrEqual(2);
      expect(distractors).not.toContain(kanji);
    }
  });

  it("memiliki registri berkas dataset dengan SHA-256 di checksums.json", () => {
    expect(checksums.datasets).toBeDefined();
    expect(checksums.datasets.jmdict_e).toBeDefined();
    expect(checksums.datasets.kanjidic2).toBeDefined();
    expect(checksums.datasets.tatoeba_jpn_sentences).toBeDefined();
    expect(checksums.datasets.tatoeba_ind_sentences).toBeDefined();
    expect(checksums.datasets.tatoeba_jpn_ind_links).toBeDefined();
  });
});

describe("Tahap 2 - Tokenizer Bahasa Jepang N5", () => {
  it("membedah kalimat sederhana dengan partikel dan verba konjugasi", () => {
    const sentence = "私は本を読みます。";
    const tokens = tokenizeJapanese(sentence);

    const surfaces = tokens.map((t) => t.surface);
    expect(surfaces).toEqual(["私", "は", "本", "を", "読みます", "。"]);

    // Cek POS dan pembacaan
    expect(tokens[0].pos).toBe("noun");
    expect(tokens[0].reading).toBe("わたし");
    expect(tokens[0].ent_seq).toBe("1303970");

    expect(tokens[1].pos).toBe("particle");
    expect(tokens[1].surface).toBe("は");

    expect(tokens[2].pos).toBe("noun");
    expect(tokens[2].reading).toBe("ほん");
    expect(tokens[2].ent_seq).toBe("1360010");

    expect(tokens[3].pos).toBe("particle");
    expect(tokens[3].surface).toBe("を");

    expect(tokens[4].pos).toBe("verb");
    expect(tokens[4].surface).toBe("読みます");
    expect(tokens[4].reading).toBe("よみます");
    expect(tokens[4].lemma).toBe("読む");
    expect(tokens[4].ent_seq).toBe("1542380");

    expect(tokens[5].pos).toBe("symbol");
  });

  it("mengenali kata majemuk '勉強します' dan lokasi '学校で'", () => {
    const sentence = "毎日学校で日本語を勉強します。";
    const tokens = tokenizeJapanese(sentence);

    const surfaces = tokens.map((t) => t.surface);
    expect(surfaces).toEqual([
      "毎日",
      "学校",
      "で",
      "日本語",
      "を",
      "勉強します",
      "。"
    ]);

    const studyToken = tokens.find((t) => t.surface === "勉強します");
    expect(studyToken).toBeDefined();
    expect(studyToken?.lemma).toBe("勉強する");
    expect(studyToken?.reading).toBe("べんきょうします");
  });

  it("mengenali numeral dan counter waktu '七時に'", () => {
    const sentence = "毎朝七時に起きます。";
    const tokens = tokenizeJapanese(sentence);

    const surfaces = tokens.map((t) => t.surface);
    expect(surfaces).toEqual(["毎朝", "七", "時", "に", "起きます", "。"]);

    const shichiToken = tokens[1];
    expect(shichiToken.pos).toBe("numeral");
    expect(shichiToken.reading).toBe("しち");

    const jiToken = tokens[2];
    expect(jiToken.pos).toBe("noun");
    expect(jiToken.reading).toBe("じ");

    const niToken = tokens[3];
    expect(niToken.pos).toBe("particle");

    const okiruToken = tokens[4];
    expect(okiruToken.pos).toBe("verb");
    expect(okiruToken.lemma).toBe("起きる");
    expect(okiruToken.reading).toBe("おきます");
  });

  it("dapat mencari target token dengan findTargetToken", () => {
    const tokens = tokenizeJapanese("冷たい水を飲みました。");
    const waterToken = findTargetToken(tokens, "水");
    expect(waterToken).toBeDefined();
    expect(waterToken?.reading).toBe("みず");

    const drinkToken = findTargetToken(tokens, "飲む");
    expect(drinkToken).toBeDefined();
    expect(drinkToken?.surface).toBe("飲みました");
  });
});

describe("Tahap 2 - Furigana & Ruby Node Formatter", () => {
  it("mendeteksi kanji dengan isKanji dan containsKanji", () => {
    expect(isKanji("日")).toBe(true);
    expect(isKanji("本")).toBe(true);
    expect(isKanji("あ")).toBe(false);
    expect(isKanji("ア")).toBe(false);
    expect(isKanji("1")).toBe(false);

    expect(containsKanji("日本語")).toBe(true);
    expect(containsKanji("食べる")).toBe(true);
    expect(containsKanji("パン")).toBe(false);
    expect(containsKanji("ありがとう")).toBe(false);
  });

  it("melakukan perataan okurigana (alignFuriganaForWord)", () => {
    // Seluruh kata kanji
    expect(alignFuriganaForWord("日本", "にほん")).toEqual([
      { text: "日本", rt: "にほん" }
    ]);

    // Kanji + okurigana
    expect(alignFuriganaForWord("食べる", "たべる")).toEqual([
      { text: "食", rt: "た" },
      { text: "べる" }
    ]);

    expect(alignFuriganaForWord("飲みます", "のみます")).toEqual([
      { text: "飲", rt: "の" },
      { text: "みます" }
    ]);

    expect(alignFuriganaForWord("新しい", "あたらしい")).toEqual([
      { text: "新", rt: "あたら" },
      { text: "しい" }
    ]);

    // Prefix kana + kanji
    expect(alignFuriganaForWord("お茶", "おちゃ")).toEqual([
      { text: "お" },
      { text: "茶", rt: "ちゃ" }
    ]);

    // Tanpa kanji
    expect(alignFuriganaForWord("パン", "パン")).toEqual([{ text: "パン" }]);
  });

  it("menghasilkan QuestionRubyNode[] untuk kalimat lengkap", () => {
    const sentence = "私は本を読みます。";
    const nodes = generateRubyNodes(sentence);

    // Verifikasi node-node ruby
    const rubyItems = nodes.filter((n) => n.rt);
    expect(rubyItems.length).toBe(3); // 私, 本, 読
    expect(rubyItems[0]).toEqual({ text: "私", rt: "わたし" });
    expect(rubyItems[1]).toEqual({ text: "本", rt: "ほん" });
    expect(rubyItems[2]).toEqual({ text: "読", rt: "よ" });
  });

  it("menyembunyikan furigana untuk kata target yang sedang diuji (suppressWord)", () => {
    const sentence = "私は本を読みます。";
    // Uji kata "本": furigana pada "本" harus ditiadakan
    const nodes = generateRubyNodes(sentence, { suppressWord: "本" });

    const honNode = nodes.find((n) => n.text.includes("本"));
    expect(honNode).toBeDefined();
    expect(honNode?.rt).toBeUndefined();

    // Kata lain seperti "私" dan "読" tetap memiliki furigana
    const watashiNode = nodes.find((n) => n.text === "私");
    expect(watashiNode?.rt).toBe("わたし");
  });

  it("merender format HTML dengan sakelar showFurigana", () => {
    const nodes = [
      { text: "日本", rt: "にほん" },
      { text: "へ" },
      { text: "行", rt: "い" },
      { text: "きます。" }
    ];

    // Sakelar ON (showFurigana = true)
    const htmlOn = renderRubyHtml(nodes, true);
    expect(htmlOn).toBe(
      "<ruby>日本<rt>にほん</rt></ruby>へ<ruby>行<rt>い</rt></ruby>きます。"
    );

    // Sakelar OFF (showFurigana = false)
    const htmlOff = renderRubyHtml(nodes, false);
    expect(htmlOff).toBe("日本へ行きます。");
  });

  it("merender format teks biasa dengan sakelar showFurigana", () => {
    const nodes = [
      { text: "学校", rt: "がっこう" },
      { text: "で" }
    ];

    expect(renderRubyPlainText(nodes, true)).toBe("学校[がっこう]で");
    expect(renderRubyPlainText(nodes, false)).toBe("学校で");
  });

  it("merender prompt dengan garis bawah <u> pada kata target", () => {
    const nodes = [
      { text: "本", rt: "ほん" },
      { text: "を" },
      { text: "読", rt: "よ" },
      { text: "みます。" }
    ];

    const promptHtml = renderPromptWithUnderline(nodes, "本", false);
    expect(promptHtml).toContain("<u>本</u>を読みます。");
  });

  it("melakukan masking node ruby untuk soal isian rumpang", () => {
    const nodes = [
      { text: "水" },
      { text: "を" },
      { text: "飲みます" }
    ];

    const masked = maskRubyNodes(nodes, "を", "（　★　）");
    expect(masked[1].text).toBe("（　★　）");
  });
});

describe("Tahap 2 - Validasi Skema QuestionPack", () => {
  it("memvalidasi item soal yang sah sesuai skema", () => {
    const validItem: QuestionItem = {
      id: "q-g1-001",
      type: "G1_KANJI_READING",
      level: "N5",
      prompt: "私は<u>本</u>を読みます。",
      options: ["ほん", "ぼん", "ぽん", "はん"],
      correctIndex: 0,
      rubyNodes: [
        { text: "私", rt: "わたし" },
        { text: "は本を" },
        { text: "読", rt: "よ" },
        { text: "みます。" }
      ],
      explanation: {
        targetWord: "本",
        reading: "ほん",
        meaningEn: "book",
        translationId: "Saya membaca buku."
      },
      provenance: {
        jmdict_ent_seq: "1360010",
        tatoeba_jpn_id: 141973,
        tatoeba_ind_id: 921401,
        generator: "G1_KANJI_READING_GENERATOR",
        generator_version: "1.0.0",
        seed: 42
      },
      review: {
        status: "approved",
        notes: "Otomatis divalidasi tanpa distractor ambigu"
      }
    };

    const res = validateQuestionItem(validItem);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("menolak item soal dengan opsi duplikat atau jumlah opsi bukan 4", () => {
    const invalidItem: QuestionItem = {
      id: "q-bad-001",
      type: "G1_KANJI_READING",
      level: "N5",
      prompt: "test",
      options: ["ほん", "ほん", "ぼん", "ぽん"], // Duplikat!
      correctIndex: 0,
      provenance: {
        generator: "test",
        generator_version: "1.0.0",
        seed: 1
      },
      review: { status: "draft" }
    };

    const res = validateQuestionItem(invalidItem);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("duplikat"))).toBe(true);
  });

  it("memvalidasi paket lengkap (QuestionPack)", () => {
    const pack: QuestionPack = {
      id: "seed-pack-n5-v1",
      title: "Latihan Ujian JLPT N5 Orisinal (Paket Bawaan)",
      version: "1.0.0",
      description: "Paket soal orisinal bergaya N5 dari JMdict, KANJIDIC2, dan Tatoeba.",
      level: "N5",
      language: "ja",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      license: "CC BY-SA 4.0",
      attribution: {
        sources: [
          {
            name: "JMdict & KANJIDIC2",
            url: "https://www.edrdg.org/",
            license: "CC BY-SA 4.0"
          },
          {
            name: "Tatoeba",
            url: "https://tatoeba.org/",
            license: "CC BY 2.0 FR"
          }
        ],
        disclaimer: "Bergaya JLPT N5, bukan soal resmi."
      },
      stats: {
        totalQuestions: 1,
        byType: {
          G1_KANJI_READING: 1,
          G2_KANJI_WRITING: 0,
          G3_PARTICLES: 0,
          G4_CONTEXT_VOCAB: 0
        },
        approvedCount: 1,
        draftCount: 0,
        rejectedCount: 0
      },
      questions: [
        {
          id: "q-001",
          type: "G1_KANJI_READING",
          level: "N5",
          prompt: "<u>水</u>を飲みます。",
          options: ["みず", "みす", "ゆ", "かわ"],
          correctIndex: 0,
          explanation: {
            targetWord: "水",
            reading: "みず",
            meaningEn: "water",
            translationId: "Minum air."
          },
          provenance: {
            generator: "G1_KANJI_READING_GENERATOR",
            generator_version: "1.0.0",
            seed: 100
          },
          review: { status: "approved" }
        }
      ]
    };

    const packRes = validateQuestionPack(pack);
    expect(packRes.valid).toBe(true);
    expect(packRes.errors).toHaveLength(0);
  });
});
