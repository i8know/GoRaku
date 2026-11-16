import { describe, expect, it } from "vitest";
import {
  removeDrillCardByKey,
  type ReviewSessionCard,
} from "../reviewSession";

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
