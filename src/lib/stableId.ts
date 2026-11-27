// Pembuat ID stabil lintas perangkat (Tahap B2):
// - UUIDv4 kriptografis (crypto.randomUUID -> fallback crypto.getRandomValues, tanpa Math.random)
// - Hash konten deterministik sinkron (dual cyrb53 + panjang) untuk impor CSV/JSON

/**
 * Menghasilkan UUID v4 acak berbasis CSPRNG (`crypto.randomUUID` atau fallback `crypto.getRandomValues`).
 * Tidak pernah menggunakan `Math.random()`.
 */
export function generateSecureUuid(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
  throw new Error("CSPRNG (crypto.randomUUID / crypto.getRandomValues) tidak tersedia.");
}

/** ID baru untuk deck manual (`<uuid>`) atau deck impor (`deck-<uuid>`). */
export function newDeckId(prefix = ""): string {
  return `${prefix}${generateSecureUuid()}`;
}

/** ID baru untuk kartu manual atau hasil mining (`m<uuid>`). */
export function newCardId(): string {
  return `m${generateSecureUuid()}`;
}

/** ID baru untuk item antrean mining lokal (`m-<uuid>`, tidak bertabrakan dengan sampel `m1`/`m2`). */
export function newMinedCardId(): string {
  return `m-${generateSecureUuid()}`;
}

/**
 * Hash string 53-bit sinkron (cyrb53) tanpa dependensi eksternal.
 * Mengembalikan bilangan bulat tak bertanda hingga 53 bit.
 */
export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function normalizeHashField(value: string): string {
  return (value ?? "").normalize("NFC").trim();
}

/**
 * Menghasilkan sidik konten deterministik (dual cyrb53 + panjang) dari kombinasi
 * `(word, reading, meaning)` yang telah dinormalisasi NFC dan di-trim.
 */
export function hashRowContent(word: string, reading: string, meaning: string): string {
  const canonical = `${normalizeHashField(word)}\x1f${normalizeHashField(reading)}\x1f${normalizeHashField(meaning)}`;
  const primary = cyrb53(canonical, 0).toString(36).padStart(11, "0");
  const secondary = cyrb53(canonical, 0x9e3779b9).toString(36).padStart(11, "0").slice(-6);
  const lenTail = canonical.length.toString(36);
  return `${primary}${secondary}${lenTail}`;
}

/**
 * Menetapkan ID deterministik `<prefix>-<hash>` untuk seluruh baris impor CSV/JSON.
 * Baris identik dalam satu berkas diberi akhiran `-2`, `-3`, dst. sesuai urutan kemunculan.
 */
export function assignContentHashIds(
  prefix: "csv" | "json",
  rows: ReadonlyArray<{ word: string; reading: string; meaning: string }>,
): string[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const base = `${prefix}-${hashRowContent(row.word, row.reading, row.meaning)}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}
