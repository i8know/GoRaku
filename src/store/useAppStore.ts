import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DeckImportMeta {
  fileName: string;
  fileSize: number;
  format: string;
  importedAt: number;
  noteTypes: string[];
  subdecks: string[];
  mediaCount: number;
  mediaFailed?: number;
  decksCount?: number;
  skipped: number;
}

export interface DeckItem {
  id: string;
  title: string;
  level: string;
  kind: string;
  due: number;
  total: number;
  progress: number;
  kanji: string;
  color: string;
  updated: string;
  /** Epoch ms of the last metadata/card change; preferred over the legacy `updated` label. */
  updatedAt?: number;
  /** All decks keep their cards in IndexedDB (see lib/deckDb.ts). "apkg" = imported from Anki. */
  source?: "manual" | "apkg";
  meta?: DeckImportMeta;
  /** ID of parent deck if this deck is a subdeck. */
  parentId?: string;
  /** Leaf subdeck label without parent path (e.g. "N5" or "Kosakata N5"). */
  subdeckName?: string;
  /** Ordered IDs of direct subdecks if this is a parent deck. */
  subdeckIds?: string[];
}

/** Built-in starter decks; their cards are seeded into IndexedDB by lib/deckCards.ts. */
export const SEED_TOTALS: Record<string, number> = {
  "1": 12,
  "2": 8,
  "3": 8,
  "ps-root": 52,
  "ps-bi": 52,
  "ps-ankidrone": 10,
  "ps-kotoba": 42,
  "ps-n1": 8,
  "ps-n2": 8,
  "ps-n3": 8,
  "ps-n4": 8,
  "ps-n5": 10,
};

export interface MinedCard {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  src: string;
  deck: string;
  deckId?: string;
  sentence?: string;
  translation?: string;
}

