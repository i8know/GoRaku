import { create } from "zustand";
import type { SyncEntity, SyncOutboxRow } from "../lib/deckDb";
import { getScopedStorageItem, setScopedStorageItem } from "../lib/userStorageScope";

export const SYNC_PAUSED_STORAGE_KEY = "goraku-sync-paused";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "paused"
  | "auth_required"
  | "error";

export interface SyncProgressInfo {
  phase: "push" | "pull";
  entity: SyncEntity;
  done: number;
  total: number;
}

interface SyncStoreState {
  status: SyncStatus;
  pendingCount: number;
  quarantined: SyncOutboxRow[];
  lastSyncAt: number | null;
  lastError: string | null;
  pausedOnDevice: boolean;
  progress: SyncProgressInfo | null;
  malformedSkipped: number;
  setSyncState: (patch: Partial<SyncStoreState>) => void;
  loadPausedPreference: (userId?: string | null) => boolean;
  setPausedOnDevice: (paused: boolean, userId?: string | null) => void;
  resetSyncState: () => void;
}

const INITIAL_STATE = {
  status: "idle" as SyncStatus,
  pendingCount: 0,
  quarantined: [] as SyncOutboxRow[],
  lastSyncAt: null as number | null,
  lastError: null as string | null,
  pausedOnDevice: false,
  progress: null as SyncProgressInfo | null,
  malformedSkipped: 0,
};

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...INITIAL_STATE,
  setSyncState: (patch) => set((state) => ({ ...state, ...patch })),
  loadPausedPreference: (userId) => {
    const raw = getScopedStorageItem(SYNC_PAUSED_STORAGE_KEY, userId);
    const paused = raw === "1";
    set((state) => ({
      pausedOnDevice: paused,
      status: paused ? "paused" : state.status === "paused" ? "idle" : state.status,
    }));
    return paused;
  },
  setPausedOnDevice: (paused, userId) => {
    setScopedStorageItem(SYNC_PAUSED_STORAGE_KEY, paused ? "1" : "0", userId);
    set((state) => ({
      pausedOnDevice: paused,
      status: paused ? "paused" : state.status === "paused" ? "idle" : state.status,
      lastError: paused ? null : state.lastError,
    }));
  },
  resetSyncState: () => set({ ...INITIAL_STATE }),
}));
