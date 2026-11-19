import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { deckDexie, flushReviewLogs, getCards, putCards, switchDeckDatabaseScope } from "../deckDb";
import { lexiconDb, switchLexiconDatabaseScope } from "../lexiconDb";
import { questionPackDb, switchQuestionPackDatabaseScope } from "../questionPackStorage";
import { flushReviewStorageWrites, resetReviewStorageForScopeChange } from "../reviewStorage";
import {
  clearScopedLocalDataForUser,
  getDeckDbName,
  getLexiconDbName,
  getOrCreateDeviceId,
  getQuestionPackDbName,
  getScopedKey,
  getScopedStorageItem,
  LEGACY_FIRST_RUN_DISMISSED_KEY,
  resetUserStorageScopeForTest,
  setScopedStorageItem,
  withPersistWriteSuppressed,
} from "../userStorageScope";
import {
  initUserStorageScopeSync,
  resetScopeCoordinatorForTest,
  switchUserStorageScope,
} from "../userScopeCoordinator";
import { useAppStore } from "../../store/useAppStore";
import { registerAuthScopeChangeHandler, useAuthStore } from "../../store/useAuthStore";
import { useReviewStore } from "../../store/useReviewStore";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    key: (idx) => Array.from(map.keys())[idx] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, val) => {
      map.set(key, String(val));
    },
  };
}

function makeFakeUser(id: string, email: string, fullName: string): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: "2026-11-19T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: fullName },
    identities: [{ id: `${id}-ident`, user_id: id, provider: "email" }],
    created_at: "2026-11-19T00:00:00.000Z",
    updated_at: "2026-11-19T00:00:00.000Z",
  } as unknown as User;
}

