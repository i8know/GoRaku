import type { StateStorage } from "zustand/middleware";
import {
  deckDexie,
  deleteKvValue,
  ensureDeckDbOpen,
  getKvValue,
  putKvValue,
} from "./deckDb";
import { useToastStore } from "../store/useToastStore";

export const REVIEW_STORAGE_KEY = "japanese-review-storage";
export const REVIEW_MIGRATION_DONE_KEY = "japanese-review-storage::migrated-v1";
export const STORAGE_WRITE_ERROR_MSG =
  "Penyimpanan penuh atau diblokir. Ekspor cadangan jadwal sekarang.";

type PendingOp =
  | { type: "set"; value: string }
  | { type: "remove" };

type BackendMode = "idb" | "localStorage";

export type BackupExporter = () => void | Promise<void>;

let registeredBackupExporter: BackupExporter | null = null;

/**
 * Mendaftarkan fungsi ekspor cadangan jadwal untuk tombol aksi pada toast galat penyimpanan,
 * tanpa membuat ketergantungan impor melingkar antara `reviewStorage` dan `scheduleBackup`.
 */
export function registerReviewBackupExporter(fn: BackupExporter): void {
  registeredBackupExporter = fn;
}

export interface ReviewPersistStorageOptions {
  idbGet?: (key: string) => Promise<string | undefined>;
  idbPut?: (key: string, value: string) => Promise<void>;
  idbDelete?: (key: string) => Promise<void>;
  probeIdb?: () => Promise<boolean>;
  getLocalStorage?: () => Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined;
  exportBackupOnToast?: BackupExporter;
  onWriteError?: (err: unknown) => void;
  onWriteSuccess?: () => void;
  debounceMs?: number;
  retryDelayMs?: number;
  maxRetries?: number;
}

export interface ReviewPersistController {
  storage: StateStorage;
  flush: () => Promise<void>;
  dispose: () => void;
  getMemorySnapshot: (key?: string) => string | null;
  getBackendMode: () => BackendMode | null;
}

/**
 * Perbandingan kesetaraan struktural untuk payload JSON terurai tanpa bergantung
 * pada urutan properti objek saat memverifikasi hasil migrasi ke IndexedDB.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }
  return true;
}

function defaultGetLocalStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined {
  try {
    if (
      typeof localStorage !== "undefined" &&
      typeof localStorage.getItem === "function" &&
      typeof localStorage.setItem === "function" &&
      typeof localStorage.removeItem === "function"
    ) {
      return localStorage;
    }
  } catch {
    /* localStorage tidak tersedia atau diblokir */
  }
  return undefined;
}

async function defaultProbeIdb(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    await ensureDeckDbOpen();
    return Boolean(deckDexie.kv);
  } catch {
    return false;
  }
}

function runRegisteredBackupExport(): void {
  if (registeredBackupExporter) {
    void Promise.resolve(registeredBackupExporter()).catch((err) => {
      console.error("Gagal mengekspor cadangan jadwal dari pemberitahuan:", err);
    });
    return;
  }
  void import("./scheduleBackup")
    .then((mod) => mod.downloadScheduleBackupJson())
    .catch((err) => {
      console.error("Gagal memuat modul ekspor cadangan jadwal:", err);
    });
}

