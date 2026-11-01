import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  addNovelFile,
  decodeTxtBytes,
  deleteNovel,
  getNovelWithBlob,
  listNovels,
  splitTxtIntoChapters,
  updateNovelProgress,
} from "../bookStorage";
import { LexiconDatabase } from "../lexiconDb";
import {
  convertAozoraRubyToHtml,
  parseRubyHtmlToSearchText,
} from "../rubyText";

describe("Tahap 3 - Perpustakaan, Dekoder TXT (UTF-8/Shift_JIS/EUC-JP) & Furigana <ruby>", () => {
  it("1. mendekode berkas TXT ber-encoding UTF-8 dengan benar", () => {
    const sample = "吾輩は猫である。名前はまだ無い。";
    const bytes = new TextEncoder().encode(sample);
    const res = decodeTxtBytes(bytes);
    expect(res.encoding).toBe("utf-8");
    expect(res.text).toBe(sample);
  });

  it("2. mendeteksi dan mendekode berkas TXT ber-encoding Shift_JIS secara otomatis", () => {
    // Byte Shift_JIS untuk: "吾輩は猫である。名前はまだ無い。"
    const sjisBytes = new Uint8Array([
      0x8c, 0xe1, 0x94, 0x79, 0x82, 0xcd, 0x94, 0x4c, 0x82, 0xc5, 0x82, 0xa0,
      0x82, 0xe9, 0x81, 0x42, 0x96, 0xbc, 0x91, 0x4f, 0x82, 0xcd, 0x82, 0xdc,
      0x82, 0xbe, 0x96, 0xb3, 0x82, 0xa2, 0x81, 0x42,
    ]);
    const res = decodeTxtBytes(sjisBytes);
    expect(res.encoding).toBe("shift_jis");
    expect(res.text).toBe("吾輩は猫である。名前はまだ無い。");
  });

  it("3. mendeteksi dan mendekode berkas TXT ber-encoding EUC-JP secara otomatis", () => {
    // Byte EUC-JP untuk: "日本語の小説を読む"
    const eucBytes = new Uint8Array([
      0xc6, 0xfc, 0xcb, 0xdc, 0xb8, 0xec, 0xa4, 0xce, 0xbe, 0xae, 0xc0, 0xe2,
      0xa4, 0xf2, 0xc6, 0xc9, 0xa4, 0xe0,
    ]);
    const res = decodeTxtBytes(eucBytes);
    expect(res.encoding).toBe("euc-jp");
    expect(res.text).toBe("日本語の小説を読む");
  });

  it("4. memecah berkas TXT menjadi bab dan mengonversi furigana Aozora Bunko menjadi <ruby>", () => {
    const rawTxt = `第一章　始まり
｜吾輩《わがはい》は猫《ねこ》である。

第二章　散歩
今日はとても｜美味《おい》しかった。`;

    const chapters = splitTxtIntoChapters(rawTxt, "Novel Uji");
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("第一章　始まり");
    expect(chapters[0].paragraphs[0]).toBe(
      "<ruby>吾輩<rt>わがはい</rt></ruby>は<ruby>猫<rt>ねこ</rt></ruby>である。",
    );
    expect(chapters[1].title).toBe("第二章　散歩");
    expect(chapters[1].paragraphs[0]).toContain(
      "<ruby>美味<rt>おい</rt></ruby>しかった",
    );
  });

  it("5. membuang isi <rt> dan <rp> saat mengambil teks pencarian tetapi menyimpan bacaannya sebagai petunjuk", () => {
    const html = convertAozoraRubyToHtml(
      "｜日本語学校《にほんごがっこう》で<ruby>勉強<rp>(</rp><rt>べんきょう</rt><rp>)</rp></ruby>している。",
    );
    const { cleanText, rubyHints } = parseRubyHtmlToSearchText(html);

    expect(cleanText).toBe("日本語学校で勉強している。");
    expect(rubyHints).toEqual([
      {
        startOffset: 0,
        endOffset: 5,
        base: "日本語学校",
        reading: "にほんごがっこう",
      },
      {
        startOffset: 6,
        endOffset: 8,
        base: "勉強",
        reading: "べんきょう",
      },
    ]);
  });

  it("6. menyimpan novel TXT ke IndexedDB, memulihkan posisi baca, dan menghapusnya", async () => {
    const db = new LexiconDatabase(`test-books-${Date.now()}`);
    const file = new File(
      ["吾輩は猫である\n夏目漱石\n\n第一章\n吾輩は猫である。"],
      "wagahai.txt",
      { type: "text/plain" },
    );

    const added = await addNovelFile(file, db);
    expect(added.title).toBe("吾輩は猫である");
    expect(added.author).toBe("夏目漱石");
    expect(added.format).toBe("txt");

    await updateNovelProgress(added.id, "ch:0:scroll:0.4500", 45, db);

    const loaded = await getNovelWithBlob(added.id, db);
    expect(loaded).not.toBeNull();
    expect(loaded?.book.progress).toBe(45);
    expect(loaded?.book.lastLocation).toBe("ch:0:scroll:0.4500");

    await deleteNovel(added.id, db);
    expect(await listNovels(db)).toHaveLength(0);
  });
});
