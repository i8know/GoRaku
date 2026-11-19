import {
  normalizeJapaneseOcrText,
  orderVerticalOcrColumnsRtl,
  type OcrLanguage,
  type OcrModelVariant,
  type OcrProgressInfo,
  type OcrProvider,
  type OcrRecognitionResult,
  type OcrRecognizeOptions,
} from "./ocrProvider";
import { normalizeBasePath } from "../basePath";
import { useToastStore } from "../../store/useToastStore";

export const OCR_ASSET_LOAD_ERROR_MESSAGE =
  "Data OCR tidak dapat dimuat. Pastikan aset /tesseract terpasang dengan benar.";

const LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec";

async function readInitialAssetBytes(
  url: string,
  maxBytes = 64,
): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${url})`);
  }
  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    try {
      const { value } = await reader.read();
      return value ? value.subarray(0, maxBytes) : new Uint8Array(0);
    } finally {
      await reader.cancel().catch(() => {});
    }
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf, 0, Math.min(buf.byteLength, maxBytes));
}

/**
 * Memastikan aset biner OCR (`/tesseract/tesseract-core-lstm.wasm` dan `traineddata.gz`)
 * dapat diakses dan bukan berkas pointer Git LFS 132-byte sebelum worker dijalankan.
 */
export async function verifyOcrRuntimeAssets(
  assetUrls: { corePath: string; langPath: string },
  lang: OcrLanguage,
): Promise<void> {
  if (typeof fetch !== "function") return;

  const wasmUrl = `${assetUrls.corePath.replace(/\/$/, "")}/tesseract-core-lstm.wasm`;
  const langUrl = `${assetUrls.langPath.replace(/\/$/, "")}/${lang}.traineddata.gz`;

  const [wasmBytes, gzipBytes] = await Promise.all([
    readInitialAssetBytes(wasmUrl, 64),
    readInitialAssetBytes(langUrl, 64),
  ]);

  const decoder = new TextDecoder("utf-8", { fatal: false });
  if (
    decoder.decode(wasmBytes).startsWith(LFS_POINTER_PREFIX) ||
    wasmBytes.length < 4 ||
    wasmBytes[0] !== 0x00 ||
    wasmBytes[1] !== 0x61 ||
    wasmBytes[2] !== 0x73 ||
    wasmBytes[3] !== 0x6d
  ) {
    throw new Error(OCR_ASSET_LOAD_ERROR_MESSAGE);
  }

  if (
    decoder.decode(gzipBytes).startsWith(LFS_POINTER_PREFIX) ||
    gzipBytes.length < 2 ||
    gzipBytes[0] !== 0x1f ||
    gzipBytes[1] !== 0x8b
  ) {
    throw new Error(OCR_ASSET_LOAD_ERROR_MESSAGE);
  }
}

/**
 * Membangun URL aset lokal Tesseract (`workerPath`, `corePath`, `langPath`)
 * dengan memperhitungkan `import.meta.env.BASE_URL` (mis. `/` atau `/GoRaku/`).
 */
export function buildTesseractAssetUrls(
  variant: OcrModelVariant,
  baseUrl: string = import.meta.env.BASE_URL ?? "/",
  origin: string = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost",
): {
  workerPath: string;
  corePath: string;
  langPath: string;
} {
  const normalizedBase = normalizeBasePath(baseUrl);
  return {
    workerPath: new URL(`${normalizedBase}tesseract/worker.min.js`, origin).href,
    corePath: new URL(`${normalizedBase}tesseract`, origin).href,
    langPath: new URL(
      `${normalizedBase}tesseract/lang-data/${variant}`,
      origin,
    ).href,
  };
}

function formatProgressStatusId(rawStatus: string, lang: OcrLanguage): string {
  const s = (rawStatus || "").toLowerCase();
  if (s.includes("core")) {
    return "Memuat mesin WebAssembly OCR lokal...";
  }
  if (s.includes("traineddata") || s.includes("language")) {
    return `Memuat model bahasa (${lang === "jpn_vert" ? "Jepang Vertikal" : "Jepang Horizontal"})...`;
  }
  if (s.includes("initializing")) {
    return "Menginisialisasi mesin pengenalan huruf...";
  }
  if (s.includes("recognizing")) {
    return "Mengenali teks gelembung dialog...";
  }
  return rawStatus || "Memproses OCR...";
}

interface TesseractWorkerInstance {
  reinitialize: (langs: string, oem?: number) => Promise<unknown>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  recognize: (
    image: Blob,
    opts?: Record<string, unknown>,
    output?: Record<string, boolean>,
  ) => Promise<{
    data: {
      text?: string;
      confidence?: number;
      blocks?: Array<{
        paragraphs?: Array<{
          lines?: Array<{
            text?: string;
            bbox?: { x0: number; y0: number; x1: number; y1: number };
          }>;
        }>;
      }>;
    };
  }>;
  terminate: () => Promise<unknown>;
}

/**
 * Implementasi `OcrProvider` menggunakan Tesseract.js di dalam Web Worker.
 * - Seluruh berkas worker (`/tesseract/worker.min.js`), WASM core (`/tesseract/tesseract-core-*-lstm.wasm.js`),
 *   dan traineddata (`/tesseract/lang-data/{best|fast}/jpn*.traineddata.gz`) di-self-host secara lokal tanpa CDN.
 * - Dimuat secara malas (lazy) hanya saat pengguna pertama kali memilih gelembung dialog untuk di-OCR.
 */
export class TesseractProvider implements OcrProvider {
  private workerPromise: Promise<TesseractWorkerInstance> | null = null;
  private currentLang: OcrLanguage | null = null;
  private currentVariant: OcrModelVariant | null = null;
  private activeProgressHandler: ((info: OcrProgressInfo) => void) | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  private async ensureWorker(
    lang: OcrLanguage,
    variant: OcrModelVariant,
  ): Promise<TesseractWorkerInstance> {
    if (this.workerPromise && this.currentVariant !== variant) {
      try {
        const oldWorker = await this.workerPromise;
        await oldWorker.terminate();
      } catch {
        // Abaikan
      }
      this.workerPromise = null;
      this.currentLang = null;
      this.currentVariant = null;
    }

    if (!this.workerPromise) {
      this.currentVariant = variant;
      this.currentLang = lang;

      this.workerPromise = (async () => {
        const assetUrls = buildTesseractAssetUrls(variant);
        await verifyOcrRuntimeAssets(assetUrls, lang);

        const tesseractMod = await import("tesseract.js");
        const createWorker =
          tesseractMod.createWorker ??
          (tesseractMod as unknown as { default: { createWorker: typeof tesseractMod.createWorker } }).default
            ?.createWorker;

        let rejectWorkerInit: ((reason?: unknown) => void) | null = null;
        const workerInitErrorPromise = new Promise<never>((_, reject) => {
          rejectWorkerInit = reject;
        });

        const worker = (await Promise.race([
          createWorker(lang, 1, {
            workerPath: assetUrls.workerPath,
            corePath: assetUrls.corePath,
            langPath: assetUrls.langPath,
            cachePath: `goraku-tess-${variant}`,
            gzip: true,
            workerBlobURL: false,
            errorHandler: (err: unknown) => {
              rejectWorkerInit?.(
                err instanceof Error ? err : new Error(String(err)),
              );
            },
            logger: (msg: { status?: string; progress?: number }) => {
              if (this.activeProgressHandler) {
                this.activeProgressHandler({
                  status: formatProgressStatusId(
                    msg.status ?? "",
                    this.currentLang ?? lang,
                  ),
                  progress:
                    typeof msg.progress === "number"
                      ? Math.max(0, Math.min(1, msg.progress))
                      : 0,
                  lang: this.currentLang ?? lang,
                });
              }
            },
          }),
          workerInitErrorPromise,
        ])) as unknown as TesseractWorkerInstance;

        return worker;
      })();
    }

    try {
      const worker = await this.workerPromise;

      if (this.currentLang !== lang) {
        const assetUrls = buildTesseractAssetUrls(variant);
        await verifyOcrRuntimeAssets(assetUrls, lang);
        await worker.reinitialize(lang, 1);
        this.currentLang = lang;
      }

      // PSM 5 = SINGLE_BLOCK_VERT_TEXT (teks vertikal kolom kanan-ke-kiri)
      // PSM 6 = SINGLE_BLOCK (teks horizontal seragam)
      await worker.setParameters({
        tessedit_pageseg_mode: lang === "jpn_vert" ? "5" : "6",
        preserve_interword_spaces: "0",
      });

      return worker;
    } catch {
      this.workerPromise = null;
      this.currentLang = null;
      this.currentVariant = null;
      useToastStore.getState().notify(OCR_ASSET_LOAD_ERROR_MESSAGE);
      throw new Error(OCR_ASSET_LOAD_ERROR_MESSAGE);
    }
  }

  async recognize(
    image: Blob,
    opts?: OcrRecognizeOptions,
  ): Promise<OcrRecognitionResult> {
    const lang: OcrLanguage = opts?.lang ?? "jpn_vert";
    const variant: OcrModelVariant = opts?.modelVariant ?? "best";

    const runTask = async (): Promise<OcrRecognitionResult> => {
      const t0 = performance.now();
      this.activeProgressHandler = opts?.onProgress ?? null;

      try {
        const worker = await this.ensureWorker(lang, variant);
        const response = await worker.recognize(
          image,
          {},
          { text: true, blocks: true },
        );

        const data = response?.data ?? {};
        let rawText = data.text ?? "";
        let columnOrderVerifiedRtl = false;

        // Untuk jpn_vert, ekstrak semua baris beserta bounding box-nya dan pastikan
        // urutan kolom adalah dari KANAN ke KIRI (RTL)
        if (lang === "jpn_vert" && Array.isArray(data.blocks)) {
          const extractedLines: Array<{
            text: string;
            bbox?: { x0: number; y0: number; x1: number; y1: number };
          }> = [];
          for (const block of data.blocks) {
            for (const para of block.paragraphs ?? []) {
              for (const line of para.lines ?? []) {
                if (line.text) {
                  extractedLines.push({
                    text: line.text,
                    bbox: line.bbox,
                  });
                }
              }
            }
          }
          if (extractedLines.length > 0) {
            const ordered = orderVerticalOcrColumnsRtl(extractedLines);
            rawText = ordered.joinedText;
            columnOrderVerifiedRtl = true;
          }
        }

        const normalizedText = normalizeJapaneseOcrText(rawText);
        const elapsedMs = Math.round(performance.now() - t0);

        return {
          text: normalizedText,
          rawText: rawText.trim(),
          confidence:
            typeof data.confidence === "number"
              ? Math.round(data.confidence)
              : undefined,
          elapsedMs,
          columnOrderVerifiedRtl,
        };
      } catch (err) {
        // Jika worker gagal dimuat pada percobaan pertama, reset promise agar percobaan berikutnya bersih
        this.workerPromise = null;
        this.currentLang = null;
        throw err;
      } finally {
        this.activeProgressHandler = null;
      }
    };

    const queued = this.queue.then(runTask, runTask);
    this.queue = queued.catch(() => {});
    return await queued;
  }

  async terminate(): Promise<void> {
    if (!this.workerPromise) return;
    try {
      const w = await this.workerPromise;
      await w.terminate();
    } catch {
      // Abaikan
    } finally {
      this.workerPromise = null;
      this.currentLang = null;
      this.currentVariant = null;
    }
  }
}

export const defaultOcrProvider: OcrProvider = new TesseractProvider();

