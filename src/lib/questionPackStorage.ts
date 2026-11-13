/**
 * Penyimpanan & Manajemen Paket Soal Ujian JLPT (IndexedDB / Dexie)
 *
 * Mengelola penyimpanan paket soal QuestionPack secara lokal di browser,
 * validasi impor berkas JSON, serta pemuatan otomatis paket bawaan (seed pack)
 * secara idempoten saat pertama kali aplikasi dibuka.
 */

import Dexie, { type Table } from "dexie";
import {
  QuestionPack,
  validateQuestionPack
} from "./questionPack";

const SEED_PACK_ID = "jlpt-n5-seed-pack-v1";
const SEED_PACK_VERSION = "1.0.0";

class QuestionPackDatabase extends Dexie {
  packs!: Table<QuestionPack, string>;

  constructor() {
    super("ma-immersion-question-packs");
    this.version(1).stores({
      packs: "id, level, version, createdAt"
    });
  }
}

export const questionPackDb = new QuestionPackDatabase();

/**
 * Menyimpan atau memperbarui QuestionPack ke IndexedDB.
 */
export async function saveQuestionPack(pack: QuestionPack): Promise<void> {
  const validation = validateQuestionPack(pack);
  if (!validation.valid) {
    throw new Error(`Validasi QuestionPack gagal: ${validation.errors.join("; ")}`);
  }
  await questionPackDb.packs.put(pack);
}

/**
 * Mengambil QuestionPack berdasarkan ID.
 */
export async function getQuestionPack(id: string): Promise<QuestionPack | undefined> {
  return questionPackDb.packs.get(id);
}

/**
 * Mengambil daftar seluruh QuestionPack yang tersimpan di aplikasi.
 */
export async function listQuestionPacks(): Promise<QuestionPack[]> {
  return questionPackDb.packs.toArray();
}

/**
 * Menghapus QuestionPack berdasarkan ID.
 */
export async function deleteQuestionPack(id: string): Promise<void> {
  await questionPackDb.packs.delete(id);
}

/**
 * Memvalidasi dan mengimpor QuestionPack dari string JSON.
 */
export async function importQuestionPackFromJson(
  jsonString: string
): Promise<{ success: boolean; pack?: QuestionPack; errors?: string[] }> {
  try {
    const parsed = JSON.parse(jsonString) as QuestionPack;
    const validation = validateQuestionPack(parsed);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    await saveQuestionPack(parsed);
    return {
      success: true,
      pack: parsed
    };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : "Format berkas JSON tidak valid."]
    };
  }
}

/**
 * Memastikan paket bawaan (seed pack) terpasang di database aplikasi secara idempoten.
 * Jika belum ada, atau jika versinya diperbarui, paket akan dipasang tanpa mengganggu
 * paket buatan pengguna.
 */
export async function ensureSeedPackLoaded(): Promise<QuestionPack> {
  const existing = await questionPackDb.packs.get(SEED_PACK_ID);
  if (existing && existing.version === SEED_PACK_VERSION) {
    return existing;
  }

  const { default: seedPackData } = await import("../data/seedQuestionPack.json");
  const seed = seedPackData as unknown as QuestionPack;
  await saveQuestionPack(seed);
  return seed;
}

