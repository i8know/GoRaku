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
}

/** Built-in starter decks; their cards are seeded into IndexedDB by lib/deckCards.ts. */
export const SEED_TOTALS: Record<string, number> = { "1": 12, "2": 8, "3": 8 };

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
      updateDeck: (id, patch) =>
        set((state) => ({
          decks: state.decks.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: patch.updatedAt ?? Date.now() } : d)),
        })),
      removeDeck: (id) =>
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== id),
        })),
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
