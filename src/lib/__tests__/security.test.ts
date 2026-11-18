import "fake-indexeddb/auto";
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { compressSync, strToU8, zipSync } from "fflate";
import { renderJapanese, sanitizeInline, sanitizeRichHtml } from "../ankiText";
import {
  ArchiveLimitError,
  inflateWithLimit,
  sanitizeHttpUrl,
} from "../archiveLimits";
import { extractZipEntry, indexZipEntries } from "../apkg";
import { sanitizeQuestionPack, type QuestionPack } from "../questionPack";
import { getQuestionPack, importQuestionPackFromJson } from "../questionPackStorage";
import {
  extractZipEntryBytes,
  indexYomitanZip,
  parseYomitanIndex,
} from "../yomitanParser";
import { renderQuestionPrompt } from "../../components/jlpt/furiganaHelper";

function buildDeflateZipWithClaimedSize(
  fileName: string,
  content: Uint8Array,
  claimedUncompressedSize: number,
): Uint8Array {
  const compressed = new Uint8Array(deflateRawSync(content));
  const nameBytes = strToU8(fileName);
  const lhLen = 30 + nameBytes.length;
  const cdLen = 46 + nameBytes.length;
  const eocdLen = 22;
  const out = new Uint8Array(lhLen + compressed.length + cdLen + eocdLen);
  const dv = new DataView(out.buffer);

  dv.setUint32(0, 0x04034b50, true);
  dv.setUint16(4, 20, true);
  dv.setUint16(8, 8, true);
  dv.setUint32(18, compressed.length, true);
  dv.setUint32(22, claimedUncompressedSize, true);
  dv.setUint16(26, nameBytes.length, true);
  out.set(nameBytes, 30);
  out.set(compressed, lhLen);

  const cdOff = lhLen + compressed.length;
  dv.setUint32(cdOff, 0x02014b50, true);
  dv.setUint16(cdOff + 4, 20, true);
  dv.setUint16(cdOff + 6, 20, true);
  dv.setUint16(cdOff + 10, 8, true);
  dv.setUint32(cdOff + 20, compressed.length, true);
  dv.setUint32(cdOff + 24, claimedUncompressedSize, true);
  dv.setUint16(cdOff + 28, nameBytes.length, true);
  dv.setUint32(cdOff + 42, 0, true);
  out.set(nameBytes, cdOff + 46);

  const eocdOff = cdOff + cdLen;
  dv.setUint32(eocdOff, 0x06054b50, true);
  dv.setUint16(eocdOff + 8, 1, true);
  dv.setUint16(eocdOff + 10, 1, true);
  dv.setUint32(eocdOff + 12, cdLen, true);
  dv.setUint32(eocdOff + 16, cdOff, true);

  return out;
}

