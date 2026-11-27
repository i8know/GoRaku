// Fungsi merge murni (pure, deterministik, komutatif & idempoten) yang mencerminkan aturan
// RPC PostgreSQL (`202611270001_sync_b2.sql`) sehingga klien dan server selalu konvergen.

import type { SRSCard } from "../srs";
import { isSrsRowAlive } from "./mappers";

// ---------------------------------------------------------------------------
// 1. Last-Writer-Wins (settings, decks, cards — termasuk tombstone)
// ---------------------------------------------------------------------------

export interface LwwEnvelope {
  client_updated_at: number;
  deleted_at?: number | string | null;
}

/**
 * Aturan LWW ketat: baris masuk menang hanya bila `client_updated_at` lebih besar secara ketat (`>`).
 * Seri (`===`) mempertahankan baris yang sudah ada (`local`); tombstone juga mengikuti LWW dan
 * tidak pernah dibangkitkan oleh suntingan dengan timestamp lebih lama.
 */
export function mergeLwwRecord<T extends LwwEnvelope>(
  local: T | null | undefined,
  incoming: T,
): { merged: T; winner: "local" | "incoming"; changed: boolean } {
  if (!local) {
    return { merged: incoming, winner: "incoming", changed: true };
  }
  const localTs = Math.max(0, Math.round(local.client_updated_at ?? 0));
  const incomingTs = Math.max(0, Math.round(incoming.client_updated_at ?? 0));
  if (incomingTs > localTs) {
    return { merged: incoming, winner: "incoming", changed: true };
  }
  return { merged: local, winner: "local", changed: false };
}

// ---------------------------------------------------------------------------
// 2. SRS State Merge (last_review > reps + alive rule vs deleted_at)
// ---------------------------------------------------------------------------

export interface SrsMergeState {
  card: SRSCard | null;
  lastReview: number | null;
  reps: number;
  deletedAt: number | null;
}

function maxNullable(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null;
  if (a == null) return b!;
  if (b == null) return a;
  return Math.max(a, b);
}

/**
 * Aturan merge SRS (identik dengan `sync_upsert_srs` di Postgres):
 * - `deletedAt` mengambil maksimum dari kedua sisi (join-semilattice).
 * - Status review (`card`, `lastReview`, `reps`) menang bila `lastReview` lebih besar,
 *   atau sama dengan `reps` lebih besar; seri mempertahankan sisi lokal.
 * - Status kartu hidup hanya bila `deletedAt === null` atau `coalesce(lastReview, 0) > deletedAt`.
 */
export function mergeSrsRecord(
  local: SrsMergeState | null | undefined,
  incoming: SrsMergeState,
): { merged: SrsMergeState; changed: boolean; alive: boolean } {
  if (!local) {
    const alive = isSrsRowAlive(incoming.lastReview, incoming.deletedAt);
    return {
      merged: {
        card: alive ? incoming.card : null,
        lastReview: incoming.lastReview,
        reps: Math.max(0, Math.round(incoming.reps ?? 0)),
        deletedAt: incoming.deletedAt,
      },
      changed: true,
      alive,
    };
  }

  const localLr = local.lastReview ?? 0;
  const incomingLr = incoming.lastReview ?? 0;
  const localReps = Math.max(0, Math.round(local.reps ?? 0));
  const incomingReps = Math.max(0, Math.round(incoming.reps ?? 0));

  const incomingWinsReview =
    incomingLr > localLr || (incomingLr === localLr && incomingReps > localReps);
  const nextDel = maxNullable(local.deletedAt, incoming.deletedAt);
  const delRaised = nextDel !== null && (local.deletedAt === null || nextDel > local.deletedAt);

  if (!incomingWinsReview && !delRaised) {
    const alive = isSrsRowAlive(local.lastReview, local.deletedAt);
    return {
      merged: {
        ...local,
        card: alive ? local.card : null,
      },
      changed: false,
      alive,
    };
  }

  const nextLr = incomingWinsReview ? incoming.lastReview : local.lastReview;
  const nextReps = incomingWinsReview ? incomingReps : localReps;
  const alive = isSrsRowAlive(nextLr, nextDel);
  const nextCard = alive ? (incomingWinsReview ? incoming.card : local.card) : null;

  return {
    merged: {
      card: nextCard,
      lastReview: nextLr,
      reps: nextReps,
      deletedAt: nextDel,
    },
    changed: true,
    alive,
  };
}

// ---------------------------------------------------------------------------
// 3. Daily Counters Merge (reset_at epoch dominance + GREATEST)
// ---------------------------------------------------------------------------

export interface CounterMergeState {
  newIntroduced: number;
  extraNew: number;
  reviewedCount: number;
  lastActivity: number | null;
  resetAt: number;
}

/**
 * Aturan merge counter harian (identik dengan `sync_upsert_counters` di Postgres):
 * - Jika `incoming.resetAt > local.resetAt`: epoch reset baru menang dan mengganti seluruh angka.
 * - Jika `incoming.resetAt < local.resetAt`: baris lama diabaikan (tidak membangkitkan sebelum reset).
 * - Jika `resetAt` sama: ambil `Math.max` untuk `newIntroduced`, `extraNew`, `reviewedCount`, `lastActivity`.
 */
