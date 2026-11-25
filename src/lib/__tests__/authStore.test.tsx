import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import {
  evaluateSupabaseConfig,
  extractSafeUrlAuthError,
  formatSupabaseAuthError,
  getAuthRedirectUrl,
  getPasswordStrength,
  mapSupabaseUserToAppUser,
  sanitizeInternalRedirect,
  validatePublishableKey,
} from "../supabase";
import { useAuthStore } from "../../store/useAuthStore";
import { useAppStore } from "../../store/useAppStore";
import ProtectedRoute, { resolveProtectedRouteAction } from "../../components/ProtectedRoute";
import LoginPage from "../../pages/LoginPage";

function encodeBase64Url(jsonObj: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(jsonObj), "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makeFakeJwt(payload: Record<string, unknown>): string {
  return `${encodeBase64Url({ alg: "HS256", typ: "JWT" })}.${encodeBase64Url(payload)}.sig`;
}

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

function createMockSupabase(overrides: {
  session?: Session | null;
  profileRow?: Record<string, unknown> | null;
  claimsError?: unknown;
  signInResult?: { data: { session: Session | null; user: User | null }; error: unknown };
  signUpResult?: { data: { session: Session | null; user: User | null }; error: unknown };
  oauthResult?: { data: { url: string }; error: unknown };
  resetResult?: { error: unknown };
} = {}) {
  let listener: ((event: string, session: Session | null) => void) | null = null;
  const unsubscribe = vi.fn();

  const client = {
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => void) => {
        listener = cb;
        return { data: { subscription: { unsubscribe } } };
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: overrides.session ?? null },
        error: null,
      }),
      getClaims: vi.fn().mockResolvedValue({
        data: overrides.claimsError ? null : { claims: {} },
        error: overrides.claimsError ?? null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue(
        overrides.signInResult ?? { data: { session: null, user: null }, error: null },
      ),
      signUp: vi.fn().mockResolvedValue(
        overrides.signUpResult ?? { data: { session: null, user: null }, error: null },
      ),
      signInWithOAuth: vi.fn().mockResolvedValue(
        overrides.oauthResult ?? { data: { url: "https://accounts.google.com/o/oauth2/auth" }, error: null },
      ),
      resetPasswordForEmail: vi.fn().mockResolvedValue(
        overrides.resetResult ?? { data: {}, error: null },
      ),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: overrides.session?.user ?? null },
        error: null,
      }),
      resend: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: overrides.profileRow ?? null,
            error: null,
          }),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: overrides.profileRow ?? null,
            error: null,
          }),
        })),
      })),
    })),
  } as unknown as SupabaseClient;

  return {
    client,
    emitAuthEvent: (event: string, nextSession: Session | null) => {
      listener?.(event, nextSession);
    },
    unsubscribe,
  };
}

const sampleUser = {
  id: "user-123-uuid",
  email: "hana@example.com",
  user_metadata: { full_name: "Hana Sato", jlpt_level: "N2" },
  app_metadata: { providers: ["email"] },
} as unknown as User;

const sampleSession = {
  access_token: "access-token-123",
  refresh_token: "refresh-token-123",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: sampleUser,
} as Session;

