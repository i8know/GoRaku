import { limitsFor, type DeckItem } from "../store/useAppStore";
import type { LiveDeckStats } from "./deckStats";
import { liveDeckStats } from "./deckStats";
import type { SRSCard } from "./srs";
import type { ApkgNote, ApkgSubdeck, ParsedApkg } from "./apkg";

export type JLPTLevelCode = "N5" | "N4" | "N3" | "N2" | "N1" | "Campuran";

export interface LevelMetadata {
  kanji: string;
  color: string;
  levelText: string;
  badgeLabel: string;
}

export const LEVEL_METAS: Record<JLPTLevelCode, LevelMetadata> = {
  N5: { kanji: "初", color: "coral", levelText: "N5 • Core", badgeLabel: "JLPT N5" },
  N4: { kanji: "基", color: "sage", levelText: "N4 • Core", badgeLabel: "JLPT N4" },
  N3: { kanji: "中", color: "indigo", levelText: "N3 • Core", badgeLabel: "JLPT N3" },
  N2: { kanji: "上", color: "ochre", levelText: "N2 • Core", badgeLabel: "JLPT N2" },
  N1: { kanji: "極", color: "plum", levelText: "N1 • Core", badgeLabel: "JLPT N1" },
  Campuran: { kanji: "札", color: "slate", levelText: "Campuran • Core", badgeLabel: "Campuran" },
};

/**
 * Extract JLPT level (N1–N5) from strings like "Philia Space::N5", "Kosakata N4", "JLPT_N3", etc.
 * When Anki subdeck separators (::) are present, prefers the leaf subdeck name.
 */
export function extractLevelCode(str: string): JLPTLevelCode | undefined {
  if (!str) return undefined;
  const parts = str.split("::").map((s) => s.trim()).filter(Boolean);
  const target = parts[parts.length - 1] || str;
  const regex = /(?:^|[^a-zA-Z0-9])(?:jlpt[_\s-]*)?n([1-5])(?![a-zA-Z0-9])/i;
  const match = target.match(regex);
  if (match) {
    const num = match[1];
    return `N${num}` as JLPTLevelCode;
  }
  const fallbackMatch = str.match(regex);
  if (fallbackMatch) {
    return `N${fallbackMatch[1]}` as JLPTLevelCode;
  }
  return undefined;
}

export interface SubdeckGroupDefinition {
  key: string;
  title: string;
  subdeckName: string;
  level: string;
  levelCode: JLPTLevelCode;
  kanji: string;
  color: string;
  noteCount: number;
  scheduledCount: number;
  pathKey?: string;
  parentPathKey?: string;
  isContainer?: boolean;
}

export interface SubdeckDetectionResult {
  hasSubdecks: boolean;
  strategy: "anki-subdecks" | "level-tags" | "none";
  suggestedParentTitle: string;
  groups: SubdeckGroupDefinition[];
}

/**
 * Detect subdecks and JLPT level breakdown from an APKG package.
 * Supports:
 * 1. Anki subdecks (`::` hierarchy or multiple decks in SQLite collection, e.g. "Philia Space::N5")
 * 2. Tag-based level segregation (e.g. notes tagged N5, N4, N3, N2, N1)
 */
