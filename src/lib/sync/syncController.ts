// Pengendali siklus hidup sinkronisasi: single-flight per pengguna, kunci lintas-tab,
// pemicu event (login/consent, debounce outbox, online, visibilitychange, interval rendah
// saat tab terlihat), exponential backoff berbatas, serta flush singkat sebelum keluar akun.

import {
  getPendingOutboxCount,
  getQuarantinedOutboxRows,
  retryQuarantinedOutboxRow,
  dismissQuarantinedOutboxRow,
} from "../deckDb";
import { CURRENT_CONSENT_VERSION, isSupabaseConfigured } from "../supabase";
import { useAuthStore } from "../../store/useAuthStore";
import { useSyncStore } from "../../store/useSyncStore";
import { registerOutboxDirtyListener } from "./captureControl";
import { getLastSyncAtMeta, runSyncCycle, type SyncCycleResult } from "./engine";
import { computeBackoffMs } from "./merge";
import { withSyncTabLock } from "./tabLock";

export const SYNC_DEBOUNCE_MS = 2_500;
export const SYNC_VISIBLE_POLL_MS = 60_000;
export const SYNC_IDLE_PULL_INTERVAL_MS = 300_000;
export const MAX_AUTO_CONSECUTIVE_FAILURES = 5;

let started = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let inFlightByUser = new Map<string, Promise<SyncCycleResult | null>>();
let consecutiveFailures = 0;
let unsubDirty: (() => void) | null = null;
let unsubAuth: (() => void) | null = null;
let prevAuthKey = "";

function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") return true;
  return navigator.onLine;
}

function isTabVisible(): boolean {
  if (typeof document === "undefined" || typeof document.visibilityState !== "string") return true;
  return document.visibilityState === "visible";
}

/**
 * Memeriksa apakah akun aktif boleh menjalankan unggah/unduh sinkronisasi:
 * - Supabase terkonfigurasi & sesi `signedIn`
 * - Persetujuan privasi versi B2 (`CURRENT_CONSENT_VERSION`) SUDAH disetujui
 * - Sinkronisasi tidak dijeda pada perangkat ini
 */
export function isAccountEligibleForSync(): {
  eligible: boolean;
  reason?: "unconfigured" | "signed_out" | "consent_pending" | "paused" | "offline";
} {
  const auth = useAuthStore.getState();
  const sync = useSyncStore.getState();

  if (!auth._client || (!auth.isConfigured && !isSupabaseConfigured)) {
    return { eligible: false, reason: "unconfigured" };
  }
  if (auth.status !== "signedIn" || !auth.user?.id) {
    return { eligible: false, reason: "signed_out" };
  }
  // Blokir unggahan sampai versi persetujuan terbaru (B2) benar-benar disetujui di profil
  if (auth.profile?.consent_version !== CURRENT_CONSENT_VERSION) {
    return { eligible: false, reason: "consent_pending" };
  }
  if (sync.pausedOnDevice) {
    return { eligible: false, reason: "paused" };
  }
  if (!isBrowserOnline()) {
    return { eligible: false, reason: "offline" };
  }
  return { eligible: true };
}

function clearTimers(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (retryTimer !== null) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

export async function refreshSyncCounters(): Promise<{ pendingCount: number; quarantinedCount: number }> {
  try {
    const [pendingCount, quarantined, lastSyncAt] = await Promise.all([
      getPendingOutboxCount(),
      getQuarantinedOutboxRows(),
      getLastSyncAtMeta(),
    ]);
    useSyncStore.getState().setSyncState({
      pendingCount,
      quarantined,
      ...(lastSyncAt !== null ? { lastSyncAt } : {}),
    });
    return { pendingCount, quarantinedCount: quarantined.length };
  } catch {
    return { pendingCount: 0, quarantinedCount: 0 };
  }
}

function scheduleRetryBackoff(): void {
  if (retryTimer !== null) return;
  if (consecutiveFailures >= MAX_AUTO_CONSECUTIVE_FAILURES) return;
  const delay = computeBackoffMs(consecutiveFailures, { rand: Math.random });
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (isTabVisible() && isBrowserOnline()) {
      void syncNow({ manual: false });
    }
  }, delay);
}

