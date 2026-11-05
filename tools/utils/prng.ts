/**
 * Pseudorandom Number Generator (PRNG) deterministik berbasis Mulberry32.
 * Menjamin hasil yang 100% identik di setiap mesin dan arsitektur untuk seed yang sama.
 */

export interface PRNG {
  /** Menghasilkan angka float acak dalam rentang [0, 1) */
  next(): number;
  /** Menghasilkan bilangan bulat acak dalam rentang [min, max] (inklusif) */
  nextInt(min: number, max: number): number;
  /** Mengacak array dan mengembalikan salinan baru (Fisher-Yates shuffle) */
  shuffle<T>(array: readonly T[]): T[];
  /** Memilih satu elemen secara acak dari array */
  pickOne<T>(array: readonly T[]): T;
  /** Memilih n elemen unik acak dari array */
  pickMultiple<T>(array: readonly T[], count: number): T[];
}

export function createPRNG(seed: number): PRNG {
  // Pastikan seed berupa integer 32-bit tak bertanda
  let s = Math.floor(Math.abs(seed)) >>> 0;
  if (s === 0) s = 1; // Hindari seed 0

  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    if (low >= high) return low;
    return low + Math.floor(next() * (high - low + 1));
  }

  function shuffle<T>(array: readonly T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function pickOne<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error("pickOne: array tidak boleh kosong");
    }
    const idx = Math.floor(next() * array.length);
    return array[idx];
  }

  function pickMultiple<T>(array: readonly T[], count: number): T[] {
    if (count <= 0) return [];
    if (count >= array.length) return shuffle(array);
    const shuffled = shuffle(array);
    return shuffled.slice(0, count);
  }

  return {
    next,
    nextInt,
    shuffle,
    pickOne,
    pickMultiple,
  };
}

export class Mulberry32 implements PRNG {
  private prng: PRNG;
  constructor(seed: number) {
    this.prng = createPRNG(seed);
  }
  next(): number {
    return this.prng.next();
  }
  nextInt(min: number, max: number): number {
    return this.prng.nextInt(min, max);
  }
  shuffle<T>(array: readonly T[]): T[] {
    return this.prng.shuffle(array);
  }
  pickOne<T>(array: readonly T[]): T {
    return this.prng.pickOne(array);
  }
  pickMultiple<T>(array: readonly T[], count: number): T[] {
    return this.prng.pickMultiple(array, count);
  }
}