interface AppState {
  user: { name: string; email: string; level: string } | null;
  login: (name: string, email: string) => void;
  logout: () => void;
  updateUser: (name: string, level: string) => void;
  decks: DeckItem[];
  addDeck: (deck: Omit<DeckItem, "id" | "progress" | "updated">) => string;
  importDeck: (deck: Omit<DeckItem, "progress" | "updated" | "due">) => void;
  importDecksBatch: (decks: Omit<DeckItem, "progress" | "updated" | "due">[]) => void;
  updateDeck: (id: string, patch: Partial<Omit<DeckItem, "id">>) => void;
  removeDeck: (id: string) => void;
  minedQueue: MinedCard[];
  addMinedCard: (card: Omit<MinedCard, "id">) => void;
  removeMinedCard: (id: string) => void;
  clearMinedQueue: () => void;
  libraryItems: string[];
  toggleLibraryItem: (title: string) => void;
  settings: {
    newCards: number;
    maxReview: number;
    furi: boolean;
    audio: boolean;
    romaji: boolean;
    remind: boolean;
    time: string;
    weekly: boolean;
    size: string;
  };
  updateSettings: (settings: Partial<AppState["settings"]>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: { name: "Akira", email: "akira@immersion.jp", level: "N3" },
      login: (name, email) => set({ user: { name, email, level: "N3" } }),
      logout: () => set({ user: null }),
      updateUser: (name, level) =>
        set((state) => ({
          user: state.user ? { ...state.user, name, level } : null,
        })),
      decks: [
        {
          id: "ps-root",
          title: "Philia Space",
          level: "Campuran • Core",
          kind: "Core",
          due: 0,
          total: 52,
          progress: 0,
          kanji: "宙",
          color: "indigo",
          updated: "Hari ini",
          source: "manual",
          subdeckIds: ["ps-bi"],
        },
        {
          id: "ps-bi",
          parentId: "ps-root",
          title: "Bahasa Indonesia",
          subdeckName: "Bahasa Indonesia",
          level: "Campuran • Core",
          kind: "Core",
          due: 0,
          total: 52,
          progress: 0,
          kanji: "印",
          color: "slate",
          updated: "Hari ini",
          source: "manual",
          subdeckIds: ["ps-ankidrone", "ps-kotoba"],
        },
        {
          id: "ps-ankidrone",
          parentId: "ps-bi",
          title: "Ankidrone Core 10K",
          subdeckName: "Ankidrone Core 10K",
          level: "Core 10K",
          kind: "Core",
          due: 0,
          total: 10,
          progress: 0,
          kanji: "単",
          color: "plum",
          updated: "Hari ini",
          source: "manual",
        },
        {
          id: "ps-kotoba",
          parentId: "ps-bi",
          title: "Kotoba N5-N1",
          subdeckName: "Kotoba N5-N1",
          level: "N5-N1 • Core",
          kind: "Core",
          due: 0,
          total: 42,
          progress: 0,
          kanji: "語",
          color: "ochre",
          updated: "Hari ini",
          source: "manual",
          subdeckIds: ["ps-n1", "ps-n2", "ps-n3", "ps-n4", "ps-n5"],
        },
        {
          id: "ps-n1",
          parentId: "ps-kotoba",
          title: "N1",
          subdeckName: "N1",
          level: "N1 • Core",
          kind: "Core",
          due: 0,
          total: 8,
          progress: 0,
          kanji: "極",
          color: "plum",
          updated: "Hari ini",
          source: "manual",
        },
        {
          id: "ps-n2",
          parentId: "ps-kotoba",
          title: "N2",
          subdeckName: "N2",
          level: "N2 • Core",
          kind: "Core",
          due: 0,
          total: 8,
          progress: 0,
          kanji: "上",
          color: "ochre",
          updated: "Hari ini",
          source: "manual",
        },
        {
          id: "ps-n3",
          parentId: "ps-kotoba",
          title: "N3",
          subdeckName: "N3",
          level: "N3 • Core",
          kind: "Core",
          due: 0,
          total: 8,
          progress: 0,
          kanji: "中",
          color: "indigo",
          updated: "Hari ini",
          source: "manual",
        },
        {
          id: "ps-n4",
          parentId: "ps-kotoba",
          title: "N4",
          subdeckName: "N4",
          level: "N4 • Core",
          kind: "Core",
          due: 0,
          total: 8,
          progress: 0,
          kanji: "基",
          color: "sage",
          updated: "Hari ini",
          source: "manual",
        },
        {
          id: "ps-n5",
          parentId: "ps-kotoba",
          title: "N5",
          subdeckName: "N5",
          level: "N5 • Core",
          kind: "Core",
          due: 0,
          total: 10,
          progress: 0,
          kanji: "初",
          color: "coral",
          updated: "Hari ini",
          source: "manual",
        },
        { id: "1", title: "Bahasa Jepang Sehari-hari", level: "N4 • Core", kind: "Core", due: 0, total: SEED_TOTALS["1"], progress: 0, kanji: "日常", color: "coral", updated: "Hari ini", source: "manual" },
        { id: "2", title: "Frieren: Beyond Journey", level: "Anime • Fantasy", kind: "Anime", due: 0, total: SEED_TOTALS["2"], progress: 0, kanji: "葬送", color: "indigo", updated: "Kemarin", source: "manual" },
        { id: "3", title: "Kitchen — Banana Yoshimoto", level: "Novel • N3", kind: "Novel", due: 0, total: SEED_TOTALS["3"], progress: 0, kanji: "小説", color: "sage", updated: "2 hari lalu", source: "manual" },
      ],
      addDeck: (newDeck) => {
        const id = Date.now().toString();
        set((state) => ({
          decks: [
            {
              ...newDeck,
              id,
              progress: 0,
              updated: "Baru saja",
              updatedAt: Date.now(),
              source: "manual",
            },
            ...state.decks,
          ],
        }));
        return id;
      },
      importDeck: (deck) =>
        set((state) => ({
          decks: [{ ...deck, due: 0, progress: 0, updated: "Baru saja", updatedAt: Date.now(), source: "apkg" }, ...state.decks],
        })),
      importDecksBatch: (newDecks) =>
        set((state) => {
          const now = Date.now();
          const prepared = newDecks.map((d) => ({
            ...d,
            due: 0,
            progress: 0,
            updated: "Baru saja",
            updatedAt: now,
            source: "apkg" as const,
          }));
          return {
            decks: [...prepared, ...state.decks],
          };
        }),
      updateDeck: (id, patch) =>
        set((state) => ({
          decks: state.decks.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: patch.updatedAt ?? Date.now() } : d)),
        })),
      removeDeck: (id) =>
        set((state) => {
          // Identify all descendant decks recursively
          const toRemove = new Set<string>([id]);
          let added = true;
          while (added) {
            added = false;
            for (const d of state.decks) {
              if (d.parentId && toRemove.has(d.parentId) && !toRemove.has(d.id)) {
                toRemove.add(d.id);
                added = true;
              }
            }
          }
          return {
            decks: state.decks
              .filter((d) => !toRemove.has(d.id))
              .map((d) => {
                if (d.subdeckIds?.some((subId) => toRemove.has(subId))) {
                  return { ...d, subdeckIds: d.subdeckIds.filter((subId) => !toRemove.has(subId)) };
                }
                return d;
              }),
          };
        }),
      minedQueue: [
        { id: "m1", word: "寿命", reading: "じゅみょう", meaning: "umur; masa hidup", src: "葬送のフリーレン", deck: "Frieren: Beyond Journey" },
        { id: "m2", word: "届く", reading: "とどく", meaning: "sampai; tersampaikan", src: "ブルーピリオド", deck: "Bahasa Jepang Sehari-hari" },
      ],
      addMinedCard: (card) =>
        set((state) => ({
          minedQueue: [{ ...card, id: Date.now().toString() }, ...state.minedQueue],
        })),
      removeMinedCard: (id) =>
        set((state) => ({
          minedQueue: state.minedQueue.filter((m) => m.id !== id),
        })),
      clearMinedQueue: () => set({ minedQueue: [] }),
      libraryItems: [],
      toggleLibraryItem: (title) =>
        set((state) => ({
          libraryItems: state.libraryItems.includes(title)
            ? state.libraryItems.filter((t) => t !== title)
            : [...state.libraryItems, title],
        })),
      settings: {
        newCards: 15,
        maxReview: 120,
        furi: true,
        audio: true,
        romaji: false,
        remind: true,
        time: "19:30",
        weekly: true,
        size: "Sedang",
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: "japanese-learning-storage",
      version: 2,
      // v2: every deck is "live" (cards in IndexedDB). The old demo decks carried fake
      // due/total/progress numbers; convert them to real seeded decks.
      migrate: (persisted, version) => {
        const state = persisted as Partial<AppState>;
        if (version < 2 && Array.isArray(state.decks)) {
          state.decks = state.decks.map((d) =>
            d.source
              ? d
              : { ...d, source: "manual" as const, due: 0, progress: 0, total: SEED_TOTALS[d.id] ?? 0 },
          );
        }
        return state as AppState;
      },
    }
  )
);