export function detectSubdeckHierarchy(
  parsed: Pick<ParsedApkg, "subdecks" | "notes" | "suggestedTitle">,
): SubdeckDetectionResult {
  const { subdecks, notes, suggestedTitle } = parsed;

  // 1. Strategy: Anki Subdecks (multiple decks in collection or with `::`)
  if (subdecks.length > 1) {
    const parentRoot = (suggestedTitle || "").trim().toLowerCase();
    const allFirstParts = subdecks.map((sd) => sd.name.split("::")[0]?.trim() || "");
    const commonFirst =
      allFirstParts.length > 0 && allFirstParts.every((p) => p.toLowerCase() === allFirstParts[0].toLowerCase())
        ? allFirstParts[0]
        : undefined;

    const containersMap = new Map<string, SubdeckGroupDefinition>();
    const leafGroups: SubdeckGroupDefinition[] = [];

    for (const sd of subdecks) {
      const parts = sd.name.split("::").map((p) => p.trim()).filter(Boolean);
      // Strip common root prefix so relative path starts from children
      const relParts =
        (commonFirst && parts.length > 1 && parts[0].toLowerCase() === commonFirst.toLowerCase()) ||
        (parentRoot && parts.length > 1 && parts[0].toLowerCase() === parentRoot)
          ? parts.slice(1)
          : parts;

      // Synthesize intermediate containers for multi-level paths (e.g. Bahasa Indonesia -> Kotoba N5-N1)
      for (let k = 1; k < relParts.length; k++) {
        const cPath = relParts.slice(0, k).join("::");
        const cParentPath = k > 1 ? relParts.slice(0, k - 1).join("::") : "";
        const cName = relParts[k - 1];
        if (!containersMap.has(cPath)) {
          const cLvl = extractLevelCode(cName) ?? "Campuran";
          const cMeta = LEVEL_METAS[cLvl];
          containersMap.set(cPath, {
            key: `container:${cPath}`,
            title: cName,
            subdeckName: cName,
            level: cLvl !== "Campuran" ? cMeta.levelText : "Campuran • Core",
            levelCode: cLvl,
            kanji: cMeta.kanji || "階",
            color: cMeta.color || "slate",
            noteCount: 0,
            scheduledCount: 0,
            pathKey: cPath,
            parentPathKey: cParentPath,
            isContainer: true,
          });
        }
      }

      const leaf = relParts[relParts.length - 1] || sd.name;
      const levelCode = extractLevelCode(sd.name) ?? extractLevelCode(leaf) ?? "Campuran";
      const meta = LEVEL_METAS[levelCode];

      // Count scheduled cards in this subdeck
      const sdNotes = notes.filter((n) => n.deckId === sd.id);
      const scheduledCount = sdNotes.filter((n) => !!n.schedule).length;

      // Clean displayName: if leaf is "N5", name it "Kosakata N5" for readability, or keep leaf
      let cleanName = leaf;
      if (/^N[1-5]$/i.test(leaf)) {
        cleanName = `Kosakata ${leaf.toUpperCase()}`;
      }

      const pathKey = relParts.join("::");
      const parentPathKey = relParts.length > 1 ? relParts.slice(0, -1).join("::") : "";

      leafGroups.push({
        key: sd.id,
        title: cleanName,
        subdeckName: cleanName,
        level: meta.levelText,
        levelCode,
        kanji: meta.kanji,
        color: meta.color,
        noteCount: sd.noteCount,
        scheduledCount,
        pathKey,
        parentPathKey,
        isContainer: false,
      });
    }

    const groups: SubdeckGroupDefinition[] = [
      ...Array.from(containersMap.values()),
      ...leafGroups,
    ];

    return {
      hasSubdecks: true,
      strategy: "anki-subdecks",
      suggestedParentTitle: suggestedTitle || "Koleksi Deck Anki",
      groups,
    };
  }

  // 2. Strategy: Single deck, but notes contain JLPT level tags (N5..N1)
  const tagLevelCounts: Record<string, { count: number; scheduled: number }> = {
    N5: { count: 0, scheduled: 0 },
    N4: { count: 0, scheduled: 0 },
    N3: { count: 0, scheduled: 0 },
    N2: { count: 0, scheduled: 0 },
    N1: { count: 0, scheduled: 0 },
  };

  let untaggedCount = 0;
  let untaggedScheduled = 0;

  for (const n of notes) {
    let matchedLevel: JLPTLevelCode | undefined;
    for (const tag of n.tags) {
      const lvl = extractLevelCode(tag);
      if (lvl && lvl !== "Campuran") {
        matchedLevel = lvl;
        break;
      }
    }

    if (matchedLevel && tagLevelCounts[matchedLevel]) {
      tagLevelCounts[matchedLevel].count++;
      if (n.schedule) tagLevelCounts[matchedLevel].scheduled++;
    } else {
      untaggedCount++;
      if (n.schedule) untaggedScheduled++;
    }
  }

  const activeLevels = (["N5", "N4", "N3", "N2", "N1"] as JLPTLevelCode[]).filter(
    (lvl) => tagLevelCounts[lvl]?.count > 0,
  );

  // If at least 2 distinct level tags were found, split into subdecks!
  if (activeLevels.length >= 2) {
    const groups: SubdeckGroupDefinition[] = activeLevels.map((lvl) => {
      const meta = LEVEL_METAS[lvl];
      return {
        key: lvl,
        title: `Kosakata ${lvl}`,
        subdeckName: `Kosakata ${lvl}`,
        level: meta.levelText,
        levelCode: lvl,
        kanji: meta.kanji,
        color: meta.color,
        noteCount: tagLevelCounts[lvl].count,
        scheduledCount: tagLevelCounts[lvl].scheduled,
      };
    });

    if (untaggedCount > 0) {
      groups.push({
        key: "other",
        title: "Kosakata Lainnya",
        subdeckName: "Lainnya",
        level: "Campuran • Core",
        levelCode: "Campuran",
        kanji: "札",
        color: "slate",
        noteCount: untaggedCount,
        scheduledCount: untaggedScheduled,
      });
    }

    return {
      hasSubdecks: true,
      strategy: "level-tags",
      suggestedParentTitle: suggestedTitle || "Paket Kosakata JLPT",
      groups,
    };
  }

  // 3. Single flat deck
  return {
    hasSubdecks: false,
    strategy: "none",
    suggestedParentTitle: suggestedTitle || "Deck",
    groups: [],
  };
}

