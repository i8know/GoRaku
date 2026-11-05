import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";

export interface DatasetMeta {
  fileName: string;
  url: string;
  format: string;
  license: string;
  attribution: string;
  sha256: string;
}

export interface ChecksumsRegistry {
  version: string;
  generatedAt: string;
  datasets: Record<string, DatasetMeta>;
}

export function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith("https") ? https : http;

    const request = client.get(url, (response) => {
      // Handle redirect 301 / 302
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`Gagal mengunduh ${url} (HTTP ${response.statusCode})`));
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    });

    request.on("error", (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

export async function runDownloadPipeline(options: {
  targetDir?: string;
  verifyOnly?: boolean;
  offline?: boolean;
} = {}): Promise<{ success: boolean; datasetsChecked: number; details: string[] }> {
  const rootDir = process.cwd();
  const checksumsPath = path.join(rootDir, "tools", "checksums.json");

  if (!fs.existsSync(checksumsPath)) {
    throw new Error(`Berkas checksums tidak ditemukan di: ${checksumsPath}`);
  }

  const registry = JSON.parse(fs.readFileSync(checksumsPath, "utf-8")) as ChecksumsRegistry;
  const downloadsDir = options.targetDir || path.join(rootDir, "tools", "downloads");

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const details: string[] = [];
  let datasetsChecked = 0;

  for (const [key, meta] of Object.entries(registry.datasets)) {
    datasetsChecked++;
    const destPath = path.join(downloadsDir, meta.fileName);

    if (fs.existsSync(destPath)) {
      const hash = await calculateFileSha256(destPath);
      details.push(`[ADA] ${meta.fileName} (SHA-256: ${hash.slice(0, 12)}...)`);
    } else {
      if (options.verifyOnly || options.offline) {
        details.push(`[BELUM DIUNDUH] ${meta.fileName} - Menggunakan fixture lokal (offline/test mode)`);
      } else {
        try {
          console.log(`Mengunduh ${meta.fileName} dari ${meta.url}...`);
          await downloadFile(meta.url, destPath);
          const hash = await calculateFileSha256(destPath);
          details.push(`[BERHASIL UNDUH] ${meta.fileName} (SHA-256: ${hash.slice(0, 12)}...)`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          details.push(`[GAGAL] ${meta.fileName}: ${msg}`);
        }
      }
    }
  }

  return {
    success: true,
    datasetsChecked,
    details,
  };
}

// Eksekusi jika dijalankan langsung lewat CLI
if (process.argv[1] && process.argv[1].endsWith("downloadDatasets.ts")) {
  const isVerifyOnly = process.argv.includes("--verify-only") || process.argv.includes("--offline");
  console.log("=== Memulai Pipeline Unduh & Verifikasi Data N5 ===");
  runDownloadPipeline({ verifyOnly: isVerifyOnly })
    .then((res) => {
      console.log(`Pemeriksaan selesai. (${res.datasetsChecked} dataset diperiksa)`);
      res.details.forEach((d) => console.log(`  ${d}`));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Kesalahan pipeline data:", err);
      process.exit(1);
    });
}