/**
 * Memicu satu siklus sinkronisasi (single-flight per user + kunci lintas-tab).
 */
export async function syncNow(options: { manual?: boolean; pushOnly?: boolean } = {}): Promise<SyncCycleResult | null> {
  const manual = Boolean(options.manual);
  if (manual) {
    consecutiveFailures = 0;
    clearTimers();
  }

  const eligibility = isAccountEligibleForSync();
  if (!eligibility.eligible) {
    if (eligibility.reason === "offline") {
      useSyncStore.getState().setSyncState({ status: "offline", progress: null });
    } else if (eligibility.reason === "paused") {
      useSyncStore.getState().setSyncState({ status: "paused", progress: null });
    }
    return null;
  }

  const auth = useAuthStore.getState();
  const client = auth._client!;
  const userId = auth.user!.id;

  // Single-flight per user di tab ini
  const existing = inFlightByUser.get(userId);
  if (existing) return existing;

  const task = (async (): Promise<SyncCycleResult | null> => {
    const lockRes = await withSyncTabLock(userId, async () => {
      useSyncStore.getState().setSyncState({
        status: "syncing",
        lastError: null,
        progress: null,
      });

      const result = await runSyncCycle({
        client,
        userId,
        pushOnly: options.pushOnly,
        onProgress: (info) => {
          useSyncStore.getState().setSyncState({ progress: info });
        },
      });

      const quarantined = await getQuarantinedOutboxRows().catch(() => []);
      const lastSyncAt = result.ok && !options.pushOnly ? Date.now() : await getLastSyncAtMeta();

      if (result.ok) {
        consecutiveFailures = 0;
        useSyncStore.getState().setSyncState({
          status: result.pendingRemaining > 0 ? "idle" : "synced",
          pendingCount: result.pendingRemaining,
          quarantined,
          lastSyncAt,
          lastError: null,
          progress: null,
          malformedSkipped: result.malformedSkipped,
        });
      } else if (result.error) {
        const err = result.error;
        if (err.kind === "auth") {
          useSyncStore.getState().setSyncState({
            status: "auth_required",
            pendingCount: result.pendingRemaining,
            quarantined,
            lastError: err.message,
            progress: null,
          });
        } else if (err.kind === "rls" || err.kind === "fatal") {
          useSyncStore.getState().setSyncState({
            status: "error",
            pendingCount: result.pendingRemaining,
            quarantined,
            lastError: err.message,
            progress: null,
          });
        } else if (err.kind === "retryable") {
          consecutiveFailures += 1;
          useSyncStore.getState().setSyncState({
            status: isBrowserOnline() ? "error" : "offline",
            pendingCount: result.pendingRemaining,
            quarantined,
            lastError: err.message,
            progress: null,
          });
          scheduleRetryBackoff();
        }
      } else {
        useSyncStore.getState().setSyncState({
          status: "idle",
          pendingCount: result.pendingRemaining,
          quarantined,
          progress: null,
        });
      }

      return result;
    });

    if (!lockRes.acquired) {
      await refreshSyncCounters();
      return null;
    }
    return lockRes.value ?? null;
  })().finally(() => {
    inFlightByUser.delete(userId);
  });

  inFlightByUser.set(userId, task);
  return task;
}

export function scheduleDebouncedSync(): void {
  void refreshSyncCounters();
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (isAccountEligibleForSync().eligible) {
      void syncNow({ manual: false });
    }
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Flush best-effort terhadap outbox sebelum keluar akun dengan batas waktu singkat.
 * Mengembalikan jumlah perubahan tersisa agar UI dapat menampilkan peringatan tenang
 * tanpa menghapus data lokal pengguna.
 */
export async function flushSyncBeforeSignOut(timeoutMs = 3_000): Promise<{ remainingPending: number }> {
  const initialPending = await getPendingOutboxCount().catch(() => 0);
  if (initialPending === 0) return { remainingPending: 0 };

  if (!isAccountEligibleForSync().eligible) {
    return { remainingPending: initialPending };
  }

  await Promise.race([
    syncNow({ manual: false, pushOnly: true }).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), Math.max(100, timeoutMs))),
  ]);

  const remainingPending = await getPendingOutboxCount().catch(() => initialPending);
  return { remainingPending };
}