/**
 * Filter note by subdeck definition based on strategy.
 */
export function isNoteInSubdeckGroup(
  note: ApkgNote,
  group: SubdeckGroupDefinition,
  strategy: "anki-subdecks" | "level-tags" | "none",
): boolean {
  if (strategy === "anki-subdecks") {
    return note.deckId === group.key;
  }
  if (strategy === "level-tags") {
    if (group.key === "other") {
      return !note.tags.some((t) => {
        const lvl = extractLevelCode(t);
        return lvl && lvl !== "Campuran";
      });
    }
    return note.tags.some((t) => extractLevelCode(t) === group.levelCode);
  }
  return true;
}

/**
 * Recursively find all leaf descendant decks under a parent deck.
 * A leaf deck is one that has no child decks pointing to it as parentId.
 */
export function getLeafDescendantDecks(
  parentDeckId: string,
  allDecks: DeckItem[],
): DeckItem[] {
  const childrenMap = new Map<string, DeckItem[]>();
  for (const d of allDecks) {
    if (d.parentId) {
      const arr = childrenMap.get(d.parentId) ?? [];
      arr.push(d);
      childrenMap.set(d.parentId, arr);
    }
  }

  const leaves: DeckItem[] = [];
  const queue = [...(childrenMap.get(parentDeckId) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const grandChildren = childrenMap.get(current.id);
    if (!grandChildren || grandChildren.length === 0) {
      leaves.push(current);
    } else {
      queue.push(...grandChildren);
    }
  }

  return leaves;
}

/**
 * Aggregate live stats of a parent deck from its children without double-counting.
 * If allDecks is provided, resolves leaf descendants recursively across multi-level trees.
 */
export function aggregateParentStats(
  parentDeck: DeckItem,
  childDecks: DeckItem[],
  srsCards: Record<string, Record<string, SRSCard>>,
  newIntroduced: Record<string, { date: string; count: number }>,
  settings: { newCards: number; maxReview: number },
  allDecks?: DeckItem[],
): LiveDeckStats {
  const targetChildren =
    allDecks && allDecks.length > 0
      ? getLeafDescendantDecks(parentDeck.id, allDecks)
      : childDecks;

  if (targetChildren.length === 0) {
    const parentLimits = limitsFor(parentDeck.id, settings);
    return liveDeckStats(
      parentDeck,
      srsCards[parentDeck.id],
      newIntroduced[parentDeck.id],
      parentLimits,
    );
  }

  let due = 0;
  let reviewDue = 0;
  let newToday = 0;
  let newTotal = 0;
  let learning = 0;
  let learned = 0;
  let totalCards = 0;

  for (const child of targetChildren) {
    const childLimits = limitsFor(child.id, settings);
    const st = liveDeckStats(
      child,
      srsCards[child.id],
      newIntroduced[child.id],
      childLimits,
    );
    due += st.due;
    reviewDue += st.reviewDue;
    newToday += st.newToday;
    newTotal += st.newTotal;
    learning += st.learning;
    learned += st.learned;
    totalCards += child.total;
  }

  return {
    due,
    reviewDue,
    newToday,
    newTotal,
    learning,
    learned,
    progress: totalCards > 0 ? Math.min(100, Math.round((learned / totalCards) * 100)) : 0,
  };
}