export function mergeCounterRecord(
  local: CounterMergeState | null | undefined,
  incoming: CounterMergeState,
): { merged: CounterMergeState; changed: boolean } {
  const normIn: CounterMergeState = {
    newIntroduced: Math.max(0, Math.round(incoming.newIntroduced ?? 0)),
    extraNew: Math.max(0, Math.round(incoming.extraNew ?? 0)),
    reviewedCount: Math.max(0, Math.round(incoming.reviewedCount ?? 0)),
    lastActivity: incoming.lastActivity ?? null,
    resetAt: Math.max(0, Math.round(incoming.resetAt ?? 0)),
  };
  if (!local) {
    return { merged: normIn, changed: true };
  }

  const localReset = Math.max(0, Math.round(local.resetAt ?? 0));
  if (normIn.resetAt > localReset) {
    return { merged: normIn, changed: true };
  }
  if (normIn.resetAt < localReset) {
    return { merged: local, changed: false };
  }

  const nextNew = Math.max(local.newIntroduced, normIn.newIntroduced);
  const nextExtra = Math.max(local.extraNew, normIn.extraNew);
  const nextRev = Math.max(local.reviewedCount, normIn.reviewedCount);
  const nextLast = maxNullable(local.lastActivity, normIn.lastActivity);

  const changed =
    nextNew !== local.newIntroduced ||
    nextExtra !== local.extraNew ||
    nextRev !== local.reviewedCount ||
    nextLast !== local.lastActivity;

  if (!changed) {
    return { merged: local, changed: false };
  }

  return {
    merged: {
      newIntroduced: nextNew,
      extraNew: nextExtra,
      reviewedCount: nextRev,
      lastActivity: nextLast,
      resetAt: localReset,
    },
    changed: true,
  };
}

// ---------------------------------------------------------------------------
// 4. Error Classification & Exponential Backoff with Jitter
// ---------------------------------------------------------------------------

export type SyncErrorKind = "auth" | "rls" | "constraint" | "retryable" | "fatal";

export interface ClassifiedSyncError {
  kind: SyncErrorKind;
  code?: string;
  status?: number;
  message: string;
}

export function classifySyncError(err: unknown): ClassifiedSyncError {
  const obj = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : null;
  const code = typeof obj?.code === "string" ? obj.code : undefined;
  const statusRaw = obj?.status ?? obj?.statusCode;
  const status = typeof statusRaw === "number" ? statusRaw : undefined;
  const rawMsg =
    err instanceof Error
      ? err.message
      : typeof obj?.message === "string"
        ? obj.message
        : String(err ?? "");
  const lower = rawMsg.toLowerCase();

  // 1. Auth / JWT expired (401 / PGRST301) -> refresh & retry sekali, lalu jeda "Masuk ulang"
  if (
    status === 401 ||
    code === "PGRST301" ||
    code === "PGRST302" ||
    lower.includes("jwt expired") ||
    lower.includes("invalid jwt") ||
    lower.includes("token has expired") ||
    lower.includes("autentikasi diperlukan")
  ) {
    return {
      kind: "auth",
      code,
      status,
      message: "Sesi masuk berakhir. Masuk ulang untuk melanjutkan sinkronisasi.",
    };
  }

  // 2. RLS / Forbidden (403 / 42501) -> hentikan sinkronisasi & laporkan
  if (
    status === 403 ||
    code === "42501" ||
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    lower.includes("forbidden")
  ) {
    return {
      kind: "rls",
      code,
      status,
      message: "Akses sinkronisasi ditolak oleh kebijakan keamanan server (403).",
    };
  }

  // 3. Pelanggaran constraint (23514 CHECK / 23503 FK / 22xxx data) -> karantina baris
  if (
    code === "23514" ||
    code === "23503" ||
    code === "23502" ||
    (code && code.startsWith("22")) ||
    lower.includes("violates check constraint") ||
    lower.includes("violates foreign key constraint")
  ) {
    return {
      kind: "constraint",
      code,
      status,
      message: rawMsg || "Data tidak memenuhi batas validasi server.",
    };
  }

  // 4. Jaringan / 429 / 5xx -> exponential backoff dengan jitter
  if (
    status === 429 ||
    (status !== undefined && status >= 500) ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("fetch failed") ||
    lower.includes("load failed") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("aborted") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  ) {
    return {
      kind: "retryable",
      code,
      status,
      message: "Gagal menghubungi server sinkronisasi. Akan dicoba lagi otomatis.",
    };
  }

  return {
    kind: "fatal",
    code,
    status,
    message: rawMsg || "Terjadi galat sinkronisasi tak terduga.",
  };
}

export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
  rand?: () => number;
}

/**
 * Menghitung jeda exponential backoff dengan equal jitter (50%–100% dari batas eksponensial)
 * agar beberapa perangkat/tab tidak menumbuk server secara bersamaan.
 */
export function computeBackoffMs(attempt: number, opts: BackoffOptions = {}): number {
  const baseMs = Math.max(100, opts.baseMs ?? 1500);
  const maxMs = Math.max(baseMs, opts.maxMs ?? 60_000);
  const safeAttempt = Math.max(0, Math.min(10, Math.floor(attempt)));
  const ceiling = Math.min(maxMs, baseMs * Math.pow(2, safeAttempt));
  const rand = opts.rand ?? (() => 0.5);
  const r = Math.max(0, Math.min(1, rand()));
  return Math.round(ceiling * (0.5 + 0.5 * r));
}
