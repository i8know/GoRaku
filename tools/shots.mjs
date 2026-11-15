import { chromium } from "playwright";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

function resolveChromiumLaunchOptions() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return {};
  const msPlaywright = path.join(localAppData, "ms-playwright");
  if (!existsSync(msPlaywright)) return {};
  try {
    const dirs = readdirSync(msPlaywright);
    for (const d of dirs) {
      if (d.startsWith("chromium_headless_shell-")) {
        const candidate = path.join(
          msPlaywright,
          d,
          "chrome-headless-shell-win64",
          "chrome-headless-shell.exe",
        );
        if (existsSync(candidate)) return { executablePath: candidate };
      }
      if (d.startsWith("chromium-")) {
        const candidate = path.join(msPlaywright, d, "chrome-win64", "chrome.exe");
        if (existsSync(candidate)) return { executablePath: candidate };
      }
    }
  } catch {
    // ignore
  }
  return {};
}

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = path.resolve(
  outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : "docs/aizome-v2/before",
);
const jsonIdx = args.indexOf("--report");
const reportPath =
  jsonIdx !== -1 && args[jsonIdx + 1] ? path.resolve(args[jsonIdx + 1]) : null;
const urlIdx = args.indexOf("--url");
const BASE_URL =
  urlIdx !== -1 && args[urlIdx + 1] ? args[urlIdx + 1] : "http://127.0.0.1:8443";

mkdirSync(outDir, { recursive: true });

const WIDTHS = [1440, 1024, 768, 390, 320];

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
  const proc = spawn(
    "node",
    ["node_modules/vite/bin/vite.js", "--port", "8443", "--strictPort"],
    {
      stdio: "ignore",
      detached: false,
    },
  );
  for (let i = 0; i < 40; i++) {
    if (await isServerUp(BASE_URL)) return proc;
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill();
  throw new Error(`Vite server failed to start at ${BASE_URL}`);
}

async function prepareSession(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "akira@immersion.jp");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/beranda", { timeout: 10000 });
  await page.waitForTimeout(450);

  await page.goto(`${BASE_URL}/deck`, { waitUntil: "networkidle" });
  await page.waitForTimeout(450);

  const deckId = await page.evaluate(() => {
    const raw = localStorage.getItem("japanese-learning-storage");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const decks = parsed?.state?.decks ?? [];
        const leaf = decks.find(
          (d) => !decks.some((other) => other.parentId === d.id) && d.total > 0,
        );
        if (leaf) return leaf.id;
        if (decks[0]) return decks[0].id;
      } catch {
        // ignore
      }
    }
    return "1";
  });

  return { deckId };
}

async function navigateToReviewComplete(page, deckId) {
  // Set newIntroduced so only 1 new card is left today for deckId, then grade that 1 card
  await page.evaluate((targetDeckId) => {
    const learnRaw = localStorage.getItem("japanese-learning-storage");
    let limit = 15;
    let dayStartHour = 4;
    if (learnRaw) {
      try {
        const parsed = JSON.parse(learnRaw);
        limit = parsed?.state?.settings?.newCards ?? 15;
        dayStartHour = parsed?.state?.settings?.dayStartHour ?? 4;
      } catch {
        // ignore
      }
    }
    const shifted = new Date(Date.now() - dayStartHour * 3600_000);
    const y = shifted.getFullYear();
    const m = String(shifted.getMonth() + 1).padStart(2, "0");
    const d = String(shifted.getDate()).padStart(2, "0");
    const dayKey = `${y}-${m}-${d}`;

    const revRaw = localStorage.getItem("japanese-review-storage");
    const revObj = revRaw
      ? JSON.parse(revRaw)
      : { state: { srsCards: {}, newIntroduced: {}, activity: {} }, version: 1 };
    revObj.state = revObj.state || { srsCards: {}, newIntroduced: {}, activity: {} };
    revObj.state.srsCards = revObj.state.srsCards || {};
    delete revObj.state.srsCards[targetDeckId];
    revObj.state.newIntroduced = {
      ...(revObj.state.newIntroduced || {}),
      [targetDeckId]: { date: dayKey, count: Math.max(0, limit - 1) },
    };
    localStorage.setItem("japanese-review-storage", JSON.stringify(revObj));
  }, deckId);

  await page.goto(`${BASE_URL}/deck/${deckId}/review`, {
    waitUntil: "networkidle",
    timeout: 15000,
  });
  await page.waitForTimeout(500);

  // Reveal answer and grade "Baik" (key '3') so session completes with reviewed = 1
  const isAlreadyComplete = await page
    .locator(".review-complete")
    .isVisible()
    .catch(() => false);
  if (!isAlreadyComplete) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
    await page.keyboard.press("3");
    await page.waitForTimeout(350);
  }
}

