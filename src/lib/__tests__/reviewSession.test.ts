import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Rating, type FsrsGrade } from "../../lib/fsrsScheduler";
import {
  classifyReviewKeyEvent,
  computeSessionProgress,
  countUniqueReviewedCards,
  formatReviewInterval,
  getGradeButtonHint,
  removeDrillCardByKey,
  type ReviewSessionCard,
  type ReviewUndoItem,
} from "../reviewSession";
import { ReviewGradeButtons } from "../../pages/Review";

function card(id: string, extra: Partial<ReviewSessionCard> = {}): ReviewSessionCard {
  return {
    id,
    deckId: "deck-1",
    word: `語-${id}`,
    reading: `ご-${id}`,
    meaning: `arti ${id}`,
    sentence: "",
    translation: "",
    ...extra,
  };
}

describe("Bug 3 — Penghapusan item drill saat Undo setelah Pelajari lebih", () => {
  it("Undo kartu 'Lupa' sesudah 'Pelajari lebih +5' hanya menghapus salinan drill terkait dan mempertahankan seluruh 5 kartu baru", () => {
    const c1 = card("c1");
    let queue: ReviewSessionCard[] = [c1];

    // 1. Nilai c1 "Lupa" (q = 0) -> salinan drill dengan drillKey ditambahkan ke antrean
    const drillKey = "drill-1-deck-1-c1";
    queue = [...queue, { ...c1, isDrill: true, drillKey }];
    expect(queue.map((x) => `${x.id}${x.isDrill ? ":drill" : ""}`)).toEqual([
      "c1",
      "c1:drill",
    ]);

    // 2. Selesaikan drill -> masuk layar selesai, lalu klik "Pelajari lebih +5"
    const extra5 = ["n1", "n2", "n3", "n4", "n5"].map((id) => card(id));
    queue = [...queue, ...extra5];
    expect(queue).toHaveLength(7);

    // 3. Undo penilaian "Lupa" c1 (meski extra5 ada di akhir antrean!)
    queue = removeDrillCardByKey(queue, drillKey);

    expect(queue.map((x) => x.id)).toEqual(["c1", "n1", "n2", "n3", "n4", "n5"]);
    expect(queue.some((x) => x.isDrill)).toBe(false);
    // Semua 5 kartu baru tetap utuh (bug lama slice(0, -1) akan membuang n5)
    expect(queue.slice(1).map((x) => x.id)).toEqual(["n1", "n2", "n3", "n4", "n5"]);
  });

  it("jika drillKey tidak ditemukan di antrean atau kosong, antrean tidak berubah sama sekali", () => {
    const queue: ReviewSessionCard[] = [card("c1"), card("n1"), card("n2")];
    expect(removeDrillCardByKey(queue, "drill-tidak-ada")).toEqual(queue);
    expect(removeDrillCardByKey(queue, undefined)).toEqual(queue);
  });
});

