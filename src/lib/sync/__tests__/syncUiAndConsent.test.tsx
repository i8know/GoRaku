import "fake-indexeddb/auto";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import SyncStatusBadge, { deriveSyncPresentation } from "../../../components/SyncStatusBadge";
import { needsConsentUpdate } from "../../../components/ConsentUpdateModal";
import SettingsPage from "../../../pages/Settings";
import PrivacyPolicyPage from "../../../pages/PrivacyPolicy";
import { buildUserAccountExportJson, deleteCurrentUserAccount } from "../../accountData";
import { addCards } from "../../deckCards";
import { flushReviewLogs, flushSyncOutboxWrites } from "../../deckDb";
import { CURRENT_CONSENT_VERSION } from "../../supabase";
import { resetScopeCoordinatorForTest, switchUserStorageScope } from "../../userScopeCoordinator";
import { clearScopedLocalDataForUser, resetUserStorageScopeForTest } from "../../userStorageScope";
import { useAppStore } from "../../../store/useAppStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useReviewStore } from "../../../store/useReviewStore";
import { useSyncStore } from "../../../store/useSyncStore";
import {
  refreshCaptureSnapshots,
  startSyncStoreCapture,
  stopSyncStoreCaptureForTest,
} from "../storeCapture";
import { runSyncCycle } from "../engine";
import { stopSyncController, syncNow } from "../syncController";
import { MockSyncServer } from "./mockSyncServer";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  };
}

function makeFakeUser(id: string, email: string): User {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Hana" },
    identities: [{ id: `${id}-id`, user_id: id, provider: "email" }],
    created_at: "2026-11-19T00:00:00.000Z",
    updated_at: "2026-11-19T00:00:00.000Z",
  } as unknown as User;
}

