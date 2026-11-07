import { describe, expect, it } from "vitest";
import {
  detectSubdeckHierarchy,
  extractLevelCode,
  aggregateParentStats,
  LEVEL_METAS,
} from "../deckSubdecks";
import type { DeckItem } from "../../store/useAppStore";
import { useAppStore } from "../../store/useAppStore";
import type { SRSCard } from "../srs";

describe("Subdeck Hierarchy & JLPT Level Partitioning (Revolusi Anki)", () => {
  it("extracts JLPT level codes from various naming formats", () => {
    expect(extractLevelCode("Philia Space::N5")).toBe("N5");
    expect(extractLevelCode("Philia Space::Bahasa Indonesia::Kotoba N5-N1::N4")).toBe("N4");
    expect(extractLevelCode("JLPT_N3_Vocab")).toBe("N3");
    expect(extractLevelCode("Kosakata N2")).toBe("N2");
    expect(extractLevelCode("N1")).toBe("N1");
    expect(extractLevelCode("Random Non-JLPT Deck")).toBeUndefined();
  });

  it("detects and partitions Anki subdecks (e.g. Philia Space N1-N5 with `::` subdecks)", () => {
    const parsedMock = {
      suggestedTitle: "Philia Space JLPT N1-N5",
      subdecks: [
        { id: "101", name: "Philia Space::Kosakata N5", noteCount: 650 },
        { id: "102", name: "Philia Space::Kosakata N4", noteCount: 720 },
        { id: "103", name: "Philia Space::Kosakata N3", noteCount: 950 },
        { id: "104", name: "Philia Space::Kosakata N2", noteCount: 880 },
        { id: "105", name: "Philia Space::Kosakata N1", noteCount: 1100 },
      ],
      notes: [
        { id: "n1", noteTypeId: "nt1", deckId: "101", fields: ["食べる", "たべる"], tags: ["N5"] },
        { id: "n2", noteTypeId: "nt1", deckId: "102", fields: ["案内", "あんない"], tags: ["N4"] },
        { id: "n3", noteTypeId: "nt1", deckId: "103", fields: ["関心", "かんしん"], tags: ["N3"] },
        { id: "n4", noteTypeId: "nt1", deckId: "104", fields: ["克服", "こくふく"], tags: ["N2"] },
        { id: "n5", noteTypeId: "nt1", deckId: "105", fields: ["相変わらず", "あいかわらず"], tags: ["N1"] },
      ],
    };

    const res = detectSubdeckHierarchy(parsedMock);
    expect(res.hasSubdecks).toBe(true);
    expect(res.strategy).toBe("anki-subdecks");
    expect(res.suggestedParentTitle).toBe("Philia Space JLPT N1-N5");
    expect(res.groups).toHaveLength(5);

    // Verify N5 group details
    const n5Group = res.groups.find((g) => g.levelCode === "N5");
    expect(n5Group).toBeDefined();
    expect(n5Group?.subdeckName).toBe("Kosakata N5");
    expect(n5Group?.kanji).toBe("初");
    expect(n5Group?.color).toBe("coral");
    expect(n5Group?.noteCount).toBe(650);

    // Verify N1 group details
    const n1Group = res.groups.find((g) => g.levelCode === "N1");
    expect(n1Group).toBeDefined();
    expect(n1Group?.kanji).toBe("極");
    expect(n1Group?.color).toBe("plum");
    expect(n1Group?.noteCount).toBe(1100);
  });

  it("detects and partitions single deck with JLPT level tags (N5..N1 tags)", () => {
    const parsedMock = {
      suggestedTitle: "Tango JLPT Master",
      subdecks: [{ id: "single-deck", name: "Tango Master", noteCount: 50 }],
      notes: [
        { id: "1", noteTypeId: "nt1", deckId: "single-deck", fields: ["水", "みず"], tags: ["JLPT_N5", "Kotoba"] },
        { id: "2", noteTypeId: "nt1", deckId: "single-deck", fields: ["猫", "ねこ"], tags: ["N5"] },
        { id: "3", noteTypeId: "nt1", deckId: "single-deck", fields: ["試験", "しけん"], tags: ["JLPT_N4"] },
        { id: "4", noteTypeId: "nt1", deckId: "single-deck", fields: ["経済", "けいざい"], tags: ["N3"] },
      ],
    };

    const res = detectSubdeckHierarchy(parsedMock);
    expect(res.hasSubdecks).toBe(true);
    expect(res.strategy).toBe("level-tags");
    expect(res.groups).toHaveLength(3); // N5, N4, N3

    const n5 = res.groups.find((g) => g.levelCode === "N5");
    expect(n5?.noteCount).toBe(2);
    expect(n5?.subdeckName).toBe("Kosakata N5");

    const n4 = res.groups.find((g) => g.levelCode === "N4");
    expect(n4?.noteCount).toBe(1);

    const n3 = res.groups.find((g) => g.levelCode === "N3");
    expect(n3?.noteCount).toBe(1);
  });

  it("returns hasSubdecks: false for single decks without level segregation", () => {
    const parsedMock = {
      suggestedTitle: "My Anime Phrases",
      subdecks: [{ id: "anime-deck", name: "Anime Phrases", noteCount: 20 }],
      notes: [
        { id: "1", noteTypeId: "nt1", deckId: "anime-deck", fields: ["仲間", "なかま"], tags: ["Anime"] },
        { id: "2", noteTypeId: "nt1", deckId: "anime-deck", fields: ["絆", "きずな"], tags: ["Anime", "Emosi"] },
      ],
    };

    const res = detectSubdeckHierarchy(parsedMock);
    expect(res.hasSubdecks).toBe(false);
    expect(res.strategy).toBe("none");
    expect(res.groups).toHaveLength(0);
  });

  it("aggregates parent deck stats seamlessly from child subdecks without double counting", () => {
    const parentDeck: DeckItem = {
      id: "philia-parent",
      title: "Philia Space JLPT N1-N5",
      level: "Campuran • Core",
      kind: "Core",
      due: 0,
      total: 200,
      progress: 0,
      kanji: "札",
      color: "indigo",
      updated: "Baru saja",
      subdeckIds: ["sub-n5", "sub-n4"],
    };

    const subN5: DeckItem = {
      id: "sub-n5",
      parentId: "philia-parent",
      title: "Kosakata N5",
      subdeckName: "N5",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 100,
      progress: 0,
      kanji: "初",
      color: "coral",
      updated: "Baru saja",
    };

    const subN4: DeckItem = {
      id: "sub-n4",
      parentId: "philia-parent",
      title: "Kosakata N4",
      subdeckName: "N4",
      level: "N4 • Core",
      kind: "Core",
      due: 0,
      total: 100,
      progress: 0,
      kanji: "基",
      color: "sage",
      updated: "Baru saja",
    };

    const srsCards: Record<string, Record<string, SRSCard>> = {
      "sub-n5": {
        c1: { id: "c1", interval: 25, easeFactor: 2.5, repetitions: 4, nextReview: Date.now() + 86400000 },
        c2: { id: "c2", interval: 1, easeFactor: 2.5, repetitions: 1, nextReview: Date.now() - 1000 }, // due
      },
      "sub-n4": {
        c3: { id: "c3", interval: 30, easeFactor: 2.6, repetitions: 5, nextReview: Date.now() + 86400000 },
      },
    };

    const newIntroduced: Record<string, { date: string; count: number }> = {};
    const settings = { newCards: 20, maxReview: 100 };

    const parentStats = aggregateParentStats(
      parentDeck,
      [subN5, subN4],
      srsCards,
      newIntroduced,
      settings,
    );

    // Learned cards: c1 (n5) + c3 (n4) = 2
    expect(parentStats.learned).toBe(2);
    // Review due: c2 (n5) = 1
    expect(parentStats.reviewDue).toBe(1);
    // Total cards = 200, progress = (2 / 200) * 100 = 1%
    expect(parentStats.progress).toBe(1);
    // New total = (100 - 2) + (100 - 1) = 197
    expect(parentStats.newTotal).toBe(197);
  });

  it("handles batch import and cascade removal in useAppStore", () => {
    const parentId = `test-parent-${Date.now()}`;
    const subN5Id = `${parentId}-n5`;
    const subN4Id = `${parentId}-n4`;

    useAppStore.getState().importDecksBatch([
      {
        id: parentId,
        title: "Philia Space Test Bundle",
        level: "Campuran • Core",
        kind: "Core",
        total: 20,
        kanji: "札",
        color: "indigo",
        subdeckIds: [subN5Id, subN4Id],
      },
      {
        id: subN5Id,
        parentId,
        title: "Philia Space • Kosakata N5",
        subdeckName: "Kosakata N5",
        level: "N5 • Core",
        kind: "Core",
        total: 10,
        kanji: "初",
        color: "coral",
      },
      {
        id: subN4Id,
        parentId,
        title: "Philia Space • Kosakata N4",
        subdeckName: "Kosakata N4",
        level: "N4 • Core",
        kind: "Core",
        total: 10,
        kanji: "基",
        color: "sage",
      },
    ]);

    const stateAfterImport = useAppStore.getState().decks;
    expect(stateAfterImport.some((d) => d.id === parentId)).toBe(true);
    expect(stateAfterImport.some((d) => d.id === subN5Id)).toBe(true);
    expect(stateAfterImport.some((d) => d.id === subN4Id)).toBe(true);

    // Deleting parent deck should cascade-delete all its subdecks!
    useAppStore.getState().removeDeck(parentId);

    const stateAfterRemoval = useAppStore.getState().decks;
    expect(stateAfterRemoval.some((d) => d.id === parentId)).toBe(false);
    expect(stateAfterRemoval.some((d) => d.id === subN5Id)).toBe(false);
    expect(stateAfterRemoval.some((d) => d.id === subN4Id)).toBe(false);
  });

  it("handles multi-level hierarchy (e.g. Philia Space -> Bahasa Indonesia -> Kotoba N5-N1 -> N5)", () => {
    const rootId = `root-${Date.now()}`;
    const mid1Id = `${rootId}-bi`;
    const mid2Id = `${mid1Id}-kotoba`;
    const leafN5Id = `${mid2Id}-n5`;
    const leafN1Id = `${mid2Id}-n1`;

    useAppStore.getState().importDecksBatch([
      { id: rootId, title: "Philia Space", level: "Campuran • Core", kind: "Core", total: 100, kanji: "札", color: "indigo" },
      { id: mid1Id, parentId: rootId, title: "Bahasa Indonesia", level: "Campuran • Core", kind: "Core", total: 100, kanji: "印", color: "slate" },
      { id: mid2Id, parentId: mid1Id, title: "Kotoba N5-N1", level: "Campuran • Core", kind: "Core", total: 100, kanji: "単", color: "ochre" },
      { id: leafN5Id, parentId: mid2Id, title: "N5", subdeckName: "N5", level: "N5 • Core", kind: "Core", total: 50, kanji: "初", color: "coral" },
      { id: leafN1Id, parentId: mid2Id, title: "N1", subdeckName: "N1", level: "N1 • Core", kind: "Core", total: 50, kanji: "極", color: "plum" },
    ]);

    const state = useAppStore.getState().decks;
    expect(state.some((d) => d.id === leafN5Id)).toBe(true);
    expect(state.some((d) => d.id === leafN1Id)).toBe(true);

    // Cascading delete on root must remove all levels: mid1, mid2, leafN5, leafN1!
    useAppStore.getState().removeDeck(rootId);
    const afterDelete = useAppStore.getState().decks;
    expect(afterDelete.some((d) => d.id === rootId)).toBe(false);
    expect(afterDelete.some((d) => d.id === mid1Id)).toBe(false);
    expect(afterDelete.some((d) => d.id === mid2Id)).toBe(false);
    expect(afterDelete.some((d) => d.id === leafN5Id)).toBe(false);
    expect(afterDelete.some((d) => d.id === leafN1Id)).toBe(false);
  });

  it("detects deep multi-level Anki subdecks (Philia Space -> Bahasa Indonesia -> Kotoba N5-N1 -> N1..N5 + Ankidrone)", () => {
    const deepMock = {
      suggestedTitle: "Philia Space",
      subdecks: [
        { id: "did-ankidrone", name: "Philia Space::Bahasa Indonesia::Ankidrone Core 10K", noteCount: 98 },
        { id: "did-n1", name: "Philia Space::Bahasa Indonesia::Kotoba N5-N1::N1", noteCount: 20 },
        { id: "did-n2", name: "Philia Space::Bahasa Indonesia::Kotoba N5-N1::N2", noteCount: 119 },
        { id: "did-n3", name: "Philia Space::Bahasa Indonesia::Kotoba N5-N1::N3", noteCount: 28 },
        { id: "did-n4", name: "Philia Space::Bahasa Indonesia::Kotoba N5-N1::N4", noteCount: 3 },
        { id: "did-n5", name: "Philia Space::Bahasa Indonesia::Kotoba N5-N1::N5", noteCount: 10 },
      ],
      notes: [
        { id: "n1", noteTypeId: "nt1", deckId: "did-n5", fields: ["一", "いち"], tags: ["N5"] },
        { id: "n2", noteTypeId: "nt1", deckId: "did-n1", fields: ["極致", "きょくち"], tags: ["N1"] },
      ],
    };

    const res = detectSubdeckHierarchy(deepMock);
    expect(res.hasSubdecks).toBe(true);
    expect(res.strategy).toBe("anki-subdecks");

    // Must synthesize containers: "Bahasa Indonesia" and "Bahasa Indonesia::Kotoba N5-N1"
    const biContainer = res.groups.find((g) => g.pathKey === "Bahasa Indonesia");
    expect(biContainer).toBeDefined();
    expect(biContainer?.isContainer).toBe(true);
    expect(biContainer?.parentPathKey).toBe("");

    const kotobaContainer = res.groups.find((g) => g.pathKey === "Bahasa Indonesia::Kotoba N5-N1");
    expect(kotobaContainer).toBeDefined();
    expect(kotobaContainer?.isContainer).toBe(true);
    expect(kotobaContainer?.parentPathKey).toBe("Bahasa Indonesia");

    // Leaf decks must point to their respective parentPathKey
    const n5Leaf = res.groups.find((g) => g.key === "did-n5");
    expect(n5Leaf).toBeDefined();
    expect(n5Leaf?.levelCode).toBe("N5");
    expect(n5Leaf?.parentPathKey).toBe("Bahasa Indonesia::Kotoba N5-N1");

    const ankidroneLeaf = res.groups.find((g) => g.key === "did-ankidrone");
    expect(ankidroneLeaf).toBeDefined();
    expect(ankidroneLeaf?.parentPathKey).toBe("Bahasa Indonesia");
  });
});

