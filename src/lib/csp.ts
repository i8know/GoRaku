/**
 * Utilitas injeksi origin Supabase secara ketat ke direktif `connect-src` pada Content-Security-Policy.
 *
 * Aturan keamanan:
 * - Hanya mengizinkan origin persis (`https://...` atau `http://localhost:...`) hasil `new URL(supabaseUrl).origin`.
 * - Menolak wildcard (`*`), skema tidak aman (`javascript:`, `data:`), maupun karakter pemecah direktif (`;`).
 * - Ketika `supabaseUrl` kosong / belum disetel, HTML dikembalikan apa adanya tanpa modifikasi.
 */

export function resolveSupabaseOrigin(rawUrl: string | undefined): string | null {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) return null;
  if (/[*;\s'"]/.test(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }
  if (!parsed.hostname || parsed.hostname.includes("*")) {
    return null;
  }

  return parsed.origin;
}

export function injectSupabaseConnectSrc(html: string, rawUrl: string | undefined): string {
  const origin = resolveSupabaseOrigin(rawUrl);
  if (!origin) return html;

  return html.replace(/<meta\b[^>]*>/gi, (metaTag) => {
    if (!/\bhttp-equiv\s*=\s*(?:"Content-Security-Policy"|'Content-Security-Policy')/i.test(metaTag)) {
      return metaTag;
    }

    return metaTag.replace(
      /(\bcontent\s*=\s*)(?:"([^"]*)"|'([^']*)')/i,
      (attrMatch, attrPrefix: string, doubleQuoted?: string, singleQuoted?: string) => {
        const quote = doubleQuoted !== undefined ? '"' : "'";
        const cspContent = doubleQuoted ?? singleQuoted ?? "";
        if (!cspContent) return attrMatch;

        const updated = cspContent.replace(
          /((?:^|;)\s*connect-src\s+[^;]*)(;|$)/i,
          (_dirMatch, directive: string, ending: string) => {
            const tokens = directive.trim().split(/\s+/);
            if (tokens.includes(origin)) {
              return `${directive}${ending}`;
            }
            return `${directive.trimEnd()} ${origin}${ending}`;
          },
        );
        if (updated === cspContent) return attrMatch;
        return `${attrPrefix}${quote}${updated}${quote}`;
      },
    );
  });
}
