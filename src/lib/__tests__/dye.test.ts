import { describe, expect, it } from "vitest";
import { dyeStep, jlptDyeStep, titleDyeStep } from "../dye";
import { forecastKanji, formatKanjiDate } from "../deckStats";

describe("Skala celupan indigo Aizome v2 (dye.ts)", () => {
  it("memetakan rentang persentase 0-100 ke langkah celupan 0-4 dan menjepit nilai di luar rentang", () => {
    expect(dyeStep(-25)).toBe(0);
    expect(dyeStep(Number.NaN)).toBe(0);
    expect(dyeStep(0)).toBe(0);
    expect(dyeStep(19.9)).toBe(0);

    expect(dyeStep(20)).toBe(1);
    expect(dyeStep(39.9)).toBe(1);

    expect(dyeStep(40)).toBe(2);
    expect(dyeStep(59.9)).toBe(2);

    expect(dyeStep(60)).toBe(3);
    expect(dyeStep(79.9)).toBe(3);

    expect(dyeStep(80)).toBe(4);
    expect(dyeStep(100)).toBe(4);
    expect(dyeStep(140)).toBe(4);
  });

  it("memetakan level JLPT N5-N1 secara monoton ke langkah 0-4", () => {
    expect(jlptDyeStep("N5")).toBe(0);
    expect(jlptDyeStep("N4")).toBe(1);
    expect(jlptDyeStep("N3")).toBe(2);
    expect(jlptDyeStep("N2")).toBe(3);
    expect(jlptDyeStep("N1")).toBe(4);

    // Mendukung string deskriptif deck
    expect(jlptDyeStep("JLPT N5 • Dasar")).toBe(0);
    expect(jlptDyeStep("JLPT N1 • Mahir")).toBe(4);
  });

  it("titleDyeStep menghasilkan langkah 0-4 yang stabil untuk judul yang sama", () => {
    const stepA1 = titleDyeStep("吾輩は猫である");
    const stepA2 = titleDyeStep("吾輩は猫である");
    expect(stepA1).toBe(stepA2);
    expect(stepA1).toBeGreaterThanOrEqual(0);
    expect(stepA1).toBeLessThanOrEqual(4);
  });

  it("forecastKanji dan formatKanjiDate menghasilkan label kanji hari dalam seminggu yang akurat", () => {
    const sunNoon = new Date(2026, 10, 15, 12, 0, 0);
    expect(forecastKanji(7, sunNoon, 4)).toEqual(["日", "月", "火", "水", "木", "金", "土"]);
    expect(formatKanjiDate(sunNoon)).toBe("十一月十五日・日");
  });
});
