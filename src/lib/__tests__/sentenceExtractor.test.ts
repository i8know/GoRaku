import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { extractSentenceAround } from "../sentenceExtractor";
import {
  addMinedCardToDeck,
  buildCardDuplicateKey,
  getDeckDuplicateKeys,
  loadDeckCards,
} from "../deckCards";

describe("Tahap 4 — Sentence Extraction & Sentence Mining Card Creation", () => {
  it("mengekstrak satu kalimat utuh dari paragraf multi-kalimat dan menandai kata target dengan <b>", () => {
    const paragraph =
      "朝早く目が覚めた。窓を開けると冷たい風が吹き込んできた。今日もいい天気になりそうだ。";
    const target = "冷たい";
    const matchStart = paragraph.indexOf(target);

    const res = extractSentenceAround(paragraph, matchStart, target.length);

    expect(res.sentencePlain).toBe("窓を開けると冷たい風が吹き込んできた。");
    expect(res.targetSurface).toBe("冷たい");
    expect(res.sentenceHighlightedHtml).toBe(
      "窓を開けると<b>冷たい</b>風が吹き込んできた。",
    );
  });

  it("tidak memotong kalimat di tengah dialog 「...！」 yang diikuti atribusi narasi", () => {
    const paragraph =
      "放課後の教室は静かだった。「本当に食べさせられなかったの？信じられない！」と彼女は驚いた声で言った。私はただ頷くしかなかった。";
    const target = "信じられない";
    const matchStart = paragraph.indexOf(target);

    const res = extractSentenceAround(paragraph, matchStart, target.length);

    expect(res.sentencePlain).toBe(
      "「本当に食べさせられなかったの？信じられない！」と彼女は驚いた声で言った。",
    );
    expect(res.sentenceHighlightedHtml).toBe(
      "「本当に食べさせられなかったの？<b>信じられない</b>！」と彼女は驚いた声で言った。",
    );
  });

  it("mendukung tanda kutip bersarang 『...』 di dalam 「...」 tanpa terpotong di tengah", () => {
    const paragraph =
      "先輩は本を閉じた。「漱石の『吾輩は猫である！』を読んだことがあるか？」と尋ねられた。私は首を横に振った。";
    const target = "吾輩";
    const matchStart = paragraph.indexOf(target);

    const res = extractSentenceAround(paragraph, matchStart, target.length);

    expect(res.sentencePlain).toBe(
      "「漱石の『吾輩は猫である！』を読んだことがあるか？」と尋ねられた。",
    );
    expect(res.sentenceHighlightedHtml).toContain("<b>吾輩</b>");
  });

  it("memangkas kalimat yang melebihi batas maksimum karakter dengan elipsis … di sekitar kata target", () => {
    const longPrefix = "あ".repeat(90);
    const longSuffix = "い".repeat(90);
    const block = `${longPrefix}図書館${longSuffix}。`;
    const matchStart = block.indexOf("図書館");

    const res = extractSentenceAround(block, matchStart, 3, 60);

    expect(res.sentencePlain.length).toBeLessThanOrEqual(64);
    expect(res.sentencePlain.startsWith("…")).toBe(true);
    expect(res.sentencePlain.endsWith("…")).toBe(true);
    expect(res.sentenceHighlightedHtml).toContain("<b>図書館</b>");
  });

  it("menyimpan kartu hasil Sentence Mining dengan tag <b> utuh dan mendeteksi duplikat (expression + reading)", async () => {
    const deckId = "test-mining-deck-1";

    // Sebelum ditambahkan, belum ada duplikat
    const initialKeys = await getDeckDuplicateKeys(deckId);
    const keyTaberu = buildCardDuplicateKey("食べる", "たべる");
    expect(initialKeys.has(keyTaberu)).toBe(false);

    // Tambahkan kartu hasil Sentence Mining
    const saved = await addMinedCardToDeck(deckId, {
      word: "食べる",
      reading: "たべる",
      meaning: "1. to eat\n2. to live on",
      sentence: "毎日美味しいご飯を<b>食べました</b>。",
      translation: "Sumber: 吾輩は猫である — 第一章",
      subdeck: "吾輩は猫である",
      tags: ["sentence-mining", "v1"],
    });

    expect(saved.word).toBe("食べる");
    expect(saved.reading).toBe("たべる");
    // Pastikan tag <b> tidak di-escape menjadi &lt;b&gt;
    expect(saved.sentence).toBe("毎日美味しいご飯を<b>食べました</b>。");
    expect(saved.meaning).toContain("1. to eat<br>2. to live on");
    expect(saved.translation).toContain("吾輩は猫である — 第一章");

    // Pastikan tersimpan di IndexedDB dan terdeteksi sebagai duplikat
    const cardsInDb = await loadDeckCards(deckId);
    expect(cardsInDb.some((c) => c.id === saved.id)).toBe(true);

    const afterKeys = await getDeckDuplicateKeys(deckId);
    expect(afterKeys.has(keyTaberu)).toBe(true);
    // Normalisasi katakana -> hiragana pada reading juga harus cocok
    expect(afterKeys.has(buildCardDuplicateKey("食べる", "タベル"))).toBe(true);
    // Kata dengan kanji sama namun bacaan berbeda tidak dianggap duplikat persis
    expect(afterKeys.has(buildCardDuplicateKey("行く", "いく"))).toBe(false);
  });
});

