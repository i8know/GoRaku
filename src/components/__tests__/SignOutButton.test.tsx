import "fake-indexeddb/auto";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import ProtectedLayout from "../Layout";
import ProtectedRoute, { resolveProtectedRouteAction } from "../ProtectedRoute";
import SignOutButton, {
  createSignOutFlowHandler,
  SignOutButtonView,
} from "../SignOutButton";
import ProfilePage from "../../pages/Profile";
import SettingsPage from "../../pages/Settings";
import { flushReviewLogs, switchDeckDatabaseScope } from "../../lib/deckDb";
import { switchLexiconDatabaseScope } from "../../lib/lexiconDb";
import { switchQuestionPackDatabaseScope } from "../../lib/questionPackStorage";
import {
  flushReviewStorageWrites,
  resetReviewStorageForScopeChange,
} from "../../lib/reviewStorage";
import {
  clearScopedLocalDataForUser,
  LEGACY_SIDEBAR_COLLAPSED_KEY,
  resetUserStorageScopeForTest,
} from "../../lib/userStorageScope";
import {
  initUserStorageScopeSync,
  resetScopeCoordinatorForTest,
  switchUserStorageScope,
} from "../../lib/userScopeCoordinator";
import { useAppStore } from "../../store/useAppStore";
import {
  registerAuthScopeChangeHandler,
  useAuthStore,
  type AuthActionResult,
} from "../../store/useAuthStore";
import { useReviewStore } from "../../store/useReviewStore";
import { useToastStore } from "../../store/useToastStore";

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

function makeUser(id: string, email: string, name: string): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: "2026-11-19T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: name },
    identities: [{ id: `${id}-ident`, user_id: id, provider: "email" }],
    created_at: "2026-11-19T00:00:00.000Z",
    updated_at: "2026-11-19T00:00:00.000Z",
  } as unknown as User;
}