export function createReviewPersistStorage(
  opts: ReviewPersistStorageOptions = {},
): ReviewPersistController {
  const idbGet = opts.idbGet ?? getKvValue;
  const idbPut = opts.idbPut ?? putKvValue;
  const idbDelete = opts.idbDelete ?? deleteKvValue;
  const probeIdb = opts.probeIdb ?? defaultProbeIdb;
  const getLocal = opts.getLocalStorage ?? defaultGetLocalStorage;
  const exportBackupOnToast = opts.exportBackupOnToast ?? runRegisteredBackupExport;
  const debounceMs = opts.debounceMs ?? 300;
  const retryDelayMs = opts.retryDelayMs ?? 1500;
  const maxRetries = opts.maxRetries ?? 3;

  const memoryStore = new Map<string, string>();
  const pendingOps = new Map<string, PendingOp>();
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const retryCounts = new Map<string, number>();

  let backendMode: BackendMode | null = null;
  let backendProbePromise: Promise<BackendMode> | null = null;
  let writeChain: Promise<void> = Promise.resolve();
  let toastShownForFailure = false;
  let disposed = false;

  const resolveBackend = async (): Promise<BackendMode> => {
    if (backendMode !== null) return backendMode;
    if (!backendProbePromise) {
      backendProbePromise = probeIdb()
        .then((ok): BackendMode => {
          backendMode = ok ? "idb" : "localStorage";
          return backendMode;
        })
        .catch((): BackendMode => {
          backendMode = "localStorage";
          return "localStorage";
        });
    }
    return backendProbePromise;
  };

  const readLocalSafe = (key: string): string | null => {
    try {
      const ls = getLocal();
      if (ls) return ls.getItem(key);
    } catch {
      /* fallback ke memori */
    }
    return memoryStore.get(key) ?? null;
  };

  const writeLocalOrThrow = (key: string, op: PendingOp): void => {
    const ls = getLocal();
    if (!ls) {
      // Lingkungan tanpa DOM/localStorage (mis. SSR atau Vitest non-browser tanpa IndexedDB)
      return;
    }
    if (op.type === "set") ls.setItem(key, op.value);
    else ls.removeItem(key);
  };

  const triggerWriteErrorToast = () => {
    if (toastShownForFailure) return;
    toastShownForFailure = true;
    try {
      useToastStore.getState().notifyWithOptions(STORAGE_WRITE_ERROR_MSG, {
        durationMs: 0,
        action: {
          label: "Ekspor cadangan",
          onClick: () => {
            void exportBackupOnToast();
          },
        },
      });
    } catch {
      /* abaikan bila store toast tidak tersedia */
    }
  };

  const clearTimersForKey = (key: string) => {
    const dt = debounceTimers.get(key);
    if (dt !== undefined) {
      clearTimeout(dt);
      debounceTimers.delete(key);
    }
    const rt = retryTimers.get(key);
    if (rt !== undefined) {
      clearTimeout(rt);
      retryTimers.delete(key);
    }
  };

  const executeWrite = async (key: string): Promise<void> => {
    if (disposed) return;
    const op = pendingOps.get(key);
    if (!op) return;
    pendingOps.delete(key);

    const mode = await resolveBackend();
    try {
      if (mode === "idb") {
        if (op.type === "set") {
          await idbPut(key, op.value);
        } else {
          await idbDelete(key);
        }
      } else {
        writeLocalOrThrow(key, op);
      }

      retryCounts.set(key, 0);
      toastShownForFailure = false;
      opts.onWriteSuccess?.();

      // Jika selama penulisan berlangsung ada perubahan baru, jadwalkan flush segera
      if (pendingOps.has(key) && !disposed) {
        await enqueueFlushKey(key);
      }
    } catch (err) {
      if (!pendingOps.has(key)) {
        pendingOps.set(key, op);
      }
      console.error("Gagal menyimpan progres review ke penyimpanan persisten:", err);
      opts.onWriteError?.(err);
      triggerWriteErrorToast();

      const attempt = retryCounts.get(key) ?? 0;
      if (attempt < maxRetries && !disposed && !retryTimers.has(key)) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        retryCounts.set(key, attempt + 1);
        const timer = setTimeout(() => {
          retryTimers.delete(key);
          void enqueueFlushKey(key);
        }, delay);
        retryTimers.set(key, timer);
      }
    }
  };

  const enqueueFlushKey = (key: string): Promise<void> => {
    const dt = debounceTimers.get(key);
    if (dt !== undefined) {
      clearTimeout(dt);
      debounceTimers.delete(key);
    }
    const next = writeChain.then(
      () => executeWrite(key),
      () => executeWrite(key),
    );
    writeChain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const flush = async (): Promise<void> => {
    const keys = new Set<string>([...debounceTimers.keys(), ...pendingOps.keys()]);
    for (const key of keys) {
      clearTimersForKey(key);
      if (pendingOps.has(key)) {
        await enqueueFlushKey(key);
      }
    }
    await writeChain;
  };

  const onVisibilityChange = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      void flush();
    }
  };
  const onPageHide = () => {
    void flush();
  };

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("pagehide", onPageHide);
  }

  const storage: StateStorage = {
    getItem: async (name: string) => {
      if (pendingOps.has(name)) {
        await enqueueFlushKey(name);
        if (pendingOps.has(name)) {
          return memoryStore.get(name) ?? null;
        }
      }

      const mode = await resolveBackend();
      if (mode === "localStorage") {
        return readLocalSafe(name);
      }

      let idbVal: string | undefined;
      try {
        idbVal = await idbGet(name);
      } catch (err) {
        console.error("Gagal membaca progres review dari IndexedDB:", err);
        return memoryStore.get(name) ?? readLocalSafe(name);
      }

      if (typeof idbVal === "string") {
        memoryStore.set(name, idbVal);
        return idbVal;
      }

      // Belum ada data review di IndexedDB -> cek migrasi satu kali dari localStorage
      let alreadyMigrated = false;
      try {
        alreadyMigrated = Boolean(await idbGet(REVIEW_MIGRATION_DONE_KEY));
      } catch {
        alreadyMigrated = false;
      }
      if (alreadyMigrated) {
        return memoryStore.get(name) ?? null;
      }

      const localRaw = readLocalSafe(name);
      if (!localRaw) {
        return memoryStore.get(name) ?? null;
      }

      let parsedLocal: unknown;
      try {
        parsedLocal = JSON.parse(localRaw);
      } catch (err) {
        console.error(
          "Data progres review di localStorage rusak, migrasi ke IndexedDB dilewati:",
          err,
        );
        return memoryStore.get(name) ?? null;
      }

      if (!parsedLocal || typeof parsedLocal !== "object" || Array.isArray(parsedLocal)) {
        console.error(
          "Struktur data progres review di localStorage tidak valid, migrasi dilewati.",
        );
        return memoryStore.get(name) ?? null;
      }

      try {
        await idbPut(name, localRaw);
        const readBack = await idbGet(name);
        if (typeof readBack !== "string") {
          throw new Error("Hasil baca-ulang IndexedDB kosong setelah migrasi.");
        }
        const parsedReadBack = JSON.parse(readBack);
        if (!deepEqual(parsedLocal, parsedReadBack)) {
          throw new Error("Verifikasi deep equality gagal sesudah menyalin data ke IndexedDB.");
        }
        await idbPut(
          REVIEW_MIGRATION_DONE_KEY,
          JSON.stringify({ done: true, migratedAt: Date.now() }),
        );
        // Biarkan kunci localStorage lama tetap ada sebagai cadangan aman di rilis ini.
        memoryStore.set(name, readBack);
        return readBack;
      } catch (err) {
        console.error("Migrasi satu kali progres review ke IndexedDB gagal:", err);
        memoryStore.set(name, localRaw);
        opts.onWriteError?.(err);
        triggerWriteErrorToast();
        return localRaw;
      }
    },

    setItem: (name: string, value: string) => {
      memoryStore.set(name, value);
      pendingOps.set(name, { type: "set", value });
      retryCounts.set(name, 0);
      clearTimersForKey(name);

      if (debounceMs <= 0) {
        return enqueueFlushKey(name);
      }
      const timer = setTimeout(() => {
        debounceTimers.delete(name);
        void enqueueFlushKey(name);
      }, debounceMs);
      debounceTimers.set(name, timer);
    },

    removeItem: (name: string) => {
      memoryStore.delete(name);
      pendingOps.set(name, { type: "remove" });
      retryCounts.set(name, 0);
      clearTimersForKey(name);
      return enqueueFlushKey(name);
    },
  };

  return {
    storage,
    flush,
    dispose: () => {
      disposed = true;
      for (const t of debounceTimers.values()) clearTimeout(t);
      for (const t of retryTimers.values()) clearTimeout(t);
      debounceTimers.clear();
      retryTimers.clear();
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("pagehide", onPageHide);
      }
    },
    getMemorySnapshot: (key = REVIEW_STORAGE_KEY) => memoryStore.get(key) ?? null,
    getBackendMode: () => backendMode,
  };
}

export const defaultReviewPersistController = createReviewPersistStorage();

export async function flushReviewStorageWrites(): Promise<void> {
  await defaultReviewPersistController.flush();
}