export async function retryQuarantinedItem(id: number): Promise<void> {
  await retryQuarantinedOutboxRow(id);
  await refreshSyncCounters();
  void syncNow({ manual: true });
}

export async function dismissQuarantinedItem(id: number): Promise<void> {
  await dismissQuarantinedOutboxRow(id);
  await refreshSyncCounters();
}

export function setSyncPausedOnDevice(paused: boolean): void {
  const userId = useAuthStore.getState().user?.id ?? null;
  useSyncStore.getState().setPausedOnDevice(paused, userId);
  if (paused) {
    clearTimers();
  } else {
    void syncNow({ manual: true });
  }
}

function handleOnlineEvent(): void {
  consecutiveFailures = 0;
  if (useSyncStore.getState().status === "offline") {
    useSyncStore.getState().setSyncState({ status: "idle", lastError: null });
  }
  void syncNow({ manual: false });
}

function handleOfflineEvent(): void {
  clearTimers();
  if (useAuthStore.getState().status === "signedIn") {
    useSyncStore.getState().setSyncState({ status: "offline", progress: null });
  }
}

function handleVisibilityChange(): void {
  if (isTabVisible()) {
    void syncNow({ manual: false });
  }
}

function handleAuthStoreChange(): void {
  const auth = useAuthStore.getState();
  const key = `${auth.status}::${auth.user?.id ?? ""}::${auth.profile?.consent_version ?? ""}`;
  if (key === prevAuthKey) return;
  prevAuthKey = key;

  clearTimers();
  consecutiveFailures = 0;

  if (auth.status !== "signedIn" || !auth.user?.id) {
    useSyncStore.getState().resetSyncState();
    return;
  }

  useSyncStore.getState().loadPausedPreference(auth.user.id);
  void refreshSyncCounters();

  if (auth.profile?.consent_version === CURRENT_CONSENT_VERSION) {
    void syncNow({ manual: false });
  }
}

/**
 * Mengaktifkan pengontrol sinkronisasi global (idempoten).
 */
export function initSyncController(): () => void {
  if (started) return () => {};
  started = true;

  unsubDirty = registerOutboxDirtyListener(() => {
    scheduleDebouncedSync();
  });

  unsubAuth = useAuthStore.subscribe(() => {
    handleAuthStoreChange();
  });
  handleAuthStoreChange();

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOfflineEvent);
  }
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  // Interval frekuensi rendah: HANYA berjalan saat tab terlihat & ada pending atau sudah melewati batas idle
  pollInterval = setInterval(() => {
    if (!isTabVisible() || !isBrowserOnline()) return;
    if (!isAccountEligibleForSync().eligible) return;
    const { pendingCount, lastSyncAt, status } = useSyncStore.getState();
    if (status === "auth_required" || status === "syncing") return;
    const stale = lastSyncAt === null || Date.now() - lastSyncAt >= SYNC_IDLE_PULL_INTERVAL_MS;
    if (pendingCount > 0 || stale) {
      void syncNow({ manual: false });
    }
  }, SYNC_VISIBLE_POLL_MS);

  return stopSyncController;
}

export function stopSyncController(): void {
  if (!started) return;
  started = false;
  clearTimers();
  if (pollInterval !== null) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  unsubDirty?.();
  unsubAuth?.();
  unsubDirty = null;
  unsubAuth = null;
  prevAuthKey = "";
  consecutiveFailures = 0;
  inFlightByUser.clear();
  if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
    window.removeEventListener("online", handleOnlineEvent);
    window.removeEventListener("offline", handleOfflineEvent);
  }
  if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }
}
