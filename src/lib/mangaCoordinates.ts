/**
 * Modul pemetaan koordinat tampilan (viewport) ke piksel gambar asli (natural pixels)
 * serta pra-pemrosesan gambar gelembung dialog sebelum dikirim ke mesin OCR.
 */

export interface ViewportBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface NaturalPixelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CoordinateMappingParams {
  /**
   * Kotak seleksi yang diseret pengguna (dalam piksel CSS viewport, atau piksel fisik layar jika `inputSpace === "device"`).
   */
  selectionBox: ViewportBox;
  /**
   * Ukuran piksel resolusi penuh gambar asli (`img.naturalWidth` & `img.naturalHeight`).
   */
  naturalWidth: number;
  naturalHeight: number;
  /**
   * Kotak elemen gambar pada layar sebelum transformasi zoom/pan (atau jika `alreadyTransformed: true`,
   * merupakan hasil langsung `imgElement.getBoundingClientRect()`).
   */
  baseImageRect: ViewportBox;
  /**
   * Faktor perbesaran (zoom) saat ini, default 1.
   */
  zoom?: number;
  /**
   * Geseran horizontal & vertikal (pan) dalam piksel CSS, default 0.
   */
  panX?: number;
  panY?: number;
  /**
   * Titik pusat transformasi (`transform-origin`), default adalah titik tengah `baseImageRect`.
   */
  transformOrigin?: { x: number; y: number };
  /**
   * Setel ke `true` apabila `baseImageRect` diambil dari `img.getBoundingClientRect()` setelah
   * browser menerapkan CSS `transform: translate3d(panX, panY, 0) scale(zoom)`.
   */
  alreadyTransformed?: boolean;
  /**
   * Rasio piksel perangkat (`window.devicePixelRatio`), default 1.
   */
  devicePixelRatio?: number;
  /**
   * Ruang koordinat dari `selectionBox`:
   * - `"css"` (default untuk `MouseEvent.clientX` / `Touch.clientX`)
   * - `"device"` (bila koordinat masukan dikalikan `devicePixelRatio` pada kanvas fisik)
   */
  inputSpace?: "css" | "device";
  /**
   * Mode penyesuaian aspek rasio di dalam elemen `<img>`, default `"contain"`.
   */
  objectFit?: "contain" | "fill";
}

/**
 * Nilai konfigurasi pra-pemrosesan citra gelembung sebelum dijalankan OCR.
 *
 * Dokumentasi nilai default:
 * - `grayscale: true` — Konversi ke luminance BT.601 (`0.299R + 0.587G + 0.114B`).
 * - `paddingPx: 24` — Menambahkan bingkai putih bersih (`#FFFFFF`) selebar 24px di sekeliling hasil crop
 *   agar garis tepi gelembung tidak menempel pada batas kanvas yang dapat membingungkan segmentasi Tesseract.
 * - `upscaleIfSmall: true` & `minDimensionPx: 320` — Jika lebar atau tinggi crop < 320px, diperbesar otomatis
 *   (maks. 3.0x) agar tinggi karakter kanji mencapai ukuran optimal LSTM Tesseract (~32-48px).
 * - `contrastFactor: 1.35` — Peregangan kontras sekitar nilai tengah 128 serta pemutihan latar abu-abu muda (>238 -> 255)
 *   untuk menghilangkan derau screentone tipis tanpa merusak anti-aliasing huruf.
 * - `binarize: false` & `binarizeThreshold: 165` — Binarisasi ambang batas hitam-putih penuh (opsional, berguna
 *   saat latar gelembung memiliki tekstur/screentone pekat).
 */
export interface OcrPreprocessOptions {
  grayscale: boolean;
  paddingPx: number;
  upscaleIfSmall: boolean;
  minDimensionPx: number;
  maxUpscaleFactor: number;
  contrastFactor: number;
  binarize: boolean;
  binarizeThreshold: number;
}

export const DEFAULT_OCR_PREPROCESS_OPTIONS: OcrPreprocessOptions = {
  grayscale: true,
  paddingPx: 24,
  upscaleIfSmall: true,
  minDimensionPx: 320,
  maxUpscaleFactor: 3.0,
  contrastFactor: 1.35,
  binarize: false,
  binarizeThreshold: 165,
};

