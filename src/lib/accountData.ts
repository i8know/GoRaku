import type { SupabaseClient, User } from "@supabase/supabase-js";
import { deckDexie, getCards, type ReviewLogEntry } from "./deckDb";
import {
  clearLegacyLocalData,
  getLegacyAdoptedBy,
  LEGACY_DECLINED_KEY_PREFIX,
} from "./legacyAdoption";
import { lexiconDb } from "./lexiconDb";
import { flushReviewStorageWrites } from "./reviewStorage";
import {
  CURRENT_CONSENT_VERSION,
  mapSupabaseUserToAppUser,
  supabase,
  type ProfileRecord,
} from "./supabase";
import { switchUserStorageScope } from "./userScopeCoordinator";
import { clearScopedLocalDataForUser } from "./userStorageScope";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { useReviewStore } from "../store/useReviewStore";

export const DELETE_ACCOUNT_CONFIRMATION_WORD = "HAPUS";

export interface UserAccountExportPayload {
  version: 1;
  exportedAt: string;
  consentVersionExpected: string;
  account: {
    id: string | null;
    email: string | null;
    displayName: string;
    jlptLevel: string;
    consentedAt: string | null;
    consentVersion: string | null;
  };
  settings: ReturnType<typeof useAppStore.getState>["settings"];
  deckLimits: ReturnType<typeof useAppStore.getState>["deckLimits"];
  decks: Array<{
    deck: ReturnType<typeof useAppStore.getState>["decks"][number];
    cards: Array<Omit<Awaited<ReturnType<typeof getCards>>[number], "deckId">>;
  }>;
  minedQueue: ReturnType<typeof useAppStore.getState>["minedQueue"];
  libraryItems: string[];
  books: Array<{
    id: string;
    type?: string;
    title: string;
    author: string;
    format: string;
    progress: number;
    minedCount: number;
    addedAt: string;
    lastReadAt?: string;
  }>;
  dictionaries: Array<{
    title: string;
    revision: string;
    enabled: boolean;
    priority: number;
    termCount: number;
    importedAt: string;
  }>;
  reviewProgress: {
    srsCards: ReturnType<typeof useReviewStore.getState>["srsCards"];
    newIntroduced: ReturnType<typeof useReviewStore.getState>["newIntroduced"];
    activity: ReturnType<typeof useReviewStore.getState>["activity"];
    reviewLogs: ReviewLogEntry[];
  };
}

/**
 * Mengumpulkan seluruh data belajar dan profil milik pengguna aktif menjadi objek JSON yang aman diunduh
 * (tanpa menyertakan blob media/berkas biner berukuran besar atau token sesi).
 */
export async function buildUserAccountExportJson(
  authUser: User | null,
  profile: ProfileRecord | null,
): Promise<UserAccountExportPayload> {
  const appState = useAppStore.getState();
  const reviewState = useReviewStore.getState();
  const mappedUser = authUser
    ? mapSupabaseUserToAppUser(authUser, profile)
    : appState.user;

  const decksWithCards = await Promise.all(
    appState.decks.map(async (deck) => {
      let cards: Awaited<ReturnType<typeof getCards>> = [];
      try {
        cards = await getCards(deck.id);
      } catch {
        cards = [];
      }
      return {
        deck,
        cards: cards.map(({ deckId: _dropDeckId, ...rest }) => rest),
      };
    }),
  );

  let reviewLogs: ReviewLogEntry[] = [];
  try {
    reviewLogs = await deckDexie.reviewLogs.toArray();
  } catch {
    reviewLogs = [];
  }

  let books: UserAccountExportPayload["books"] = [];
  try {
    const rawBooks = await lexiconDb.books.toArray();
    books = rawBooks.map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title,
      author: b.author,
      format: b.format,
      progress: b.progress,
      minedCount: b.minedCount,
      addedAt: b.addedAt,
      lastReadAt: b.lastReadAt,
    }));
  } catch {
    books = [];
  }

  let dictionaries: UserAccountExportPayload["dictionaries"] = [];
  try {
    const rawDicts = await lexiconDb.dictionaries.toArray();
    dictionaries = rawDicts.map((d) => ({
      title: d.title,
      revision: d.revision,
      enabled: d.enabled,
      priority: d.priority,
      termCount: d.termCount,
      importedAt: d.importedAt,
    }));
  } catch {
    dictionaries = [];
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    consentVersionExpected: CURRENT_CONSENT_VERSION,
    account: {
      id: authUser?.id ?? null,
      email: authUser?.email ?? mappedUser?.email ?? null,
      displayName: mappedUser?.name ?? profile?.display_name ?? "Pelajar GoRaku",
      jlptLevel: mappedUser?.level ?? profile?.jlpt_level ?? "N4",
      consentedAt: profile?.consented_at ?? null,
      consentVersion: profile?.consent_version ?? null,
    },
    settings: appState.settings,
    deckLimits: appState.deckLimits,
    decks: decksWithCards,
    minedQueue: appState.minedQueue,
    libraryItems: appState.libraryItems,
    books,
    dictionaries,
    reviewProgress: {
      srsCards: reviewState.srsCards,
      newIntroduced: reviewState.newIntroduced,
      activity: reviewState.activity,
      reviewLogs,
    },
  };
}

