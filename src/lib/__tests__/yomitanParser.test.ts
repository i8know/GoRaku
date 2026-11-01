import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { extractYomitanGlossary, isKanaOnly, toHiragana } from "../kana";
import {
  extractZipEntryJson,
  indexYomitanZip,
  parseTagBankRow,
  parseTermBankRow,
  parseTermMetaBankRow,
  parseYomitanIndex,
  sortBankFileNames,
} from "../yomitanParser";

describe("Tahap 1 - Utilitas Kana & Parser Kamus Yomitan", () => {
  it("mengonversi Katakana ke Hiragana dengan mempertahankan tanda vokal panjang (ー)", () => {
    expect(toHiragana("コーヒー")).toBe("こーひー");
    expect(toHiragana("アリガトウ")).toBe("ありがとう");
    expect(toHiragana("食べる")).toBe("食べる");
    expect(isKanaOnly("ありがとう")).toBe(true);
    expect(isKanaOnly("コーヒー")).toBe(true);
    expect(isKanaOnly("食べる")).toBe(false);
  });

  it("mengekstrak arti dari glossary string biasa dan structured-content Yomitan v3", () => {
    const rawGlossary = [
      "to eat",
      { type: "text", text: "to live on (e.g. a salary)" },
      {
        type: "structured-content",
        content: {
          tag: "ul",
          content: [
            {
              tag: "li",
              content: [
                "memakan ",
                {
                  tag: "ruby",
                  content: ["食", { tag: "rt", content: "しょく" }],
                },
              ],
            },
            { tag: "li", content: "menyantap" },
          ],
        },
      },
    ];

    const parsed = extractYomitanGlossary(rawGlossary);
    expect(parsed).toEqual([
      "to eat",
      "to live on (e.g. a salary)",
      "• memakan 食; • menyantap",
    ]);
  });

  it("mengurai baris term_bank v3 sesuai skema resmi dan menormalisasi reading ke Hiragana", () => {
    // [expression, reading, definitionTags, rules, score, glossary[], sequence, termTags]
    const row = [
      "食べる",
      "たべる",
      "v1 vt",
      "v1",
      100,
      ["makan", "menyantap"],
      1358280,
      "ichi1",
    ];
    const term = parseTermBankRow(row, 1, 3);
    expect(term).not.toBeNull();
    expect(term).toEqual({
      dictId: 1,
      expression: "食べる",
      reading: "たべる",
      rawReading: "たべる",
      tags: "v1 vt",
      rules: "v1",
      score: 100,
      glossary: ["makan", "menyantap"],
      sequence: 1358280,
      termTags: "ichi1",
    });

    // Kata Katakana dengan reading kosong di JMdict
    const katakanaRow = [
      "パソコン",
      "",
      "n",
      "",
      50,
      ["personal computer"],
      1100000,
      "ichi1",
    ];
    const katakanaTerm = parseTermBankRow(katakanaRow, 1, 3);
    expect(katakanaTerm?.reading).toBe("ぱそこん");
    expect(katakanaTerm?.rawReading).toBe("パソコン");
  });

  it("mengurai tag_bank dan term_meta_bank (frekuensi & pitch accent)", () => {
    const tag = parseTagBankRow(["v1", "partOfSpeech", -3, "Ichidan verb", 0], 2);
    expect(tag).toEqual({
      dictId: 2,
      name: "v1",
      category: "partOfSpeech",
      order: -3,
      notes: "Ichidan verb",
      score: 0,
    });

    const meta = parseTermMetaBankRow(
      ["食べる", "freq", { value: 412, displayValue: "412" }],
      2,
    );
    expect(meta).toEqual({
      dictId: 2,
      expression: "食べる",
      mode: "freq",
      data: { value: 412, displayValue: "412" },
    });
  });

  it("membaca arsip ZIP Yomitan secara bertahap dan memvalidasi index.json serta urutan berkas bank", () => {
    const zipBytes = zipSync({
      "index.json": strToU8(
        JSON.stringify({
          title: "JMdict (English)",
          revision: "2026-10-01",
          format: 3,
        }),
      ),
      "term_bank_2.json": strToU8(
        JSON.stringify([["行く", "いく", "v5k-s", "v5", 80, ["to go"], 1002, ""]]),
      ),
      "term_bank_1.json": strToU8(
        JSON.stringify([
          ["食べる", "たべる", "v1", "v1", 100, ["to eat"], 1001, ""],
        ]),
      ),
      "term_bank_10.json": strToU8(
        JSON.stringify([
          ["見る", "みる", "v1", "v1", 90, ["to see"], 1010, ""],
        ]),
      ),
    });

    const entries = indexYomitanZip(zipBytes);
    expect(entries.has("index.json")).toBe(true);

    const rawIndex = extractZipEntryJson(zipBytes, entries.get("index.json")!);
    const parsedIndex = parseYomitanIndex(rawIndex, 1);
    expect(parsedIndex.title).toBe("JMdict (English)");
    expect(parsedIndex.format).toBe(3);
    expect(parsedIndex.attribution).toContain("CC BY-SA 4.0");

    const sortedBanks = sortBankFileNames(
      Array.from(entries.keys()).filter((k) => k.startsWith("term_bank_")),
    );
    expect(sortedBanks).toEqual([
      "term_bank_1.json",
      "term_bank_2.json",
      "term_bank_10.json",
    ]);
  });

  it("menolak berkas bukan ZIP dan versi format yang tidak dikenal dengan pesan jelas", () => {
    expect(() => indexYomitanZip(new Uint8Array([1, 2, 3, 4]))).toThrow(
      /bukan arsip ZIP/i,
    );

    expect(() =>
      parseYomitanIndex({ title: "Kamus Uji", revision: "1", format: 99 }, 1),
    ).toThrow(/Versi format kamus Yomitan tidak dikenal/i);
  });
});