/**
 * Menghitung kotak layar aktual dari elemen gambar setelah memperhitungkan zoom, pan, dan object-fit: contain.
 */
export function computeRenderedImageContentRect(
  params: Omit<CoordinateMappingParams, "selectionBox">,
): ViewportBox {
  const {
    naturalWidth,
    naturalHeight,
    baseImageRect,
    zoom = 1,
    panX = 0,
    panY = 0,
    transformOrigin,
    alreadyTransformed = false,
    objectFit = "contain",
  } = params;

  const safeZoom = zoom > 0 ? zoom : 1;

  let transformedRect: ViewportBox;
  if (alreadyTransformed) {
    transformedRect = { ...baseImageRect };
  } else {
    const originX =
      transformOrigin?.x ?? baseImageRect.left + baseImageRect.width / 2;
    const originY =
      transformOrigin?.y ?? baseImageRect.top + baseImageRect.height / 2;

    transformedRect = {
      left: originX + (baseImageRect.left - originX) * safeZoom + panX,
      top: originY + (baseImageRect.top - originY) * safeZoom + panY,
      width: baseImageRect.width * safeZoom,
      height: baseImageRect.height * safeZoom,
    };
  }

  if (
    objectFit === "fill" ||
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    transformedRect.width <= 0 ||
    transformedRect.height <= 0
  ) {
    return transformedRect;
  }

  // Hitung kotak konten sebenarnya di dalam elemen bila menggunakan object-fit: contain
  const imgAspect = naturalWidth / naturalHeight;
  const boxAspect = transformedRect.width / transformedRect.height;

  if (Math.abs(imgAspect - boxAspect) < 1e-4) {
    return transformedRect;
  }

  if (imgAspect > boxAspect) {
    // Gambar dibatasi oleh lebar (letterbox di atas & bawah)
    const contentWidth = transformedRect.width;
    const contentHeight = contentWidth / imgAspect;
    const offsetY = (transformedRect.height - contentHeight) / 2;
    return {
      left: transformedRect.left,
      top: transformedRect.top + offsetY,
      width: contentWidth,
      height: contentHeight,
    };
  } else {
    // Gambar dibatasi oleh tinggi (pillarbox di kiri & kanan)
    const contentHeight = transformedRect.height;
    const contentWidth = contentHeight * imgAspect;
    const offsetX = (transformedRect.width - contentWidth) / 2;
    return {
      left: transformedRect.left + offsetX,
      top: transformedRect.top,
      width: contentWidth,
      height: contentHeight,
    };
  }
}

/**
 * Memetakan kotak seleksi dari koordinat tampilan (viewport) ke koordinat piksel gambar ASLI
 * (`naturalWidth` x `naturalHeight`) dengan memperhitungkan zoom, pan (geser), object-fit,
 * dan `devicePixelRatio`.
 */
export function mapViewportBoxToImagePixels(
  params: CoordinateMappingParams,
): NaturalPixelBox | null {
  const {
    selectionBox,
    naturalWidth,
    naturalHeight,
    devicePixelRatio = 1,
    inputSpace = "css",
  } = params;

  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }

  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const normSel: ViewportBox =
    inputSpace === "device"
      ? {
          left: selectionBox.left / dpr,
          top: selectionBox.top / dpr,
          width: selectionBox.width / dpr,
          height: selectionBox.height / dpr,
        }
      : selectionBox;

  if (normSel.width <= 0 || normSel.height <= 0) {
    return null;
  }

  const contentRect = computeRenderedImageContentRect(params);
  if (contentRect.width <= 0 || contentRect.height <= 0) {
    return null;
  }

  // Skala dari piksel CSS yang dirender ke piksel gambar resolusi penuh
  const scaleX = naturalWidth / contentRect.width;
  const scaleY = naturalHeight / contentRect.height;

  const rawX1 = (normSel.left - contentRect.left) * scaleX;
  const rawY1 = (normSel.top - contentRect.top) * scaleY;
  const rawX2 = (normSel.left + normSel.width - contentRect.left) * scaleX;
  const rawY2 = (normSel.top + normSel.height - contentRect.top) * scaleY;

  // Clamp ke batas [0..naturalWidth] dan [0..naturalHeight]
  const clampedX1 = Math.max(0, Math.min(naturalWidth, Math.round(rawX1)));
  const clampedY1 = Math.max(0, Math.min(naturalHeight, Math.round(rawY1)));
  const clampedX2 = Math.max(0, Math.min(naturalWidth, Math.round(rawX2)));
  const clampedY2 = Math.max(0, Math.min(naturalHeight, Math.round(rawY2)));

  const w = clampedX2 - clampedX1;
  const h = clampedY2 - clampedY1;

  if (w < 4 || h < 4) {
    return null;
  }

  return {
    x: clampedX1,
    y: clampedY1,
    w,
    h,
  };
}

