import "fake-indexeddb/auto";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import ConsentUpdateModal, { needsConsentUpdate } from "../../components/ConsentUpdateModal";
import LandingPage from "../../pages/Landing";
import PrivacyPolicyPage from "../../pages/PrivacyPolicy";
import TermsOfServicePage from "../../pages/TermsOfService";
import {
  buildUserAccountExportJson,
  DELETE_ACCOUNT_CONFIRMATION_WORD,
  deleteCurrentUserAccount,
} from "../accountData";
import { flushReviewLogs, getCards, putCards, switchDeckDatabaseScope } from "../deckDb";
import { lexiconDb, switchLexiconDatabaseScope } from "../lexiconDb";
import { switchQuestionPackDatabaseScope } from "../questionPackStorage";
import { flushReviewStorageWrites, resetReviewStorageForScopeChange } from "../reviewStorage";
import { CURRENT_CONSENT_VERSION, hasEmailPasswordIdentity } from "../supabase";
import {
  clearScopedLocalDataForUser,
  getOrCreateDeviceId,
  getScopedKey,
  LEGACY_APP_STORAGE_KEY,
  resetUserStorageScopeForTest,
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

function makeUser(id: string, provider: "email" | "google", email: string): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: "2026-11-19T00:00:00.000Z",
    app_metadata: { provider, providers: [provider] },
    user_metadata: { full_name: "Hana" },
    identities: [{ id: `${id}-ident`, user_id: id, provider }],
    created_at: "2026-11-19T00:00:00.000Z",
    updated_at: "2026-11-19T00:00:00.000Z",
  } as unknown as User;
}

function makeSession(user: User): Session {
  return {
    access_token: "secret-access-token-must-not-export",
    refresh_token: "secret-refresh-token-must-not-export",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  } as Session;
}

