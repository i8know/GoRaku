import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec";
const WASM_MAGIC = Buffer.from([0x00, 0x61, 0x73, 0x6d]);
const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

function collectFiles(dirPath, out = []) {
  if (!fs.existsSync(dirPath)) return out;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function readHeaderBytes(filePath, byteCount = 64) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(byteCount);
    const bytesRead = fs.readSync(fd, buf, 0, byteCount, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Memeriksa direktori aset (`public/`, `dist/`, atau direktori uji) untuk mendeteksi:
 * 1. Berkas pointer Git LFS (`version https://git-lfs.github.com/spec...`) yang belum diunduh.
 * 2. Berkas `tesseract/*.wasm` yang tidak diawali magic bytes WebAssembly (`00 61 73 6d`).
 * 3. Berkas `*.gz` yang tidak diawali magic bytes GZIP (`1f 8b`).
 *
 * @param {{ dirs?: string[], rootDir?: string }} [options]
 * @returns {{ ok: boolean, errors: Array<{ file: string, reason: string }>, scannedCount: number }}
 */
export function inspectLfsAndBinaryAssets(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const dirs = options.dirs ?? [
    path.join(rootDir, "public"),
    path.join(rootDir, "dist"),
  ];

  const errors = [];
  let scannedCount = 0;

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = collectFiles(dir);
    for (const filePath of files) {
      scannedCount++;
      const relPath = path.relative(rootDir, filePath).replace(/\\/g, "/");
      const header = readHeaderBytes(filePath, 64);
      const headerUtf8 = header.toString("utf8");

      if (headerUtf8.startsWith(LFS_POINTER_PREFIX)) {
        errors.push({
          file: relPath,
          reason:
            "Merupakan berkas pointer Git LFS (132 byte), bukan biner asli / File is an unpulled Git LFS pointer.",
        });
        continue;
      }

      const normalizedPath = filePath.replace(/\\/g, "/");
      if (
        normalizedPath.endsWith(".wasm") &&
        normalizedPath.includes("/tesseract/")
      ) {
        if (
          header.length < 4 ||
          !header.subarray(0, 4).equals(WASM_MAGIC)
        ) {
          errors.push({
            file: relPath,
            reason: `Header WebAssembly tidak valid (diharapkan magic bytes 00 61 73 6d, ditemukan ${header.subarray(0, 4).toString("hex") || "kosong"}) / Invalid WebAssembly magic bytes.`,
          });
        }
      } else if (normalizedPath.endsWith(".gz")) {
        if (
          header.length < 2 ||
          !header.subarray(0, 2).equals(GZIP_MAGIC)
        ) {
          errors.push({
            file: relPath,
            reason: `Header GZIP tidak valid (diharapkan magic bytes 1f 8b, ditemukan ${header.subarray(0, 2).toString("hex") || "kosong"}) / Invalid GZIP magic bytes.`,
          });
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    scannedCount,
  };
}

function runCli() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const customDirs = args.filter((a) => !a.startsWith("--"));

  const result = inspectLfsAndBinaryAssets(
    customDirs.length > 0
      ? { dirs: customDirs.map((d) => path.resolve(process.cwd(), d)) }
      : {},
  );

  if (result.ok) {
    console.log(
      `[checkLfsAssets] OK — ${result.scannedCount} berkas diperiksa; seluruh aset WASM (00 61 73 6d) dan GZIP (1f 8b) valid (bukan pointer Git LFS).`,
    );
    process.exit(0);
  }

  const lines = [
    strict
      ? "[checkLfsAssets] GAGAL / ERROR: Ditemukan aset Git LFS yang belum diunduh atau biner OCR rusak:"
      : "[checkLfsAssets] PERINGATAN / WARNING: Ditemukan aset Git LFS yang belum diunduh atau biner OCR tidak valid:",
    ...result.errors.map((e) => `  - ${e.file}: ${e.reason}`),
    "",
    "Cara memperbaiki / How to fix:",
    "  1. Lokal / Local: jalankan `git lfs install && git lfs pull` untuk mengunduh aset OCR Tesseract (~12 MB).",
    "  2. GitHub Actions: pastikan `actions/checkout@v4` menggunakan `with: { lfs: true }`.",
    "  3. Vercel / Netlify: aktifkan dukungan Git LFS pada pengaturan repositori, atau deploy dari artefak GitHub Actions.",
  ];

  if (strict) {
    console.error(lines.join("\n"));
    process.exit(1);
  } else {
    console.warn(lines.join("\n"));
    process.exit(0);
  }
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  runCli();
}
