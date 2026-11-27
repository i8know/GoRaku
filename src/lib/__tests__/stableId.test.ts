import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignContentHashIds,
  generateSecureUuid,
  hashRowContent,
  newCardId,
  newDeckId,
  newMinedCardId,
} from "../stableId";
import { noteToCard, parseDelimitedText, parseJsonDeck } from "../apkg";
import { guessMapping } from "../ankiText";
import { deleteDeckData, getCards, getExistingCardIds, putCards, type StoredCard } from "../deckDb";
import { addCards, exportDeck } from "../deckCards";
import { useAppStore } from "../../store/useAppStore";
import { useReviewStore } from "../../store/useReviewStore";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("Task 1 — ID stabil (UUID CSPRNG & hash konten deterministik)", () => {
  beforeEach(() => {
    useAppStore.getState().resetUserData();
    useReviewStore.getState().resetReviewState();
  });

  it("menghasilkan 50.000 ID baru tanpa satu pun tabrakan dan mendukung fallback getRandomValues tanpa Math.random", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50_000; i++) {
      ids.add(i % 2 === 0 ? newCardId() : newDeckId("deck-"));
    }
    expect(ids.size).toBe(50_000);

    // Uji jalur fallback saat crypto.randomUUID tidak tersedia
    const origCrypto = globalThis.crypto;
    const fakeCrypto = {
      getRandomValues: (arr: Uint8Array) => origCrypto.getRandomValues(arr),
    } as Crypto;
    vi.stubGlobal("crypto", fakeCrypto);
    try {
      const uuid = generateSecureUuid();
      expect(uuid).toMatch(UUID_RE);
      expect(newDeckId()).toMatch(UUID_RE);
      expect(newDeckId("deck-").startsWith("deck-")).toBe(true);
      expect(newCardId().startsWith("m")).toBe(true);
      expect(newMinedCardId().startsWith("m-")).toBe(true);
    } finally {
      vi.stubGlobal("crypto", origCrypto);
    }
  });

  it("addDeck, addMinedCard, dan addCards menghasilkan ID berbasis UUID (bukan Date.now() / Math.random())", async () => {
    const d1 = useAppStore.getState().addDeck({
      title: "Deck Uji 1",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "試",
      color: "indigo",
    });
    const d2 = useAppStore.getState().addDeck({
      title: "Deck Uji 2",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "試",
      color: "indigo",
    });
    expect(d1).toMatch(UUID_RE);
    expect(d2).toMatch(UUID_RE);
    expect(d1).not.toBe(d2);

    useAppStore.getState().addMinedCard({
      word: "猫",
      reading: "ねこ",
      meaning: "kucing",
      src: "Uji",
      deck: "Deck Uji 1",
      deckId: d1,
    });
    expect(useAppStore.getState().minedQueue[0].id).toMatch(/^m-[0-9a-f-]{36}$/i);

    const cards = await addCards(d1, [
      { word: "水", reading: "みず", meaning: "air", sentence: "", translation: "", tags: [] },
      { word: "火", reading: "ひ", meaning: "api", sentence: "", translation: "", tags: [] },
    ]);
    expect(cards[0].id).toMatch(/^m[0-9a-f-]{36}$/i);
    expect(cards[1].id).toMatch(/^m[0-9a-f-]{36}$/i);
    expect(cards[0].id).not.toBe(cards[1].id);
    await deleteDeckData(d1);
  });

  it("menormalkan NFC + trim dan memberi akhiran -2, -3 untuk baris identik dalam satu berkas", () => {
    // Bentuk terdekomposisi (NFD) vs tersusun (NFC) untuk が harus menghasilkan hash identik
    const nfc = hashRowContent(" がっこう ", "がっこう", "sekolah");
    const nfd = hashRowContent("か\u3099っこう", "か\u3099っこう", "  sekolah  ");
    expect(nfc).toBe(nfd);

    const ids = assignContentHashIds("csv", [
      { word: "猫", reading: "ねこ", meaning: "kucing" },
      { word: "犬", reading: "いぬ", meaning: "anjing" },
      { word: "猫", reading: "ねこ", meaning: "kucing" },
      { word: "猫", reading: "ねこ", meaning: "kucing" },
    ]);
    expect(ids[0]).toMatch(/^csv-[0-9a-z]+$/);
    expect(ids[1]).not.toBe(ids[0]);
    expect(ids[2]).toBe(`${ids[0]}-2`);
    expect(ids[3]).toBe(`${ids[0]}-3`);
  });

  it("impor dua berkas CSV berbeda ke satu deck mempertahankan keduanya; impor CSV yang sama dua kali terdeteksi duplikat", async () => {
    const deckId = newDeckId("deck-");
    const csvA = "word,reading,meaning\n猫,ねこ,kucing\n犬,いぬ,anjing\n";
    const csvB = "word,reading,meaning\n鳥,とり,burung\n魚,さかな,ikan\n";

    const parsedA = parseDelimitedText(csvA, "a.csv", csvA.length);
    const parsedB = parseDelimitedText(csvB, "b.csv", csvB.length);
    const parsedAAgain = parseDelimitedText(csvA, "a-copy.csv", csvA.length);

    expect(parsedA.notes.map((n) => n.id)).toEqual(parsedAAgain.notes.map((n) => n.id));
    expect(parsedA.notes[0].id).not.toBe(parsedB.notes[0].id);
    expect(parsedA.notes[0].id.startsWith("csv-")).toBe(true);
    expect(parsedA.notes[0].id).not.toBe("csv-1");

    const mapA = guessMapping(parsedA.noteTypes[0].fields, parsedA.notes.map((n) => n.fields));
    const mapB = guessMapping(parsedB.noteTypes[0].fields, parsedB.notes.map((n) => n.fields));

    // 1. Impor berkas A
    const cardsA = parsedA.notes
      .map((n) => noteToCard(n, mapA, deckId, ""))
      .filter((c): c is StoredCard => c !== null);
    await putCards(cardsA);

    // 2. Impor berkas B ke deck yang sama -> keduanya bertahan (total 4)
    const existingAfterA = await getExistingCardIds(deckId);
    const cardsB = parsedB.notes
      .filter((n) => !existingAfterA.has(n.id))
      .map((n) => noteToCard(n, mapB, deckId, ""))
      .filter((c): c is StoredCard => c !== null);
    await putCards(cardsB);
    expect((await getCards(deckId)).map((c) => c.word).sort()).toEqual(["犬", "猫", "魚", "鳥"]);

    // 3. Impor ulang berkas A dengan duplicateMode "skip" -> semua terdeteksi duplikat (0 baru)
    const existingAfterB = await getExistingCardIds(deckId);
    const newFromAAgain = parsedAAgain.notes.filter((n) => !existingAfterB.has(n.id));
    expect(newFromAAgain).toHaveLength(0);

    // 4. Verifikasi JSON juga memakai hash deterministik dan tidak menimpa antar berkas berbeda
    const json1 = JSON.stringify([{ word: "山", reading: "やま", meaning: "gunung" }]);
    const json2 = JSON.stringify([{ word: "川", reading: "かわ", meaning: "sungai" }]);
    const pj1 = parseJsonDeck(json1, "1.json", json1.length);
    const pj1Again = parseJsonDeck(json1, "1-dup.json", json1.length);
    const pj2 = parseJsonDeck(json2, "2.json", json2.length);
    expect(pj1.notes[0].id).toBe(pj1Again.notes[0].id);
    expect(pj1.notes[0].id).not.toBe(pj2.notes[0].id);
    expect(pj1.notes[0].id.startsWith("json-")).toBe(true);
    expect(pj1.notes[0].id).not.toBe("json-1");

    await deleteDeckData(deckId);
  });

  it("ID format lama (numeric deckId, csv-1, json-1, s1-01) tetap dapat dimuat, direview, dan diekspor", async () => {
    const legacyDeckId = "1730000000000";
    const legacyCards: StoredCard[] = [
      {
        id: "csv-1",
        deckId: legacyDeckId,
        word: "本",
        reading: "ほん",
        meaning: "buku",
        sentence: "",
        translation: "",
        subdeck: "",
        tags: ["legacy"],
      },
      {
        id: "json-1",
        deckId: legacyDeckId,
        word: "車",
        reading: "くるま",
        meaning: "mobil",
        sentence: "",
        translation: "",
        subdeck: "",
        tags: [],
      },
    ];
    await putCards(legacyCards);
    const loaded = await getCards(legacyDeckId);
    expect(loaded.map((c) => c.id).sort()).toEqual(["csv-1", "json-1"]);

    const updatedSrs = useReviewStore.getState().reviewCardAction(legacyDeckId, "csv-1", 4);
    expect(updatedSrs.id).toBe("csv-1");
    expect(updatedSrs.reps).toBe(1);

    // Uji exportDeck pada ID lama tanpa menyentuh browser download nyata
    const origCreateObjectUrl = URL.createObjectURL;
    const origRevokeObjectUrl = URL.revokeObjectURL;
    const createSpy = vi.fn(() => "blob:legacy-test");
    const revokeSpy = vi.fn();
    const clickSpy = vi.fn();
    const removeSpy = vi.fn();
    URL.createObjectURL = createSpy;
    URL.revokeObjectURL = revokeSpy;
    vi.stubGlobal("document", {
      createElement: () => ({ href: "", download: "", click: clickSpy, remove: removeSpy }),
      body: { appendChild: vi.fn() },
    });
    try {
      const exportedCount = await exportDeck(legacyDeckId, "Deck Lama", "json");
      expect(exportedCount).toBe(2);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      URL.createObjectURL = origCreateObjectUrl;
      URL.revokeObjectURL = origRevokeObjectUrl;
      await deleteDeckData(legacyDeckId);
    }
  });
});