/**
 * Menentukan bahasa OCR awal (`"jpn_vert"` atau `"jpn"`) berdasarkan rasio dimensi kotak gelembung:
 * - `"jpn_vert"` jika kotak lebih tinggi daripada lebarnya (`h > w`)
 * - `"jpn"` jika kotak lebih lebar atau sama dengan tingginya (`w >= h`)
 */
export function inferInitialOcrLang(
  bbox: Pick<NaturalPixelBox, "w" | "h">,
): "jpn_vert" | "jpn" {
  return bbox.h > bbox.w ? "jpn_vert" : "jpn";
}

/**
 * Memproses array piksel RGBA (`Uint8ClampedArray`) secara in-place sesuai opsi pra-pemrosesan OCR
 * (grayscale, peregangan kontras, pemutihan latar screentone tipis, dan binarisasi opsional).
 * Dipisahkan sebagai fungsi murni agar juga dapat diuji langsung di Vitest.
 */
export function applyOcrPixelPreprocessing(
  rgba: Uint8ClampedArray,
  opts: Pick<
    OcrPreprocessOptions,
    "grayscale" | "contrastFactor" | "binarize" | "binarizeThreshold"
  >,
): void {
  const { grayscale, contrastFactor, binarize, binarizeThreshold } = opts;
  const factor = Math.max(0.5, Math.min(3.0, contrastFactor));

  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3];
    // Piksel transparan dijadikan putih bersih
    if (a < 128) {
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = 255;
      continue;
    }

    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];

    if (grayscale || binarize || factor !== 1) {
      let lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (factor !== 1) {
        lum = (lum - 128) * factor + 128;
      }

      if (binarize) {
        const bw = lum >= binarizeThreshold ? 255 : 0;
        rgba[i] = bw;
        rgba[i + 1] = bw;
        rgba[i + 2] = bw;
      } else {
        // Bersihkan derau latar abu-abu sangat terang (> 240) menjadi putih murni (255)
        const clamped =
          lum >= 240 ? 255 : lum <= 12 ? 0 : Math.round(lum);
        rgba[i] = clamped;
        rgba[i + 1] = clamped;
        rgba[i + 2] = clamped;
      }
      rgba[i + 3] = 255;
    }
  }
}

/**
 * Memotong (crop) kotak `bbox` langsung dari Blob halaman RESOLUSI PENUH (`fullPageBlob`),
 * menghasilkan:
 * 1. `rawCropBlob`: gambar crop asli (untuk pratinjau panel & disimpan ke kartu saat Sentence Mining).
 * 2. `preprocessedBlob`: gambar crop yang sudah diberi padding putih, di-upscale bila kecil,
 *    dan diberi filter grayscale/kontras/binarisasi untuk dimasukkan ke Tesseract OCR.
 */