describe("Task 2 — Validasi Kunci Supabase, useAuthStore, Helper & Route Guard", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    useAuthStore.getState().resetForTest();
  });

  afterEach(() => {
    useAuthStore.getState().resetForTest();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("menerima sb_publishable_ atau JWT anon, serta menolak keras sb_secret_ dan JWT service_role", () => {
    expect(validatePublishableKey("sb_publishable_abc123").valid).toBe(true);
    expect(validatePublishableKey(makeFakeJwt({ role: "anon" })).valid).toBe(true);

    const secretCheck = validatePublishableKey("sb_secret_danger999");
    expect(secretCheck.valid).toBe(false);
    expect(secretCheck.reason).toContain("sb_secret_");

    const serviceRoleJwt = makeFakeJwt({ role: "service_role" });
    const jwtCheck = validatePublishableKey(serviceRoleJwt);
    expect(jwtCheck.valid).toBe(false);
    expect(jwtCheck.reason).toContain("service_role");

    const evalMissing = evaluateSupabaseConfig("", "");
    expect(evalMissing.isConfigured).toBe(false);
    expect(evalMissing.error).toBeNull();

    const evalInvalid = evaluateSupabaseConfig("https://proj.supabase.co", serviceRoleJwt);
    expect(evalInvalid.isConfigured).toBe(false);
    expect(evalInvalid.error).toContain("service_role");
  });

  it("membangun redirect URL sesuai BASE_URL dan mencegah open redirect pada sanitizeInternalRedirect", () => {
    expect(getAuthRedirectUrl("/beranda", "https://u.github.io", "/GoRaku/")).toBe(
      "https://u.github.io/GoRaku/beranda",
    );
    expect(getAuthRedirectUrl("/atur-ulang-sandi", "https://u.github.io", "/GoRaku/")).toBe(
      "https://u.github.io/GoRaku/atur-ulang-sandi",
    );

    expect(sanitizeInternalRedirect({ pathname: "/deck", search: "?tab=kartu", hash: "" })).toBe(
      "/deck?tab=kartu",
    );
    expect(sanitizeInternalRedirect("https://evil.example/phish")).toBe("/beranda");
    expect(sanitizeInternalRedirect("//evil.example")).toBe("/beranda");
    expect(sanitizeInternalRedirect("/login")).toBe("/beranda");
  });

  it("memetakan error autentikasi ke Bahasa Indonesia dan menghitung kekuatan sandi", () => {
    expect(formatSupabaseAuthError(new Error("Invalid login credentials"))).toBe(
      "Email atau kata sandi tidak cocok.",
    );
    expect(formatSupabaseAuthError({ message: "Email not confirmed" })).toContain(
      "Email belum terverifikasi",
    );
    expect(formatSupabaseAuthError({ message: "Too many requests rate limit" })).toContain(
      "Terlalu banyak percobaan",
    );
    expect(formatSupabaseAuthError(new TypeError("Failed to fetch"))).toContain(
      "Gagal terhubung",
    );

    expect(getPasswordStrength("12345").valid).toBe(false);
    expect(getPasswordStrength("abcdef").valid).toBe(false);
    expect(getPasswordStrength("abcdefgh").score).toBe(1);
    expect(getPasswordStrength("abcdefgh").valid).toBe(true);
    expect(getPasswordStrength("Abcdef12").score).toBe(2);
    expect(getPasswordStrength("GoRaku2026!#").score).toBe(3);

    // Anti content spoofing: error_description bebas di URL tidak boleh dipantulkan mentah
    const spoofed = extractSafeUrlAuthError(
      "?error_description=Akun+dibajak+hubungi+https://evil.example",
      "",
    );
    expect(spoofed).not.toContain("evil.example");
    expect(spoofed).not.toContain("dibajak");
    expect(spoofed).toContain("Autentikasi gagal");
    expect(extractSafeUrlAuthError("?error=access_denied", "")).toContain("dibatalkan");
    expect(extractSafeUrlAuthError("", "#error_code=otp_expired&error_description=evil")).toContain(
      "kedaluwarsa",
    );
    expect(extractSafeUrlAuthError("", "")).toBe("");
  });

  it("useAuthStore: restore sesi via getClaims + profiles, sign-in gagal/berhasil, email belum dikonfirmasi, dan sign-out", async () => {
    const mock = createMockSupabase({
      session: sampleSession,
      profileRow: {
        user_id: sampleUser.id,
        display_name: "Hana Profiles",
        jlpt_level: "N1",
        consented_at: "2026-11-19T00:00:00Z",
        consent_version: "2026-11-19-b1",
      },
    });

    const cleanup = useAuthStore.getState().init(mock.client);
    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe("signedIn");
    });
    expect(useAuthStore.getState().user?.id).toBe("user-123-uuid");
    expect(useAppStore.getState().user).toEqual({
      name: "Hana Profiles",
      email: "hana@example.com",
      level: "N1",
    });

    // Sign out
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAppStore.getState().user).toBeNull();

    // Sign in salah sandi
    const badLogin = createMockSupabase({
      signInResult: {
        data: { session: null, user: null },
        error: new Error("Invalid login credentials"),
      },
    });
    useAuthStore.getState().init(badLogin.client);
    const errRes = await useAuthStore.getState().signIn("hana@example.com", "salah");
    expect(errRes.error).toBe("Email atau kata sandi tidak cocok.");

    // Sign in belum verifikasi email
    const unconfirmed = createMockSupabase({
      signInResult: {
        data: { session: null, user: null },
        error: { message: "Email not confirmed" },
      },
    });
    useAuthStore.getState().init(unconfirmed.client);
    const unconfRes = await useAuthStore.getState().signIn("hana@example.com", "benar123");
    expect(unconfRes.error).toContain("Email belum terverifikasi");

    // Sign in sukses + OAuth Google + password reset anti-enumerasi
    const okMock = createMockSupabase({
      signInResult: {
        data: { session: sampleSession, user: sampleUser },
        error: null,
      },
      resetResult: { error: { message: "User not found" } },
    });
    useAuthStore.getState().init(okMock.client);
    const okRes = await useAuthStore.getState().signIn("hana@example.com", "GoRaku2026!");
    expect(okRes.error).toBeNull();
    expect(useAuthStore.getState().status).toBe("signedIn");

    await useAuthStore.getState().signInWithGoogle("/library");
    expect(okMock.client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/library"),
      },
    });

    const resetRes = await useAuthStore.getState().sendPasswordReset("unknown@example.com");
    expect(resetRes.error).toBeNull();
    expect(okMock.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "unknown@example.com",
      {
        redirectTo: expect.stringContaining("/atur-ulang-sandi"),
      },
    );

    // Ubah sandi dengan currentPassword wajib memverifikasi sandi lama terlebih dahulu
    (okMock.client.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: new Error("Invalid login credentials"),
    });
    const wrongCurRes = await useAuthStore
      .getState()
      .updatePassword("SandiBaru2026!", "SandiLamaSalah");
    expect(wrongCurRes.error).toBe("Kata sandi saat ini tidak cocok.");
    expect(okMock.client.auth.updateUser).not.toHaveBeenCalled();

    (okMock.client.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { session: sampleSession, user: sampleUser },
      error: null,
    });
    const okUpdateRes = await useAuthStore
      .getState()
      .updatePassword("SandiBaru2026!", "SandiLamaBenar");
    expect(okUpdateRes.error).toBeNull();
    expect(okMock.client.auth.updateUser).toHaveBeenCalledWith({
      password: "SandiBaru2026!",
    });

    cleanup();
  });

  it("ProtectedRoute & LoginPage: menahan konten saat loading, mengarahkan signedOut ke /login + state.from, kembali setelah login, dan menghapus mock user v5", async () => {
    // 1. status === 'loading' -> loading (tanpa redirect ke /login maupun kebocoran konten)
    expect(
      resolveProtectedRouteAction("loading", null, {
        pathname: "/deck",
        search: "?tab=kartu",
        hash: "",
      }),
    ).toEqual({ action: "loading" });

    // Dalam mode uji tanpa env Supabase, status awal SSR adalah signedOut sehingga konten terproteksi tidak pernah bocor
    const htmlSsrUnauth = renderToString(
      <MemoryRouter initialEntries={["/deck?tab=kartu"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/deck" element={<div>KONTEN TERPROTEKSI</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(htmlSsrUnauth).not.toContain("KONTEN TERPROTEKSI");

    // 2. status === 'signedOut' -> mengarahkan ke /login sambil membawa rute asal (walau useAppStore.user dimanipulasi)
    useAppStore.getState().setAuthUser({ name: "Spoof", email: "spoof@example.com", level: "N3" });
    const redirDecision = resolveProtectedRouteAction("signedOut", null, {
      pathname: "/deck",
      search: "?tab=kartu",
      hash: "#bagian",
    });
    expect(redirDecision).toEqual({
      action: "redirect",
      to: "/login",
      state: {
        from: { pathname: "/deck", search: "?tab=kartu", hash: "#bagian" },
      },
    });

    // 3. Setelah login sukses, status === 'signedIn' mengizinkan rute & sanitizeInternalRedirect mengembalikan rute asal
    expect(
      resolveProtectedRouteAction("signedIn", sampleUser, {
        pathname: "/deck",
        search: "?tab=kartu",
        hash: "#bagian",
      }),
    ).toEqual({ action: "allow" });
    if (redirDecision.action === "redirect") {
      expect(sanitizeInternalRedirect(redirDecision.state.from)).toBe(
        "/deck?tab=kartu#bagian",
      );
    }

    // 4. LoginPage dalam keadaan tanpa env menampilkan pesan konfigurasi & tombol Masuk dengan Google + tautan Privasi/Syarat
    const authInit = useAuthStore.getInitialState();
    const prevInit = {
      status: authInit.status,
      isConfigured: authInit.isConfigured,
      configError: authInit.configError,
    };
    let loginHtml = "";
    try {
      authInit.status = "signedOut";
      authInit.isConfigured = false;
      authInit.configError = null;
      loginHtml = renderToString(
        <MemoryRouter initialEntries={["/login?error_description=Akses+ditolak"]}>
          <LoginPage />
        </MemoryRouter>,
      );
    } finally {
      Object.assign(authInit, prevInit);
    }
    expect(loginHtml).toContain("Autentikasi Belum Dikonfigurasi");
    expect(loginHtml).toContain("Masuk dengan Google");
    expect(loginHtml).toContain("Lupa kata sandi?");
    expect(loginHtml).toContain("Privasi");
    expect(loginHtml).toContain("Syarat");

    // 5. Migrasi useAppStore v5 -> v6 menghapus mock user lama dari localStorage
    localStorage.setItem(
      "japanese-learning-storage",
      JSON.stringify({
        state: {
          user: { name: "Akira", email: "akira@immersion.jp", level: "N3" },
          settings: { newCards: 25 },
        },
        version: 5,
      }),
    );
    await useAppStore.persist.rehydrate();
    expect(useAppStore.getState().user).toBeNull();
    expect(useAppStore.getState().settings.newCards).toBe(25);
    expect(mapSupabaseUserToAppUser(sampleUser).name).toBe("Hana Sato");
  });
});
