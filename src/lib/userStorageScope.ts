/**
 * Penyekat ruang penyimpanan lokal per pengguna (Tahap B1: isolasi data per akun).
 *
 * Setiap pengguna mendapatkan namespace terpisah untuk:
 * - Kunci localStorage (`<baseKey>::<userId>`)
 * - Kunci IndexedDB `kv` (`japanese-review-storage::<userId>`)
 * - Nama basis data Dexie (`goraku-<userId>-decks`, `goraku-<userId>-lexicon`, `goraku-<userId>-question-packs`)
 * - ID perangkat lokal per pengguna (`goraku-device-id::<userId>`)
 *
 * Catatan keamanan & integritas data:
 * - Selama `persistWriteSuppressionCount > 0`, operasi tulis Zustand `persist` diabaikan agar proses reset RAM
 *   saat logout / pergantian akun tidak pernah menimpa ruang pengguna sebelumnya maupun data warisan anonim.
 * - Selama `unauthenticatedScopeLocked` aktif dan `activeUserId === null`, akses ke kunci/DB tanpa ruang
 *   diblokir sehingga data warisan tidak pernah bocor ke sesi keluar atau akun baru tanpa persetujuan eksplisit.
 */

export const LEGACY_APP_STORAGE_KEY = "japanese-learning-storage";
export const LEGACY_REVIEW_STORAGE_KEY = "japanese-review-storage";
export const LEGACY_REVIEW_MIGRATION_DONE_KEY = "japanese-review-storage::migrated-v1";

export const LEGACY_DECK_DB_NAME = "ma-immersion-decks";
export const LEGACY_LEXICON_DB_NAME = "ma-immersion-lexicon";
export const LEGACY_QUESTION_PACK_DB_NAME = "ma-immersion-question-packs";

export const LEGACY_SEED_FLAG = "ma-seed-v2-philia";
export const LEGACY_FIRST_RUN_DISMISSED_KEY = "goraku.firstRun.dismissed";
export const LEGACY_FIRST_RUN_COMPLETED_SHOWN_KEY = "goraku.firstRun.completedShown";
export const LEGACY_LAST_DECK_STORAGE_KEY = "ma-mining-last-deck-id";
export const LEGACY_EXAM_SESSIONS_KEY = "jlpt_mock_sessions_v1";
export const LEGACY_READER_THEME_KEY = "ma-reader-theme";
export const LEGACY_READER_FONTSIZE_KEY = "ma-reader-fontsize";
export const LEGACY_READER_FLOW_KEY = "ma-reader-flow";
export const LEGACY_SIDEBAR_COLLAPSED_KEY = "goraku_sidebar_collapsed";

export const DEVICE_ID_KEY_PREFIX = "goraku-device-id";

let activeUserId: string | null = null;
let persistWriteSuppressionCount = 0;
let unauthenticatedScopeLocked = false;
const deviceIdMemoryFallback = new Map<string, string>();

export function normalizeScopeUserId(userId: string | null | undefined): string | null {
  if (typeof userId !== "string") return null;
  const trimmed = userId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function setActiveStorageUserId(userId: string | null | undefined): string | null {
  activeUserId = normalizeScopeUserId(userId);
  return activeUserId;
}

export function getActiveStorageUserId(): string | null {
  return activeUserId;
}

/**
 * Mengaktifkan/menonaktifkan penguncian akses penyimpanan ketika tidak ada pengguna yang masuk.
 * Diaktifkan oleh bootstrap aplikasi (terutama saat konfigurasi Supabase aktif) agar proses boot/logout
 * tidak pernah membaca atau menimpa data warisan tanpa akun (`legacy unscoped`).
 */
export function setUnauthenticatedScopeLocked(locked: boolean): void {
  unauthenticatedScopeLocked = locked;
}

export function isUnauthenticatedScopeLocked(): boolean {
  return unauthenticatedScopeLocked;
}

export function isBlockedUnauthenticatedStorageAccess(
  userId: string | null = activeUserId,
): boolean {
  return unauthenticatedScopeLocked && normalizeScopeUserId(userId) === null;
}

export function isPersistWriteSuppressed(): boolean {
  return persistWriteSuppressionCount > 0;
}

export async function withPersistWriteSuppressed<T>(fn: () => Promise<T> | T): Promise<T> {
  persistWriteSuppressionCount += 1;
  try {
    return await fn();
  } finally {
    persistWriteSuppressionCount = Math.max(0, persistWriteSuppressionCount - 1);
  }
}

export function getScopedKey(baseKey: string, userId: string | null = activeUserId): string {
  const uid = normalizeScopeUserId(userId);
  if (!uid) return baseKey;
  const suffix = `::${uid}`;
  return baseKey.endsWith(suffix) ? baseKey : `${baseKey}${suffix}`;
}

function sanitizeDbScopeSegment(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getDeckDbName(userId: string | null = activeUserId): string {
  const uid = normalizeScopeUserId(userId);
  return uid ? `goraku-${sanitizeDbScopeSegment(uid)}-decks` : LEGACY_DECK_DB_NAME;
}

export function getLexiconDbName(userId: string | null = activeUserId): string {
  const uid = normalizeScopeUserId(userId);
  return uid ? `goraku-${sanitizeDbScopeSegment(uid)}-lexicon` : LEGACY_LEXICON_DB_NAME;
}

export function getQuestionPackDbName(userId: string | null = activeUserId): string {
  const uid = normalizeScopeUserId(userId);
  return uid
    ? `goraku-${sanitizeDbScopeSegment(uid)}-question-packs`
    : LEGACY_QUESTION_PACK_DB_NAME;
}

export function getScopedStorageItem(
  baseKey: string,
  userId: string | null = activeUserId,
): string | null {
  if (isBlockedUnauthenticatedStorageAccess(userId)) return null;
  try {
    if (typeof localStorage === "undefined" || typeof localStorage.getItem !== "function") {
      return null;
    }
    return localStorage.getItem(getScopedKey(baseKey, userId));
  } catch {
    return null;
  }
}

export function setScopedStorageItem(
  baseKey: string,
  value: string,
  userId: string | null = activeUserId,
): void {
  if (isPersistWriteSuppressed() || isBlockedUnauthenticatedStorageAccess(userId)) {
    return;
  }
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
      localStorage.setItem(getScopedKey(baseKey, userId), value);
    }
  } catch {
    // Abaikan pembatasan penyimpanan lokal / kuota penuh
  }
}

