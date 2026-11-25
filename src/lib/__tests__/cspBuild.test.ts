import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { injectSupabaseConnectSrc, resolveSupabaseOrigin } from "../csp";

const execFileAsync = promisify(execFile);

function extractCspContent(html: string): string {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (
      !/\bhttp-equiv\s*=\s*(?:"Content-Security-Policy"|'Content-Security-Policy')/i.test(
        tag,
      )
    ) {
      continue;
    }
    const contentMatch = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (contentMatch) {
      return contentMatch[1] ?? contentMatch[2] ?? "";
    }
  }
  throw new Error("Meta Content-Security-Policy tidak ditemukan di HTML.");
}

function extractConnectSrcTokens(csp: string): string[] {
  const match = csp.match(/(?:^|;)\s*connect-src\s+([^;]+)/i);
  if (!match) {
    throw new Error("Direktif connect-src tidak ditemukan di CSP.");
  }
  return match[1].trim().split(/\s+/);
}

describe("Task 6 — Strict CSP Build & Injeksi Origin Supabase", () => {
  it("memvalidasi dan menyuntikkan hanya origin Supabase persis tanpa wildcard maupun duplikat", () => {
    const sampleHtml = fs.readFileSync(
      path.resolve(process.cwd(), "index.html"),
      "utf8",
    );

    expect(resolveSupabaseOrigin("")).toBeNull();
    expect(resolveSupabaseOrigin("https://*.supabase.co")).toBeNull();
    expect(resolveSupabaseOrigin("javascript:alert(1)")).toBeNull();
    expect(resolveSupabaseOrigin("https://demo.supabase.co/auth/v1")).toBe(
      "https://demo.supabase.co",
    );

    // Tanpa env & tanpa flag dev -> HTML tidak berubah dan tanpa ws:/wss:
    expect(injectSupabaseConnectSrc(sampleHtml, "")).toBe(sampleHtml);
    expect(extractConnectSrcTokens(extractCspContent(sampleHtml))).toEqual([
      "'self'",
      "blob:",
      "data:",
    ]);

    // Mode dev -> menambahkan ws: dan wss: hanya untuk Vite HMR
    const devInjected = injectSupabaseConnectSrc(
      sampleHtml,
      "https://projek123.supabase.co/rest/v1",
      { allowDevWebSockets: true },
    );
    expect(extractConnectSrcTokens(extractCspContent(devInjected))).toEqual([
      "'self'",
      "blob:",
      "data:",
      "ws:",
      "wss:",
      "https://projek123.supabase.co",
    ]);

    // Mode produksi dengan env -> tepat menyuntikkan origin tanpa wildcard dan tanpa ws:/wss:
    const injected = injectSupabaseConnectSrc(
      sampleHtml,
      "https://projek123.supabase.co/rest/v1",
    );
    const tokens = extractConnectSrcTokens(extractCspContent(injected));
    expect(tokens).toEqual([
      "'self'",
      "blob:",
      "data:",
      "https://projek123.supabase.co",
    ]);
    expect(tokens.some((t) => t.includes("*.supabase.co"))).toBe(false);
    expect(tokens.some((t) => t === "ws:" || t === "wss:" || t.startsWith("wss://"))).toBe(false);

    // Idempoten bila dipanggil dua kali
    expect(
      injectSupabaseConnectSrc(injected, "https://projek123.supabase.co"),
    ).toBe(injected);
  });

  it("membangun dist terpisah tanpa VITE_SUPABASE_URL dan dengan VITE_SUPABASE_URL secara persis", async () => {
    const rootDir = process.cwd();
    const viteBin = path.resolve(rootDir, "node_modules/vite/bin/vite.js");
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "goraku-csp-test-"));
    const outWithoutEnv = path.join(tmpBase, "without-env");
    const outWithEnv = path.join(tmpBase, "with-env");

    try {
      // 1. Build tanpa VITE_SUPABASE_URL
      await execFileAsync(
        process.execPath,
        [viteBin, "build", "--outDir", outWithoutEnv],
        {
          cwd: rootDir,
          env: {
            ...process.env,
            VITE_SUPABASE_URL: "",
            VITE_SUPABASE_PUBLISHABLE_KEY: "",
          },
        },
      );

      const htmlWithout = fs.readFileSync(
        path.join(outWithoutEnv, "index.html"),
        "utf8",
      );
      const tokensWithout = extractConnectSrcTokens(extractCspContent(htmlWithout));
      expect(tokensWithout).toEqual(["'self'", "blob:", "data:"]);

      // 2. Build dengan VITE_SUPABASE_URL terpasang
      await execFileAsync(
        process.execPath,
        [viteBin, "build", "--outDir", outWithEnv],
        {
          cwd: rootDir,
          env: {
            ...process.env,
            VITE_SUPABASE_URL: "https://ujicobagoraku.supabase.co",
            VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ujicoba_b1",
          },
        },
      );

      const htmlWith = fs.readFileSync(
        path.join(outWithEnv, "index.html"),
        "utf8",
      );
      const tokensWith = extractConnectSrcTokens(extractCspContent(htmlWith));
      expect(tokensWith).toEqual([
        "'self'",
        "blob:",
        "data:",
        "https://ujicobagoraku.supabase.co",
      ]);
      expect(tokensWith).not.toContain("ws:");
      expect(tokensWith).not.toContain("wss:");
      expect(tokensWith.some((t) => t.includes("*.supabase.co"))).toBe(false);
    } finally {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  }, 30_000);
});
