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
        const tesseractMod = await import("tesseract.js");
        const createWorker =
          tesseractMod.createWorker ??
          (tesseractMod as unknown as { default: { createWorker: typeof tesseractMod.createWorker } }).default
            ?.createWorker;

        const origin =
          typeof window !== "undefined" && window.location?.origin
            ? window.location.origin
            : "";

        const worker = (await createWorker(lang, 1, {
          workerPath: `${origin}/tesseract/worker.min.js`,
          corePath: `${origin}/tesseract`,
          langPath: `${origin}/tesseract/lang-data/${variant}`,
          cachePath: `goraku-tess-${variant}`,
          gzip: true,
          workerBlobURL: false,
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
        })) as unknown as TesseractWorkerInstance;

        return worker;
      })();
    }

    const worker = await this.workerPromise;

    if (this.currentLang !== lang) {
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

