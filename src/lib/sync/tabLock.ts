// Penguncian lintas-tab agar hanya satu tab per pengguna yang menyinkronkan pada satu waktu.
// Memakai Web Locks API (`navigator.locks`) dengan fallback lease `localStorage` terdokumentasi
// ketika lingkungan tidak mendukung Web Locks (mis. Safari lama atau lingkungan uji).

const FALLBACK_LOCK_PREFIX = "goraku-sync-tab-lock::";
const FALLBACK_LEASE_MS = 20_000;

let fallbackOwnerCounter = 0;

function makeOwnerId(): string {
  fallbackOwnerCounter += 1;
  return `${Date.now().toString(36)}-${fallbackOwnerCounter}`;
}

export interface TabLockResult<T> {
  acquired: boolean;
  value?: T;
}

/**
 * Menjalankan `fn` di dalam kunci eksklusif lintas-tab untuk `userId`.
 * Jika tab lain sedang memegang kunci, langsung mengembalikan `{ acquired: false }` tanpa menunggu.
 */
export async function withSyncTabLock<T>(
  userId: string,
  fn: () => Promise<T>,
): Promise<TabLockResult<T>> {
  const lockName = `goraku-sync:${userId}`;

  // 1. Jalur utama: Web Locks API
  const locks =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & {
          locks?: {
            request: <R>(
              name: string,
              options: { mode?: "exclusive" | "shared"; ifAvailable?: boolean },
              callback: (lock: unknown | null) => Promise<R> | R,
            ) => Promise<R>;
          };
        }).locks
      : undefined;

  if (locks && typeof locks.request === "function") {
    return locks.request(lockName, { mode: "exclusive", ifAvailable: true }, async (lock) => {
      if (!lock) return { acquired: false };
      const value = await fn();
      return { acquired: true, value };
    });
  }

  // 2. Fallback terdokumentasi: lease berbasis localStorage ber-TTL 20 detik
  const canUseLs = (() => {
    try {
      return (
        typeof localStorage !== "undefined" &&
        typeof localStorage.getItem === "function" &&
        typeof localStorage.setItem === "function" &&
        typeof localStorage.removeItem === "function"
      );
    } catch {
      return false;
    }
  })();

  if (!canUseLs) {
    const value = await fn();
    return { acquired: true, value };
  }

  const key = `${FALLBACK_LOCK_PREFIX}${userId}`;
  const now = Date.now();
  try {
    const existingRaw = localStorage.getItem(key);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as { owner?: string; expiresAt?: number };
      if (typeof existing.expiresAt === "number" && existing.expiresAt > now) {
        return { acquired: false };
      }
    }
  } catch {
    // Kunci rusak -> timpa secara aman
  }

  const owner = makeOwnerId();
  try {
    localStorage.setItem(key, JSON.stringify({ owner, expiresAt: now + FALLBACK_LEASE_MS }));
  } catch {
    // Lanjut tanpa fallback lock bila localStorage penuh
  }

  try {
    const value = await fn();
    return { acquired: true, value };
  } finally {
    try {
      const curRaw = localStorage.getItem(key);
      if (curRaw) {
        const cur = JSON.parse(curRaw) as { owner?: string };
        if (cur.owner === owner) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Abaikan galat pelepasan kunci fallback
    }
  }
}