describe("Bug 4 — Poles sesi review: pintasan keyboard, label drill, hitungan unik, progres antrean", () => {
  it("1. mengabaikan ctrlKey, metaKey, altKey untuk angka 1–4 dan R, mengabaikan e.repeat untuk penilaian, serta mempertahankan Ctrl/Cmd+Z undo", () => {
    const base = {
      shiftKey: false,
      repeat: false,
      isComposing: false,
      hasCard: true,
      showAnswer: true,
      inEditableTarget: false,
    };

    // Ctrl+1..4 & Alt+1..4 & Cmd+1..4 -> diabaikan (tidak menilai kartu saat berpindah tab)
    expect(classifyReviewKeyEvent({ ...base, key: "1", ctrlKey: true, metaKey: false, altKey: false })).toEqual({ type: "none" });
    expect(classifyReviewKeyEvent({ ...base, key: "2", ctrlKey: false, metaKey: true, altKey: false })).toEqual({ type: "none" });
    expect(classifyReviewKeyEvent({ ...base, key: "3", ctrlKey: false, metaKey: false, altKey: true })).toEqual({ type: "none" });

    // Ctrl+R & Cmd+R & Alt+R -> diabaikan (tidak memutar audio saat reload)
    expect(classifyReviewKeyEvent({ ...base, key: "r", ctrlKey: true, metaKey: false, altKey: false })).toEqual({ type: "none" });
    expect(classifyReviewKeyEvent({ ...base, key: "R", ctrlKey: false, metaKey: true, altKey: false })).toEqual({ type: "none" });
    expect(classifyReviewKeyEvent({ ...base, key: "r", ctrlKey: false, metaKey: false, altKey: true })).toEqual({ type: "none" });

    // e.repeat pada tombol penilaian 1..4 -> diabaikan agar menahan tombol tidak menilai beruntun
    expect(classifyReviewKeyEvent({ ...base, key: "4", repeat: true, ctrlKey: false, metaKey: false, altKey: false })).toEqual({ type: "none" });

    // Tanpa modifier & tidak repeat -> berfungsi normal
    expect(classifyReviewKeyEvent({ ...base, key: "1", ctrlKey: false, metaKey: false, altKey: false })).toEqual({ type: "grade", gradeIndex: 0 });
    expect(classifyReviewKeyEvent({ ...base, key: "4", ctrlKey: false, metaKey: false, altKey: false })).toEqual({ type: "grade", gradeIndex: 3 });
    expect(classifyReviewKeyEvent({ ...base, key: "r", ctrlKey: false, metaKey: false, altKey: false })).toEqual({ type: "play-word" });
    expect(classifyReviewKeyEvent({ ...base, showAnswer: false, key: " ", ctrlKey: false, metaKey: false, altKey: false })).toEqual({ type: "reveal" });

    // Ctrl+Z dan Cmd+Z undo tetap aktif
    expect(classifyReviewKeyEvent({ ...base, hasCard: false, key: "z", ctrlKey: true, metaKey: false, altKey: false })).toEqual({ type: "undo" });
    expect(classifyReviewKeyEvent({ ...base, key: "Z", ctrlKey: false, metaKey: true, altKey: false })).toEqual({ type: "undo" });
  });

  it("2. tombol penilaian pada kartu drill menampilkan teks Ulangi tanpa pratinjau interval FSRS", () => {
    const intervals: Record<FsrsGrade, number> = {
      [Rating.Again]: 1,
      [Rating.Hard]: 3,
      [Rating.Good]: 6,
      [Rating.Easy]: 12,
    };

    expect(getGradeButtonHint(0, false, intervals)).toBe("Ulangi lagi");
    expect(getGradeButtonHint(4, false, intervals)).toBe(formatReviewInterval(6));
    expect(getGradeButtonHint(0, true, intervals)).toBe("Ulangi lagi");
    expect(getGradeButtonHint(2, true, intervals)).toBe("Ulangi");
    expect(getGradeButtonHint(4, true, intervals)).toBe("Ulangi");
    expect(getGradeButtonHint(5, true, intervals)).toBe("Ulangi");

    const htmlNormal = renderToString(
      React.createElement(ReviewGradeButtons, {
        isDrill: false,
        intervals,
        onGrade: () => {},
      }),
    );
    expect(htmlNormal).toContain("6 hari");

    const htmlDrill = renderToString(
      React.createElement(ReviewGradeButtons, {
        isDrill: true,
        intervals,
        onGrade: () => {},
      }),
    );
    expect(htmlDrill).not.toContain("hari");
    expect(htmlDrill).not.toContain("bln");
    expect(htmlDrill).not.toContain("thn");
    expect(htmlDrill).toContain("Ulangi");
  });

  it("3. hitungan kartu selesai pada akhir sesi menghitung kartu unik, bukan pengulangan drill", () => {
    const history: Pick<ReviewUndoItem, "cardId" | "deckId" | "wasDrill">[] = [
      { cardId: "c1", deckId: "d1", wasDrill: false }, // Lupa c1
      { cardId: "c2", deckId: "d1", wasDrill: false }, // Baik c2
      { cardId: "c1", deckId: "d1", wasDrill: true },  // Drill c1 -> Baik
      { cardId: "c1", deckId: "d1", wasDrill: true },  // Jika diulang 2x
    ];
    expect(countUniqueReviewedCards(history, "d1")).toBe(2);
    expect(countUniqueReviewedCards(history.slice(0, 1), "d1")).toBe(1);
    expect(countUniqueReviewedCards([], "d1")).toBe(0);
  });

  it("4. bilah progres dan penghitung x / y tidak mundur atau mengubah penyebut saat salinan drill ditambahkan", () => {
    const c1 = card("c1");
    const c2 = card("c2");
    const c3 = card("c3");

    // Awal sesi: 3 kartu asli
    const q0 = [c1, c2, c3];
    const p0 = computeSessionProgress(q0, 0);
    expect(p0).toEqual({ totalBase: 3, currentStep: 1, progressPct: 0, remainingDrills: 0 });

    // User menekan "Lupa" pada c1 -> c1_drill ditambahkan ke belakang antrean, lanjut ke pos=1 (c2)
    const q1 = [c1, c2, c3, { ...c1, isDrill: true, drillKey: "drill-1" }];
    const p1 = computeSessionProgress(q1, 1);
    expect(p1.totalBase).toBe(3); // Penyebut tetap 3, bukan 4
    expect(p1.currentStep).toBe(2);
    expect(p1.progressPct).toBeGreaterThan(p0.progressPct); // Maju 1/3 (~33.3%), tidak mengecil ke 1/4 (25%)
    expect(p1.progressPct).toBeCloseTo((1 / 3) * 100);
    expect(p1.remainingDrills).toBe(1);

    // Lanjut ke pos=2 (c3)
    const p2 = computeSessionProgress(q1, 2);
    expect(p2.totalBase).toBe(3);
    expect(p2.currentStep).toBe(3);
    expect(p2.progressPct).toBeCloseTo((2 / 3) * 100);
    expect(p2.remainingDrills).toBe(1);

    // Lanjut ke pos=3 (c1_drill) -> tidak menampilkan 4 / 3, progres tetap >= p2
    const p3 = computeSessionProgress(q1, 3);
    expect(p3.totalBase).toBe(3);
    expect(p3.currentStep).toBe(3);
    expect(p3.progressPct).toBe(100);
    expect(p3.remainingDrills).toBe(1);
  });
});
