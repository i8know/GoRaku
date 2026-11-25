import { create } from "zustand";
import {
  isAuthRetryableFetchError,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import {
  CURRENT_CONSENT_VERSION,
  formatSupabaseAuthError,
  getAuthRedirectUrl,
  isSupabaseConfigured,
  mapSupabaseUserToAppUser,
  normalizeJlptLevel,
  supabase,
  supabaseConfigError,
  type ProfileRecord,
} from "../lib/supabase";
import { useAppStore } from "./useAppStore";

export type AuthStatus = "loading" | "signedOut" | "signedIn";
export type ProfileLoadState = "idle" | "loaded" | "error";

export interface AuthActionResult {
  error: string | null;
}

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  consentedAt?: string;
  consentVersion?: string;
}

export interface SignUpResult extends AuthActionResult {
  needsEmailConfirmation: boolean;
}

export interface UpdateProfileParams {
  display_name: string;
  jlpt_level: string;
  consented_at?: string | null;
  consent_version?: string | null;
}

type ScopeChangeHandler = (userId: string | null) => Promise<void> | void;

let scopeChangeHandler: ScopeChangeHandler | null = null;

/**
 * Mendaftarkan handler isolasi data per pengguna (Task 3) tanpa membuat ketergantungan
 * impor melingkar antara `useAuthStore` dan modul penyimpanan.
 */
export function registerAuthScopeChangeHandler(
  handler: ScopeChangeHandler | null,
): void {
  scopeChangeHandler = handler;
}

interface AuthStoreState {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  profile: ProfileRecord | null;
  profileLoadState: ProfileLoadState;
  recoveryMode: boolean;
  isConfigured: boolean;
  configError: string | null;
  _client: SupabaseClient | null;
  init: (client?: SupabaseClient | null) => () => void;
  clearRecoveryMode: () => void;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signInWithGoogle: (redirectPath?: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string, currentPassword?: string) => Promise<AuthActionResult>;
  resendConfirmation: (email: string) => Promise<AuthActionResult>;
  fetchProfile: () => Promise<ProfileRecord | null>;
  updateProfile: (patch: UpdateProfileParams) => Promise<AuthActionResult>;
  resetForTest: () => void;
}

const MISSING_CONFIG_ERROR =
  "Konfigurasi Supabase belum disetel (VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY).";

let activeSubscription: { unsubscribe: () => void } | null = null;
let initGeneration = 0;

async function notifyScopeHandler(userId: string | null): Promise<void> {
  if (!scopeChangeHandler) return;
  try {
    await scopeChangeHandler(userId);
  } catch (err) {
    console.error("[GoRaku Auth] Gagal beralih ruang penyimpanan pengguna:", err);
  }
}

