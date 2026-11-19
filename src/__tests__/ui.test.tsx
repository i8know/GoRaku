import React from "react";
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { DyeTile, Hanko } from "../ui";
import { deckTileGlyph } from "../lib/dye";

describe("Komponen DyeTile & Hanko (ui.tsx)", () => {
  it("merender glif yang diberikan di dalam ubin celupan", () => {
    const html = renderToString(<DyeTile glyph="語" step={3} size={44} />);
    expect(html).toContain("dye-tile dye-3");
    expect(html).toContain(">語<");
  });

  it("jatuh kembali ke karakter pertama judul saat deck.kanji kosong", () => {
    const glyph = deckTileGlyph("", "Kosakata N5");
    expect(glyph).toBe("K");
    const html = renderToString(
      <DyeTile glyph="" fallbackTitle="Kosakata N5" step={1} size={38} />,
    );
    expect(html).toContain(">K<");
  });

  it("merender Hanko secara dekoratif (aria-hidden) tanpa label dan role='img' saat label diberikan", () => {
    const deco = renderToString(<Hanko char="済" size={44} />);
    expect(deco).toContain('aria-hidden="true"');
    expect(deco).not.toContain('role="img"');

    const labeled = renderToString(<Hanko char="済" size={44} label="Deck tuntas 100%" />);
    expect(labeled).toContain('role="img"');
    expect(labeled).toContain('aria-label="Deck tuntas 100%"');
    expect(labeled).not.toContain('aria-hidden');
  });
});
