import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { deinflect } from "../deinflect";
import { lookup } from "../dictionaryLookup";
import { toHiragana } from "../kana";
import { LexiconDatabase, type TermRecord } from "../lexiconDb";

function makeTerm(
  dictId: number,
  expression: string,
  rawReading: string,
  rules: string,
  glossary: string[],
  score = 100,
  tags = "",
): TermRecord {
  return {
    dictId,
    expression,
    reading: toHiragana(rawReading || expression),
    rawReading: rawReading || expression,
    tags: tags || rules,
    rules,
    score,
    glossary,
    sequence: 1,
    termTags: "",
  };
}

describe("Tahap 2 - Mesin Pencarian Kamus & Deinflection Murni", () => {
  let db: LexiconDatabase;
  let dict1Id: number;

  beforeEach(async () => {
    db = new LexiconDatabase(
      `test-lexicon-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    dict1Id = await db.dictionaries.add({
      title: "JMdict (Uji Utama)",
      revision: "2026-10",
      format: 3,
      attribution: "CC BY-SA 4.0 EDRDG",
      enabled: true,
      priority: 1,
      termCount: 20,
      importedAt: new Date().toISOString(),
    });

    await db.terms.bulkAdd([
      makeTerm(dict1Id, "食べる", "たべる", "v1", ["makan", "menyantap"], 100),
      makeTerm(dict1Id, "行く", "いく", "v5", ["pergi"], 100, "v5k-s"),
      makeTerm(dict1Id, "美味しい", "おいしい", "adj-i", ["enak", "lezat"], 100),
      makeTerm(dict1Id, "いい", "いい", "adj-i", ["baik", "bagus"], 90),
      makeTerm(dict1Id, "来る", "くる", "vk", ["datang"], 100),
      makeTerm(dict1Id, "勉強", "べんきょう", "vs", ["belajar", "studi"], 95, "n vs"),
      makeTerm(dict1Id, "勉強する", "べんきょうする", "vs", ["belajar (verba)"], 85),
      makeTerm(dict1Id, "する", "する", "vs", ["melakukan"], 100),
      makeTerm(dict1Id, "有難う", "ありがとう", "", ["terima kasih"], 100, "int uk"),
      makeTerm(dict1Id, "コーヒー", "コーヒー", "", ["kopi"], 80, "n"),
      makeTerm(dict1Id, "日本", "にほん", "", ["Jepang"], 80, "n"),
      makeTerm(dict1Id, "日本語", "にほんご", "", ["bahasa Jepang"], 90, "n"),
      makeTerm(
        dict1Id,
        "日本語学校",
        "にほんごがっこう",
        "",
        ["sekolah bahasa Jepang"],
        95,
        "n",
      ),
      makeTerm(dict1Id, "泳ぐ", "およぐ", "v5", ["berenang"], 85),
      makeTerm(dict1Id, "読む", "よむ", "v5", ["membaca"], 90),
      makeTerm(dict1Id, "話す", "はなす", "v5", ["berbicara"], 90),
      makeTerm(dict1Id, "待つ", "まつ", "v5", ["menunggu"], 85),
      makeTerm(dict1Id, "買う", "かう", "v5", ["membeli"], 85),
    ]);
  });

  it("1. mengonjugasi balik rantai 食べさせられなかった -> 食べる", async () => {
    const cands = deinflect("食べさせられなかった");
    const taberu = cands.find((c) => c.term === "食べる");
    expect(taberu).toBeDefined();
    expect(taberu?.requiredTags).toContain("v1");

    const res = await lookup("昨日は野菜を食べさせられなかった。", 6, { db });
    expect(res.matchedText).toBe("食べさせられなかった");
    expect(res.matchedLength).toBe("食べさせられなかった".length);
    expect(res.results[0].expression).toBe("食べる");
    expect(res.results[0].reading).toBe("たべる");
    expect(res.results[0].senses[0].glossary).toContain("makan");
  });

  it("2. mengonjugasi balik 行かなかった -> 行く dan 行った -> 行く", async () => {
    const res1 = await lookup("学校に行かなかった理由", 3, { db });
    expect(res1.matchedText).toBe("行かなかった");
    expect(res1.matchedLength).toBe(6);
    expect(res1.results[0].expression).toBe("行く");

    const res2 = await lookup("東京に行ったことがある", 3, { db });
    expect(res2.matchedText).toBe("行った");
    expect(res2.results[0].expression).toBe("行く");
  });

  it("3. mengonjugasi balik 美味しくなかった -> 美味しい (dan bentuk -sou / -nakute)", async () => {
    const res1 = await lookup("あまり美味しくなかったです", 3, { db });
    expect(res1.matchedText).toBe("美味しくなかった");
    expect(res1.matchedLength).toBe(8);
    expect(res1.results[0].expression).toBe("美味しい");

    const res2 = await lookup("美味しそうなケーキ", 0, { db });
    expect(res2.matchedText).toBe("美味しそう");
    expect(res2.results[0].expression).toBe("美味しい");
  });

  it("4. mengonjugasi balik 来ました -> 来る (baik Kanji maupun Kana きました -> 来る)", async () => {
    const resKanji = await lookup("先生が来ました。", 3, { db });
    expect(resKanji.matchedText).toBe("来ました");
    expect(resKanji.matchedLength).toBe(4);
    expect(resKanji.results[0].expression).toBe("来る");

    const resKana = await lookup("ともだちがきました。", 5, { db });
    expect(resKana.matchedText).toBe("きました");
    expect(resKana.matchedLength).toBe(4);
    expect(resKana.results[0].expression).toBe("来る");
  });

  it("5. mengonjugasi balik 勉強している -> 勉強 dan 勉強する", async () => {
    const res = await lookup("毎日日本語を勉強している学生", 6, { db });
    expect(res.matchedText).toBe("勉強している");
    expect(res.matchedLength).toBe(6);

    const expressions = res.results
      .filter((r) => r.matchLength === 6)
      .map((r) => r.expression);
    expect(expressions).toContain("勉強");
    expect(expressions).toContain("勉強する");
  });

  it("6. mencocokkan kata berkana lewat indeks reading (ありがとう -> 有難う, アリガトウ -> 有難う)", async () => {
    const resHira = await lookup("いつもありがとう！", 3, { db });
    expect(resHira.matchedText).toBe("ありがとう");
    expect(resHira.matchedLength).toBe(5);
    expect(resHira.results[0].expression).toBe("有難う");
    expect(resHira.results[0].reading).toBe("ありがとう");

    const resKata = await lookup("アリガトウございます", 0, { db });
    expect(resKata.matchedText).toBe("アリガトウ");
    expect(resKata.matchedLength).toBe(5);
    expect(resKata.results[0].expression).toBe("有難う");
  });

  it("7. memenangkan kata majemuk lebih panjang (日本語学校) di atas kata pendek (日本語 / 日本)", async () => {
    const res = await lookup("日本語学校に通っています", 0, { db });
    expect(res.matchedText).toBe("日本語学校");
    expect(res.matchedLength).toBe(5);
    expect(res.results[0].expression).toBe("日本語学校");
    expect(res.results[1].expression).toBe("日本語");
    expect(res.results[2].expression).toBe("日本");
  });

  it("8. mengelompokkan per (expression, reading) dan menggabungkan arti dari beberapa kamus sesuai prioritas", async () => {
    const dict2Id = await db.dictionaries.add({
      title: "Kamus Indonesia Kedua",
      revision: "1.0",
      format: 3,
      attribution: "Kamus Uji 2",
      enabled: true,
      priority: 2,
      termCount: 1,
      importedAt: new Date().toISOString(),
    });

    await db.terms.add(
      makeTerm(dict2Id, "食べる", "たべる", "v1", ["mengonsumsi makanan"], 120),
    );

    const res = await lookup("食べる", 0, { db });
    expect(res.results[0].expression).toBe("食べる");
    expect(res.results[0].senses).toHaveLength(2);
    expect(res.results[0].senses[0].dictTitle).toBe("JMdict (Uji Utama)");
    expect(res.results[0].senses[1].dictTitle).toBe("Kamus Indonesia Kedua");
  });

  it("9. mendukung seluruh akhiran Godan lainnya (泳いでいた, 読んでいた, 話しませんでした, 待っていた, 買わなかった)", async () => {
    expect((await lookup("泳いでいた", 0, { db })).results[0].expression).toBe(
      "泳ぐ",
    );
    expect((await lookup("読んでいた", 0, { db })).results[0].expression).toBe(
      "読む",
    );
    expect(
      (await lookup("話しませんでした", 0, { db })).results[0].expression,
    ).toBe("話す");
    expect((await lookup("待っていた", 0, { db })).results[0].expression).toBe(
      "待つ",
    );
    expect((await lookup("買わなかった", 0, { db })).results[0].expression).toBe(
      "買う",
    );
  });

  it(
    "10. benchmark kinerja pencarian < 100 ms pada kamus ±200.000 entri",
    async () => {
      // Tambahkan 200.000 entri sintetis untuk menguji kinerja indeks B-Tree IndexedDB
      const TOTAL_SYNTHETIC = 200_000;
      const BATCH = 25_000;
      for (let offset = 0; offset < TOTAL_SYNTHETIC; offset += BATCH) {
        const rows: TermRecord[] = new Array(BATCH);
        for (let i = 0; i < BATCH; i++) {
          const n = offset + i;
          rows[i] = {
            dictId: dict1Id,
            expression: `語彙項目${n}`,
            reading: `ごいこうもく${n}`,
            rawReading: `ごいこうもく${n}`,
            tags: "n",
            rules: "",
            score: 10,
            glossary: [`arti kata ke-${n}`],
            sequence: n,
            termTags: "",
          };
        }
        await db.terms.bulkAdd(rows);
      }

      const start = performance.now();
      const out = await lookup("昨日は野菜を食べさせられなかった。", 6, { db });
      const elapsedMs = performance.now() - start;

      expect(out.results[0].expression).toBe("食べる");
      expect(elapsedMs).toBeLessThan(100);
      console.info(
        `[Benchmark Lookup] Waktu pencarian pada ${(TOTAL_SYNTHETIC + 18).toLocaleString("id-ID")} entri: ${elapsedMs.toFixed(2)} ms`,
      );
    },
    60_000,
  );
});