function makeSession(user: User): Session {
  return {
    access_token: `tok-${user.id}`,
    refresh_token: `ref-${user.id}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  } as Session;
}

describe("SignOutButton & jalur keluar di seluruh aplikasi", () => {
  const USER_A = "aaaa9999-1111-4111-8111-111111111111";

  beforeEach(async () => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    useAuthStore.getState().resetForTest();
    useToastStore.setState({ toasts: [] });
    await switchDeckDatabaseScope(null);
    switchLexiconDatabaseScope(null);
    switchQuestionPackDatabaseScope(null);
    await resetReviewStorageForScopeChange();
    await clearScopedLocalDataForUser(USER_A);
  });

  afterEach(async () => {
    registerAuthScopeChangeHandler(null);
    await flushReviewStorageWrites();
    await flushReviewLogs();
    await switchUserStorageScope(null);
    await clearScopedLocalDataForUser(USER_A);
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    useAuthStore.getState().resetForTest();
    useToastStore.setState({ toasts: [] });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("memanggil signOut sekali walau diklik dua kali cepat, menampilkan status 'Keluar…' lalu hilang, dan memicu toast saat error", async () => {
    let resolveFirst!: (res: AuthActionResult) => void;
    const signOutSpy = vi.fn(
      () =>
        new Promise<AuthActionResult>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const pendingHistory: boolean[] = [];
    const navigateSpy = vi.fn();
    const lockRef = { current: false };

    const trigger = createSignOutFlowHandler(
      {
        signOut: signOutSpy,
        notify: (msg) => useToastStore.getState().notify(msg),
        navigateToLogin: navigateSpy,
        onPendingChange: (pending) => pendingHistory.push(pending),
      },
      lockRef,
    );

    // Dua klik cepat beruntun sebelum promise pertama selesai
    const p1 = trigger();
    const p2 = trigger();

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(pendingHistory).toEqual([true]);

    // Tampilan saat proses keluar aktif menampilkan status "Keluar…" (label & icon)
    const pendingLabelHtml = renderToString(
      <SignOutButtonView variant="label" signingOut={true} onClick={() => {}} />,
    );
    expect(pendingLabelHtml).toContain("Keluar…");
    expect(pendingLabelHtml).toContain("disabled");
    expect(pendingLabelHtml).toContain('aria-busy="true"');

    const pendingIconHtml = renderToString(
      <SignOutButtonView variant="icon" signingOut={true} onClick={() => {}} />,
    );
    expect(pendingIconHtml).toContain('aria-label="Keluar…"');
    expect(pendingIconHtml).toContain('title="Keluar…"');
    expect(pendingIconHtml).toContain("disabled");

    // Selesaikan dengan error -> toast muncul, status kembali idle, dan tetap mengarah ke /login
    resolveFirst({ error: "Gagal menghubungi server saat keluar." });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe(true);
    expect(r2).toBe(false);
    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(pendingHistory).toEqual([true, false]);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain(
      "Gagal menghubungi server saat keluar.",
    );

    // Setelah selesai, tampilan kembali ke "Keluar"
    const idleLabelHtml = renderToString(
      <SignOutButtonView variant="label" signingOut={false} onClick={() => {}} />,
    );
    expect(idleLabelHtml).toContain(">Keluar<");
    expect(idleLabelHtml).not.toContain("Keluar…");
    expect(idleLabelHtml).not.toContain("disabled");
  });

  it("merender tombol dengan nama aksesibel 'Keluar' di sidebar penuh, sidebar diciutkan, Profile, dan Settings", () => {
    const fakeUser = makeUser(USER_A, "hana@goraku.id", "Hana");
    const appUser = { name: "Hana", email: "hana@goraku.id", level: "N3" };

    // React 19 renderToString membaca objek api.getInitialState() internal Zustand v5.
    const appInit = useAppStore.getInitialState();
    const authInit = useAuthStore.getInitialState();
    const prevAppUser = appInit.user;
    const prevAuth = {
      user: authInit.user,
      status: authInit.status,
      profile: authInit.profile,
    };
    const hydratedSpy = vi.spyOn(useReviewStore.persist, "hasHydrated").mockReturnValue(true);

    try {
      appInit.user = appUser;
      authInit.user = fakeUser;
      authInit.status = "signedIn";
      authInit.profile = {
        user_id: USER_A,
        display_name: "Hana",
        jlpt_level: "N3",
        consented_at: "2026-11-19T00:00:00.000Z",
        consent_version: "2026-11-27-b2",
      };

      // 1. Sidebar penuh (tidak diciutkan)
      localStorage.setItem(LEGACY_SIDEBAR_COLLAPSED_KEY, "0");
      const sidebarFullHtml = renderToString(
        <MemoryRouter initialEntries={["/beranda"]}>
          <Routes>
            <Route element={<ProtectedLayout />}>
              <Route path="/beranda" element={<div>Konten Beranda</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      expect(sidebarFullHtml).toContain('aria-label="Keluar"');
      expect(sidebarFullHtml).toContain('title="Keluar"');
      expect(sidebarFullHtml).toContain("sidebar-signout-btn");
      // Pastikan ikon logout yang dipakai, bukan ikon X ("m6 6 12 12M18 6 6 18")
      expect(sidebarFullHtml).toContain("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4");
      expect(sidebarFullHtml).not.toContain("m6 6 12 12M18 6 6 18");

      // 2. Sidebar diciutkan
      localStorage.setItem(LEGACY_SIDEBAR_COLLAPSED_KEY, "1");
      const sidebarCollapsedHtml = renderToString(
        <MemoryRouter initialEntries={["/beranda"]}>
          <Routes>
            <Route element={<ProtectedLayout />}>
              <Route path="/beranda" element={<div>Konten Beranda</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      expect(sidebarCollapsedHtml).toContain("is-collapsed");
      expect(sidebarCollapsedHtml).toContain('aria-label="Keluar"');
      expect(sidebarCollapsedHtml).toContain('title="Keluar"');
      expect(sidebarCollapsedHtml).toContain("sidebar-signout-btn");

      // 3. Halaman Profile
      const profileHtml = renderToString(
        <MemoryRouter initialEntries={["/profile"]}>
          <ProfilePage />
        </MemoryRouter>,
      );
      expect(profileHtml).toContain("prof-header-actions");
      expect(profileHtml).toContain("outline-button signout-btn");
      expect(profileHtml).toContain("<span>Keluar</span>");

      // 4. Halaman Settings: bagian Akun dengan email, tombol Keluar, dan teks bantu persis
      const settingsHtml = renderToString(
        <MemoryRouter initialEntries={["/settings"]}>
          <SettingsPage notify={() => {}} />
        </MemoryRouter>,
      );
      expect(settingsHtml).toContain("settings-account-heading");
      expect(settingsHtml).toContain(">Akun<");
      expect(settingsHtml).toContain("hana@goraku.id");
      expect(settingsHtml).toContain("outline-button signout-btn");
      expect(settingsHtml).toContain("<span>Keluar</span>");
      expect(settingsHtml).toContain(
        "Data belajarmu tetap tersimpan lokal di perangkat ini dan disinkronkan ke akunmu secara otomatis saat terhubung.",
      );

      // 5. Render komponen SignOutButton langsung untuk kedua varian
      const directLabelHtml = renderToString(
        <MemoryRouter>
          <SignOutButton variant="label" />
        </MemoryRouter>,
      );
      const directIconHtml = renderToString(
        <MemoryRouter>
          <SignOutButton variant="icon" />
        </MemoryRouter>,
      );
      expect(directLabelHtml).toContain("<span>Keluar</span>");
      expect(directIconHtml).toContain('aria-label="Keluar"');
      expect(directIconHtml).toContain('title="Keluar"');
    } finally {
      hydratedSpy.mockRestore();
      appInit.user = prevAppUser;
      Object.assign(authInit, prevAuth);
    }
  });

  it("setelah keluar, data akun sebelumnya dibersihkan dari RAM dan rute terlindungi mengarah ke layar masuk (/login)", async () => {
    initUserStorageScopeSync({ lockUnauthenticated: true });

    const userA = makeUser(USER_A, "hana@goraku.id", "Hana");
    let currentSession: Session | null = makeSession(userA);
    let authListener: ((event: string, session: Session | null) => void) | null = null;

    const mockClient = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: currentSession }, error: null })),
        getClaims: vi.fn(async () => ({
          data: currentSession ? { claims: { sub: currentSession.user.id } } : null,
          error: null,
        })),
        onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => void) => {
          authListener = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signOut: vi.fn(async () => {
          currentSession = null;
          authListener?.("SIGNED_OUT", null);
          return { error: null };
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                user_id: USER_A,
                display_name: "Hana",
                jlpt_level: "N3",
                consented_at: "2026-11-19T00:00:00.000Z",
                consent_version: "2026-11-27-b2",
              },
              error: null,
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const cleanup = useAuthStore.getState().init(mockClient);
    await vi.waitFor(() => expect(useAuthStore.getState().status).toBe("signedIn"));

    // Tambahkan deck khusus milik akun A
    useAppStore.getState().addDeck({
      title: "Deck Pribadi Hana",
      level: "N3 • Novel",
      kind: "Novel",
      due: 0,
      total: 1,
      kanji: "花",
      color: "indigo",
    });
    expect(useAppStore.getState().decks.some((d) => d.title === "Deck Pribadi Hana")).toBe(true);

    // Jalankan handler keluar akun seperti yang dilakukan SignOutButton
    let redirectedToLogin = false;
    const triggerSignOut = createSignOutFlowHandler({
      signOut: () => useAuthStore.getState().signOut(),
      notify: (m) => useToastStore.getState().notify(m),
      navigateToLogin: () => {
        redirectedToLogin = true;
      },
      onPendingChange: () => {},
    });

    await triggerSignOut();

    expect(redirectedToLogin).toBe(true);
    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAppStore.getState().user).toBeNull();
    expect(useAppStore.getState().decks.some((d) => d.title === "Deck Pribadi Hana")).toBe(false);

    // Rute terlindungi mengarah ke /login dan tidak merender konten akun sebelumnya
    for (const protectedPath of ["/beranda", "/profile", "/settings"]) {
      const decision = resolveProtectedRouteAction(
        useAuthStore.getState().status,
        useAuthStore.getState().user,
        { pathname: protectedPath, search: "", hash: "" },
      );
      expect(decision.action).toBe("redirect");
      if (decision.action === "redirect") {
        expect(decision.to).toBe("/login");
      }
    }

    const authInit = useAuthStore.getInitialState();
    const prevAuthInit = { status: authInit.status, user: authInit.user };
    let protectedHtml = "";
    try {
      authInit.status = "signedOut";
      authInit.user = null;
      protectedHtml = renderToString(
        <MemoryRouter initialEntries={["/beranda"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/beranda" element={<div>Rahasia Hana</div>} />
            </Route>
            <Route path="/login" element={<div>Layar Masuk</div>} />
          </Routes>
        </MemoryRouter>,
      );
    } finally {
      Object.assign(authInit, prevAuthInit);
    }
    expect(protectedHtml).not.toContain("Rahasia Hana");

    cleanup();
  });
});
