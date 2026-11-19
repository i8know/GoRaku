import { flushReviewLogs, switchDeckDatabaseScope } from "./deckDb";
import { resetDeckCardsSeedState } from "./deckCards";
import { switchLexiconDatabaseScope } from "./lexiconDb";
import { switchQuestionPackDatabaseScope } from "./questionPackStorage";
import {
  flushReviewStorageWrites,
  resetReviewStorageForScopeChange,
} from "./reviewStorage";
import { isSupabaseConfigured } from "./supabase";
import {
  getOrCreateDeviceId,
  normalizeScopeUserId,
  setActiveStorageUserId,
  setUnauthenticatedScopeLocked,
  withPersistWriteSuppressed,
} from "./userStorageScope";
import { useAppStore } from "../store/useAppStore";
import { registerAuthScopeChangeHandler } from "../store/useAuthStore";
import { useReviewStore } from "../store/useReviewStore";

let hasAppliedInitialScope = false;
let appliedScopeUserId: string | null = null;
let scopeSwitchQueue: Promise<void> = Promise.resolve();

/**
 * Mengganti seluruh ruang penyimpanan lokal aktif (Zustand persist, IndexedDB/Dexie,
 * dan device_id) agar terikat ketat ke `userId` yang sedang masuk.
 *
 * - Saat keluar (`userId === null`), penulisan yang tertunda dibilas terlebih dahulu,
 *   lalu state di RAM dikosongkan di dalam `withPersistWriteSuppressed` agar tidak
 *   menimpa ruang pengguna sebelumnya maupun data warisan anonim.
 * - Pemanggilan berulang dengan `userId` yang sama bersifat idempoten.
 */
export function switchUserStorageScope(userId: string | null): Promise<void> {
  const run = scopeSwitchQueue.then(async () => {
    const nextUserId = normalizeScopeUserId(userId);
    if (hasAppliedInitialScope && nextUserId === appliedScopeUserId) {
      return;
    }

    // Pastikan tidak ada tulis balik dari sesi sebelumnya yang tertinggal saat DB ditutup.
    await Promise.allSettled([flushReviewStorageWrites(), flushReviewLogs()]);
    await resetReviewStorageForScopeChange();

    await withPersistWriteSuppressed(async () => {
      setActiveStorageUserId(nextUserId);
      await switchDeckDatabaseScope(nextUserId);
      switchLexiconDatabaseScope(nextUserId);
      switchQuestionPackDatabaseScope(nextUserId);

      resetDeckCardsSeedState();
      useAppStore.getState().resetUserData();
      useReviewStore.getState().resetReviewState();
    });

    if (nextUserId !== null) {
      getOrCreateDeviceId(nextUserId);
      await Promise.all([
        useAppStore.persist.rehydrate(),
        useReviewStore.persist.rehydrate(),
      ]);
    }

    appliedScopeUserId = nextUserId;
    hasAppliedInitialScope = true;
  });

  scopeSwitchQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Mengaktifkan proteksi ruang penyimpanan tanpa autentikasi (bila Supabase aktif) dan
 * mendaftarkan pengalih ruang ke store autentikasi.
 */
export function initUserStorageScopeSync(
  options: { lockUnauthenticated?: boolean } = {},
): void {
  const shouldLock = options.lockUnauthenticated ?? isSupabaseConfigured;
  setUnauthenticatedScopeLocked(shouldLock);
  registerAuthScopeChangeHandler(switchUserStorageScope);
}

export function resetScopeCoordinatorForTest(): void {
  hasAppliedInitialScope = false;
  appliedScopeUserId = null;
  scopeSwitchQueue = Promise.resolve();
}
