import "fake-indexeddb/auto";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJSONStorage } from "zustand/middleware";
import {
  clearAllReviewLogs,
  deckDexie,
  getKvValue,
  putCards,
  putKvValue,
  type StoredCard,
} from "../deckDb";
import {
  createReviewPersistStorage,
  deepEqual,
  flushReviewStorageWrites,
  REVIEW_MIGRATION_DONE_KEY,
  REVIEW_STORAGE_KEY,
  STORAGE_WRITE_ERROR_MSG,
} from "../reviewStorage";
import { loadHydratedSessionQueue } from "../sessionQueue";
import { importScheduleBackup } from "../scheduleBackup";
import { useAppStore } from "../../store/useAppStore";
import { useToastStore } from "../../store/useToastStore";
import { useReviewStore, waitForReviewStoreHydration, resetPersistentStorageRequestForTest } from "../../store/useReviewStore";
import ReviewPage from "../../pages/Review";
import ProtectedLayout from "../../components/Layout";
import type { SRSCard } from "../srs";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

describe("Bug 2 — Penyimpanan progres review di IndexedDB, migrasi aman, gerbang hidrasi & galat tulis", () => {
  beforeEach(async () => {
    vi.useRealTimers();
    vi.stubGlobal("localStorage", createMemoryStorage());
    resetPersistentStorageRequestForTest();
    useToastStore.setState({ toasts: [] });
    useAppStore.getState().updateSettings({
      newCards: 10,
      maxReview: 120,
      dayStartHour: 4,
      desiredRetention: 0.9,
      newOrder: "urutan",
    });
    await deckDexie.open();
    await deckDexie.kv.clear();
    await clearAllReviewLogs();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("deepEqual membandingkan JSON terurai tanpa bergantung urutan properti", () => {
    expect(deepEqual({ a: 1, b: { c: 2, d: [3, 4] } }, { b: { d: [3, 4], c: 2 }, a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  it("memigrasikan japanese-review-storage dari localStorage ke IndexedDB satu kali, memverifikasi kesetaraan JSON, dan membiarkan localStorage sebagai cadangan", async () => {
    const legacy = {
      state: {
        srsCards: {
          "deck-m": {
            c1: { id: "c1", easeFactor: 2.5, interval: 6, repetitions: 2, nextReview: 1778400000000 },
          },
        },
        newIntroduced: { "deck-m": { date: "2026-05-10", count: 3 } },
        activity: { "deck-m": { date: "2026-05-10", count: 5, last: 1778390000000 } },
      },
      version: 1,
    };
    const raw = JSON.stringify(legacy);
    localStorage.setItem(REVIEW_STORAGE_KEY, raw);

    const adapter = createReviewPersistStorage({
      idbGet: getKvValue,
      idbPut: putKvValue,
      idbDelete: async (k) => {
        await deckDexie.kv.delete(k);
      },
      probeIdb: async () => true,
      debounceMs: 0,
    });

    const loaded = await adapter.storage.getItem(REVIEW_STORAGE_KEY);
    expect(loaded).toBe(raw);

    // Data harus sudah berada di IndexedDB + penanda migrasi tersimpan + localStorage tetap ada sebagai cadangan
    expect(await getKvValue(REVIEW_STORAGE_KEY)).toBe(raw);
    expect(await getKvValue(REVIEW_MIGRATION_DONE_KEY)).toBeTruthy();
    expect(localStorage.getItem(REVIEW_STORAGE_KEY)).toBe(raw);

    adapter.dispose();
  });

  it("migrasi tidak crash pada localStorage rusak dan tidak menimpa data IndexedDB yang sudah bagus", async () => {
    const goodIdb = JSON.stringify({
      state: {
        srsCards: {
          "deck-good": {
            c1: { id: "c1", easeFactor: 2.5, interval: 10, repetitions: 3, nextReview: 1779000000000 },
          },
        },
        newIntroduced: {},
        activity: {},
      },
      version: 1,
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Kasus 1: IDB sudah berisi data bagus + localStorage rusak -> IDB tetap utuh
    await putKvValue(REVIEW_STORAGE_KEY, goodIdb);
    localStorage.setItem(REVIEW_STORAGE_KEY, "{corrupt-json-payload");

    const adapterWithGoodIdb = createReviewPersistStorage({
      idbGet: getKvValue,
      idbPut: putKvValue,
      idbDelete: async (k) => {
        await deckDexie.kv.delete(k);
      },
      probeIdb: async () => true,
    });

    expect(await adapterWithGoodIdb.storage.getItem(REVIEW_STORAGE_KEY)).toBe(goodIdb);
    expect(await getKvValue(REVIEW_STORAGE_KEY)).toBe(goodIdb);
    adapterWithGoodIdb.dispose();

    // Kasus 2: IDB kosong + localStorage rusak -> tidak crash, tidak menulis sampah ke IDB
    await deckDexie.kv.clear();
    const adapterEmptyIdb = createReviewPersistStorage({
      idbGet: getKvValue,
      idbPut: putKvValue,
      idbDelete: async (k) => {
        await deckDexie.kv.delete(k);
      },
      probeIdb: async () => true,
    });

    expect(await adapterEmptyIdb.storage.getItem(REVIEW_STORAGE_KEY)).toBeNull();
    expect(await getKvValue(REVIEW_STORAGE_KEY)).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    adapterEmptyIdb.dispose();
  });

  it("jatuh kembali ke localStorage bila IndexedDB tidak tersedia (mode privat / diblokir)", async () => {
    const adapter = createReviewPersistStorage({
      idbGet: getKvValue,
      idbPut: putKvValue,
      idbDelete: async () => {},
      probeIdb: async () => false,
      debounceMs: 0,
    });

    const payload = JSON.stringify({ state: { srsCards: { d1: {} }, newIntroduced: {}, activity: {} }, version: 1 });
    await adapter.storage.setItem(REVIEW_STORAGE_KEY, payload);
    expect(localStorage.getItem(REVIEW_STORAGE_KEY)).toBe(payload);
    expect(await adapter.storage.getItem(REVIEW_STORAGE_KEY)).toBe(payload);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    adapter.dispose();
  });

  it("kegagalan tulis tidak ditelan: data tetap aman di memori, retry debounce berjalan, console.error tercatat, dan toast muncul sekali dengan aksi ekspor", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let failWrites = true;
    let putCalls = 0;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onExportSpy = vi.fn();

    const adapter = createReviewPersistStorage({
      idbGet: async () => undefined,
      idbPut: async () => {
        putCalls++;
        if (failWrites) {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
      },
      idbDelete: async () => {},
      probeIdb: async () => true,
      debounceMs: 300,
      retryDelayMs: 500,
      exportBackupOnToast: onExportSpy,
    });

    const firstPayload = JSON.stringify({ state: { srsCards: { d: { c1: { id: "c1" } } }, newIntroduced: {}, activity: {} }, version: 1 });
    const secondPayload = JSON.stringify({ state: { srsCards: { d: { c1: { id: "c1" }, c2: { id: "c2" } } }, newIntroduced: {}, activity: {} }, version: 1 });

    // Penulisan cepat berturut-turut di-batch oleh debounce 300ms
    void adapter.storage.setItem(REVIEW_STORAGE_KEY, firstPayload);
    void adapter.storage.setItem(REVIEW_STORAGE_KEY, secondPayload);
    expect(putCalls).toBe(0);

    await vi.advanceTimersByTimeAsync(300);
    expect(putCalls).toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    // Toast error muncul TEPAT SEKALI dengan tombol ekspor cadangan
    const toastsAfterFirstFail = useToastStore.getState().toasts;
    expect(toastsAfterFirstFail).toHaveLength(1);
    expect(toastsAfterFirstFail[0].message).toBe(STORAGE_WRITE_ERROR_MSG);
    expect(toastsAfterFirstFail[0].action?.label).toBeTruthy();

    // Klik tombol ekspor cadangan di toast memicu aksi ekspor
    toastsAfterFirstFail[0].action?.onClick();
    expect(onExportSpy).toHaveBeenCalledTimes(1);

    // Data terbaru tetap tersimpan aman di memori meskipun IDB gagal
    expect(adapter.getMemorySnapshot(REVIEW_STORAGE_KEY)).toBe(secondPayload);

    // Retry otomatis berjalan setelah 500ms; toast TIDAK diduplikasi selama error berlanjut
    await vi.advanceTimersByTimeAsync(500);
    expect(putCalls).toBe(2);
    expect(useToastStore.getState().toasts).toHaveLength(1);

    // Saat penyimpanan pulih pada retry berikutnya, antrean tertunda berhasil ditulis
    failWrites = false;
    await vi.advanceTimersByTimeAsync(1000);
    expect(putCalls).toBe(3);

    adapter.dispose();
  });

  it("gerbang hidrasi menahan pemuatan sesi sampai hidrasi selesai dan data bertahan setelah simulasi reload", async () => {
    const backedMap = new Map<string, string>();
    const storage1 = createReviewPersistStorage({
      idbGet: async (k) => backedMap.get(k),
      idbPut: async (k, v) => {
        backedMap.set(k, v);
      },
      idbDelete: async (k) => {
        backedMap.delete(k);
      },
      probeIdb: async () => true,
      debounceMs: 300,
    });

    // Pasang adapter ke useReviewStore, reset, dan nilai 1 kartu baru -> flush ke backend
    useReviewStore.persist.setOptions({
      storage: createJSONStorage(() => storage1.storage),
    });
    useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} });
    useReviewStore.getState().reviewCardAction("deck-hyd", "c-1", 4, {
      now: new Date(2026, 4, 10, 12, 0, 0, 0),
      fuzz: false,
    });
    await storage1.flush();

    // Pastikan state tertulis sebelum simulasi reload
    expect(backedMap.has(REVIEW_STORAGE_KEY)).toBe(true);

    // 1. Tes sesi menunggu hidrasi: siapkan deferred hydration promise dan pastikan antrean baru membaca state setelah resolved
    let hydratedFlag = false;
    let resolveHydration!: () => void;
    const waitHydration = () =>
      hydratedFlag
        ? Promise.resolve()
        : new Promise<void>((res) => {
            resolveHydration = res;
          });

    // Simulasikan store sebelum rehydrate selesai: state kosong dulu tanpa menimpa backedMap
    const noopStorage = createJSONStorage(() => ({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }));
    useReviewStore.persist.setOptions({ storage: noopStorage });
    useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} });

    const cards: StoredCard[] = [
      { id: "c-1", deckId: "deck-hyd", word: "一", reading: "いち", meaning: "satu", sentence: "", translation: "", subdeck: "", tags: [] },
      { id: "c-2", deckId: "deck-hyd", word: "二", reading: "に", meaning: "dua", sentence: "", translation: "", subdeck: "", tags: [] },
    ];

    // Saat belum terhidrasi, Review dan ProtectedLayout menampilkan status loading dan menahan rute
    const loadingSpy = vi.spyOn(useReviewStore.persist, "hasHydrated").mockReturnValue(false);
    const loadingHtml = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/deck/1/review"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/deck/:deckId/review",
            element: React.createElement(ReviewPage),
          }),
        ),
      ),
    );
    expect(loadingHtml).toContain("rv-loading");
    const layoutLoadingHtml = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/beranda"] },
        React.createElement(ProtectedLayout),
      ),
    );
    expect(layoutLoadingHtml).toContain("Memuat progres belajar");
    loadingSpy.mockRestore();

    let resolvedBeforeHydration = false;
    const sessionPromise = loadHydratedSessionQueue({
      deckId: "deck-hyd",
      waitForHydration: waitHydration,
      loadCards: async () => cards,
      getReviewState: () => useReviewStore.getState(),
      settings: { newCards: 10, maxReview: 100, dayStartHour: 4, newOrder: "urutan" },
      now: new Date(2026, 4, 10, 12, 0, 0, 0),
    }).then((res) => {
      resolvedBeforeHydration = true;
      return res;
    });

    await Promise.resolve();
    expect(resolvedBeforeHydration).toBe(false);

    // Simulasi reload: sambungkan storage kedua yang membaca dari backedMap yang sama dan rehydrate
    const storageAfterReload = createReviewPersistStorage({
      idbGet: async (k) => backedMap.get(k),
      idbPut: async (k, v) => {
        backedMap.set(k, v);
      },
      idbDelete: async (k) => {
        backedMap.delete(k);
      },
      probeIdb: async () => true,
      debounceMs: 0,
    });
    useReviewStore.persist.setOptions({
      storage: createJSONStorage(() => storageAfterReload.storage),
    });
    await useReviewStore.persist.rehydrate();
    await waitForReviewStoreHydration();
    hydratedFlag = true;
    resolveHydration();

    const sessionResult = await sessionPromise;
    expect(resolvedBeforeHydration).toBe(true);
    // c-1 sudah dipelajari sebelum reload -> tidak ikut antrean baru, hanya c-2 yang disajikan!
    expect(useReviewStore.getState().srsCards["deck-hyd"]?.["c-1"]).toBeDefined();
    expect(sessionResult.queue.map((c) => c.id)).toEqual(["c-2"]);

    storage1.dispose();
    storageAfterReload.dispose();
  });

  it("impor cadangan jadwal dan Reset progres review menyimpan state ke penyimpanan IndexedDB baru", async () => {
    const kvStore = createReviewPersistStorage({
      idbGet: getKvValue,
      idbPut: putKvValue,
      idbDelete: async (k) => {
        await deckDexie.kv.delete(k);
      },
      probeIdb: async () => true,
      debounceMs: 300,
    });
    useReviewStore.persist.setOptions({
      storage: createJSONStorage(() => kvStore.storage),
    });

    const card: SRSCard = {
      id: "imp-1",
      easeFactor: 2.5,
      interval: 7,
      repetitions: 3,
      nextReview: Date.now() + 86_400_000,
    };
    const res = await importScheduleBackup({
      version: 1,
      exportedAt: Date.now(),
      reviewStorage: {
        srsCards: { "deck-imp": { "imp-1": card } },
        newIntroduced: { "deck-imp": { date: "2026-05-10", count: 1 } },
        activity: { "deck-imp": { date: "2026-05-10", count: 1, last: 1778400000000 } },
      },
    });
    expect(res.cardsCount).toBe(1);

    await kvStore.flush();
    await flushReviewStorageWrites();
    const persistedAfterImport = await getKvValue(REVIEW_STORAGE_KEY);
    expect(persistedAfterImport).toBeTruthy();
    expect(JSON.parse(persistedAfterImport!).state.srsCards["deck-imp"]["imp-1"].interval).toBe(7);

    // Reset progres review (persis seperti Settings.tsx)
    useReviewStore.setState({ srsCards: {}, newIntroduced: {}, activity: {} });
    await kvStore.flush();
    await flushReviewStorageWrites();
    const persistedAfterReset = await getKvValue(REVIEW_STORAGE_KEY);
    expect(JSON.parse(persistedAfterReset!).state.srsCards).toEqual({});

    kvStore.dispose();
  });

  it("visibilitychange (hidden) dan pagehide mem-flush tulisan tertunda tanpa menunggu 300ms", async () => {
    let puts = 0;
    const listeners = new Map<string, Set<() => void>>();
    vi.stubGlobal("document", {
      visibilityState: "hidden",
      addEventListener: (ev: string, fn: () => void) => {
        if (!listeners.has(`doc:${ev}`)) listeners.set(`doc:${ev}`, new Set());
        listeners.get(`doc:${ev}`)!.add(fn);
      },
      removeEventListener: (ev: string, fn: () => void) => {
        listeners.get(`doc:${ev}`)?.delete(fn);
      },
    });
    vi.stubGlobal("window", {
      addEventListener: (ev: string, fn: () => void) => {
        if (!listeners.has(`win:${ev}`)) listeners.set(`win:${ev}`, new Set());
        listeners.get(`win:${ev}`)!.add(fn);
      },
      removeEventListener: (ev: string, fn: () => void) => {
        listeners.get(`win:${ev}`)?.delete(fn);
      },
    });

    const adapter = createReviewPersistStorage({
      idbGet: getKvValue,
      idbPut: async (k, v) => {
        puts++;
        await putKvValue(k, v);
      },
      idbDelete: async () => {},
      probeIdb: async () => true,
      debounceMs: 300,
    });

    void adapter.storage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({ state: { srsCards: { a: {} }, newIntroduced: {}, activity: {} }, version: 1 }));
    expect(puts).toBe(0);

    for (const fn of listeners.get("doc:visibilitychange") ?? []) fn();
    await vi.waitFor(() => {
      expect(puts).toBe(1);
    });

    void adapter.storage.setItem(REVIEW_STORAGE_KEY, JSON.stringify({ state: { srsCards: { b: {} }, newIntroduced: {}, activity: {} }, version: 1 }));
    for (const fn of listeners.get("win:pagehide") ?? []) fn();
    await vi.waitFor(() => {
      expect(puts).toBe(2);
    });

    adapter.dispose();
  });

  it("memanggil navigator.storage.persist() satu kali setelah review nyata pertama dan mengabaikan kegagalan", async () => {
    const persistMock = vi.fn().mockRejectedValue(new Error("blocked"));
    vi.stubGlobal("navigator", {
      storage: { persist: persistMock },
    });

    // Reset ke storage memori sederhana agar tes fokus pada side-effect navigator.storage.persist
    useReviewStore.persist.setOptions({
      storage: createJSONStorage(() => createMemoryStorage()),
    });
    useReviewStore.getState().reviewCardAction("d-persist", "c-1", 4, {
      fuzz: false,
    });
    useReviewStore.getState().reviewCardAction("d-persist", "c-2", 4, {
      fuzz: false,
    });

    await Promise.resolve();
    expect(persistMock).toHaveBeenCalledTimes(1);
  });

  it("mengukur waktu tulis 20.000 kartu FSRS ke Dexie kv (benchmark)", async () => {
    vi.useRealTimers();
    const deckMap: Record<string, SRSCard> = {};
    const now = Date.now();
    for (let i = 0; i < 20_000; i++) {
      deckMap[`card-${i}`] = {
        id: `card-${i}`,
        easeFactor: 2.5,
        interval: 12,
        repetitions: 4,
        nextReview: now + 86_400_000,
        stability: 14.32,
        difficulty: 5.18,
        state: 2,
        lapses: 0,
        reps: 4,
        lastReview: now,
        scheduler: "fsrs",
      };
    }

    const t0 = performance.now();
    const serialized = JSON.stringify({
      state: { srsCards: { "deck-20k": deckMap }, newIntroduced: {}, activity: {} },
      version: 1,
    });
    await putKvValue(REVIEW_STORAGE_KEY, serialized);
    const elapsedMs = performance.now() - t0;

    console.info(
      `[Benchmark 20K Kartu] Ukuran JSON: ${(serialized.length / (1024 * 1024)).toFixed(2)} MB | Waktu serialize + putKvValue (fake-indexeddb): ${elapsedMs.toFixed(1)} ms`,
    );
    expect(await getKvValue(REVIEW_STORAGE_KEY)).toBe(serialized);
    expect(elapsedMs).toBeLessThan(15_000);
  });

  it("putCards store lama di Dexie tetap utuh di versi 3", async () => {
    await putCards([
      {
        id: "legacy-card",
        deckId: "deck-v3",
        word: "日本語",
        reading: "にほんご",
        meaning: "bahasa Jepang",
        sentence: "",
        translation: "",
        subdeck: "",
        tags: [],
      },
    ]);
    expect(await deckDexie.kv.count()).toBe(0);
    await putKvValue("test-key", "ok");
    expect(await getKvValue("test-key")).toBe("ok");
  });
});
