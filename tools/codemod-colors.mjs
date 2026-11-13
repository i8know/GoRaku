import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");

const MAP = new Map([
  // Panel / surface
  ["#fffdfa", "var(--panel)"],
  ["#fffdf9", "var(--panel)"],
  ["#fffdf8", "var(--panel)"],
  ["#fdfbf6", "var(--panel)"],
  // Page background / muted surface
  ["#f7f5ef", "var(--tsuki)"],
  ["#f7f3ea", "var(--tsuki)"],
  ["#f8f5ef", "var(--tsuki)"],
  ["#f8f6f1", "var(--tsuki)"],
  ["#f8f4eb", "var(--tsuki)"],
  ["#f7f4ec", "var(--tsuki)"],
  ["#f3f0e9", "var(--tsuki)"],
  ["#f0ece4", "var(--tsuki)"],
  ["#f2ede2", "var(--tsuki)"],
  ["#efede7", "var(--tsuki)"],
  ["#f9f6f0", "var(--tsuki)"],
  ["#f4efe4", "var(--tsuki)"],
  // Borders & dividers
  ["#e8e4dc", "var(--garis)"],
  ["#ddd8cf", "var(--garis)"],
  ["#e2ded5", "var(--garis)"],
  ["#dfd9cc", "var(--garis)"],
  ["#e4e0d7", "var(--garis)"],
  ["#dedad1", "var(--garis)"],
  ["#e1ddd4", "var(--garis)"],
  ["#e1ddd5", "var(--garis)"],
  ["#dfdbd2", "var(--garis)"],
  ["#d8d3c9", "var(--garis)"],
  ["#d4d0c8", "var(--garis)"],
  ["#ddd7cd", "var(--garis)"],
  ["#ded8ce", "var(--garis)"],
  ["#e0dbd1", "var(--garis)"],
  ["#ebe6dc", "var(--garis)"],
  ["#d9d4ca", "var(--garis)"],
  ["#ece8df", "var(--garis)"],
  ["#eeeae2", "var(--garis)"],
  ["#e9e3d7", "var(--garis)"],
  ["#d8d2c5", "var(--garis)"],
  ["#ded8cb", "var(--garis)"],
  ["#ddd9d0", "var(--garis)"],
  // Primary ink
  ["#25231f", "var(--tinta)"],
  ["#1e201d", "var(--tinta)"],
  ["#1f1e1b", "var(--tinta)"],
  ["#1c1f1d", "var(--tinta)"],
  ["#33312c", "var(--tinta)"],
  ["#34312d", "var(--tinta)"],
  ["#37342e", "var(--tinta)"],
  // Secondary / muted ink
  ["#88847b", "var(--tinta-2)"],
  ["#77736b", "var(--tinta-2)"],
  ["#9c978e", "var(--tinta-2)"],
  ["#88877f", "var(--tinta-2)"],
  ["#9c9a92", "var(--tinta-2)"],
  ["#8c8982", "var(--tinta-2)"],
  ["#96938c", "var(--tinta-2)"],
  ["#a19e96", "var(--tinta-2)"],
  ["#959188", "var(--tinta-2)"],
  ["#99958c", "var(--tinta-2)"],
  ["#8e8a82", "var(--tinta-2)"],
  ["#949087", "var(--tinta-2)"],
  ["#959087", "var(--tinta-2)"],
  ["#78746c", "var(--tinta-2)"],
  ["#858078", "var(--tinta-2)"],
  ["#6f6b63", "var(--tinta-2)"],
  ["#8a867d", "var(--tinta-2)"],
  ["#6f6a61", "var(--tinta-2)"],
  ["#787268", "var(--tinta-2)"],
  ["#6e695f", "var(--tinta-2)"],
  ["#545049", "var(--tinta-2)"],
  ["#4f4b44", "var(--tinta-2)"],
  ["#4d4942", "var(--tinta-2)"],
  ["#4c4a44", "var(--tinta-2)"],
  ["#494740", "var(--tinta-2)"],
  ["#595750", "var(--tinta-2)"],
  ["#65615a", "var(--tinta-2)"],
  ["#98938a", "var(--tinta-2)"],
  // Dark forest green -> kon
  ["#263d36", "var(--kon)"],
  ["#233c35", "var(--kon)"],
  ["#243a34", "var(--kon)"],
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (
      rel.startsWith("vendor/") ||
      rel.startsWith("data/") ||
      rel.startsWith("lib/") ||
      rel.includes("__tests__/") ||
      rel === "aizome.css"
    ) {
      continue;
    }
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(css|tsx|ts)$/.test(name) && !name.endsWith("Data.ts") && !name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(ROOT);
let totalReplacements = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  let count = 0;
  const next = src.replace(/#[0-9a-fA-F]{6}\b/g, (match) => {
    const mapped = MAP.get(match.toLowerCase());
    if (!mapped) return match;
    count++;
    return mapped;
  });
  if (count > 0) {
    writeFileSync(file, next, "utf8");
    totalReplacements += count;
    console.log(`${String(count).padStart(4)}  ${path.relative(process.cwd(), file).replace(/\\/g, "/")}`);
  }
}

console.log(`Total replacements: ${totalReplacements}`);