async function loadUserProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{ profile: ProfileRecord | null; state: ProfileLoadState }> {
  if (typeof (client as unknown as { from?: unknown }).from !== "function") {
    return { profile: null, state: "idle" };
  }
  try {
    const { data, error } = await client
      .from("profiles")
      .select("user_id, display_name, jlpt_level, consented_at, consent_version, created_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { profile: null, state: "error" };
    return { profile: (data as ProfileRecord | null) ?? null, state: "loaded" };
  } catch {
    return { profile: null, state: "error" };
  }
}

export const useAuthStore = create<AuthStoreState>((set, get) => {
  const applySignedOutState = async () => {
    await notifyScopeHandler(null);
    useAppStore.getState().setAuthUser(null);
    set({
      session: null,
      user: null,
      profile: null,
      profileLoadState: "idle",
      recoveryMode: false,
      status: "signedOut",
    });
  };

  const applySignedInSession = async (
    client: SupabaseClient,
    nextSession: Session,
    extraPatch?: Partial<Pick<AuthStoreState, "recoveryMode">>,
  ) => {
    const user = nextSession.user;
    await notifyScopeHandler(user.id);

    const existingProfile =
      get().profile?.user_id === user.id ? get().profile : null;
    const fetched = await loadUserProfile(client, user.id);
    const loadedProfile = fetched.profile ?? existingProfile;

    useAppStore
      .getState()
      .setAuthUser(mapSupabaseUserToAppUser(user, loadedProfile));

    set({
      session: nextSession,
      user,
      profile: loadedProfile,
      profileLoadState: fetched.state,
      status: "signedIn",
      ...(extraPatch ?? {}),
    });
  };

  const verifySessionAndApply = async (
    client: SupabaseClient,
    candidateSession: Session | null,
    gen: number,
    isRecovery = false,
  ) => {
    if (gen !== initGeneration) return;

    if (!candidateSession) {
      await applySignedOutState();
      return;
    }

    try {
      const canVerifyClaims =
        typeof (client.auth as unknown as { getClaims?: unknown }).getClaims ===
        "function";
      if (canVerifyClaims) {
        const { error } = await client.auth.getClaims(
          candidateSession.access_token,
        );
        if (gen !== initGeneration) return;

        if (error) {
          if (isAuthRetryableFetchError(error)) {
            const expiresAtMs = (candidateSession.expires_at ?? 0) * 1000;
            if (expiresAtMs <= Date.now()) {
              await applySignedOutState();
              return;
            }
          } else {
            await client.auth.signOut({ scope: "local" }).catch(() => {});
            if (gen !== initGeneration) return;
            await applySignedOutState();
            return;
          }
        }
      }

      if (gen !== initGeneration) return;
      await applySignedInSession(
        client,
        candidateSession,
        isRecovery ? { recoveryMode: true } : undefined,
      );
    } catch (err) {
      if (gen !== initGeneration) return;
      const expiresAtMs = (candidateSession.expires_at ?? 0) * 1000;
      if (isAuthRetryableFetchError(err) && expiresAtMs > Date.now()) {
        await applySignedInSession(client, candidateSession);
      } else {
        await applySignedOutState();
      }
    }
  };

  return {
    session: null,
    user: null,
    status: isSupabaseConfigured ? "loading" : "signedOut",
    profile: null,
    profileLoadState: "idle",
    recoveryMode: false,
    isConfigured: isSupabaseConfigured,
    configError: supabaseConfigError,
    _client: supabase,

    init: (client = supabase) => {
      initGeneration += 1;
      const gen = initGeneration;

      if (activeSubscription) {
        activeSubscription.unsubscribe();
        activeSubscription = null;
      }

      const configured =
        Boolean(client) && (client !== supabase || isSupabaseConfigured);

      set({
        _client: client ?? null,
        isConfigured: configured,
        configError: client === supabase ? supabaseConfigError : null,
        status: client ? "loading" : "signedOut",
      });

      if (!client) {
        useAppStore.getState().setAuthUser(null);
        set({
          session: null,
          user: null,
          profile: null,
          profileLoadState: "idle",
          recoveryMode: false,
          status: "signedOut",
        });
        return () => {};
      }

      let initialResolved = false;

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, nextSession) => {
        if (gen !== initGeneration) return;

        if (event === "INITIAL_SESSION") {
          if (initialResolved) return;
          initialResolved = true;
          void verifySessionAndApply(client, nextSession, gen);
          return;
        }

        if (event === "PASSWORD_RECOVERY") {
          initialResolved = true;
          if (nextSession) {
            void applySignedInSession(client, nextSession, {
              recoveryMode: true,
            });
          } else {
            set({ recoveryMode: true, status: "signedOut" });
          }
          return;
        }

        if (event === "SIGNED_OUT") {
          initialResolved = true;
          void applySignedOutState();
          return;
        }

        if (nextSession) {
          initialResolved = true;
          void applySignedInSession(client, nextSession);
        }
      });

      activeSubscription = subscription;

      // Pastikan inisialisasi selesai walau getSession() membalikkan hasil sebelum/tanpa INITIAL_SESSION
      if (typeof client.auth.getSession === "function") {
        void client.auth
          .getSession()
          .then(({ data }) => {
            if (gen !== initGeneration || initialResolved) return;
            initialResolved = true;
            return verifySessionAndApply(client, data?.session ?? null, gen);
          })
          .catch(() => {
            if (gen !== initGeneration || initialResolved) return;
            initialResolved = true;
            return applySignedOutState();
          });
      }

      return () => {
        if (activeSubscription === subscription) {
          subscription.unsubscribe();
          activeSubscription = null;
        }
      };
    },

    clearRecoveryMode: () => set({ recoveryMode: false }),

    signIn: async (email, password) => {
      const client = get()._client;
      if (!client) return { error: get().configError || MISSING_CONFIG_ERROR };
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error: formatSupabaseAuthError(error) };
        if (data.session) {
          await applySignedInSession(client, data.session);
        }
        return { error: null };
      } catch (err) {
        return { error: formatSupabaseAuthError(err) };
      }
    },

    signUp: async ({
      email,
      password,
      name,
      consentedAt = new Date().toISOString(),
      consentVersion = CURRENT_CONSENT_VERSION,
    }) => {
      const client = get()._client;
      if (!client) {
        return {
          error: get().configError || MISSING_CONFIG_ERROR,
          needsEmailConfirmation: false,
        };
      }
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              jlpt_level: "N3",
              consented_at: consentedAt,
              consent_version: consentVersion,
            },
            emailRedirectTo: getAuthRedirectUrl("/beranda"),
          },
        });
        if (error) {
          return {
            error: formatSupabaseAuthError(error),
            needsEmailConfirmation: false,
          };
        }
        if (data.session) {
          await applySignedInSession(client, data.session);
          // Sinkronkan juga consent ke tabel profiles bila proyek tidak mewajibkan konfirmasi email
          await get().updateProfile({
            display_name: name,
            jlpt_level: get().profile?.jlpt_level || "N3",
            consented_at: consentedAt,
            consent_version: consentVersion,
          });
          return { error: null, needsEmailConfirmation: false };
        }
        return { error: null, needsEmailConfirmation: Boolean(data.user) };
      } catch (err) {
        return {
          error: formatSupabaseAuthError(err),
          needsEmailConfirmation: false,
        };
      }
    },

    signInWithGoogle: async (redirectPath = "/beranda") => {
      const client = get()._client;
      if (!client) return { error: get().configError || MISSING_CONFIG_ERROR };
      try {
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: getAuthRedirectUrl(redirectPath),
          },
        });
        if (error) return { error: formatSupabaseAuthError(error) };
        return { error: null };
      } catch (err) {
        return { error: formatSupabaseAuthError(err) };
      }
    },

    signOut: async () => {
      const client = get()._client;
      set({ recoveryMode: false });
      if (!client) {
        await applySignedOutState();
        return { error: null };
      }
      try {
        const { error } = await client.auth.signOut();
        await applySignedOutState();
        if (error) return { error: formatSupabaseAuthError(error) };
        return { error: null };
      } catch (err) {
        await applySignedOutState();
        return { error: formatSupabaseAuthError(err) };
      }
    },

    sendPasswordReset: async (email) => {
      const client = get()._client;
      if (!client) return { error: get().configError || MISSING_CONFIG_ERROR };
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl("/atur-ulang-sandi"),
        });
        if (error) {
          const lower = error.message.toLowerCase();
          // Jangan pernah membocorkan apakah alamat email terdaftar atau tidak
          if (lower.includes("user not found") || lower.includes("not found")) {
            return { error: null };
          }
          return { error: formatSupabaseAuthError(error) };
        }
        return { error: null };
      } catch (err) {
        return { error: formatSupabaseAuthError(err) };
      }
    },

    updatePassword: async (newPassword, currentPassword) => {
      const client = get()._client;
      if (!client) return { error: get().configError || MISSING_CONFIG_ERROR };
      try {
        if (currentPassword !== undefined) {
          const email = get().user?.email;
          if (!currentPassword) {
            return { error: "Masukkan kata sandi saat ini untuk memverifikasi identitas Anda." };
          }
          if (!email) {
            return { error: "Email akun tidak ditemukan untuk verifikasi kata sandi saat ini." };
          }
          const { error: verifyErr } = await client.auth.signInWithPassword({
            email,
            password: currentPassword,
          });
          if (verifyErr) {
            const lower = (verifyErr.message ?? "").toLowerCase();
            if (lower.includes("invalid login credentials")) {
              return { error: "Kata sandi saat ini tidak cocok." };
            }
            return { error: formatSupabaseAuthError(verifyErr) };
          }
        }
        const { data, error } = await client.auth.updateUser({
          password: newPassword,
        });
        if (error) return { error: formatSupabaseAuthError(error) };
        if (data.user) {
          useAppStore
            .getState()
            .setAuthUser(mapSupabaseUserToAppUser(data.user, get().profile));
          set({ user: data.user });
        }
        set({ recoveryMode: false });
        return { error: null };
      } catch (err) {
        return { error: formatSupabaseAuthError(err) };
      }
    },

    resendConfirmation: async (email) => {
      const client = get()._client;
      if (!client) return { error: get().configError || MISSING_CONFIG_ERROR };
      try {
        const { error } = await client.auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo: getAuthRedirectUrl("/beranda"),
          },
        });
        if (error) return { error: formatSupabaseAuthError(error) };
        return { error: null };
      } catch (err) {
        return { error: formatSupabaseAuthError(err) };
      }
    },

    fetchProfile: async () => {
      const client = get()._client;
      const currentUser = get().user;
      if (!client || !currentUser) return null;
      const fetched = await loadUserProfile(client, currentUser.id);
      if (fetched.profile) {
        set({ profile: fetched.profile, profileLoadState: fetched.state });
        useAppStore
          .getState()
          .setAuthUser(mapSupabaseUserToAppUser(currentUser, fetched.profile));
      } else {
        set({ profileLoadState: fetched.state });
      }
      return fetched.profile;
    },

    updateProfile: async (patch) => {
      const client = get()._client;
      const currentUser = get().user;
      const cleanName = patch.display_name.trim() || "Pelajar";
      const cleanLevel = normalizeJlptLevel(patch.jlpt_level);

      if (!client || !currentUser) {
        useAppStore.getState().updateUser(cleanName, cleanLevel);
        return { error: null };
      }

      const prevProfile = get().profile;
      const payload: {
        user_id: string;
        display_name: string;
        jlpt_level: string;
        consented_at?: string | null;
        consent_version?: string | null;
      } = {
        user_id: currentUser.id,
        display_name: cleanName,
        jlpt_level: cleanLevel,
      };
      if (patch.consented_at !== undefined) {
        payload.consented_at = patch.consented_at;
      }
      if (patch.consent_version !== undefined) {
        payload.consent_version = patch.consent_version;
      }

      if (typeof (client as unknown as { from?: unknown }).from === "function") {
        try {
          const { data, error } = await client
            .from("profiles")
            .upsert(payload, { onConflict: "user_id" })
            .select("user_id, display_name, jlpt_level, consented_at, consent_version, created_at, updated_at")
            .single();
          if (error) {
            return { error: formatSupabaseAuthError(error) };
          }
          const updatedProfile = (data as ProfileRecord) ?? {
            user_id: currentUser.id,
            display_name: cleanName,
            jlpt_level: cleanLevel,
            consented_at: patch.consented_at ?? prevProfile?.consented_at ?? null,
            consent_version:
              patch.consent_version ?? prevProfile?.consent_version ?? null,
          };
          set({ profile: updatedProfile, profileLoadState: "loaded" });
          useAppStore
            .getState()
            .setAuthUser(mapSupabaseUserToAppUser(currentUser, updatedProfile));
        } catch (err) {
          return { error: formatSupabaseAuthError(err) };
        }
      }

      // Sinkronkan juga metadata tampilan non-otorisasi di Auth (best-effort)
      await client.auth
        .updateUser({
          data: {
            full_name: cleanName,
            jlpt_level: cleanLevel,
          },
        })
        .catch(() => {});

      useAppStore.getState().updateUser(cleanName, cleanLevel);
      return { error: null };
    },

    resetForTest: () => {
      initGeneration += 1;
      if (activeSubscription) {
        activeSubscription.unsubscribe();
        activeSubscription = null;
      }
      useAppStore.getState().setAuthUser(null);
      set({
        session: null,
        user: null,
        profile: null,
        profileLoadState: "idle",
        status: "signedOut",
        recoveryMode: false,
        isConfigured: isSupabaseConfigured,
        configError: supabaseConfigError,
        _client: supabase,
      });
    },
  };
});
