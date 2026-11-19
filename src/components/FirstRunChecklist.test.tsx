import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import FirstRunChecklist, {
  FIRST_RUN_COMPLETED_SHOWN_KEY,
  FIRST_RUN_DISMISSED_KEY,
} from "./FirstRunChecklist";
import {
  countCompletedReviews,
  countUserMinedCards,
  getMiningActionPath,
} from "../lib/onboardingStats";
import type { BookRecord } from "../lib/lexiconDb";

const noop = () => {};

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

describe("FirstRunChecklist & onboardingStats", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("menghitung data nyata mining dan review tanpa menghitung seed demo", () => {
    const mockBook: BookRecord = {
      id: "b1",
      title: "Sample",
      author: "Anon",
      format: "epub",
      fileSize: 100,
      addedAt: "2026-11-15T00:00:00.000Z",
      progress: 0,
      lastReadAt: "2026-11-15T00:00:00.000Z",
      minedCount: 0,
    };

    expect(
      countUserMinedCards([mockBook], [{ id: "m1" }, { id: "m2" }]),
    ).toBe(0);
    expect(
      countUserMinedCards(
        [{ ...mockBook, minedCount: 2 }],
        [{ id: "m1" }, { id: "1700000" }],
      ),
    ).toBe(3);

    expect(countCompletedReviews(0, {})).toBe(0);
    expect(
      countCompletedReviews(4, { d1: { last: 100, date: "2026-11-15", count: 2 } }),
    ).toBe(4);
    expect(
      countCompletedReviews(0, { d1: { last: 100, date: "2026-11-15", count: 5 } }),
    ).toBe(5);

    expect(getMiningActionPath([])).toBe("/library");
    expect(getMiningActionPath([mockBook])).toBe("/library/b1");
    expect(getMiningActionPath([{ ...mockBook, id: "m1", type: "manga", format: "cbz" }])).toBe(
      "/manga/m1",
    );
  });

  it("merender progres langkah awal dan menghormati penutupan di localStorage", () => {
    const html = renderToString(
      <FirstRunChecklist
        activeDictCount={0}
        booksCount={1}
        minedCardsCount={0}
        reviewedCount={0}
        onOpenDictManager={noop}
        onAddBook={noop}
        onStartMining={noop}
        onStartReview={noop}
      />,
    );
    expect(html).toContain('aria-label="1 dari 4 langkah awal selesai"');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain("Pasang kamus Yomitan");
    expect(html).toContain("frc-step--done");

    localStorage.setItem(FIRST_RUN_DISMISSED_KEY, "1");
    const dismissedHtml = renderToString(
      <FirstRunChecklist
        activeDictCount={0}
        booksCount={0}
        minedCardsCount={0}
        reviewedCount={0}
        onOpenDictManager={noop}
        onAddBook={noop}
        onStartMining={noop}
        onStartReview={noop}
      />,
    );
    expect(dismissedHtml).toBe("");
  });

  it("menampilkan hanko 済 satu kali saat semua langkah selesai lalu menutup pada kunjungan berikut", () => {
    const doneHtml = renderToString(
      <FirstRunChecklist
        activeDictCount={1}
        booksCount={1}
        minedCardsCount={2}
        reviewedCount={3}
        onOpenDictManager={noop}
        onAddBook={noop}
        onStartMining={noop}
        onStartReview={noop}
      />,
    );
    expect(doneHtml).toContain("Orientasi awal selesai");
    expect(doneHtml).toContain(">済<");

    localStorage.setItem(FIRST_RUN_COMPLETED_SHOWN_KEY, "1");
    const collapsedHtml = renderToString(
      <FirstRunChecklist
        activeDictCount={1}
        booksCount={1}
        minedCardsCount={2}
        reviewedCount={3}
        onOpenDictManager={noop}
        onAddBook={noop}
        onStartMining={noop}
        onStartReview={noop}
      />,
    );
    expect(collapsedHtml).toBe("");
  });

  it("tetap aman bila akses localStorage melempar galat", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    const html = renderToString(
      <FirstRunChecklist
        activeDictCount={0}
        booksCount={0}
        minedCardsCount={0}
        reviewedCount={0}
        onOpenDictManager={noop}
        onAddBook={noop}
        onStartMining={noop}
        onStartReview={noop}
      />,
    );
    expect(html).toContain('aria-label="0 dari 4 langkah awal selesai"');
    expect(html).toContain('aria-valuenow="0"');
  });
});