async function auditPage(page) {
  return page.evaluate(() => {
    const TARGET_RGB = "rgb(185, 60, 34)";
    const TARGET_HEX = "#b93c22";

    const matchesShu = (val) => {
      if (!val || typeof val !== "string") return false;
      const lower = val.toLowerCase();
      return lower.includes(TARGET_RGB) || lower.includes(TARGET_HEX);
    };

    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity || "1") === 0
      ) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const shuElements = [];
    const all = document.querySelectorAll("*");
    for (const el of all) {
      if (!isVisible(el)) continue;
      const cs = window.getComputedStyle(el);
      const bgHit =
        matchesShu(cs.backgroundColor) || matchesShu(cs.backgroundImage);
      const borderHit =
        matchesShu(cs.borderTopColor) && parseFloat(cs.borderTopWidth) > 0;
      // Avoid double-counting child text nodes if parent already has text color #B93C22
      const parentColor = el.parentElement
        ? window.getComputedStyle(el.parentElement).color
        : "";
      const textHit =
        matchesShu(cs.color) &&
        !matchesShu(parentColor) &&
        (el.childNodes.length > 0 || el.tagName === "SVG");

      if (bgHit || borderHit || textHit) {
        shuElements.push({
          tag: el.tagName.toLowerCase(),
          className:
            typeof el.className === "string"
              ? el.className.trim().slice(0, 60)
              : "",
          text: (el.textContent || "").trim().slice(0, 40),
          reasons: [
            bgHit ? "bg" : null,
            borderHit ? "border" : null,
            textHit ? "text" : null,
          ]
            .filter(Boolean)
            .join("+"),
        });
      }
    }

    const overflow =
      document.documentElement.scrollWidth > window.innerWidth + 1;

    return {
      shuCount: shuElements.length,
      shuElements,
      overflow,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
}

const serverProc = await ensureServer();
let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch(resolveChromiumLaunchOptions());
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Capture public Landing route across all 5 widths first
  const allResults = [];

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(350);
    const audit = await auditPage(page);
    const file = `w${w}__01-landing.png`;
    await page.screenshot({ path: path.join(outDir, file), fullPage: false });
    allResults.push({ width: w, slug: "01-landing", route: "/", ...audit });
  }

  // 2. Log in and prepare session
  await page.setViewportSize({ width: 1440, height: 900 });
  const { deckId } = await prepareSession(page);

  const appRoutes = [
    ["02-beranda", "/beranda"],
    ["03-deck", "/deck"],
    ["04-library", "/library"],
    ["05-mining", "/mining"],
    ["06-exam", "/exam"],
    ["07-progress", "/progress"],
    ["08-settings", "/settings"],
  ];

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const [slug, route] of appRoutes) {
      await page.goto(`${BASE_URL}${route}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });
      await page.waitForTimeout(350);
      const audit = await auditPage(page);
      const file = `w${w}__${slug}.png`;
      await page.screenshot({ path: path.join(outDir, file), fullPage: false });
      allResults.push({ width: w, slug, route, ...audit });
    }

    // 09-review-complete
    await navigateToReviewComplete(page, deckId);
    const revAudit = await auditPage(page);
    const revFile = `w${w}__09-review-complete.png`;
    await page.screenshot({ path: path.join(outDir, revFile), fullPage: false });
    allResults.push({
      width: w,
      slug: "09-review-complete",
      route: `/deck/${deckId}/review (complete)`,
      ...revAudit,
    });
  }

  await ctx.close();

  if (reportPath) {
    mkdirSync(path.dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(allResults, null, 2), "utf8");
  }

  console.log(`Captured ${allResults.length} screenshots in ${outDir}`);
  console.log("\n=== #B93C22 (--shu) Accent Audit at 1440px ===");
  for (const r of allResults.filter((x) => x.width === 1440)) {
    console.log(
      `  ${r.slug.padEnd(20)} (${r.route}): ${r.shuCount} elements`,
      r.shuElements.map((e) => `${e.tag}.${e.className}[${e.reasons}]`).join(", "),
    );
  }

  const overflows = allResults.filter((x) => x.overflow);
  if (overflows.length > 0) {
    console.log("\nHorizontal overflow detected on:");
    for (const o of overflows) {
      console.log(`  - w${o.width} ${o.slug}: ${o.scrollWidth}px > ${o.innerWidth}px`);
    }
  } else {
    console.log("\nNo horizontal overflow detected across all widths.");
  }
} finally {
  await browser.close();
  if (serverProc) serverProc.kill();
}
