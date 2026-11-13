import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = path.resolve(outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : "docs/redesign/before");
const urlIdx = args.indexOf("--url");
const BASE_URL = urlIdx !== -1 && args[urlIdx + 1] ? args[urlIdx + 1] : "http://127.0.0.1:8443";

mkdirSync(outDir, { recursive: true });

async function isServerUp(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isServerUp(BASE_URL)) return null;
  const proc = spawn("node", ["node_modules/vite/bin/vite.js", "--port", "8443", "--strictPort"], {
    stdio: "ignore",
    detached: false,
  });
  for (let i = 0; i < 40; i++) {
    if (await isServerUp(BASE_URL)) return proc;
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill();
  throw new Error(`Vite server failed to start at ${BASE_URL}`);
}

async function prepareData(page) {
  // Public routes first
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "akira@immersion.jp");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/beranda", { timeout: 10000 });
  await page.waitForTimeout(500);

  // Get first deck ID from /deck
  await page.goto(`${BASE_URL}/deck`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const deckId = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href^="/deck/"]'));
    for (const a of links) {
      const m = a.getAttribute("href")?.match(/^\/deck\/([^/]+)$/);
      if (m) return m[1];
    }
    return null;
  });

  // Ensure sample novel & manga exist in /library
  await page.goto(`${BASE_URL}/library`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const hasNovel = await page.locator('a[href^="/library/"], [data-book-kind="novel"]').count();
  if (hasNovel === 0) {
    const novelBtn = page.getByRole("button", { name: /Novel Contoh/i }).first();
    if (await novelBtn.isVisible().catch(() => false)) {
      await novelBtn.click();
      await page.waitForTimeout(800);
    }
  }

  const hasManga = await page.locator('a[href^="/manga/"]').count();
  if (hasManga === 0) {
    const mangaBtn = page.getByRole("button", { name: /Manga Contoh/i }).first();
    if (await mangaBtn.isVisible().catch(() => false)) {
      await mangaBtn.click();
      await page.waitForTimeout(1200);
    }
  }

  // Extract bookId & mangaId from links or IndexedDB
  await page.goto(`${BASE_URL}/library`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const ids = await page.evaluate(async () => {
    let novelId = null;
    let mangaId = null;
    for (const a of document.querySelectorAll('a[href^="/library/"]')) {
      const m = a.getAttribute("href")?.match(/^\/library\/([^/]+)$/);
      if (m) { novelId = m[1]; break; }
    }
    for (const a of document.querySelectorAll('a[href^="/manga/"]')) {
      const m = a.getAttribute("href")?.match(/^\/manga\/([^/]+)$/);
      if (m) { mangaId = m[1]; break; }
    }
    return { novelId, mangaId };
  });

  // Fallback: if Library cards use onClick navigate instead of <a>, query IndexedDB
  let finalNovelId = ids.novelId;
  let finalMangaId = ids.mangaId;
  let finalDeckId = deckId;

  if (!finalNovelId || !finalMangaId || !finalDeckId) {
    const dbIds = await page.evaluate(async () => {
      const openDb = (name) =>
        new Promise((resolve) => {
          const req = indexedDB.open(name);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
      const readAll = (db, storeName) =>
        new Promise((resolve) => {
          if (!db || !db.objectStoreNames.contains(storeName)) return resolve([]);
          const tx = db.transaction(storeName, "readonly");
          const req = tx.objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

      const lexDb = await openDb("goraku-lexicon");
      const books = await readAll(lexDb, "books");
      const novel = books.find((b) => b.format !== "cbz" && b.kind !== "manga");
      const manga = books.find((b) => b.format === "cbz" || b.kind === "manga");

      let deck = null;
      const storeRaw = localStorage.getItem("goraku-app-store");
      if (storeRaw) {
        try {
          const parsed = JSON.parse(storeRaw);
          deck = parsed?.state?.decks?.[0]?.id ?? null;
        } catch {}
      }
      return { novelId: novel?.id ?? null, mangaId: manga?.id ?? null, deckId: deck };
    });
    finalNovelId = finalNovelId || dbIds.novelId;
    finalMangaId = finalMangaId || dbIds.mangaId;
    finalDeckId = finalDeckId || dbIds.deckId;
  }

  return {
    deckId: finalDeckId || "n5",
    novelId: finalNovelId || "sample-novel",
    mangaId: finalMangaId || "sample-manga",
  };
}

async function captureViewport(browser, label, contextOptions) {
  const ctx = await browser.newContext(contextOptions);
  const page = await ctx.newPage();

  const publicRoutes = [
    ["01-landing", "/"],
    ["02-login", "/login"],
  ];

  const report = [];
  for (const [slug, route] of publicRoutes) {
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 15000 });
    } catch {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    }
    await page.waitForTimeout(450);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.screenshot({ path: path.join(outDir, `${label}__${slug}.png`), fullPage: false });
    report.push({ label, slug, route, overflow });
  }

  const ids = await prepareData(page);
  const protectedRoutes = [
    ["03-beranda", "/beranda"],
    ["04-deck", "/deck"],
    ["05-deck-detail", `/deck/${ids.deckId}`],
    ["06-review", `/deck/${ids.deckId}/review`],
    ["07-mining", "/mining"],
    ["08-library", "/library"],
    ["09-reader", `/library/${ids.novelId}`],
    ["10-manga", `/manga/${ids.mangaId}`],
    ["11-progress", "/progress"],
    ["12-exam", "/exam"],
    ["13-license", "/license"],
    ["14-profile", "/profile"],
    ["15-settings", "/settings"],
  ];

  for (const [slug, route] of protectedRoutes) {
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 15000 });
    } catch {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    }
    await page.waitForTimeout(450);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.screenshot({ path: path.join(outDir, `${label}__${slug}.png`), fullPage: false });
    report.push({ label, slug, route, overflow });
  }

  await ctx.close();
  return { report, ids };
}

const serverProc = await ensureServer();
const browser = await chromium.launch();

try {
  const desktopOpts = { viewport: { width: 1440, height: 900 } };
  const iphoneOpts = { ...devices["iPhone 14"] };

  const d = await captureViewport(browser, "desktop", desktopOpts);
  const m = await captureViewport(browser, "iphone14", iphoneOpts);
  const results = [...d.report, ...m.report];

  const overflows = results.filter((r) => r.overflow);
  console.log(`Captured ${results.length} screenshots in ${outDir}`);
  console.log(`IDs used: deck=${d.ids.deckId}, novel=${d.ids.novelId}, manga=${d.ids.mangaId}`);
  if (overflows.length > 0) {
    console.log("Horizontal overflow detected on:");
    for (const o of overflows) console.log(`  - ${o.label} ${o.route}`);
  } else {
    console.log("No horizontal overflow detected.");
  }
} finally {
  await browser.close();
  if (serverProc) serverProc.kill();
}