function makeFakeSession(user: User): Session {
  return {
    access_token: `tok-${user.id}`,
    refresh_token: `ref-${user.id}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  } as Session;
}

function createSwitchableAuthMock(usersByEmail: Record<string, { id: string; name: string }>) {
  let currentSession: Session | null = null;
  let authListener: ((event: string, session: Session | null) => void) | null = null;

  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: currentSession }, error: null })),
      getClaims: vi.fn(async (jwt?: string) => {
        if (!jwt && !currentSession) return { data: null, error: null };
        const sub = currentSession?.user.id ?? "";
        return { data: { claims: { sub } }, error: null };
      }),
      onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => void) => {
        authListener = cb;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(() => {
                authListener = null;
              }),
            },
          },
        };
      }),
      signInWithPassword: vi.fn(async ({ email }: { email: string; password: string }) => {
        const entry = usersByEmail[email.toLowerCase()];
        if (!entry) {
          return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
        }
        const user = makeFakeUser(entry.id, email, entry.name);
        currentSession = makeFakeSession(user);
        authListener?.("SIGNED_IN", currentSession);
        return { data: { user, session: currentSession }, error: null };
      }),
      signOut: vi.fn(async () => {
        currentSession = null;
        authListener?.("SIGNED_OUT", null);
        return { error: null };
      }),
    },
    from: vi.fn((_table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: currentSession
              ? {
                  user_id: currentSession.user.id,
                  display_name: String(currentSession.user.user_metadata?.full_name ?? "Pengguna"),
                  jlpt_level: "N4",
                  consented_at: "2026-11-19T00:00:00.000Z",
                  consent_version: "2026-11-19-b1",
                }
              : null,
            error: null,
          })),
        })),
      })),
    })),
  } as unknown as SupabaseClient;

  return { client };
}

describe("Task 3 — Isolasi Data Lokal Per Pengguna", () => {
  const USER_A = "11111111-1111-4111-8111-111111111111";
  const USER_B = "22222222-2222-4222-8222-222222222222";

  beforeEach(async () => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    useAuthStore.getState().resetForTest();
    await switchDeckDatabaseScope(null);
    switchLexiconDatabaseScope(null);
    switchQuestionPackDatabaseScope(null);
    await resetReviewStorageForScopeChange();
    await clearScopedLocalDataForUser(USER_A);
    await clearScopedLocalDataForUser(USER_B);
  });

  afterEach(async () => {
    registerAuthScopeChangeHandler(null);
    await flushReviewStorageWrites();
    await flushReviewLogs();
    await switchUserStorageScope(null);
    await clearScopedLocalDataForUser(USER_A);
    await clearScopedLocalDataForUser(USER_B);
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    useAuthStore.getState().resetForTest();
    vi.unstubAllGlobals();
  });

  it("membentuk kunci & nama DB Dexie per userId serta device_id unik per akun", () => {
    expect(getScopedKey("japanese-learning-storage", null)).toBe("japanese-learning-storage");
    expect(getScopedKey("japanese-learning-storage", USER_A)).toBe(
      `japanese-learning-storage::${USER_A}`,
    );
    expect(getDeckDbName(USER_A)).toBe(`goraku-${USER_A}-decks`);
    expect(getLexiconDbName(USER_A)).toBe(`goraku-${USER_A}-lexicon`);
    expect(getQuestionPackDbName(USER_A)).toBe(`goraku-${USER_A}-question-packs`);

    expect(getOrCreateDeviceId(null)).toBeNull();
    const devA1 = getOrCreateDeviceId(USER_A);
    const devA2 = getOrCreateDeviceId(USER_A);
    const devB = getOrCreateDeviceId(USER_B);

    expect(devA1).toBeTruthy();
    expect(devA1).toBe(devA2);
    expect(devB).toBeTruthy();
    expect(devB).not.toBe(devA1);
    expect(localStorage.getItem(`goraku-device-id::${USER_A}`)).toBe(devA1);
    expect(localStorage.getItem(`goraku-device-id::${USER_B}`)).toBe(devB);
  });

  it("mengisolasi penuh deck, kartu, jadwal FSRS, buku, kamus, dan preferensi antara akun A dan B tanpa mencampur data warisan", async () => {
    initUserStorageScopeSync({ lockUnauthenticated: true });

    const { client } = createSwitchableAuthMock({
      "a@goraku.id": { id: USER_A, name: "Hana A" },
      "b@goraku.id": { id: USER_B, name: "Ren B" },
    });
    const cleanup = useAuthStore.getState().init(client);
    await vi.waitFor(() => expect(useAuthStore.getState().status).toBe("signedOut"));

    // Simulasikan data warisan tanpa akun yang sudah ada di perangkat sebelum login B1.
    const legacyAppRaw = JSON.stringify({
      state: {
        decks: [
          {
            id: "legacy-deck",
            title: "Deck Warisan Lokal",
            level: "N5 • Core",
            kind: "Core",
            due: 0,
            total: 1,
            progress: 0,
            kanji: "古",
            color: "slate",
            updated: "Lama",
          },
        ],
      },
      version: 6,
    });
    const legacyReviewRaw = JSON.stringify({
      state: {
        srsCards: {
          "legacy-deck": {
            "c-leg": {
              id: "c-leg",
              repetitions: 1,
              interval: 1,
              easeFactor: 2.5,
              nextReview: 1000,
              lapses: 0,
            },
          },
        },
        newIntroduced: {},
        activity: {},
      },
      version: 1,
    });
    localStorage.setItem("japanese-learning-storage", legacyAppRaw);
    localStorage.setItem("japanese-review-storage", legacyReviewRaw);

    // 1. Akun A masuk & membuat seluruh jenis data lokal
    const resA = await useAuthStore.getState().signIn("a@goraku.id", "secretA");
    expect(resA.error).toBeNull();
    expect(useAuthStore.getState().user?.id).toBe(USER_A);
    expect(deckDexie.name).toBe(`goraku-${USER_A}-decks`);
    expect(lexiconDb.name).toBe(`goraku-${USER_A}-lexicon`);
    expect(questionPackDb.name).toBe(`goraku-${USER_A}-question-packs`);

    // Pastikan A belum mewarisi data legacy secara diam-diam
    expect(useAppStore.getState().decks.some((d) => d.id === "legacy-deck")).toBe(false);
    expect(useReviewStore.getState().srsCards["legacy-deck"]).toBeUndefined();

    const deckIdA = useAppStore.getState().addDeck({
      title: "Deck Eksklusif A",
      level: "N3 • Novel",
      kind: "Novel",
      due: 0,
      total: 1,
      kanji: "秘",
      color: "indigo",
    });
    await putCards([
      {
        id: "card-a-1",
        deckId: deckIdA,
        word: "秘密",
        reading: "ひみつ",
        meaning: "rahasia",
        sentence: "秘密のノート",
        translation: "Catatan rahasia",
        subdeck: "",
        tags: [],
      },
    ]);
    useReviewStore.getState().addCardToDeck(deckIdA, "card-a-1");
    useReviewStore.getState().reviewCardAction(deckIdA, "card-a-1", 4);

    await lexiconDb.books.put({
      id: "book-a-1",
      type: "novel",
      format: "txt",
      title: "Novel Rahasia A",
      author: "Penulis A",
      fileSize: 1024,
      progress: 40,
      addedAt: "2026-11-19T00:00:00.000Z",
      lastReadAt: "2026-11-19T00:00:00.000Z",
      minedCount: 1,
    });
    await lexiconDb.dictionaries.add({
      title: "Kamus Pribadi A",
      revision: "1.0",
      format: 3,
      attribution: "",
      enabled: true,
      priority: 1,
      termCount: 42,
      importedAt: "2026-11-19T00:00:00.000Z",
    });
    await questionPackDb.packs.put({
      id: "pack-a-1",
      version: "1.0.0",
      title: "Paket Uji A",
      description: "Paket uji akun A",
      level: "N5",
      language: "ja",
      createdAt: "2026-11-19T00:00:00.000Z",
      updatedAt: "2026-11-19T00:00:00.000Z",
      license: "CC-BY-4.0",
      attribution: { sources: [], disclaimer: "" },
      stats: {
        totalQuestions: 0,
        byType: {
          G1_KANJI_READING: 0,
          G2_KANJI_WRITING: 0,
          G3_PARTICLES: 0,
          G4_CONTEXT_VOCAB: 0,
        },
        approvedCount: 0,
        draftCount: 0,
        rejectedCount: 0,
      },
      questions: [],
    });
    setScopedStorageItem(LEGACY_FIRST_RUN_DISMISSED_KEY, "1");
    await flushReviewStorageWrites();
    await flushReviewLogs();

    // 2. Akun A keluar -> state di RAM harus bersih dan data warisan tak tersentuh
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(useAppStore.getState().decks.some((d) => d.title === "Deck Eksklusif A")).toBe(false);
    expect(useReviewStore.getState().srsCards[deckIdA]).toBeUndefined();
    expect(localStorage.getItem("japanese-learning-storage")).toBe(legacyAppRaw);
    expect(localStorage.getItem("japanese-review-storage")).toBe(legacyReviewRaw);

    // 3. Akun B masuk -> tidak melihat deck/kartu/SRS/buku/kamus/paket A maupun warisan
    const resB = await useAuthStore.getState().signIn("b@goraku.id", "secretB");
    expect(resB.error).toBeNull();
    expect(useAuthStore.getState().user?.id).toBe(USER_B);
    expect(deckDexie.name).toBe(`goraku-${USER_B}-decks`);
    expect(lexiconDb.name).toBe(`goraku-${USER_B}-lexicon`);
    expect(useAppStore.getState().decks.some((d) => d.title === "Deck Eksklusif A")).toBe(false);
    expect(useAppStore.getState().decks.some((d) => d.id === "legacy-deck")).toBe(false);
    expect(await getCards(deckIdA)).toEqual([]);
    expect(useReviewStore.getState().srsCards[deckIdA]).toBeUndefined();
    expect(useReviewStore.getState().srsCards["legacy-deck"]).toBeUndefined();
    expect(await lexiconDb.books.count()).toBe(0);
    expect(await lexiconDb.dictionaries.count()).toBe(0);
    expect(await questionPackDb.packs.count()).toBe(0);
    expect(getScopedStorageItem(LEGACY_FIRST_RUN_DISMISSED_KEY)).toBeNull();

    // Akun B membuat deck sendiri
    const deckIdB = useAppStore.getState().addDeck({
      title: "Deck Milik B",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "連",
      color: "coral",
    });
    expect(deckIdB).toBeTruthy();

    // 4. Akun B keluar, Akun A masuk kembali -> seluruh data Akun A pulih utuh!
    await useAuthStore.getState().signOut();
    await useAuthStore.getState().signIn("a@goraku.id", "secretA");

    expect(useAppStore.getState().decks.some((d) => d.id === deckIdA && d.title === "Deck Eksklusif A")).toBe(true);
    expect(useAppStore.getState().decks.some((d) => d.title === "Deck Milik B")).toBe(false);
    const cardsA = await getCards(deckIdA);
    expect(cardsA.map((c) => c.word)).toEqual(["秘密"]);
    expect(useReviewStore.getState().srsCards[deckIdA]?.["card-a-1"]?.repetitions).toBeGreaterThan(0);
    expect((await lexiconDb.books.toArray()).map((b) => b.title)).toEqual(["Novel Rahasia A"]);
    expect((await lexiconDb.dictionaries.toArray()).map((d) => d.title)).toEqual(["Kamus Pribadi A"]);
    expect(await questionPackDb.packs.get("pack-a-1")).toBeTruthy();
    expect(getScopedStorageItem(LEGACY_FIRST_RUN_DISMISSED_KEY)).toBe("1");

    // 5. withPersistWriteSuppressed melindungi dari tulis tidak sengaja
    await withPersistWriteSuppressed(() => {
      setScopedStorageItem("test-suppressed", "should-not-write");
    });
    expect(getScopedStorageItem("test-suppressed")).toBeNull();

    cleanup();
  });
});
