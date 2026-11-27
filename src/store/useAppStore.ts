import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { clampDayStartHour, DEFAULT_DAY_START_HOUR, studyDayKey } from "../lib/studyDay";
import { clampDesiredRetention, DEFAULT_DESIRED_RETENTION } from "../lib/fsrsScheduler";
import {
  getScopedKey,
  isBlockedUnauthenticatedStorageAccess,
  isPersistWriteSuppressed,
} from "../lib/userStorageScope";
import { newDeckId, newMinedCardId } from "../lib/stableId";

export type NewCardOrder = "urutan" | "acak";

export interface DeckLimitOverride {
  newCards?: number;
  maxReview?: number;
}

const fallbackAppMemoryStorage = new Map<string, string>();

const safeAppStateStorage: StateStorage = {
  getItem: (name) => {
    if (isBlockedUnauthenticatedStorageAccess()) return null;
    const scopedName = getScopedKey(name);
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
        return localStorage.getItem(scopedName);
      }
    } catch {
      /* fallback to memory */
    }
    return fallbackAppMemoryStorage.get(scopedName) ?? null;
  },
  setItem: (name, value) => {
    if (isPersistWriteSuppressed() || isBlockedUnauthenticatedStorageAccess()) return;
    const scopedName = getScopedKey(name);
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
        localStorage.setItem(scopedName, value);
        return;
      }
    } catch {
      /* fallback to memory */
    }
    fallbackAppMemoryStorage.set(scopedName, value);
  },
  removeItem: (name) => {
    if (isPersistWriteSuppressed() || isBlockedUnauthenticatedStorageAccess()) return;
    const scopedName = getScopedKey(name);
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.removeItem === "function") {
        localStorage.removeItem(scopedName);
        return;
      }
    } catch {
      /* fallback to memory */
    }
    fallbackAppMemoryStorage.delete(scopedName);
  },
};

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
  setAuthUser: (user: { name: string; email: string; level: string } | null) => void;
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
    dayStartHour: number;
    desiredRetention: number;
    newOrder: NewCardOrder;
    furi: boolean;
    audio: boolean;
    romaji: boolean;
    remind: boolean;
    time: string;
    weekly: boolean;
    size: string;
  };
  deckLimits: Record<string, DeckLimitOverride>;
  setDeckLimits: (deckId: string, limits: DeckLimitOverride | null) => void;
  updateSettings: (settings: Partial<AppState["settings"]>) => void;
  /** Mengembalikan seluruh data aplikasi ke awal bersih (gunakan di dalam withPersistWriteSuppressed). */
  resetUserData: () => void;
}

export function createInitialDecks(): DeckItem[] {
  return [
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
  ];
}

export function createInitialMinedQueue(): MinedCard[] {
  return [
    { id: "m1", word: "寿命", reading: "じゅみょう", meaning: "umur; masa hidup", src: "葬送のフリーレン", deck: "Frieren: Beyond Journey" },
    { id: "m2", word: "届く", reading: "とどく", meaning: "sampai; tersampaikan", src: "ブルーピリオド", deck: "Bahasa Jepang Sehari-hari" },
  ];
}