export async function cropAndPreprocessFromFullImage(
  fullPageBlob: Blob,
  bbox: NaturalPixelBox,
  partialOpts?: Partial<OcrPreprocessOptions>,
): Promise<{
  rawCropBlob: Blob;
  preprocessedBlob: Blob;
  processedWidth: number;
  processedHeight: number;
  appliedScale: number;
}> {
  const opts: OcrPreprocessOptions = {
    ...DEFAULT_OCR_PREPROCESS_OPTIONS,
    ...partialOpts,
  };

  const bitmap = await createImageBitmap(fullPageBlob);
  try {
    const safeX = Math.max(0, Math.min(bitmap.width - 1, Math.round(bbox.x)));
    const safeY = Math.max(0, Math.min(bitmap.height - 1, Math.round(bbox.y)));
    const safeW = Math.max(
      1,
      Math.min(bitmap.width - safeX, Math.round(bbox.w)),
    );
    const safeH = Math.max(
      1,
      Math.min(bitmap.height - safeY, Math.round(bbox.h)),
    );

    // 1. Buat rawCropBlob langsung pada resolusi asli
    const rawCanvas = document.createElement("canvas");
    rawCanvas.width = safeW;
    rawCanvas.height = safeH;
    const rawCtx = rawCanvas.getContext("2d")!;
    rawCtx.fillStyle = "#ffffff";
    rawCtx.fillRect(0, 0, safeW, safeH);
    rawCtx.drawImage(bitmap, safeX, safeY, safeW, safeH, 0, 0, safeW, safeH);

    const rawCropBlob = await new Promise<Blob>((resolve) => {
      rawCanvas.toBlob(
        (b) => resolve(b ?? fullPageBlob),
        "image/png",
      );
    });

    // 2. Hitung faktor upscale bila kotak gelembung terlalu kecil
    let scale = 1;
    const minSide = Math.min(safeW, safeH);
    if (opts.upscaleIfSmall && minSide < opts.minDimensionPx) {
      scale = Math.min(
        opts.maxUpscaleFactor,
        Math.max(1.5, opts.minDimensionPx / Math.max(1, minSide)),
      );
    }

    const scaledW = Math.max(1, Math.round(safeW * scale));
    const scaledH = Math.max(1, Math.round(safeH * scale));
    const pad = Math.max(0, Math.round(opts.paddingPx));
    const finalW = scaledW + pad * 2;
    const finalH = scaledH + pad * 2;

    const procCanvas = document.createElement("canvas");
    procCanvas.width = finalW;
    procCanvas.height = finalH;
    const procCtx = procCanvas.getContext("2d")!;

    // Isi seluruh kanvas (termasuk padding sekeliling) dengan warna putih murni (#FFFFFF)
    procCtx.fillStyle = "#ffffff";
    procCtx.fillRect(0, 0, finalW, finalH);
    procCtx.imageSmoothingEnabled = true;
    procCtx.imageSmoothingQuality = "high";

    procCtx.drawImage(
      bitmap,
      safeX,
      safeY,
      safeW,
      safeH,
      pad,
      pad,
      scaledW,
      scaledH,
    );

    // Terapkan grayscale / kontras / binarisasi pada piksel
    const imgData = procCtx.getImageData(0, 0, finalW, finalH);
    applyOcrPixelPreprocessing(imgData.data, opts);
    procCtx.putImageData(imgData, 0, 0);

    const preprocessedBlob = await new Promise<Blob>((resolve) => {
      procCanvas.toBlob(
        (b) => resolve(b ?? rawCropBlob),
        "image/png",
      );
    });

    return {
      rawCropBlob,
      preprocessedBlob,
      processedWidth: finalW,
      processedHeight: finalH,
      appliedScale: Number(scale.toFixed(2)),
    };
  } finally {
    bitmap.close();
  }
}

/**
 * Mengompres gambar gelembung hasil crop (WebP/JPEG kualitas ~0.8, lebar maksimum ~800px)
 * untuk disimpan sebagai media kartu pada Tahap 4 (Sentence Mining dari Manga).
 */
export async function compressBubbleImageForCard(
  cropBlob: Blob,
  maxWidth = 800,
  quality = 0.8,
): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  if (
    typeof createImageBitmap !== "function" ||
    typeof document === "undefined"
  ) {
    return { blob: cropBlob, ext: "webp" };
  }

  const bitmap = await createImageBitmap(cropBlob);
  try {
    const origW = bitmap.width || 1;
    const origH = bitmap.height || 1;
    const scale = origW > maxWidth ? maxWidth / origW : 1;
    const targetW = Math.max(1, Math.round(origW * scale));
    const targetH = Math.max(1, Math.round(origH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: cropBlob, ext: "webp" };

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", quality);
    });
    if (webpBlob && webpBlob.type === "image/webp") {
      return { blob: webpBlob, ext: "webp" };
    }

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });
    return { blob: jpegBlob ?? cropBlob, ext: "jpg" };
  } finally {
    bitmap.close();
  }
}