export function removeScopedStorageItem(
  baseKey: string,
  userId: string | null = activeUserId,
): void {
  if (isPersistWriteSuppressed() || isBlockedUnauthenticatedStorageAccess(userId)) {
    return;
  }
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.removeItem === "function") {
      localStorage.removeItem(getScopedKey(baseKey, userId));
    }
  } catch {
    // Abaikan pembatasan penyimpanan lokal
  }
}

function generateUuidFallback(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Menghasilkan atau mengambil ID perangkat lokal unik milik pengguna ini (`goraku-device-id::<userId>`).
 * Mengembalikan `null` jika tidak ada pengguna aktif agar ID perangkat tidak pernah terbagi lintas akun.
 */
export function getOrCreateDeviceId(userId: string | null = activeUserId): string | null {
  const uid = normalizeScopeUserId(userId);
  if (!uid) return null;

  const storageKey = getScopedKey(DEVICE_ID_KEY_PREFIX, uid);
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
      const existing = localStorage.getItem(storageKey)?.trim();
      if (existing) {
        deviceIdMemoryFallback.set(uid, existing);
        return existing;
      }
    }
  } catch {
    // Abaikan kegagalan baca localStorage, gunakan memori cadangan bila ada
  }

  const cached = deviceIdMemoryFallback.get(uid);
  if (cached) return cached;

  const generated = generateUuidFallback();
  deviceIdMemoryFallback.set(uid, generated);

  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
      localStorage.setItem(storageKey, generated);
    }
  } catch {
    // Tetap kembalikan generated dari memori
  }

  return generated;
}

export const ALL_USER_SCOPED_BASE_KEYS = [
  LEGACY_APP_STORAGE_KEY,
  LEGACY_REVIEW_STORAGE_KEY,
  LEGACY_REVIEW_MIGRATION_DONE_KEY,
  LEGACY_SEED_FLAG,
  LEGACY_FIRST_RUN_DISMISSED_KEY,
  LEGACY_FIRST_RUN_COMPLETED_SHOWN_KEY,
  LEGACY_LAST_DECK_STORAGE_KEY,
  LEGACY_EXAM_SESSIONS_KEY,
  LEGACY_READER_THEME_KEY,
  LEGACY_READER_FONTSIZE_KEY,
  LEGACY_READER_FLOW_KEY,
  LEGACY_SIDEBAR_COLLAPSED_KEY,
  DEVICE_ID_KEY_PREFIX,
] as const;

export const USER_DB_CLOSE_CHANNEL = "goraku-close-dbs";

/**
 * Mengirim sinyal ke tab lain di origin yang sama agar menutup koneksi Dexie milik `userId`
 * sebelum `indexedDB.deleteDatabase` dijalankan (mencegah penghapusan tersangkut `onblocked`).
 */
export async function broadcastCloseUserDatabases(userId: string): Promise<void> {
  if (typeof BroadcastChannel !== "function") return;
  try {
    const ch = new BroadcastChannel(USER_DB_CLOSE_CHANNEL);
    ch.postMessage({ type: "close-user-dbs", userId });
    await new Promise<void>((resolve) => setTimeout(resolve, 40));
    ch.close();
  } catch {
    // Abaikan bila BroadcastChannel diblokir lingkungan
  }
}

/**
 * Menghapus semua kunci localStorage & DB Dexie milik seorang pengguna dari peramban ini
 * (dipakai pada penghapusan akun / pembersihan sesi lokal pengguna tersebut).
 */
export async function clearScopedLocalDataForUser(userId: string): Promise<void> {
  const uid = normalizeScopeUserId(userId);
  if (!uid) return;

  deviceIdMemoryFallback.delete(uid);

  try {
    if (typeof localStorage !== "undefined") {
      for (const baseKey of ALL_USER_SCOPED_BASE_KEYS) {
        localStorage.removeItem(getScopedKey(baseKey, uid));
      }
    }
  } catch {
    // Abaikan galat localStorage
  }

  if (typeof indexedDB !== "undefined" && typeof indexedDB.deleteDatabase === "function") {
    await broadcastCloseUserDatabases(uid);
    const dbNames = [
      getDeckDbName(uid),
      getLexiconDbName(uid),
      getQuestionPackDbName(uid),
    ];
    await Promise.all(
      dbNames.map(
        (name) =>
          new Promise<void>((resolve) => {
            let settled = false;
            const done = () => {
              if (!settled) {
                settled = true;
                resolve();
              }
            };
            try {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = done;
              req.onerror = done;
              req.onblocked = () => {
                console.warn(
                  `[GoRaku Storage] Penghapusan IndexedDB "${name}" diblokir tab lain; menunggu pelepasan koneksi.`,
                );
                setTimeout(done, 400);
              };
            } catch {
              done();
            }
          }),
      ),
    );
  }
}

export function resetUserStorageScopeForTest(): void {
  activeUserId = null;
  persistWriteSuppressionCount = 0;
  unauthenticatedScopeLocked = false;
  deviceIdMemoryFallback.clear();
}
