import { describe, expect, it } from "vitest";
import {
  getRouterBasename,
  normalizeBasePath,
  resolveBaseAssetHref,
} from "../basePath";
import { buildTesseractAssetUrls } from "../ocr/tesseractProvider";

describe("Konfigurasi Base Path & URL Aset OCR", () => {
  it("menormalisasi variasi base path ('', '/', '/GoRaku', '/GoRaku/', 'GoRaku')", () => {
    expect(normalizeBasePath("")).toBe("/");
    expect(normalizeBasePath("/")).toBe("/");
    expect(normalizeBasePath("/GoRaku")).toBe("/GoRaku/");
    expect(normalizeBasePath("/GoRaku/")).toBe("/GoRaku/");
    expect(normalizeBasePath("GoRaku")).toBe("/GoRaku/");
    expect(normalizeBasePath(undefined)).toBe("/");
    expect(normalizeBasePath(null)).toBe("/");
    expect(normalizeBasePath("///GoRaku///")).toBe("/GoRaku/");
  });

  it("menghasilkan basename router yang tepat untuk root dan subpath", () => {
    expect(getRouterBasename("/")).toBe("");
    expect(getRouterBasename("")).toBe("");
    expect(getRouterBasename("/GoRaku/")).toBe("/GoRaku");
    expect(getRouterBasename("GoRaku")).toBe("/GoRaku");
  });

  it("menggabungkan path aset publik seperti favicon dengan base path", () => {
    expect(resolveBaseAssetHref("/favicon.svg", "/")).toBe("/favicon.svg");
    expect(resolveBaseAssetHref("favicon.svg", "/")).toBe("/favicon.svg");
    expect(resolveBaseAssetHref("/favicon.svg", "/GoRaku/")).toBe(
      "/GoRaku/favicon.svg",
    );
    expect(resolveBaseAssetHref("favicon.svg", "GoRaku")).toBe(
      "/GoRaku/favicon.svg",
    );
    expect(
      resolveBaseAssetHref("https://example.com/icon.svg", "/GoRaku/"),
    ).toBe("https://example.com/icon.svg");
  });

  it("membangun URL aset OCR Tesseract yang tepat untuk base '/' dan '/GoRaku/'", () => {
    const rootUrls = buildTesseractAssetUrls(
      "best",
      "/",
      "https://example.github.io",
    );
    expect(rootUrls).toEqual({
      workerPath: "https://example.github.io/tesseract/worker.min.js",
      corePath: "https://example.github.io/tesseract",
      langPath: "https://example.github.io/tesseract/lang-data/best",
    });

    const subpathUrls = buildTesseractAssetUrls(
      "best",
      "/GoRaku/",
      "https://example.github.io",
    );
    expect(subpathUrls).toEqual({
      workerPath: "https://example.github.io/GoRaku/tesseract/worker.min.js",
      corePath: "https://example.github.io/GoRaku/tesseract",
      langPath: "https://example.github.io/GoRaku/tesseract/lang-data/best",
    });

    const fastSubpathUrls = buildTesseractAssetUrls(
      "fast",
      "GoRaku",
      "https://example.github.io",
    );
    expect(fastSubpathUrls.langPath).toBe(
      "https://example.github.io/GoRaku/tesseract/lang-data/fast",
    );
  });
});