/**
 * Mengunduh seluruh data akun + progres belajar pengguna ke berkas `.json`.
 */
export async function downloadUserAccountExport(
  authUser: User | null,
  profile: ProfileRecord | null,
): Promise<UserAccountExportPayload> {
  const payload = await buildUserAccountExportJson(authUser, profile);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `goraku-data-akun-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return payload;
}

function extractDeleteErrorMessage(error: unknown, data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const serverMsg = String((data as { error?: unknown }).error ?? "").trim();
    if (serverMsg) return serverMsg;
  }
  if (error && typeof error === "object" && "message" in error) {
    const raw = String((error as { message?: unknown }).message ?? "").trim();
    if (/failed to fetch|network/i.test(raw)) {
      return "Gagal menghubungi server penghapusan akun. Periksa koneksi internet Anda lalu coba lagi.";
    }
    if (raw) {
      return `Penghapusan akun di server gagal: ${raw}`;
    }
  }
  return "Gagal menghapus akun dari server. Silakan coba lagi atau ekspor data Anda terlebih dahulu.";
}

/**
 * Menghapus akun pengguna secara permanen:
 * 1. Memanggil Edge Function `delete-account` yang memverifikasi JWT & menghapus `auth.users` (+ CASCADE SQL).
 * 2. Hanya bila server mengonfirmasi terhapus (`deleted: true`), seluruh ruang data lokal milik user
 *    dihapus dan sesi dikeluarkan secara bersih.
 */
export async function deleteCurrentUserAccount(options?: {
  client?: SupabaseClient | null;
  userId?: string | null;
}): Promise<{ error: string | null }> {
  const authState = useAuthStore.getState();
  const activeClient =
    options?.client !== undefined
      ? options.client
      : authState._client ?? supabase;
  const userId = options?.userId ?? authState.user?.id ?? null;

  if (!activeClient || !userId) {
    return {
      error: "Layanan penghapusan akun belum aktif atau sesi tidak ditemukan.",
    };
  }

  let invokeRes: { data: unknown; error: unknown };
  try {
    invokeRes = await activeClient.functions.invoke("delete-account", {
      method: "POST",
    });
  } catch (err) {
    return { error: extractDeleteErrorMessage(err, null) };
  }

  const deletedFlag =
    invokeRes.data &&
    typeof invokeRes.data === "object" &&
    (invokeRes.data as { deleted?: unknown }).deleted === true;

  if (invokeRes.error || !deletedFlag) {
    return { error: extractDeleteErrorMessage(invokeRes.error, invokeRes.data) };
  }

  // Penghapusan di server berhasil -> bersihkan seluruh data lokal milik user ini tanpa menghapus data akun lain
  const adoptedLegacyByThisUser = getLegacyAdoptedBy() === userId;
  await Promise.allSettled([flushReviewStorageWrites()]);
  await switchUserStorageScope(null);
  await clearScopedLocalDataForUser(userId);

  if (adoptedLegacyByThisUser) {
    // Hapus juga salinan warisan pra-B1 yang sebelumnya diadopsi akun ini agar tidak tersisa
    // di perangkat atau ditawarkan ulang kepada akun berikutnya.
    await clearLegacyLocalData();
  }

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`${LEGACY_DECLINED_KEY_PREFIX}::${userId}`);
    }
  } catch {
    // Abaikan galat pembersihan kunci tambahan
  }

  await authState.signOut();
  return { error: null };
}