describe("Regresi Keamanan: Sanitasi HTML, QuestionPack, URI Kamus, dan Batas Arsip", () => {
  it("1. sanitizeInline & renderJapanese membersihkan tag berbahaya dan mempertahankan ruby/b/u", () => {
    const inputs = [
      '<svg onload="noop()">Teks</svg>',
      '<img src="x" alt=">" data-marker="1">',
      '<scr<script>ipt>abc</scr</script>ipt>',
      '<b onclick="noop()" style="color:red">Tebal</b>',
    ];

    for (const raw of inputs) {
      const cleaned = sanitizeInline(raw);
      const rendered = renderJapanese(cleaned, true);
      expect(cleaned).not.toMatch(/<(script|svg|img|iframe)/i);
      expect(cleaned).not.toMatch(/\bon[a-z]+\s*=/i);
      expect(rendered).not.toMatch(/<(script|svg|img|iframe)/i);
    }

    expect(sanitizeInline("<u>貴重</u>な 言葉[ことば]")).toBe("<u>貴重</u>な 言葉[ことば]");
  });

  it("2. sanitizeRichHtml menjaga tabel/kelas Dokkai JLPT dan memblokir tag/atribut berbahaya", () => {
    const validPassage =
      `<div class="p-4 font-['Noto_Serif_JP',serif]"><table class="w-full"><tr><td rowspan="2"><u>案内</u></td></tr></table></div>`;
    expect(sanitizeRichHtml(validPassage)).toBe(validPassage);

    const dirtyPassage =
      `<div class="aman" onclick="noop()" style="background:url(javascript:void(0))">` +
      `<script>console.log(1)</script>` +
      `<iframe src="https://example.invalid"></iframe>` +
      `<svg data-bad="1"><rect /></svg>` +
      `<p title="<img src=x onerror=noop()>">Isi aman</p>` +
      `</div>`;
    const cleaned = sanitizeRichHtml(dirtyPassage);
    expect(cleaned).not.toMatch(/<(script|iframe|svg|img)/i);
    expect(cleaned).not.toMatch(/\bon(?:click|error)\s*=/i);
    expect(cleaned).not.toMatch(/<p\b[^>]*\btitle\s*=/i);
    expect(cleaned).toContain("&lt;p title=");
    expect(cleaned).toContain('<div class="aman">');
    expect(cleaned).toContain("Isi aman");
  });

  it("3. importQuestionPackFromJson dan renderQuestionPrompt mensanitasi prompt/passageHtml & menjaga tag <ruby>", async () => {
    const pack: QuestionPack = {
      id: "sec-regression-pack",
      version: "1.0.0",
      title: "Paket Regresi Keamanan",
      description: "Verifikasi sanitasi HTML impor",
      level: "N5",
      language: "ja",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      license: "CC BY-SA 4.0",
      attribution: {
        sources: [{ name: "Test", url: "https://example.test", license: "MIT" }],
        disclaimer: "Test",
      },
      stats: {
        totalQuestions: 2,
        byType: { G1_KANJI_READING: 2, G2_KANJI_WRITING: 0, G3_PARTICLES: 0, G4_CONTEXT_VOCAB: 0 },
        approvedCount: 2,
        draftCount: 0,
        rejectedCount: 0,
      },
      questions: [
        {
          id: "q-sec-html",
          type: "G1_KANJI_READING",
          level: "N5",
          prompt: '<u>学校</u>へ<img src=x onerror=noop()>行きます。',
          passageHtml: '<div class="ok" onmouseover="noop()"><script>x</script><p>Bacaan</p></div>',
          options: ["あ", "い", "う", "え"],
          correctIndex: 0,
          explanation: { targetWord: "学校" },
          provenance: { generator: "test", generator_version: "1.0", seed: 1 },
          review: { status: "approved" },
        },
        {
          id: "q-sec-ruby",
          type: "G1_KANJI_READING",
          level: "N5",
          prompt: "日本語",
          rubyNodes: [{ text: "日本", rt: "にほん" }, { text: "rt" }],
          options: ["あ", "い", "う", "え"],
          correctIndex: 0,
          explanation: { targetWord: "rt" },
          provenance: { generator: "test", generator_version: "1.0", seed: 2 },
          review: { status: "approved" },
        },
      ],
    };

    const res = await importQuestionPackFromJson(JSON.stringify(pack));
    expect(res.success).toBe(true);

    const stored = await getQuestionPack("sec-regression-pack");
    expect(stored?.questions[0].prompt).toBe("<u>学校</u>へ行きます。");
    expect(stored?.questions[0].passageHtml).toBe('<div class="ok"><p>Bacaan</p></div>');

    const sanitizedCopy = sanitizeQuestionPack(pack);
    expect(renderQuestionPrompt(sanitizedCopy.questions[0], true)).toBe("<u>学校</u>へ行きます。");

    // Pastikan targetWord "rt" hanya membungkus teks di luar tag <ruby>/<rt>, tidak merusak markup <rt>
    const rubyOut = renderQuestionPrompt(pack.questions[1], true);
    expect(rubyOut).toContain("<ruby>日本<rt>にほん</rt></ruby>");
    expect(rubyOut).toContain('<u class="underline decoration-2 decoration-amber-500 font-bold">rt</u>');
  });

  it("4. sanitizeHttpUrl dan parseYomitanIndex menolak skema URI berbahaya (javascript:, data:, vbscript:)", () => {
    expect(sanitizeHttpUrl("https://jitendex.org/")).toBe("https://jitendex.org/");
    expect(sanitizeHttpUrl("http://example.test/dict")).toBe("http://example.test/dict");
    expect(sanitizeHttpUrl("javascript:void(0)")).toBeUndefined();
    expect(sanitizeHttpUrl("data:text/html,abc")).toBeUndefined();
    expect(sanitizeHttpUrl("vbscript:msgbox(1)")).toBeUndefined();

    const parsed = parseYomitanIndex({
      title: "Kamus Uji Skema",
      revision: "1",
      format: 3,
      url: "javascript:void(0)",
    });
    expect(parsed.url).toBeUndefined();
  });

  it("5. Dekompresi ZIP menolak header ukuran berlebih maupun aliran deflate melebihi batas (anti zip-bomb)", () => {
    // 1) Header Central Directory mengklaim ukuran tak terkompresi melampaui batas
    const spoofedHeaderZip = buildDeflateZipWithClaimedSize(
      "index.json",
      strToU8('{"ok":true}'),
      999_999_999,
    );
    const yomEntries = indexYomitanZip(spoofedHeaderZip);
    expect(() =>
      extractZipEntryBytes(spoofedHeaderZip, yomEntries.get("index.json")!),
    ).toThrow(ArchiveLimitError);

    const apkgIdx = indexZipEntries(spoofedHeaderZip);
    expect(() => extractZipEntry(spoofedHeaderZip, apkgIdx, "index.json")).toThrow(
      /batas aman/i,
    );

    // 2) Streaming deflate berhenti lebih awal ketika hasil dekompresi aktual melewati maxBytes
    const repeated = new Uint8Array(8192).fill(0x41);
    const smallCompressed = new Uint8Array(deflateRawSync(repeated));
    expect(() => inflateWithLimit(smallCompressed, 1024, "uji-bom")).toThrow(
      ArchiveLimitError,
    );

    // Kompresi sah di bawah batas tetap berhasil normal
    const okCompressed = compressSync(strToU8("ok"));
    expect(okCompressed.byteLength).toBeGreaterThan(0);
    expect(inflateWithLimit(smallCompressed, 16384, "uji-normal").byteLength).toBe(8192);
  });

  it("6. Indeks ZIP mengabaikan folder __MACOSX/._ dan mencegah entri bersarang menimpa entri root", () => {
    const z = zipSync({
      "index.json": strToU8('{"title":"Root"}'),
      "__MACOSX/._index.json": strToU8("garbage"),
      "sub/deep/index.json": strToU8('{"title":"Nested"}'),
    });

    const yom = indexYomitanZip(z);
    expect(yom.has("._index.json")).toBe(false);
    expect(new TextDecoder().decode(extractZipEntryBytes(z, yom.get("index.json")!))).toBe(
      '{"title":"Root"}',
    );

    const apkgIdx = indexZipEntries(z);
    expect(apkgIdx?.has("._index.json")).toBe(false);
    expect(new TextDecoder().decode(extractZipEntry(z, apkgIdx, "index.json"))).toBe(
      '{"title":"Root"}',
    );
  });
});
