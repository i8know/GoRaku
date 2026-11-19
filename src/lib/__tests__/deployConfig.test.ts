import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRouterBasename,
  normalizeBasePath,
  resolveBaseAssetHref,
} from "../basePath";
import {
  buildTesseractAssetUrls,
  OCR_ASSET_LOAD_ERROR_MESSAGE,
  TesseractProvider,
} from "../ocr/tesseractProvider";
import { useToastStore } from "../../store/useToastStore";
// @ts-expect-error modul ESM alat build
import { inspectLfsAndBinaryAssets } from "../../../tools/checkLfsAssets.mjs";

describe("Konfigurasi Base Path & URL Aset OCR", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useToastStore.setState({ toasts: [] });
  });

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

  it("memvalidasi skrip checkLfsAssets dengan direktori sementara (pointer LFS palsu, header WASM & GZIP valid)", () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "goraku-lfs-test-"));
    try {
      const validDir = path.join(tmpRoot, "valid", "tesseract", "lang-data");
      fs.mkdirSync(validDir, { recursive: true });

      // Header WASM valid: 00 61 73 6d 01 00 00 00
      fs.writeFileSync(
        path.join(tmpRoot, "valid", "tesseract", "tesseract-core-lstm.wasm"),
        Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]),
      );
      // Header GZIP valid: 1f 8b 08 00
      fs.writeFileSync(
        path.join(validDir, "jpn_vert.traineddata.gz"),
        Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]),
      );

      const okRes = inspectLfsAndBinaryAssets({
        rootDir: tmpRoot,
        dirs: [path.join(tmpRoot, "valid")],
      });
      expect(okRes.ok).toBe(true);
      expect(okRes.errors).toHaveLength(0);
      expect(okRes.scannedCount).toBe(2);

      // Tambahkan pointer Git LFS palsu dan berkas WASM/GZIP rusak
      const brokenDir = path.join(tmpRoot, "broken", "tesseract");
      fs.mkdirSync(brokenDir, { recursive: true });
      fs.writeFileSync(
        path.join(brokenDir, "pointer.wasm"),
        "version https://git-lfs.github.com/spec/v1\noid sha256:123456\nsize 2855361\n",
        "utf8",
      );
      fs.writeFileSync(
        path.join(brokenDir, "bad-magic.wasm"),
        Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
      );
      fs.writeFileSync(
        path.join(brokenDir, "bad-gzip.traineddata.gz"),
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      );

      const failRes = inspectLfsAndBinaryAssets({
        rootDir: tmpRoot,
        dirs: [path.join(tmpRoot, "broken")],
      });
      expect(failRes.ok).toBe(false);
      expect(failRes.errors).toHaveLength(3);
      expect(
        failRes.errors.some((e: { reason: string }) =>
          e.reason.includes("Git LFS"),
        ),
      ).toBe(true);
      expect(
        failRes.errors.some((e: { reason: string }) =>
          e.reason.includes("00 61 73 6d"),
        ),
      ).toBe(true);
      expect(
        failRes.errors.some((e: { reason: string }) =>
          e.reason.includes("1f 8b"),
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("menampilkan toast dan pesan galat yang jelas jika aset OCR berupa pointer Git LFS atau gagal dimuat", async () => {
    const pointerText =
      "version https://git-lfs.github.com/spec/v1\noid sha256:deadbeef\nsize 2022755\n";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(pointerText, { status: 200 }),
    );

    const provider = new TesseractProvider();
    const dummyImage = new Blob(["fake"], { type: "image/png" });

    await expect(provider.recognize(dummyImage)).rejects.toThrow(
      OCR_ASSET_LOAD_ERROR_MESSAGE,
    );

    const toasts = useToastStore.getState().toasts;
    expect(
      toasts.some((t) => t.message === OCR_ASSET_LOAD_ERROR_MESSAGE),
    ).toBe(true);
  });
});
