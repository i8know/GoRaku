import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
  type User,
} from "@supabase/supabase-js";
import { normalizeBasePath, resolveBaseAssetHref } from "./basePath";

export const CURRENT_CONSENT_VERSION = "2026-11-19-b1";

const VALID_JLPT_LEVELS = new Set(["N5", "N4", "N3", "N2", "N1"]);

const memoryAuthStorage = new Map<string, string>();

/**
 * Adapter penyimpanan yang aman terhadap lingkungan tanpa `window.localStorage`
 * (mis. Node/Vitest tanpa flag `--localstorage-file` atau konteks privasi ketat browser).
 */
export function createSafeBrowserStorage(): SupportedStorage {
  const canUseLocalStorage = (): boolean => {
    try {
      return (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined" &&
        typeof window.localStorage.getItem === "function"
      );
    } catch {
      return false;
    }
  };

  return {
    getItem(key: string): string | null {
      if (canUseLocalStorage()) {
        try {
          return window.localStorage.getItem(key);
        } catch {
          // fallback ke memori
        }
      }
      return memoryAuthStorage.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      if (canUseLocalStorage()) {
        try {
          window.localStorage.setItem(key, value);
          return;
        } catch {
          // fallback ke memori
        }
      }
      memoryAuthStorage.set(key, value);
    },
    removeItem(key: string): void {
      if (canUseLocalStorage()) {
        try {
          window.localStorage.removeItem(key);
          return;
        } catch {
          // fallback ke memori
        }
      }
      memoryAuthStorage.delete(key);
    },
  };
}

function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadSeg = parts[1];
  if (!payloadSeg) return null;

  try {
    const base64 = payloadSeg.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    let decoded = "";
    if (typeof atob === "function") {
      decoded = atob(padded);
    } else if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export interface SupabaseKeyValidationResult {
  valid: boolean;
  reason: string | null;
}

/**
 * Memastikan variabel klien hanya menerima kunci `sb_publishable_*` atau kunci JWT legacy `anon`,
 * dan menolak keras `sb_secret_*` maupun JWT dengan `role: "service_role"`.
 */
export function validatePublishableKey(key: string): SupabaseKeyValidationResult {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, reason: null };
  }

  if (/^sb_secret_/i.test(trimmed)) {
    return {
      valid: false,
      reason:
        "Konfigurasi Supabase ditolak: VITE_SUPABASE_PUBLISHABLE_KEY tidak boleh menggunakan kunci rahasia (sb_secret_*).",
    };
  }

  const jwtPayload = decodeJwtPayloadUnsafe(trimmed);
  if (
    jwtPayload &&
    typeof jwtPayload.role === "string" &&
    jwtPayload.role.toLowerCase() === "service_role"
  ) {
    return {
      valid: false,
      reason:
        "Konfigurasi Supabase ditolak: VITE_SUPABASE_PUBLISHABLE_KEY tidak boleh menggunakan token JWT dengan peran service_role.",
    };
  }

  return { valid: true, reason: null };
}

export interface EvaluatedSupabaseConfig {
  url: string;
  publishableKey: string;
  isConfigured: boolean;
  error: string | null;
}

export function evaluateSupabaseConfig(
  rawUrl?: string,
  rawKey?: string,
): EvaluatedSupabaseConfig {
  const url = (rawUrl ?? "").trim();
  const key = (rawKey ?? "").trim();

  if (!url || !key) {
    return {
      url,
      publishableKey: "",
      isConfigured: false,
      error: null,
    };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        url: "",
        publishableKey: "",
        isConfigured: false,
        error: "Konfigurasi Supabase ditolak: VITE_SUPABASE_URL harus memakai skema http:// atau https://.",
      };
    }
  } catch {
    return {
      url: "",
      publishableKey: "",
      isConfigured: false,
      error: "Konfigurasi Supabase ditolak: VITE_SUPABASE_URL bukan URL yang valid.",
    };
  }

  const keyCheck = validatePublishableKey(key);
  if (!keyCheck.valid) {
    return {
      url: "",
      publishableKey: "",
      isConfigured: false,
      error: keyCheck.reason,
    };
  }

  return {
    url,
    publishableKey: key,
    isConfigured: true,
    error: null,
  };
}

const rawEnvUrl =
  typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_URL : "";
const rawEnvKey =
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
    : "";

const evaluatedConfig = evaluateSupabaseConfig(rawEnvUrl, rawEnvKey);

if (evaluatedConfig.error) {
  console.error(`[GoRaku Auth] ${evaluatedConfig.error}`);
}

export const isSupabaseConfigured = evaluatedConfig.isConfigured;
export const supabaseConfigError = evaluatedConfig.error;

