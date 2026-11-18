import { Inflate } from "fflate";
import { Decompress } from "fzstd";

export const MAX_ZIP_ENTRIES = 100_000;
export const MAX_APKG_DB_BYTES = 256 * 1024 * 1024;
export const MAX_APKG_MEDIA_ENTRY_BYTES = 64 * 1024 * 1024;
export const MAX_APKG_MEDIA_TOTAL_BYTES = 512 * 1024 * 1024;
export const MAX_YOMITAN_ENTRY_BYTES = 64 * 1024 * 1024;
export const MAX_YOMITAN_TOTAL_BYTES = 512 * 1024 * 1024;

export function isIgnoredArchivePath(rawPath: string): boolean {
  return rawPath
    .split("/")
    .filter(Boolean)
    .some((seg) => seg.toLowerCase() === "__macosx" || seg.startsWith("._"));
}

export function shouldPreferArchivePath(candidatePath: string, existingPath?: string): boolean {
  if (!existingPath) return true;
  const depth = (p: string) => p.split("/").filter(Boolean).length;
  return depth(candidatePath) < depth(existingPath);
}

export class ArchiveLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchiveLimitError";
  }
}

function joinChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  if (chunks.length === 0) return new Uint8Array(0);
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(totalBytes);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/**
 * Mendekompresi aliran Deflate mentah dengan batas ukuran output agar terlindung dari zip bomb.
 */
export function inflateWithLimit(
  compressed: Uint8Array,
  maxBytes: number,
  context = "entri ZIP",
  declaredUncompressedSize?: number,
): Uint8Array {
  if (
    declaredUncompressedSize !== undefined &&
    declaredUncompressedSize !== 0xffffffff &&
    declaredUncompressedSize > maxBytes
  ) {
    throw new ArchiveLimitError(
      `Ukuran terdeklarasi "${context}" melebihi batas aman (${Math.round(maxBytes / (1024 * 1024))} MB).`,
    );
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const inflator = new Inflate((chunk) => {
    totalBytes += chunk.byteLength;
    if (totalBytes > maxBytes) {
      throw new ArchiveLimitError(
        `Ukuran hasil dekompresi "${context}" melebihi batas aman (${Math.round(maxBytes / (1024 * 1024))} MB).`,
      );
    }
    chunks.push(chunk);
  });

  inflator.push(compressed, true);
  return joinChunks(chunks, totalBytes);
}

/**
 * Mendekompresi aliran Zstandard dengan batas ukuran output agar terlindung dari zstd bomb.
 */
export function zstdDecompressWithLimit(
  data: Uint8Array,
  maxBytes: number,
  context = "data",
): Uint8Array {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const d = new Decompress((chunk) => {
    totalBytes += chunk.byteLength;
    if (totalBytes > maxBytes) {
      throw new ArchiveLimitError(
        `Ukuran hasil dekompresi Zstandard pada ${context} melebihi batas aman (${Math.round(maxBytes / (1024 * 1024))} MB).`,
      );
    }
    chunks.push(chunk);
  });
  d.push(data, true);
  return joinChunks(chunks, totalBytes);
}

/** Memastikan URL eksternal hanya memakai skema HTTP(S) yang aman. */
export function sanitizeHttpUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return trimmed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