describe("Task 7 — Status Sinkronisasi UI, Gerbang Persetujuan B2, Privasi, Ekspor & Hapus Akun", () => {
  const USER_A = "u-t7-aaaa-1111";
  const USER_B = "u-t7-bbbb-2222";

  beforeEach(async () => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    stopSyncController();
    stopSyncStoreCaptureForTest();
    resetScopeCoordinatorForTest();
    resetUserStorageScopeForTest();
    useSyncStore.getState().resetSyncState();
    useAuthStore.getState().resetForTest();
    await clearScopedLocalDataForUser(USER_A);
    await clearScopedLocalDataForUser(USER_B);
    await switchUserStorageScope(USER_A);
    startSyncStoreCapture();
    refreshCaptureSnapshots();
  });

  afterEach(async () => {
    stopSyncController();
    stopSyncStoreCaptureForTest();
    useSyncStore.getState().resetSyncState();
    useAuthStore.getState().resetForTest();
    await switchUserStorageScope(null);
    await clearScopedLocalDataForUser(USER_A);
    await clearScopedLocalDataForUser(USER_B);
    vi.unstubAllGlobals();
  });

  it("1) Gerbang persetujuan B2: meminta persetujuan ulang dari versi B1 dan memblokir seluruh unggahan sampai diterima", async () => {
    expect(CURRENT_CONSENT_VERSION).toBe("2026-11-27-b2");
    const server = new MockSyncServer();
    const client = server.createClientForUser(USER_A);

    const oldB1Profile = {
      user_id: USER_A,
      display_name: "Hana",
      jlpt_level: "N4",
      consented_at: "2026-11-19T00:00:00.000Z",
      consent_version: "2026-11-19-b1",
    };
    expect(needsConsentUpdate(oldB1Profile)).toBe(true);

    useAuthStore.setState({
      isConfigured: true,
      status: "signedIn",
      user: makeFakeUser(USER_A, "hana@goraku.id"),
      profile: oldB1Profile,
      profileLoadState: "loaded",
      _client: client,
    });

    const deckId = useAppStore.getState().addDeck({
      title: "Deck Sebelum Consent B2",
      level: "N5 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "待",
      color: "indigo",
    });
    await flushSyncOutboxWrites();

    // Sebelum persetujuan B2 diterima -> 0 request ke server!
    const blockedRes = await syncNow({ manual: true });
    expect(blockedRes).toBeNull();
    expect(server.rpcCallCount).toBe(0);
    expect(server.selectCallCount).toBe(0);
    expect(server.decks.has(`${USER_A}::${deckId}`)).toBe(false);

    // Setelah pengguna menyetujui versi B2 -> sync langsung berjalan & mengunggah deck
    useAuthStore.setState({
      profile: {
        ...oldB1Profile,
        consent_version: CURRENT_CONSENT_VERSION,
        consented_at: new Date().toISOString(),
      },
    });
    expect(needsConsentUpdate(useAuthStore.getState().profile)).toBe(false);

    const allowedRes = await syncNow({ manual: true });
    expect(allowedRes?.ok).toBe(true);
    expect(server.decks.has(`${USER_A}::${deckId}`)).toBe(true);
  });

  it("2) PrivacyPolicy B2 menjelaskan data tersinkron vs tidak tersinkron, tetap menandai draf, dan SyncStatusBadge/Settings merender aksesibel", () => {
    // Privacy Policy B2
    const privHtml = renderToString(
      <MemoryRouter initialEntries={["/privasi"]}>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );
    expect(privHtml).toContain("Draf — perlu ditinjau.");
    expect(privHtml).toContain(CURRENT_CONSENT_VERSION);
    expect(privHtml).toContain("srs_cards");
    expect(privHtml).toContain("review_logs");
    expect(privHtml).toContain("daily_counters");
    expect(privHtml).toContain("tidak diunggah ke server");
    expect(privHtml).toContain("Kamus Yomitan");
    expect(privHtml).toContain("Berkas media kartu");

    const authInit = useAuthStore.getInitialState();
    const syncInit = useSyncStore.getInitialState();
    const prevAuthInit = { ...authInit };
    const prevSyncInit = { ...syncInit };

    try {
      // SyncStatusBadge saat keluar akun -> kosong
      Object.assign(authInit, { status: "signedOut", isConfigured: true, user: null, profile: null });
      const signedOutBadge = renderToString(
        <MemoryRouter>
          <SyncStatusBadge variant="sidebar" />
        </MemoryRouter>,
      );
      expect(signedOutBadge).toBe("");

      // Semua presentasi state punya ikon + teks (bukan warna saja)
      const states = [
        deriveSyncPresentation({ status: "synced", pendingCount: 0, quarantinedCount: 0, pausedOnDevice: false, progress: null, consentPending: false, lastError: null }),
        deriveSyncPresentation({ status: "syncing", pendingCount: 10, quarantinedCount: 0, pausedOnDevice: false, progress: { phase: "push", entity: "cards", done: 250, total: 1000 }, consentPending: false, lastError: null }),
        deriveSyncPresentation({ status: "idle", pendingCount: 4, quarantinedCount: 0, pausedOnDevice: false, progress: null, consentPending: false, lastError: null }),
        deriveSyncPresentation({ status: "offline", pendingCount: 2, quarantinedCount: 0, pausedOnDevice: false, progress: null, consentPending: false, lastError: null }),
        deriveSyncPresentation({ status: "paused", pendingCount: 0, quarantinedCount: 0, pausedOnDevice: true, progress: null, consentPending: false, lastError: null }),
        deriveSyncPresentation({ status: "auth_required", pendingCount: 1, quarantinedCount: 0, pausedOnDevice: false, progress: null, consentPending: false, lastError: null }),
        deriveSyncPresentation({ status: "error", pendingCount: 1, quarantinedCount: 0, pausedOnDevice: false, progress: null, consentPending: false, lastError: "Gagal jaringan" }),
        deriveSyncPresentation({ status: "synced", pendingCount: 0, quarantinedCount: 2, pausedOnDevice: false, progress: null, consentPending: false, lastError: null }),
      ];
      expect(states.map((s) => s.label)).toEqual([
        "Tersinkron",
        "Menyinkronkan 250/1000",
        "4 belum tersinkron",
        "Offline (2)",
        "Sinkronisasi dijeda",
        "Masuk ulang",
        "Sinkronisasi gagal",
        "2 perlu ditinjau",
      ]);
      for (const s of states) {
        expect(s.icon.length).toBeGreaterThan(0);
        expect(s.label.length).toBeGreaterThan(0);
      }

      // Render SyncStatusBadge + Settings #sinkronisasi saat masuk akun & ada item karantina
      Object.assign(authInit, {
        isConfigured: true,
        status: "signedIn",
        user: makeFakeUser(USER_A, "hana@goraku.id"),
        profile: {
          user_id: USER_A,
          display_name: "Hana",
          jlpt_level: "N4",
          consented_at: "2026-11-27T00:00:00.000Z",
          consent_version: CURRENT_CONSENT_VERSION,
        },
        profileLoadState: "loaded",
      });
      Object.assign(syncInit, {
        status: "synced",
        pendingCount: 3,
        lastSyncAt: Date.UTC(2026, 10, 27, 5, 0),
        quarantined: [
          {
            id: 99,
            entity: "cards",
            key: "deck-1::card-huge",
            op: "upsert",
            payload: {},
            clientTs: 1000,
            attempts: 1,
            status: "quarantined",
            error: "[23514] cards_data_size_chk",
          },
        ],
      });

      const badgeHtml = renderToString(
        <MemoryRouter>
          <SyncStatusBadge variant="sidebar" />
        </MemoryRouter>,
      );
      expect(badgeHtml).toContain('aria-live="polite"');
      expect(badgeHtml).toContain("1 perlu ditinjau");
      expect(badgeHtml).toContain("/settings#sinkronisasi");

      const settingsHtml = renderToString(
        <MemoryRouter initialEntries={["/settings#sinkronisasi"]}>
          <SettingsPage notify={() => {}} />
        </MemoryRouter>,
      );
      expect(settingsHtml).toContain('id="sinkronisasi"');
      expect(settingsHtml).toContain("Sinkronkan sekarang");
      expect(settingsHtml).toContain("Jeda sinkronisasi di perangkat ini");
      expect(settingsHtml).toContain("deck-1::card-huge");
      expect(settingsHtml).toContain("Coba lagi");
      expect(settingsHtml).toContain("Abaikan");
      // Pastikan maksimal 1 aksi utama (--shu / pg-primary) pada seluruh layar Settings
      expect((settingsHtml.match(/class="[^"]*pg-primary[^"]*"/g) ?? []).length).toBe(1);
    } finally {
      Object.assign(authInit, prevAuthInit);
      Object.assign(syncInit, prevSyncInit);
    }
  });

  it("3) Ekspor akun menyertakan data studi tersinkron tanpa token, dan hapus akun menghapus 0 baris tersisa di semua 6 tabel server serta lokal", async () => {
    const server = new MockSyncServer();
    const clientA = server.createClientForUser(USER_A);
    const clientB = server.createClientForUser(USER_B);

    // Tanamkan data milik User B di server untuk membuktikan penghapusan User A tidak menyentuh User B
    await clientB.rpc("sync_upsert_decks", {
      p_rows: [
        {
          id: "deck-b-safe",
          parent_id: null,
          title: "Milik B",
          kanji: "守",
          category: "N5 • Core",
          meta: { kind: "Core", color: "indigo", source: "manual" },
          deleted_at: null,
          client_updated_at: Date.now(),
        },
      ],
    });

    // User A membuat deck, kartu, review, dan pengaturan lalu menyinkronkan ke semua 6 tabel server
    const deckId = useAppStore.getState().addDeck({
      title: "Deck A Untuk Dihapus",
      level: "N4 • Core",
      kind: "Core",
      due: 0,
      total: 0,
      kanji: "消",
      color: "coral",
    });
    const [card] = await addCards(deckId, [
      { word: "削除", reading: "さくじょ", meaning: "penghapusan", sentence: "", translation: "", tags: [] },
    ]);
    useAppStore.getState().updateSettings({ newCards: 14 });
    useReviewStore.getState().reviewCardAction(deckId, card.id, 3, { now: Date.now() });
    await Promise.all([flushReviewLogs(), flushSyncOutboxWrites()]);

    const syncRes = await runSyncCycle({ client: clientA, userId: USER_A });
    expect(syncRes.ok).toBe(true);
    expect(server.settings.has(USER_A)).toBe(true);
    expect([...server.decks.values()].filter((r) => r.user_id === USER_A).length).toBeGreaterThan(0);
    expect([...server.cards.values()].filter((r) => r.user_id === USER_A).length).toBeGreaterThan(0);
    expect([...server.srs.values()].filter((r) => r.user_id === USER_A).length).toBeGreaterThan(0);
    expect([...server.counters.values()].filter((r) => r.user_id === USER_A).length).toBeGreaterThan(0);
    expect(server.logs.filter((r) => r.user_id === USER_A).length).toBeGreaterThan(0);

    // Ekspor akun memuat seluruh data belajar tanpa token
    const fakeUserA = makeFakeUser(USER_A, "a@goraku.id");
    const exportPayload = await buildUserAccountExportJson(fakeUserA, {
      user_id: USER_A,
      display_name: "Hana A",
      jlpt_level: "N4",
      consented_at: "2026-11-27T00:00:00.000Z",
      consent_version: CURRENT_CONSENT_VERSION,
    });
    const exportedStr = JSON.stringify(exportPayload);
    expect(exportPayload.decks.some((d) => d.deck.id === deckId && d.cards.length === 1)).toBe(true);
    expect(exportPayload.reviewProgress.reviewLogs.length).toBeGreaterThanOrEqual(1);
    expect(exportedStr).not.toContain("access_token");
    expect(exportedStr).not.toContain("refresh_token");

    // Simulasikan Edge Function `delete-account` yang memicu ON DELETE CASCADE pada seluruh tabel server milik USER_A
    const deleteClient = {
      functions: {
        invoke: vi.fn(async (fnName: string) => {
          expect(fnName).toBe("delete-account");
          server.settings.delete(USER_A);
          for (const [k, v] of server.decks.entries()) if (v.user_id === USER_A) server.decks.delete(k);
          for (const [k, v] of server.cards.entries()) if (v.user_id === USER_A) server.cards.delete(k);
          for (const [k, v] of server.srs.entries()) if (v.user_id === USER_A) server.srs.delete(k);
          for (const [k, v] of server.counters.entries()) if (v.user_id === USER_A) server.counters.delete(k);
          server.logs = server.logs.filter((l) => l.user_id !== USER_A);
          return { data: { deleted: true }, error: null };
        }),
      },
      auth: {
        signOut: vi.fn(async () => ({ error: null })),
      },
    } as unknown as SupabaseClient;

    useAuthStore.setState({
      isConfigured: true,
      status: "signedIn",
      user: fakeUserA,
      _client: deleteClient,
    });

    const delRes = await deleteCurrentUserAccount({ client: deleteClient, userId: USER_A });
    expect(delRes.error).toBeNull();

    // 0 baris tersisa untuk USER_A di seluruh 6 tabel server
    expect(server.settings.has(USER_A)).toBe(false);
    expect([...server.decks.values()].filter((r) => r.user_id === USER_A)).toHaveLength(0);
    expect([...server.cards.values()].filter((r) => r.user_id === USER_A)).toHaveLength(0);
    expect([...server.srs.values()].filter((r) => r.user_id === USER_A)).toHaveLength(0);
    expect([...server.counters.values()].filter((r) => r.user_id === USER_A)).toHaveLength(0);
    expect(server.logs.filter((r) => r.user_id === USER_A)).toHaveLength(0);

    // Data milik USER_B tetap utuh 100%
    expect(server.decks.has(`${USER_B}::deck-b-safe`)).toBe(true);
    // Ruang lokal milik USER_A di localStorage sudah bersih & state sync direset
    expect(useSyncStore.getState().pendingCount).toBe(0);
    expect(useSyncStore.getState().lastSyncAt).toBeNull();
    expect(
      Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k) =>
        k?.includes(USER_A),
      ),
    ).toHaveLength(0);
  });
});