describe("Task 5 — Profil, Privasi/Syarat, Persetujuan, Ekspor Data & Hapus Akun", () => {
  const USER_A = "aaaa1111-1111-4111-8111-111111111111";
  const USER_B = "bbbb2222-2222-4222-8222-222222222222";

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

  it("merender halaman /privasi dan /syarat sebagai draf dengan placeholder pemilik serta tautan di footer Landing", () => {
    const privHtml = renderToString(
      <MemoryRouter initialEntries={["/privasi"]}>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );
    expect(privHtml).toContain("Kebijakan Privasi");
    expect(privHtml).toContain("Draf");
    expect(privHtml).toContain("perlu ditinjau");
    expect(privHtml).toContain("Pengelola layanan:");
    expect(privHtml).toContain(CURRENT_CONSENT_VERSION);

    const termsHtml = renderToString(
      <MemoryRouter initialEntries={["/syarat"]}>
        <TermsOfServicePage />
      </MemoryRouter>,
    );
    expect(termsHtml).toContain("Syarat Penggunaan");
    expect(termsHtml).toContain("Draf");
    expect(termsHtml).toContain("Nama Pengelola:");

    const landingHtml = renderToString(
      <MemoryRouter initialEntries={["/"]}>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(landingHtml).toContain('href="/privasi"');
    expect(landingHtml).toContain('href="/syarat"');
  });

  it("mendeteksi kebutuhan pembaruan consent_version dan merender ConsentUpdateModal", () => {
    expect(needsConsentUpdate(null)).toBe(false);
    expect(
      needsConsentUpdate({
        user_id: USER_A,
        display_name: "Hana",
        jlpt_level: "N4",
        consented_at: null,
        consent_version: null,
      }),
    ).toBe(true);
    expect(
      needsConsentUpdate({
        user_id: USER_A,
        display_name: "Hana",
        jlpt_level: "N4",
        consented_at: "2026-01-01T00:00:00.000Z",
        consent_version: "2026-01-01-lama",
      }),
    ).toBe(true);
    expect(
      needsConsentUpdate({
        user_id: USER_A,
        display_name: "Hana",
        jlpt_level: "N4",
        consented_at: "2026-11-19T00:00:00.000Z",
        consent_version: CURRENT_CONSENT_VERSION,
      }),
    ).toBe(false);

    const modalHtml = renderToString(
      <MemoryRouter>
        <ConsentUpdateModal open={true} onAccept={async () => ({ error: null })} onSignOut={() => {}} />
      </MemoryRouter>,
    );
    expect(modalHtml).toContain("Konfirmasi kebijakan privasi");
    expect(modalHtml).toContain(CURRENT_CONSENT_VERSION);
    expect(modalHtml).toContain('href="/privasi"');
    expect(modalHtml).toContain('href="/syarat"');
  });

  it("membedakan akun email-password vs Google-only untuk opsi ganti kata sandi dan menyimpan updateProfile ke RLS", async () => {
    const emailUser = makeUser(USER_A, "email", "hana@example.com");
    const googleUser = makeUser(USER_B, "google", "hana.oauth@gmail.com");

    expect(hasEmailPasswordIdentity(emailUser)).toBe(true);
    expect(hasEmailPasswordIdentity(googleUser)).toBe(false);

    const upsertSpy = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            user_id: USER_A,
            display_name: "Hana Baru",
            jlpt_level: "N2",
            consented_at: "2026-11-19T00:00:00.000Z",
            consent_version: CURRENT_CONSENT_VERSION,
          },
          error: null,
        })),
      })),
    }));

    const session = makeSession(emailUser);
    const mockClient = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session }, error: null })),
        getClaims: vi.fn(async () => ({ data: { claims: { sub: USER_A } }, error: null })),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        updateUser: vi.fn(async () => ({ data: { user: emailUser }, error: null })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                user_id: USER_A,
                display_name: "Hana",
                jlpt_level: "N4",
                consented_at: "2026-11-19T00:00:00.000Z",
                consent_version: CURRENT_CONSENT_VERSION,
              },
              error: null,
            })),
          })),
        })),
        upsert: upsertSpy,
      })),
    } as unknown as SupabaseClient;

    const cleanup = useAuthStore.getState().init(mockClient);
    await vi.waitFor(() => expect(useAuthStore.getState().status).toBe("signedIn"));

    const res = await useAuthStore.getState().updateProfile({
      display_name: "Hana Baru",
      jlpt_level: "N2",
    });
    expect(res.error).toBeNull();
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().profile?.display_name).toBe("Hana Baru");
    expect(useAuthStore.getState().profile?.jlpt_level).toBe("N2");
    expect(useAppStore.getState().user?.name).toBe("Hana Baru");
    expect(useAppStore.getState().user?.level).toBe("N2");

    cleanup();
  });

  it("mengekspor seluruh data akun ke JSON lengkap tanpa token sensitif dan menghapus akun via Edge Function secara aman", async () => {
    initUserStorageScopeSync({ lockUnauthenticated: true });

    const emailUser = makeUser(USER_A, "email", "hana@example.com");
    let currentSession: Session | null = makeSession(emailUser);
    let authCb: ((event: string, session: Session | null) => void) | null = null;
    let shouldFailDelete = true;

    const invokeSpy = vi.fn(async () => {
      if (shouldFailDelete) {
        return { data: null, error: { message: "Edge Function timeout" } };
      }
      return { data: { deleted: true, userId: USER_A }, error: null };
    });

    const mockClient = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: currentSession }, error: null })),
        getClaims: vi.fn(async () => ({
          data: currentSession ? { claims: { sub: currentSession.user.id } } : null,
          error: null,
        })),
        onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => void) => {
          authCb = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signOut: vi.fn(async () => {
          currentSession = null;
          authCb?.("SIGNED_OUT", null);
          return { error: null };
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                user_id: USER_A,
                display_name: "Hana Ekspor",
                jlpt_level: "N3",
                consented_at: "2026-11-19T00:00:00.000Z",
                consent_version: CURRENT_CONSENT_VERSION,
              },
              error: null,
            })),
          })),
        })),
      })),
      functions: {
        invoke: invokeSpy,
      },
    } as unknown as SupabaseClient;

    const cleanup = useAuthStore.getState().init(mockClient);
    await vi.waitFor(() => expect(useAuthStore.getState().status).toBe("signedIn"));

    const deckIdA = useAppStore.getState().addDeck({
      title: "Deck Siap Ekspor",
      level: "N3 • Core",
      kind: "Core",
      due: 0,
      total: 1,
      kanji: "出",
      color: "indigo",
    });
    await putCards([
      {
        id: "card-exp-1",
        deckId: deckIdA,
        word: "輸出",
        reading: "ゆしゅつ",
        meaning: "ekspor",
        sentence: "商品を輸出する。",
        translation: "Mengekspor barang.",
        subdeck: "",
        tags: [],
      },
    ]);
    useReviewStore.getState().addCardToDeck(deckIdA, "card-exp-1");
    useReviewStore.getState().reviewCardAction(deckIdA, "card-exp-1", 4);
    await lexiconDb.books.put({
      id: "book-exp-1",
      type: "novel",
      format: "txt",
      title: "Novel Ekspor",
      author: "Penulis",
      fileSize: 512,
      progress: 50,
      addedAt: "2026-11-19T00:00:00.000Z",
      minedCount: 1,
    });
    await flushReviewStorageWrites();
    await flushReviewLogs();

    // Simpan juga data milik Akun B dan legacy untuk memastikan hapus Akun A tidak menyentuhnya
    localStorage.setItem(getScopedKey(LEGACY_APP_STORAGE_KEY, USER_B), '{"state":{"decks":[]},"version":6}');
    localStorage.setItem("japanese-learning-storage", '{"legacy":true}');
    getOrCreateDeviceId(USER_A);

    // 1. Uji ekspor JSON
    const exported = await buildUserAccountExportJson(
      useAuthStore.getState().user,
      useAuthStore.getState().profile,
    );
    const serialized = JSON.stringify(exported);
    expect(exported.account.displayName).toBe("Hana Ekspor");
    expect(exported.account.jlptLevel).toBe("N3");
    expect(exported.decks.some((d) => d.deck.id === deckIdA && d.cards[0]?.word === "輸出")).toBe(
      true,
    );
    expect(exported.books.map((b) => b.title)).toEqual(["Novel Ekspor"]);
    expect(exported.reviewProgress.srsCards[deckIdA]?.["card-exp-1"]).toBeTruthy();
    expect(exported.reviewProgress.reviewLogs.length).toBeGreaterThan(0);
    expect(serialized).not.toContain("secret-access-token");
    expect(serialized).not.toContain("secret-refresh-token");

    // 2. Simulasikan galat Edge Function: data lokal A dan sesi TIDAK boleh dihapus
    expect(DELETE_ACCOUNT_CONFIRMATION_WORD).toBe("HAPUS");
    const failRes = await deleteCurrentUserAccount({ userId: USER_A });
    expect(failRes.error).toBeTruthy();
    expect(invokeSpy).toHaveBeenCalledWith("delete-account", { method: "POST" });
    expect(useAuthStore.getState().status).toBe("signedIn");
    expect((await getCards(deckIdA)).length).toBe(1);
    expect(localStorage.getItem(getScopedKey(LEGACY_APP_STORAGE_KEY, USER_A))).toBeTruthy();

    // 3. Sukses Edge Function: data A terhapus bersih, keluar ke signedOut, data B & legacy aman
    shouldFailDelete = false;
    const okRes = await deleteCurrentUserAccount({ userId: USER_A });
    expect(okRes.error).toBeNull();
    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem(getScopedKey(LEGACY_APP_STORAGE_KEY, USER_A))).toBeNull();
    expect(localStorage.getItem(`goraku-device-id::${USER_A}`)).toBeNull();
    expect(localStorage.getItem(getScopedKey(LEGACY_APP_STORAGE_KEY, USER_B))).toBeTruthy();
    expect(localStorage.getItem("japanese-learning-storage")).toBe('{"legacy":true}');

    cleanup();
  });
});