export function createInitialSettings(): AppState["settings"] {
  return {
    newCards: 15,
    maxReview: 120,
    dayStartHour: DEFAULT_DAY_START_HOUR,
    desiredRetention: DEFAULT_DESIRED_RETENTION,
    newOrder: "urutan",
    furi: true,
    audio: true,
    romaji: false,
    remind: true,
    time: "19:30",
    weekly: true,
    size: "Sedang",
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setAuthUser: (user) =>
        set((state) => (state.user === null && user === null ? state : { user })),
      logout: () =>
        set((state) => (state.user === null ? state : { user: null })),
      updateUser: (name, level) =>
        set((state) => ({
          user: state.user ? { ...state.user, name, level } : null,
        })),
      decks: createInitialDecks(),
      addDeck: (newDeck) => {
        const id = newDeckId();
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
      minedQueue: createInitialMinedQueue(),
      addMinedCard: (card) =>
        set((state) => ({
          minedQueue: [{ ...card, id: newMinedCardId() }, ...state.minedQueue],
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
      settings: createInitialSettings(),
      deckLimits: {},
      setDeckLimits: (deckId, limits) =>
        set((state) => {
          const next = { ...(state.deckLimits ?? {}) };
          if (
            !limits ||
            (limits.newCards === undefined && limits.maxReview === undefined)
          ) {
            delete next[deckId];
          } else {
            const entry: DeckLimitOverride = {};
            if (typeof limits.newCards === "number" && Number.isFinite(limits.newCards)) {
              entry.newCards = Math.max(1, Math.min(50, Math.round(limits.newCards)));
            }
            if (typeof limits.maxReview === "number" && Number.isFinite(limits.maxReview)) {
              entry.maxReview = Math.max(1, Math.round(limits.maxReview));
            }
            if (entry.newCards === undefined && entry.maxReview === undefined) {
              delete next[deckId];
            } else {
              next[deckId] = entry;
            }
          }
          return { deckLimits: next };
        }),
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
            dayStartHour:
              newSettings.dayStartHour !== undefined
                ? clampDayStartHour(newSettings.dayStartHour)
                : state.settings.dayStartHour,
            desiredRetention:
              newSettings.desiredRetention !== undefined
                ? clampDesiredRetention(newSettings.desiredRetention)
                : state.settings.desiredRetention,
            newOrder:
              newSettings.newOrder === "acak" || newSettings.newOrder === "urutan"
                ? newSettings.newOrder
                : (state.settings.newOrder ?? "urutan"),
          },
        })),
      resetUserData: () =>
        set({
          user: null,
          decks: createInitialDecks(),
          minedQueue: createInitialMinedQueue(),
          libraryItems: [],
          settings: createInitialSettings(),
          deckLimits: {},
        }),
    }),
    {
      name: "japanese-learning-storage",
      version: 6,
      storage: createJSONStorage(() => safeAppStateStorage),
      // Status user diturunkan dari sesi Supabase Auth di useAuthStore, bukan disimpan statis di localStorage.
      partialize: (state) => ({
        decks: state.decks,
        minedQueue: state.minedQueue,
        libraryItems: state.libraryItems,
        settings: state.settings,
        deckLimits: state.deckLimits,
      }),
      // v2: every deck is "live" (cards in IndexedDB). The old demo decks carried fake
      // due/total/progress numbers; convert them to real seeded decks.
      // v3: adds settings.dayStartHour (default 4).
      // v4: adds settings.desiredRetention (default 0.9).
      // v5: adds deckLimits ({}) and settings.newOrder ("urutan").
      // v6: drops legacy mock `user` from persisted localStorage in favor of Supabase Auth.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<AppState>;
        if (version < 2 && Array.isArray(state.decks)) {
          state.decks = state.decks.map((d) =>
            d.source
              ? d
              : { ...d, source: "manual" as const, due: 0, progress: 0, total: SEED_TOTALS[d.id] ?? 0 },
          );
        }
        if (version < 6) {
          state.user = null;
        }
        if (!state.deckLimits || typeof state.deckLimits !== "object" || Array.isArray(state.deckLimits)) {
          state.deckLimits = {};
        }
        if (state.settings) {
          const prev = state.settings as Partial<AppState["settings"]>;
          const merged: AppState["settings"] = {
            newCards: 15,
            maxReview: 120,
            dayStartHour: DEFAULT_DAY_START_HOUR,
            desiredRetention: DEFAULT_DESIRED_RETENTION,
            newOrder: "urutan",
            furi: true,
            audio: true,
            romaji: false,
            remind: true,
            time: "19:30",
            weekly: true,
            size: "Sedang",
            ...prev,
          };
          merged.dayStartHour = clampDayStartHour(prev.dayStartHour ?? DEFAULT_DAY_START_HOUR);
          merged.desiredRetention = clampDesiredRetention(prev.desiredRetention ?? DEFAULT_DESIRED_RETENTION);
          merged.newOrder = prev.newOrder === "acak" ? "acak" : "urutan";
          state.settings = merged;
        }
        return state as AppState;
      },
    }
  )
);

/**
 * Mengambil batas harian efektif (kartu baru & maksimum review) untuk suatu deck.
 * Jika deck memiliki override di `deckLimits`, nilai override dipakai; jika tidak,
 * kembali ke nilai bawaan global di `settings`.
 */
export function limitsFor(
  deckId: string,
  settings: { newCards: number; maxReview: number },
  deckLimits?: Record<string, DeckLimitOverride>,
): { newCards: number; maxReview: number } {
  const map = deckLimits ?? useAppStore.getState()?.deckLimits ?? {};
  const override = Object.prototype.hasOwnProperty.call(map, deckId)
    ? map[deckId]
    : undefined;
  return {
    newCards:
      typeof override?.newCards === "number" && Number.isFinite(override.newCards)
        ? Math.max(1, Math.min(50, Math.round(override.newCards)))
        : settings.newCards,
    maxReview:
      typeof override?.maxReview === "number" && Number.isFinite(override.maxReview)
        ? Math.max(1, Math.round(override.maxReview))
        : settings.maxReview,
  };
}

function fnv1a32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Mengurutkan kartu baru sesuai pengaturan `newOrder`:
 * - `"urutan"` (bawaan): mempertahankan urutan asli array deck.
 * - `"acak"`: mengacak secara deterministik dengan seed `studyDayKey(now, dayStartHour) + deckId`
 *   sehingga urutan tidak berubah ketika sesi dibuka ulang pada hari belajar yang sama,
 *   tetapi berubah pada hari belajar berikutnya.
 */
export function orderNewCards<T extends { id?: string }>(
  cards: readonly T[],
  deckId: string,
  newOrder: NewCardOrder = "urutan",
  now: Date | number = Date.now(),
  dayStartHour?: number,
): T[] {
  const copy = [...cards];
  if (newOrder !== "acak" || copy.length <= 1) return copy;

  const resolvedHour =
    dayStartHour ??
    useAppStore.getState()?.settings?.dayStartHour ??
    DEFAULT_DAY_START_HOUR;
  const daySeed = `${studyDayKey(now, resolvedHour)}::${deckId}`;

  return copy
    .map((item, idx) => ({
      item,
      idx,
      key: fnv1a32(`${daySeed}::${item.id ?? idx}`),
    }))
    .sort((a, b) => (a.key !== b.key ? a.key - b.key : a.idx - b.idx))
    .map((entry) => entry.item);
}
