import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  addCards,
  ensureSeeded,
  removeCards,
  updateCard,
} from "../../deckCards";
import {
  deckDexie,
  deleteDeckData,
  getAllReviewLogs,
  getCardCount,
  getCards,
  getMedia,
  putCards,
  putMedia,
  type StoredCard,
} from "../../deckDb";
import { getOrCreateDeviceId } from "../../userStorageScope";
import { useAppStore } from "../../../store/useAppStore";
import { useReviewStore } from "../../../store/useReviewStore";
import { isSeedCardId } from "../mappers";
import { MockSyncServer } from "./mockSyncServer";
import { MultiDeviceHarness } from "./twoDeviceHarness";

describe("Task 5 — Sinkronisasi Pertama, Deck Besar (5.000 Kartu), dan Media Hilang", () => {
  let harness: MultiDeviceHarness | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
      harness = null;
    }
  });

  it("1) Server kosong + lokal berisi data -> unggah penuh; perangkat B kosong -> unduh & hitung deck.total", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t5-1");
    const devA = harness.createDevice("A");
    const devB = harness.createDevice("B");

    const deckId = await harness.onDevice(devA, async () => {
      const id = useAppStore.getState().addDeck({
        title: "Kosakata N4",
        level: "N4 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "語",
        color: "indigo",
      });
      const added = await addCards(id, [
        { word: "準備", reading: "じゅんび", meaning: "persiapan", sentence: "", translation: "", tags: ["n4"] },
        { word: "約束", reading: "やくそく", meaning: "janji", sentence: "", translation: "", tags: ["n4"] },
      ]);
      useAppStore.getState().updateSettings({ newCards: 18, desiredRetention: 0.92 });
      useReviewStore.getState().reviewCardAction(id, added[0].id, 3);
      return id;
    });

    const syncA = await harness.sync(devA);
    expect(syncA.ok).toBe(true);
    expect(server.decks.has(`u-t5-1::${deckId}`)).toBe(true);
    expect([...server.cards.values()].filter((c) => c.deck_id === deckId)).toHaveLength(2);
    expect(server.logs.length).toBeGreaterThanOrEqual(1);

    const syncB = await harness.sync(devB);
    expect(syncB.ok).toBe(true);

    await harness.onDevice(devB, async () => {
      const deckB = useAppStore.getState().decks.find((d) => d.id === deckId);
      expect(deckB?.title).toBe("Kosakata N4");
      expect(deckB?.total).toBe(2);
      expect(useAppStore.getState().settings.newCards).toBe(18);
      expect(useAppStore.getState().settings.desiredRetention).toBe(0.92);
      const cardsB = await getCards(deckId);
      expect(cardsB).toHaveLength(2);
      expect(Object.keys(useReviewStore.getState().srsCards[deckId] ?? {})).toHaveLength(1);
      const logsB = await getAllReviewLogs();
      expect(logsB.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("2) Kedua perangkat sudah punya data sebelum sync pertama -> merge tanpa kehilangan atau duplikat deck", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t5-2");
    const devA = harness.createDevice("A");
    const devB = harness.createDevice("B");

    const deckA = await harness.onDevice(devA, async () => {
      const id = useAppStore.getState().addDeck({
        title: "Deck Laptop",
        level: "N3 • Novel",
        kind: "Novel",
        due: 0,
        total: 0,
        kanji: "本",
        color: "sage",
      });
      await addCards(id, [{ word: "物語", reading: "ものがたり", meaning: "cerita", sentence: "", translation: "", tags: [] }]);
      return id;
    });

    const deckB = await harness.onDevice(devB, async () => {
      const id = useAppStore.getState().addDeck({
        title: "Deck Ponsel",
        level: "N5 • Anime",
        kind: "Anime",
        due: 0,
        total: 0,
        kanji: "映",
        color: "coral",
      });
      await addCards(id, [{ word: "冒険", reading: "ぼうけん", meaning: "petualangan", sentence: "", translation: "", tags: [] }]);
      return id;
    });

    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);
    expect((await harness.sync(devA)).ok).toBe(true);

    for (const dev of [devA, devB]) {
      await harness.onDevice(dev, async () => {
        const ids = useAppStore.getState().decks.map((d) => d.id);
        expect(ids.filter((x) => x === deckA)).toHaveLength(1);
        expect(ids.filter((x) => x === deckB)).toHaveLength(1);
        expect(await getCardCount(deckA)).toBe(1);
        expect(await getCardCount(deckB)).toBe(1);
      });
    }
  });

  it("3) Deck seed di kedua perangkat: body tak tersentuh tidak diunggah; review/edit/hapus seed menyinkron & bertahan saat reload", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t5-3");
    const devA = harness.createDevice("A");
    const devB = harness.createDevice("B");
    const devC = harness.createDevice("C");

    // Perangkat A seed bawaan lalu sync tanpa menyentuh apa pun -> 0 kartu seed di server
    await harness.onDevice(devA, async () => {
      await ensureSeeded();
    });
    expect((await harness.sync(devA)).ok).toBe(true);
    const untouchedSeedCards = [...server.cards.values()].filter((c) => isSeedCardId(c.deck_id, c.id));
    expect(untouchedSeedCards).toHaveLength(0);

    // Perangkat A: review sps-n5-01, edit s2-01, hapus s2-02, hapus deck seed "1"
    await harness.onDevice(devA, async () => {
      useReviewStore.getState().reviewCardAction("ps-n5", "sps-n5-01", 3);
      const deck2Cards = await getCards("2");
      const first = deck2Cards.find((c) => c.id === "s2-01")!;
      await updateCard(first, {
        word: first.word,
        reading: first.reading,
        meaning: "umur; rentang hidup (disunting)",
        sentence: first.sentence,
        translation: first.translation,
        tags: ["edited"],
      });
      await removeCards("2", ["s2-02"]);
      useAppStore.getState().removeDeck("1");
      useReviewStore.getState().removeDeck("1");
      await deleteDeckData("1");
    });
    expect((await harness.sync(devA)).ok).toBe(true);

    // Perangkat B: seed DULU lalu sync -> terima semua perubahan & hapus tetap hilang setelah reload
    await harness.onDevice(devB, async () => {
      await ensureSeeded();
    });
    expect((await harness.sync(devB)).ok).toBe(true);
    await harness.reload(devB);
    await harness.onDevice(devB, async () => {
      await ensureSeeded();
      expect(useAppStore.getState().decks.some((d) => d.id === "1")).toBe(false);
      const c2 = await getCards("2");
      expect(c2.find((c) => c.id === "s2-01")?.meaning).toContain("disunting");
      expect(c2.some((c) => c.id === "s2-02")).toBe(false);
      expect(c2.some((c) => c.id === "s2-03")).toBe(true);
      expect((useReviewStore.getState().srsCards["ps-n5"]?.["sps-n5-01"]?.lastReview ?? 0)).toBeGreaterThan(1);
    });

    // Perangkat C: sync DULU lalu seed -> hasil konvergen identik dengan perangkat B
    expect((await harness.sync(devC)).ok).toBe(true);
    await harness.onDevice(devC, async () => {
      await ensureSeeded();
      expect(useAppStore.getState().decks.some((d) => d.id === "1")).toBe(false);
      const c2 = await getCards("2");
      expect(c2.find((c) => c.id === "s2-01")?.meaning).toContain("disunting");
      expect(c2.some((c) => c.id === "s2-02")).toBe(false);
      expect(c2.some((c) => c.id === "s2-03")).toBe(true);
      expect((useReviewStore.getState().srsCards["ps-n5"]?.["sps-n5-01"]?.lastReview ?? 0)).toBeGreaterThan(1);
    });
  });

  it("4) Perangkat offline >3 minggu mengejar paginasi penuh, konflik hapus vs sunting deck (LWW), dan 2 peramban di komputer sama", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t5-4");
    const devA = harness.createDevice("Browser-Chrome");
    const devB = harness.createDevice("Browser-Firefox");

    // Cek 2 peramban berbeda mendapat device_id unik
    const devIdA = await harness.onDevice(devA, () => getOrCreateDeviceId("u-t5-4"));
    const devIdB = await harness.onDevice(devB, () => getOrCreateDeviceId("u-t5-4"));
    expect(devIdA).toBeTruthy();
    expect(devIdB).toBeTruthy();
    expect(devIdA).not.toBe(devIdB);

    // Buat 2 deck awal & sinkronkan ke keduanya
    const { deckDelWins, deckEditWins } = await harness.onDevice(devA, () => ({
      deckDelWins: useAppStore.getState().addDeck({
        title: "Deck Akan Dihapus",
        level: "N5 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "消",
        color: "slate",
      }),
      deckEditWins: useAppStore.getState().addDeck({
        title: "Deck Akan Disunting",
        level: "N5 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "改",
        color: "ochre",
      }),
    }));
    expect((await harness.sync(devA)).ok).toBe(true);
    expect((await harness.sync(devB)).ok).toBe(true);

    // Simulasikan 3+ minggu (25 hari) aktivitas di A sementara B offline
    server.clockMs += 25 * 86_400_000;
    const bulkDeck = await harness.onDevice(devA, async () => {
      const id = useAppStore.getState().addDeck({
        title: "Akumulasi 3 Minggu",
        level: "N2 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "積",
        color: "plum",
      });
      const cards: StoredCard[] = Array.from({ length: 45 }, (_, i) => ({
        id: `w3-${i}`,
        deckId: id,
        word: `単語${i}`,
        reading: `たんご${i}`,
        meaning: `arti ${i}`,
        sentence: "",
        translation: "",
        subdeck: "",
        tags: [],
      }));
      await putCards(cards);
      return id;
    });

    // Skenario konflik A: B menyunting lebih dulu (t1), lalu A menghapus lebih baru (t2 > t1) -> hapus menang
    await harness.onDevice(devB, () => {
      useAppStore.getState().updateDeck(deckDelWins, { title: "Suntingan Lama B" });
    });
    await new Promise((r) => setTimeout(r, 15));
    await harness.onDevice(devA, () => {
      useAppStore.getState().removeDeck(deckDelWins);
    });

    // Skenario konflik B: A menghapus lebih dulu (t1), lalu B menyunting lebih baru (t2 > t1) -> sunting menang (LWW)
    await harness.onDevice(devA, () => {
      useAppStore.getState().removeDeck(deckEditWins);
    });
    await new Promise((r) => setTimeout(r, 15));
    await harness.onDevice(devB, () => {
      useAppStore.getState().updateDeck(deckEditWins, { title: "Suntingan Lebih Baru B" });
    });

    // Kedua peramban juga mereview kartu yang sama dengan timestamp reviewedAt persis sama -> tidak bentrok
    const sharedTs = Date.now() + 500;
    await harness.onDevice(devA, () => {
      useReviewStore.getState().reviewCardAction(bulkDeck, "w3-0", 3, { now: sharedTs });
    });
    await harness.onDevice(devB, () => {
      useReviewStore.getState().reviewCardAction(bulkDeck, "w3-0", 2, { now: sharedTs });
    });

    expect((await harness.sync(devA, { pullPageSize: 10 })).ok).toBe(true);
    expect((await harness.sync(devB, { pullPageSize: 10 })).ok).toBe(true);
    expect((await harness.sync(devA, { pullPageSize: 10 })).ok).toBe(true);

    for (const dev of [devA, devB]) {
      await harness.onDevice(dev, async () => {
        const decks = useAppStore.getState().decks;
        expect(decks.some((d) => d.id === deckDelWins)).toBe(false);
        expect(decks.find((d) => d.id === deckEditWins)?.title).toBe("Suntingan Lebih Baru B");
        expect(await getCardCount(bulkDeck)).toBe(45);
        expect(decks.find((d) => d.id === bulkDeck)?.total).toBe(45);
      });
    }
    // Kedua log review dengan device_id berbeda masuk semua ke server tanpa bentrok
    const logsAtSharedTs = server.logs.filter((l) => l.card_id === "w3-0" && l.reviewed_at === sharedTs);
    expect(logsAtSharedTs).toHaveLength(2);
    expect(new Set(logsAtSharedTs.map((l) => l.device_id)).size).toBe(2);
  });

  it("5) Deck besar 5.000 kartu: unggah berbatch 250, tahan reload di tengah unggah, unduh berhalaman di B, dan media hilang aman", async () => {
    const server = new MockSyncServer();
    harness = new MultiDeviceHarness(server, "u-t5-large");
    const devA = harness.createDevice("A-Large");
    const devB = harness.createDevice("B-Large");

    const deckId = await harness.onDevice(devA, async () => {
      const id = useAppStore.getState().addDeck({
        title: "Core 5000 Benchmark",
        level: "N3 • Core",
        kind: "Core",
        due: 0,
        total: 0,
        kanji: "五",
        color: "indigo",
      });
      // Sisipkan 5.000 kartu (kartu pertama punya referensi media audio & gambar)
      const allCards: StoredCard[] = Array.from({ length: 5000 }, (_, i) => ({
        id: `big-${i}`,
        deckId: id,
        word: `語彙${i}`,
        reading: `ごい${i}`,
        meaning: `arti kosakata ke-${i}`,
        sentence: `例文${i}です。`,
        translation: `Kalimat contoh ${i}.`,
        ...(i === 0 ? { audio: "goi0.mp3", sentenceAudio: "sent0.mp3", image: "goi0.jpg" } : {}),
        subdeck: "",
        tags: i % 10 === 0 ? ["core"] : [],
      }));
      // Tulis dalam batch 500 seperti importer .apkg
      for (let i = 0; i < allCards.length; i += 500) {
        await putCards(allCards.slice(i, i + 500));
      }
      // Media hanya disimpan lokal di perangkat A (tidak pernah diunggah di B2)
      await putMedia(id, [["goi0.mp3", new Blob(["fake-audio"], { type: "audio/mpeg" })]]);
      return id;
    });

    // 1. Uji tahan reload di tengah unggah (abort setelah 6 progress callback -> reload -> lanjutkan)
    const heapBefore = process.memoryUsage().heapUsed;
    const t0 = performance.now();
    let progressHits = 0;
    const firstAttempt = await harness.sync(devA, {
      pushBatchSize: 250,
      onProgress: () => {
        progressHits += 1;
      },
      shouldAbort: () => progressHits >= 6,
    });
    expect(firstAttempt.aborted).toBe(true);
    expect(firstAttempt.pendingRemaining).toBeGreaterThan(0);

    // Simulasikan reload peramban di tengah unggah
    await harness.reload(devA);
    const resumed = await harness.sync(devA, { pushBatchSize: 250 });
    const uploadMs = Math.round(performance.now() - t0);
    const heapDeltaMb = Number(((process.memoryUsage().heapUsed - heapBefore) / (1024 * 1024)).toFixed(2));

    expect(resumed.ok).toBe(true);
    expect(resumed.pendingRemaining).toBe(0);
    expect([...server.cards.values()].filter((c) => c.deck_id === deckId)).toHaveLength(5000);

    const pushRequests = (firstAttempt.pushRequestCount ?? 0) + (resumed.pushRequestCount ?? 0);
    const totalCycleRequests = firstAttempt.requestCount + resumed.requestCount;
    // 5000 / 250 = 20 batch cards + 1 deck = tepat 21 RPC push
    expect(pushRequests).toBe(21);
    expect(totalCycleRequests).toBeLessThanOrEqual(50);

    // 2. Perangkat B mengunduh seluruh 5.000 kartu berhalaman (250/halaman)
    const pullRes = await harness.sync(devB, { pullPageSize: 250 });
    expect(pullRes.ok).toBe(true);
    await harness.onDevice(devB, async () => {
      expect(await getCardCount(deckId)).toBe(5000);
      const deckB = useAppStore.getState().decks.find((d) => d.id === deckId);
      expect(deckB?.total).toBe(5000);

      // Verifikasi kartu bermedia di perangkat B: referensi nama berkas tetap utuh,
      // namun blob media lokal tidak tersedia (undefined, tidak melempar galat)
      const cardsB = await getCards(deckId);
      const mediaCard = cardsB.find((c) => c.id === "big-0");
      expect(mediaCard?.audio).toBe("goi0.mp3");
      expect(mediaCard?.sentenceAudio).toBe("sent0.mp3");
      expect(mediaCard?.image).toBe("goi0.jpg");
      expect(await getMedia(deckId, "goi0.mp3")).toBeUndefined();
      expect(await getMedia(deckId, "goi0.jpg")).toBeUndefined();
    });

    // 3. Ukur ukuran outbox 1 hari simulasi (100 review + 5 edit kartu) & bytes per review_log
    await harness.onDevice(devA, async () => {
      const baseTs = Date.now() + 10_000;
      for (let i = 0; i < 100; i++) {
        useReviewStore.getState().reviewCardAction(deckId, `big-${i}`, ((i % 4) as 0 | 1 | 2 | 3), {
          now: baseTs + i * 1000,
        });
      }
      const sampleCards = (await getCards(deckId)).slice(0, 5);
      await putCards(sampleCards.map((c) => ({ ...c, meaning: `${c.meaning} (v2)` })));
    });

    const metrics = await harness.onDevice(devA, async () => {
      const outboxRows = await deckDexie.syncOutbox.toArray();
      const outboxBytes = outboxRows.reduce((sum, r) => sum + JSON.stringify(r).length, 0);
      const logRows = outboxRows.filter((r) => r.entity === "review_logs");
      const bytesPerLog =
        logRows.length > 0
          ? Math.round(
              logRows.reduce((sum, r) => sum + JSON.stringify(r.payload).length, 0) / logRows.length,
            )
          : 0;
      return { outboxCount: outboxRows.length, outboxBytes, bytesPerLog };
    });

    expect(metrics.bytesPerLog).toBeGreaterThan(80);
    expect(metrics.bytesPerLog).toBeLessThan(600);
    expect(metrics.outboxCount).toBeGreaterThan(100);

    // Cetak metrik untuk laporan B2 & dokumentasi
    console.info(
      `[B2-BENCH] 5000_cards_upload_ms=${uploadMs} push_reqs=${pushRequests} total_first_sync_reqs=${totalCycleRequests} pull_reqs=${pullRes.requestCount} heap_delta_mb=${heapDeltaMb} day_outbox_rows=${metrics.outboxCount} day_outbox_kb=${(metrics.outboxBytes / 1024).toFixed(1)} bytes_per_review_log=${metrics.bytesPerLog}`,
    );
  }, 60_000);
});
