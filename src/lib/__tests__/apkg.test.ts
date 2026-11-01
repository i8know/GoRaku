import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import {
  ApkgError,
  decodeMediaEntries,
  decodeMediaProtobuf,
  extractZipEntry,
  getSql,
  indexZipEntries,
  mimeOf,
  noteToCard,
  parseApkgBuffer,
  parseMediaManifest,
  zstdDecompress,
} from "../apkg";
import { extractImages, extractSounds, guessMapping } from "../ankiText";

/** Helper to encode a protobuf varint in tests. */
function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  let v = value >>> 0;
  while (v >= 0x80) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);
  return bytes;
}

/**
 * Wrap arbitrary bytes in a valid RFC 8878 Zstandard frame using Raw_Block(s) (block_type = 0)
 * so `fzstd` can decompress it in tests without needing a native zstd compressor binary.
 */
function wrapZstdRawFrame(payload: Uint8Array): Uint8Array {
  const MAX_BLOCK = 65536;
  const blocks: Uint8Array[] = [];
  let offset = 0;
  while (offset < payload.length || blocks.length === 0) {
    const chunk = payload.subarray(offset, Math.min(payload.length, offset + MAX_BLOCK));
    offset += chunk.length;
    const isLast = offset >= payload.length ? 1 : 0;
    // Block_Header: 3 bytes little-endian = Last_Block (1 bit) | Block_Type=0 (2 bits) | Block_Size (21 bits)
    const headerVal = isLast | (0 << 1) | (chunk.length << 3);
    const block = new Uint8Array(3 + chunk.length);
    block[0] = headerVal & 0xff;
    block[1] = (headerVal >>> 8) & 0xff;
    block[2] = (headerVal >>> 16) & 0xff;
    block.set(chunk, 3);
    blocks.push(block);
  }
  const totalBlockBytes = blocks.reduce((acc, b) => acc + b.length, 0);
  // 4-byte magic (28 B5 2F FD) + 1-byte FHD (0x00) + 1-byte Window_Descriptor (0x58 = 2MB window)
  const out = new Uint8Array(6 + totalBlockBytes);
  out.set([0x28, 0xb5, 0x2f, 0xfd, 0x00, 0x58], 0);
  let pos = 6;
  for (const b of blocks) {
    out.set(b, pos);
    pos += b.length;
  }
  return out;
}

/** Build a binary Anki v3 `MediaEntries` protobuf buffer. */
function buildMediaProtobuf(
  items: { name: string; size: number; sha1?: Uint8Array; legacyIndex?: number }[],
): Uint8Array {
  const textEnc = new TextEncoder();
  const out: number[] = [];

  for (const item of items) {
    const entryBytes: number[] = [];
    // Field 1: name (tag 0x0a, wire 2)
    const nameBytes = textEnc.encode(item.name);
    entryBytes.push(0x0a, ...encodeVarint(nameBytes.length), ...nameBytes);
    // Field 2: size (tag 0x10, wire 0)
    entryBytes.push(0x10, ...encodeVarint(item.size));
    // Field 3: sha1 (tag 0x1a, wire 2, 20 bytes)
    if (item.sha1) {
      entryBytes.push(0x1a, ...encodeVarint(item.sha1.length), ...item.sha1);
    }
    // Optional legacy_zip_filename (field 255 -> tag (255 << 3) | 0 = 2040)
    if (item.legacyIndex !== undefined) {
      entryBytes.push(...encodeVarint(255 * 8), ...encodeVarint(item.legacyIndex));
    }

    // Outer MediaEntries field 1 (tag 0x0a, wire 2)
    out.push(0x0a, ...encodeVarint(entryBytes.length), ...entryBytes);
  }

  return new Uint8Array(out);
}