export const supabase: SupabaseClient | null = evaluatedConfig.isConfigured
  ? createClient(evaluatedConfig.url, evaluatedConfig.publishableKey, {
      auth: {
        storage: createSafeBrowserStorage(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Membangun URL redirect absolut untuk alur OAuth, konfirmasi email, dan reset kata sandi
 * dengan menghormati `import.meta.env.BASE_URL` (mis. `/` atau `/GoRaku/`).
 */
export function getAuthRedirectUrl(
  routePath = "/beranda",
  origin?: string,
  baseUrl?: string,
): string {
  const resolvedOrigin =
    origin ??
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost");
  const normalizedBase = normalizeBasePath(
    baseUrl ??
      (typeof import.meta !== "undefined" ? import.meta.env?.BASE_URL : "/"),
  );
  const cleanRoute = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const pathWithBase = resolveBaseAssetHref(cleanRoute, normalizedBase);
  return `${resolvedOrigin.replace(/\/+$/, "")}${pathWithBase}`;
}

export interface RedirectLocationLike {
  pathname?: string;
  search?: string;
  hash?: string;
}

/**
 * Memvalidasi target redirect pasca-login agar selalu berupa rute internal aplikasi
 * dan bebas dari open redirect maupun loop ke `/login`.
 */
export function sanitizeInternalRedirect(
  from: unknown,
  fallback = "/beranda",
): string {
  let candidate = "";
  if (typeof from === "string") {
    candidate = from.trim();
  } else if (from && typeof from === "object") {
    const loc = from as RedirectLocationLike;
    if (typeof loc.pathname === "string") {
      candidate = `${loc.pathname}${typeof loc.search === "string" ? loc.search : ""}${typeof loc.hash === "string" ? loc.hash : ""}`.trim();
    }
  }

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\")
  ) {
    return fallback;
  }

  if (
    candidate === "/login" ||
    candidate.startsWith("/login?") ||
    candidate.startsWith("/login#")
  ) {
    return fallback;
  }

  return candidate;
}

export interface ProfileRecord {
  user_id: string;
  display_name: string;
  jlpt_level: string;
  consented_at: string | null;
  consent_version: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MappedAppUser {
  name: string;
  email: string;
  level: string;
}

/**
 * Memetakan profil dari tabel `public.profiles` (prioritas utama) atau fallback
 * metadata tampilan `auth.User` menjadi bentuk `useAppStore.user`.
 */
export function mapSupabaseUserToAppUser(
  user: User,
  profile?: ProfileRecord | null,
): MappedAppUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const rawName =
    (profile?.display_name && profile.display_name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.user_name === "string" && meta.user_name.trim()) ||
    (user.email ? user.email.split("@")[0] : "") ||
    "Pelajar";

  const rawLevel = (
    profile?.jlpt_level ||
    (typeof meta.jlpt_level === "string" ? meta.jlpt_level : "")
  )
    .trim()
    .toUpperCase();
  const level = VALID_JLPT_LEVELS.has(rawLevel) ? rawLevel : "N3";

  return {
    name: rawName,
    email: user.email ?? "",
    level,
  };
}

export function normalizeJlptLevel(raw?: string | null): string {
  const clean = (raw ?? "").trim().toUpperCase();
  return VALID_JLPT_LEVELS.has(clean) ? clean : "N3";
}

export function hasEmailPasswordIdentity(user: User | null): boolean {
  if (!user) return false;
  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers
    : [];
  if (providers.includes("email")) return true;
  if (Array.isArray(user.identities)) {
    return user.identities.some((ident) => ident.provider === "email");
  }
  return false;
}

export interface PasswordStrengthInfo {
  score: 0 | 1 | 2 | 3;
  label: string;
  valid: boolean;
}

export function getPasswordStrength(password: string): PasswordStrengthInfo {
  if (!password || password.length < 6) {
    return {
      score: 0,
      label: "Minimal 6 karakter (disarankan 8+ karakter campuran huruf & angka).",
      valid: false,
    };
  }
  let criteria = 0;
  if (password.length >= 8) criteria++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) criteria++;
  if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) criteria++;

  if (criteria >= 3 && password.length >= 10) {
    return { score: 3, label: "Kuat", valid: true };
  }
  if (criteria >= 2) {
    return { score: 2, label: "Cukup", valid: true };
  }
  return { score: 1, label: "Lemah — tambahkan angka atau huruf besar", valid: true };
}

export function formatSupabaseAuthError(err: unknown): string {
  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err ?? "");

  const msg = rawMessage.trim();
  const lower = msg.toLowerCase();

  if (!msg) {
    return "Terjadi kesalahan autentikasi. Silakan coba lagi.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Email atau kata sandi tidak cocok.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email belum terverifikasi. Periksa kotak masuk atau folder spam Anda.";
  }
  if (
    lower.includes("user already registered") ||
    lower.includes("already been registered")
  ) {
    return "Email ini sudah terdaftar. Silakan masuk dengan akun Anda.";
  }
  if (
    lower.includes("password should be at least") ||
    lower.includes("weak password")
  ) {
    return "Kata sandi terlalu lemah. Gunakan minimal 6–8 karakter kombinasi huruf dan angka.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("over_email_send_rate_limit")) {
    return "Terlalu banyak percobaan dalam waktu singkat. Tunggu beberapa saat lalu coba lagi.";
  }
  if (
    lower.includes("provider is not enabled") ||
    lower.includes("unsupported provider")
  ) {
    return "Login Google belum diaktifkan pada konfigurasi proyek Supabase.";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    return "Gagal terhubung ke server autentikasi. Periksa koneksi internet Anda.";
  }
  if (
    lower.includes("same password") ||
    lower.includes("new password should be different")
  ) {
    return "Kata sandi baru harus berbeda dari kata sandi sebelumnya.";
  }

  return msg;
}
