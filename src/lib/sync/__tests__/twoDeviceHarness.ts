// Harness simulasi multi-perangkat (perangkat A, B, dst.) di Node + fake-indexeddb.
// Setiap perangkat memiliki instance IDBFactory & localStorage sendiri sambil memakai
// `userId` yang sama terhadap satu `MockSyncServer`, serta `device_id` berbeda.

import Dexie from "dexie";
import { IDBFactory } from "fake-indexeddb";
import { flushReviewLogs, flushSyncOutboxWrites } from "../../deckDb";
import { flushReviewStorageWrites } from "../../reviewStorage";
import { resetScopeCoordinatorForTest, switchUserStorageScope } from "../../userScopeCoordinator";
import {
  getOrCreateDeviceId,
  resetUserStorageScopeForTest,
} from "../../userStorageScope";
import {
  refreshCaptureSnapshots,
  startSyncStoreCapture,
  stopSyncStoreCaptureForTest,
} from "../storeCapture";
import { runSyncCycle, type SyncCycleOptions, type SyncCycleResult } from "../engine";
import { stopSyncController } from "../syncController";
import { useSyncStore } from "../../../store/useSyncStore";
import type { MockSyncServer, MockSyncServerOptions } from "./mockSyncServer";

export interface SimulatedDevice {
  name: string;
  userId: string;
  idb: IDBFactory;
  storage: Map<string, string>;
}

function createStorageAdapter(map: Map<string, string>): Storage {
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

export class MultiDeviceHarness {
  readonly server: MockSyncServer;
  readonly userId: string;
  private activeDevice: SimulatedDevice | null = null;
  private origIndexedDb: IDBFactory | undefined;
  private origDexieIdb: IDBFactory | undefined;
  private origLocalStorage: Storage | undefined;
  private installed = false;

  constructor(server: MockSyncServer, userId: string) {
    this.server = server;
    this.userId = userId;
  }

  createDevice(name: string): SimulatedDevice {
    return {
      name,
      userId: this.userId,
      idb: new IDBFactory(),
      storage: new Map<string, string>(),
    };
  }

  private ensureOriginalsSaved(): void {
    if (this.installed) return;
    this.origIndexedDb = globalThis.indexedDB;
    this.origDexieIdb = Dexie.dependencies.indexedDB as IDBFactory | undefined;
    this.origLocalStorage =
      typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : undefined;
    this.installed = true;
  }

  private async deactivateCurrent(): Promise<void> {
    if (!this.activeDevice) return;
    await Promise.allSettled([
      flushReviewStorageWrites(),
      flushReviewLogs(),
      flushSyncOutboxWrites(),
    ]);
    stopSyncController();
    stopSyncStoreCaptureForTest();
    await switchUserStorageScope(null);
    this.activeDevice = null;
  }

  /**
   * Mengaktifkan perangkat (memasang IDB + localStorage miliknya, lalu rehidrasi store
   * dan mengaktifkan penangkap outbox).
   */
  async activate(device: SimulatedDevice): Promise<string> {
    this.ensureOriginalsSaved();
    if (this.activeDevice === device) {
      return getOrCreateDeviceId(device.userId) ?? "local";
    }
    await this.deactivateCurrent();

    globalThis.indexedDB = device.idb;
    Dexie.dependencies.indexedDB = device.idb;
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorageAdapter(device.storage),
      configurable: true,
      writable: true,
    });

    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    useSyncStore.getState().resetSyncState();
    await switchUserStorageScope(device.userId);
    startSyncStoreCapture();
    refreshCaptureSnapshots();
    this.activeDevice = device;
    return getOrCreateDeviceId(device.userId) ?? "local";
  }

  /**
   * Menjalankan aksi pada perangkat tertentu lalu membilas seluruh penulisan lokal & outbox.
   */
  async onDevice<T>(device: SimulatedDevice, fn: () => Promise<T> | T): Promise<T> {
    await this.activate(device);
    const result = await fn();
    await Promise.allSettled([
      flushReviewStorageWrites(),
      flushReviewLogs(),
      flushSyncOutboxWrites(),
    ]);
    return result;
  }

  /**
   * Simulasi muat ulang peramban (reload penuh RAM, mempertahankan localStorage + IndexedDB).
   */
  async reload(device: SimulatedDevice): Promise<void> {
    if (this.activeDevice === device) {
      await this.deactivateCurrent();
    }
    await this.activate(device);
  }

  /**
   * Menjalankan satu siklus sinkronisasi penuh pada perangkat yang ditunjuk.
   */
  async sync(
    device: SimulatedDevice,
    extra: Partial<Omit<SyncCycleOptions, "client" | "userId">> & {
      serverOpts?: MockSyncServerOptions;
    } = {},
  ): Promise<SyncCycleResult> {
    const deviceId = await this.activate(device);
    const { serverOpts, ...cycleOpts } = extra;
    const client = this.server.createClientForUser(device.userId, serverOpts);
    const res = await runSyncCycle({
      client,
      userId: device.userId,
      deviceId,
      ...cycleOpts,
    });
    await Promise.allSettled([
      flushReviewStorageWrites(),
      flushReviewLogs(),
      flushSyncOutboxWrites(),
    ]);
    return res;
  }

  async cleanup(): Promise<void> {
    await this.deactivateCurrent();
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    if (this.installed) {
      if (this.origIndexedDb) globalThis.indexedDB = this.origIndexedDb;
      if (this.origDexieIdb) Dexie.dependencies.indexedDB = this.origDexieIdb;
      if (this.origLocalStorage !== undefined) {
        Object.defineProperty(globalThis, "localStorage", {
          value: this.origLocalStorage,
          configurable: true,
          writable: true,
        });
      }
      this.installed = false;
    }
  }
}