describe("Anki v3 Protobuf Media Manifest Parser", () => {
  it("correctly decodes repeated MediaEntry messages with name, size, and 20-byte sha1 without off-by-one misalignment", () => {
    const sha1Sample = new Uint8Array(20);
    for (let i = 0; i < 20; i++) sha1Sample[i] = 0x80 + i; // high-bit bytes to test varint boundary safety

    const buf = buildMediaProtobuf([
      { name: "NhkLocal_再建_さいけん.oga", size: 4192, sha1: sha1Sample },
      { name: "NhkLocal_取り出す_とりだす.oga", size: 5120, sha1: sha1Sample },
      { name: "NhkLocal_採取_さいしゅ.oga", size: 3980, sha1: sha1Sample },
    ]);

    const detailed = decodeMediaProtobuf(buf);
    expect(detailed).toHaveLength(3);
    expect(detailed[0]).toEqual({
      index: "0",
      name: "NhkLocal_再建_さいけん.oga",
      size: 4192,
      sha1: sha1Sample,
    });
    expect(detailed[1].index).toBe("1");
    expect(detailed[1].name).toBe("NhkLocal_取り出す_とりだす.oga");
    expect(detailed[1].size).toBe(5120);
    expect(detailed[2].index).toBe("2");
    expect(detailed[2].name).toBe("NhkLocal_採取_さいしゅ.oga");

    const map = decodeMediaEntries(buf);
    expect(map.get("NhkLocal_再建_さいけん.oga")).toBe("0");
    expect(map.get("NhkLocal_取り出す_とりだす.oga")).toBe("1");
    expect(map.get("NhkLocal_採取_さいしゅ.oga")).toBe("2");
  });

  it("supports zstd-compressed protobuf media manifest as well as legacy JSON media manifest", () => {
    const protoBytes = buildMediaProtobuf([{ name: "test_audio.oga", size: 1234 }]);
    const zstdProto = wrapZstdRawFrame(protoBytes);
    const parsedZstd = parseMediaManifest(zstdProto);
    expect(parsedZstd.zstdMedia).toBe(true);
    expect(parsedZstd.media.get("test_audio.oga")).toBe("0");

    const jsonBytes = strToU8(
      JSON.stringify({
        "0": "audio_01.mp3",
        "1": "cover.jpg",
      }),
    );
    const parsedJson = parseMediaManifest(jsonBytes);
    expect(parsedJson.zstdMedia).toBe(false);
    expect(parsedJson.media.get("audio_01.mp3")).toBe("0");
    expect(parsedJson.media.get("cover.jpg")).toBe("1");
  });

  it("maps .oga extension to audio/ogg MIME type", () => {
    expect(mimeOf("NhkLocal_相変わらず_あいかわらず.oga")).toBe("audio/ogg");
    expect(mimeOf("voice.mp3")).toBe("audio/mpeg");
    expect(mimeOf("scene.webp")).toBe("image/webp");
  });
});

describe("Anki Field Mapping & Card Conversion", () => {
  it("automatically maps camelCase v3 notetype fields (word, wordFurigana, wordEng, wordAudio)", () => {
    const fieldNames = ["word", "wordFurigana", "wordEng", "wordAudio"];
    const samples = [
      [
        "相変わらず",
        "あいかわらず",
        "as ever; as usual<br><br>seperti biasa",
        "[sound:NhkLocal_相変わらず_あいかわらず.oga]",
      ],
    ];

    const mapping = guessMapping(fieldNames, samples);
    expect(mapping.word).toBe(0);
    expect(mapping.reading).toBe(1);
    expect(mapping.meaning).toBe(2);
    expect(mapping.audio).toBe(3);

    const card = noteToCard(
      {
        id: "1746712255200",
        noteTypeId: "1746711824894",
        deckId: "1752573356724",
        fields: samples[0],
        tags: ["N1", "Kotoba"],
      },
      mapping,
      "deck-test",
      "Philia Space::Bahasa Indonesia::Kotoba N5-N1::N1",
    );

    expect(card).not.toBeNull();
    expect(card?.word).toBe("相変わらず");
    expect(card?.reading).toBe("あいかわらず");
    expect(card?.meaning).toContain("seperti biasa");
    expect(card?.audio).toBe("NhkLocal_相変わらず_あいかわらず.oga");
    expect(card?.tags).toEqual(["N1", "Kotoba"]);
  });

  it("extracts [sound:...] and <img src=...> media references cleanly", () => {
    expect(extractSounds("<div>[sound:NhkLocal_刀_かたな.oga]</div>")).toEqual(["NhkLocal_刀_かたな.oga"]);
    expect(extractImages('<p><img src="illustration_01.png" alt="test"></p>')).toEqual(["illustration_01.png"]);
  });
});

