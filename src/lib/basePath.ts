/**
 * Normalisasi base path aplikasi agar selalu diawali dan diakhiri dengan `/`
 * (default: `/`). Mendukung nilai dari `FIGMA_PUBLIC_URL` maupun `APP_BASE_PATH`.
 *
 * Contoh:
 * - `""` -> `"/"`
 * - `"/"` -> `"/"`
 * - `"/GoRaku"` -> `"/GoRaku/"`
 * - `"/GoRaku/"` -> `"/GoRaku/"`
 * - `"GoRaku"` -> `"/GoRaku/"`
 */
export function normalizeBasePath(raw?: string | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  // Jika FIGMA_PUBLIC_URL berisi URL penuh (http:// atau https://), pastikan diakhiri '/'
  if (/^https?:\/\//i.test(trimmed)) {
    return `${trimmed.replace(/\/+$/, "")}/`;
  }

  const cleaned = trimmed.replace(/^\/+|\/+$/g, "");
  if (!cleaned) {
    return "/";
  }

  return `/${cleaned}/`;
}

/**
 * Menghasilkan `basename` untuk React Router `BrowserRouter` dari `BASE_URL`.
 * - `"/"` -> `""`
 * - `"/GoRaku/"` -> `"/GoRaku"`
 */
export function getRouterBasename(baseUrl?: string | null): string {
  return normalizeBasePath(baseUrl).replace(/\/$/, "");
}

/**
 * Menggabungkan path aset publik (mis. `/favicon.svg` atau `favicon.svg`)
 * dengan base path yang sudah dinormalisasi.
 */
export function resolveBaseAssetHref(
  assetPath: string,
  baseUrl?: string | null,
): string {
  const trimmed = (assetPath ?? "").trim();
  if (!trimmed) {
    return normalizeBasePath(baseUrl);
  }
  if (/^(?:https?:|data:|blob:|\/\/)/i.test(trimmed)) {
    return trimmed;
  }
  const base = normalizeBasePath(baseUrl);
  return `${base}${trimmed.replace(/^\/+/, "")}`;
}