describe("ZIP Central Directory Indexer & Apkg Database Parsing", () => {
  it("throws NOT_ZIP ApkgError on non-ZIP files", () => {
    const badBytes = strToU8("This is not a zip file");
    expect(() => indexZipEntries(badBytes)).toThrowError(ApkgError);
  });

  it("throws ZSTD_FAILED ApkgError on corrupted zstd data", () => {
    const badZstd = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0xff, 0xff]);
    expect(() => zstdDecompress(badZstd, "collection.anki21b")).toThrowError(ApkgError);
  });

  it("indexes and extracts entries in O(1) from a valid ZIP archive", () => {
    const zipped = zipSync({
      meta: new Uint8Array([0x08, 0x03]),
      "0": strToU8("OggS-mock-audio"),
    });
    const idx = indexZipEntries(zipped);
    expect(idx).not.toBeNull();
    const metaBytes = extractZipEntry(zipped, idx, "meta");
    expect(metaBytes).toEqual(new Uint8Array([0x08, 0x03]));
    const media0 = extractZipEntry(zipped, idx, "0");
    expect(media0).toEqual(strToU8("OggS-mock-audio"));
  });

  it("rejects skeleton-only collection.anki2 packages with a clear SKELETON_ONLY error", async () => {
    const SQL = await getSql();
    const db = new SQL.Database();
    db.run(`
      CREATE TABLE col (id integer primary key, crt integer, models text, decks text);
      INSERT INTO col VALUES (1, 1700000000, '{"1":{"name":"Basic","flds":[{"name":"Front","ord":0},{"name":"Back","ord":1}]}}', '{"1":{"name":"Default"}}');
      CREATE TABLE notes (id integer primary key, mid integer, flds text, tags text);
      INSERT INTO notes VALUES (100, 1, 'Please update to the latest Anki version, then import the .colpkg/.apkg file again.\x1f', '');
      CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer, type integer, queue integer, due integer, ivl integer, factor integer);
      INSERT INTO cards VALUES (200, 100, 1, 0, 0, 0, 1, 0, 0);
    `);
    const skeletonBytes = db.export();
    db.close();

    const apkg = zipSync({
      "collection.anki2": skeletonBytes,
    });

    await expect(parseApkgBuffer(apkg, "skeleton.apkg", apkg.byteLength)).rejects.toMatchObject({
      code: "SKELETON_ONLY",
    });
  });

  it("parses Anki v3 zstd schema with custom unicase collation and ignores skeleton collection.anki2 when collection.anki21b is present", async () => {
    const SQL = await getSql();

    // 1. Skeleton collection.anki2
    const skelDb = new SQL.Database();
    skelDb.run(`
      CREATE TABLE col (id integer primary key, crt integer, models text, decks text);
      INSERT INTO col VALUES (1, 1700000000, '{"1":{"name":"Basic","flds":[{"name":"Front","ord":0}]}}', '{"1":{"name":"Default"}}');
      CREATE TABLE notes (id integer primary key, mid integer, flds text, tags text);
      INSERT INTO notes VALUES (1, 1, 'Please update to the latest Anki version, then import the .colpkg/.apkg file again.', '');
      CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer, type integer, queue integer, due integer, ivl integer, factor integer);
      INSERT INTO cards VALUES (1, 1, 1, 0, 0, 0, 1, 0, 0);
    `);
    const skelBytes = skelDb.export();
    skelDb.close();

    // 2. Real v3 database with WITHOUT ROWID fields table and COLLATE unicase
    const v3Db = new SQL.Database();
    v3Db.run(`
      CREATE TABLE col (id integer primary key, crt integer);
      INSERT INTO col VALUES (1, 1700000000);
      CREATE TABLE notetypes (id integer NOT NULL PRIMARY KEY, name text NOT NULL, mtime_secs integer NOT NULL, usn integer NOT NULL, config blob NOT NULL);
      CREATE TABLE fields (ntid integer NOT NULL, ord integer NOT NULL, name text NOT NULL, config blob NOT NULL, PRIMARY KEY (ntid, ord)) without rowid;
      CREATE UNIQUE INDEX idx_fields_name_ntid ON fields (name, ntid);
      CREATE TABLE decks (id integer PRIMARY KEY NOT NULL, name text NOT NULL, mtime_secs integer NOT NULL, usn integer NOT NULL, common blob NOT NULL, kind blob NOT NULL);
      CREATE UNIQUE INDEX idx_decks_name ON decks (name);
      CREATE TABLE notes (id integer PRIMARY KEY, mid integer NOT NULL, flds text NOT NULL, tags text NOT NULL);
      CREATE TABLE cards (id integer PRIMARY KEY, nid integer NOT NULL, did integer NOT NULL, ord integer NOT NULL, type integer NOT NULL, queue integer NOT NULL, due integer NOT NULL, ivl integer NOT NULL, factor integer NOT NULL, reps integer NOT NULL, lapses integer NOT NULL, odid integer NOT NULL);

      INSERT INTO notetypes VALUES (1001, 'Philia - Kotoba N5', 0, 0, X'00');
      INSERT INTO fields VALUES (1001, 0, 'word', X'00'), (1001, 1, 'wordFurigana', X'00'), (1001, 2, 'wordEng', X'00'), (1001, 3, 'wordAudio', X'00');
      INSERT INTO decks VALUES (1, 'Default', 0, 0, X'00', X'00'), (2001, 'Philia Space\x1fBahasa Indonesia\x1fN5', 0, 0, X'00', X'00');
      INSERT INTO notes VALUES (5001, 1001, '食べる\x1fたべる\x1fmakan\x1f[sound:taberu.oga]', ' N5 ');
      INSERT INTO cards VALUES (6001, 5001, 2001, 0, 0, 0, 1, 0, 0, 0, 0, 0);

      PRAGMA writable_schema = ON;
      UPDATE sqlite_master SET sql = replace(sql, 'name text NOT NULL', 'name text NOT NULL COLLATE unicase') WHERE type = 'table' AND name IN ('notetypes', 'fields', 'decks');
    `);
    const v3Bytes = v3Db.export();
    v3Db.close();

    const mediaProto = buildMediaProtobuf([{ name: "taberu.oga", size: 4096 }]);
    const apkg = zipSync({
      meta: new Uint8Array([0x08, 0x03]),
      "collection.anki2": skelBytes,
      "collection.anki21b": wrapZstdRawFrame(v3Bytes),
      media: wrapZstdRawFrame(mediaProto),
      "0": wrapZstdRawFrame(strToU8("OggS-audio-payload")),
    });

    const parsed = await parseApkgBuffer(apkg, "Philia.apkg", apkg.byteLength);
    expect(parsed.format).toBe("anki21b");
    expect(parsed.zstdMedia).toBe(true);
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.noteTypes[0].fields).toEqual(["word", "wordFurigana", "wordEng", "wordAudio"]);
    expect(parsed.subdecks[0].name).toBe("Philia Space::Bahasa Indonesia::N5");
    expect(parsed.totalDecks).toBe(2);
    expect(parsed.media.get("taberu.oga")).toBe("0");
  });
});
