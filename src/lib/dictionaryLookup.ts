import {
  deinflect,
  matchesDeinflectRule,
  type DeinflectCandidate,
} from "./deinflect";
import { isKanaOnly, toHiragana } from "./kana";
import {
  lexiconDb,
  type DictionaryRecord,
  type LexiconDatabase,
  type TermRecord,
} from "./lexiconDb";

export interface DictionarySense {
  dictId: number;
  dictTitle: string;
  dictPriority: number;
  glossary: string[];
  tags: string;
  termTags: string;
  score: number;
}

export interface LookupResultItem {
  /** Kata dalam bentuk kamus (kanji/kana) */
  expression: string;
  /** Bacaan furigana/kana */
  reading: string;
  /** Bacaan yang telah dinormalisasi ke Hiragana */
  readingHiragana: string;
  /** Panjang substring sumber pada teks asli yang cocok dengan entri ini */
  matchLength: number;
  /** Potongan teks asli yang cocok */
  matchedText: string;
  /** Rantai alasan konjugasi (kosong jika cocok langsung tanpa deinflection) */
  deinflectReasons: string[];
  /** Aturan gramatikal pada kamus (v1, v5, adj-i, vs, vk, dll.) */
  rules: string;
  /** Tag gabungan */
  tags: string[];
  /** Prioritas kamus terbaik (angka terkecil = tertinggi) */
  bestDictPriority: number;
  /** Skor entri tertinggi */
  maxScore: number;
  /** Gabungan arti dari berbagai kamus aktif, diurutkan menurut prioritas kamus & skor */
  senses: DictionarySense[];
}

export interface LookupOutput {
  /** Panjang kecocokan sumber terpanjang (0 jika tidak ada hasil) */
  matchedLength: number;
  /** Substring teks sumber untuk kecocokan terpanjang */
  matchedText: string;
  /** Daftar hasil yang dikelompokkan per (expression, reading) */
  results: LookupResultItem[];
}

export interface LookupOptions {
  /** Panjang substring maksimum yang dipindai dari startIndex (default: 20) */
  maxLength?: number;
  /** Kedalaman rantai deinflection maksimum (default: 7) */
  maxDeinflectDepth?: number;
  /** Instance database kustom (untuk pengujian unit) */
  db?: LexiconDatabase;
}

interface SubstringCandidate extends DeinflectCandidate {
  sourceLength: number;
  sourceText: string;
  hiraganaTerm: string;
  isKanaCandidate: boolean;
}

/**
 * Memindai substring dari `startIndex` (panjang maks ±20 karakter turun sampai 1),
 * menghasilkan bentuk asli + deinflection, lalu mengeksekusi SATU transaksi query
 * ke IndexedDB dan mengelompokkan serta mengurutkan hasilnya.
 */
export async function lookup(
  text: string,
  startIndex: number,
  options: LookupOptions = {},
): Promise<LookupOutput> {
  const maxLength = options.maxLength ?? 20;
  const maxDeinflectDepth = options.maxDeinflectDepth ?? 7;
  const db = options.db ?? lexiconDb;

  if (!text || startIndex < 0 || startIndex >= text.length) {
    return { matchedLength: 0, matchedText: "", results: [] };
  }

  // Potong teks mulai startIndex hingga maxLength atau batas baris
  let sliceEnd = Math.min(text.length, startIndex + maxLength);
  for (let i = startIndex; i < sliceEnd; i++) {
    const ch = text[i];
    if (ch === "\n" || ch === "\r" || ch === "\0") {
      sliceEnd = i;
      break;
    }
  }

  const windowText = text.slice(startIndex, sliceEnd);
  if (!windowText.trim()) {
    return { matchedLength: 0, matchedText: "", results: [] };
  }

  // 1. Bangun seluruh kandidat dari panjang terpanjang turun ke 1
  const candidatesByExpression = new Map<string, SubstringCandidate[]>();
  const candidatesByReading = new Map<string, SubstringCandidate[]>();

  for (let len = windowText.length; len >= 1; len--) {
    const sub = windowText.slice(0, len);
    if (!sub.trim()) continue;

    const deinflected = deinflect(sub, maxDeinflectDepth);
    for (const cand of deinflected) {
      const isKanaCandidate = isKanaOnly(cand.term);
      const hiraganaTerm = toHiragana(cand.term);

      const item: SubstringCandidate = {
        ...cand,
        sourceLength: len,
        sourceText: sub,
        hiraganaTerm,
        isKanaCandidate,
      };

      const exprList = candidatesByExpression.get(cand.term);
      if (exprList) {
        exprList.push(item);
      } else {
        candidatesByExpression.set(cand.term, [item]);
      }

      // Jika kandidat ditulis dengan kana (Hiragana/Katakana), cari juga lewat indeks reading
      if (isKanaCandidate) {
        const readList = candidatesByReading.get(hiraganaTerm);
        if (readList) {
          readList.push(item);
        } else {
          candidatesByReading.set(hiraganaTerm, [item]);
        }
      }
    }
  }

  const expressionKeys = Array.from(candidatesByExpression.keys());
  const readingKeys = Array.from(candidatesByReading.keys());

  if (expressionKeys.length === 0 && readingKeys.length === 0) {
    return { matchedLength: 0, matchedText: "", results: [] };
  }

  // 2. Eksekusi SATU transaksi baca IndexedDB untuk mengambil kamus aktif + seluruh kandidat
  const { activeDictMap, matchedRows } = await db.transaction(
    "r",
    db.dictionaries,
    db.terms,
    async () => {
      const allDicts = await db.dictionaries.toArray();
      const dictMap = new Map<number, DictionaryRecord>();
      for (const d of allDicts) {
        if (d.enabled && d.id != null) {
          dictMap.set(d.id, d);
        }
      }

      if (dictMap.size === 0) {
        return {
          activeDictMap: dictMap,
          matchedRows: [] as TermRecord[],
        };
      }

      const [byExpr, byRead] = await Promise.all([
        expressionKeys.length > 0
          ? db.terms.where("expression").anyOf(expressionKeys).toArray()
          : Promise.resolve([] as TermRecord[]),
        readingKeys.length > 0
          ? db.terms.where("reading").anyOf(readingKeys).toArray()
          : Promise.resolve([] as TermRecord[]),
      ]);

      // Gabungkan & hilangkan duplikat berdasarkan primary key `id`
      const seenIds = new Set<number>();
      const combined: TermRecord[] = [];
      for (const row of byExpr) {
        if (!dictMap.has(row.dictId)) continue;
        if (row.id != null) seenIds.add(row.id);
        combined.push(row);
      }
      for (const row of byRead) {
        if (!dictMap.has(row.dictId)) continue;
        if (row.id != null && seenIds.has(row.id)) continue;
        if (row.id != null) seenIds.add(row.id);
        combined.push(row);
      }

      return { activeDictMap: dictMap, matchedRows: combined };
    },
  );

  if (matchedRows.length === 0 || activeDictMap.size === 0) {
    return { matchedLength: 0, matchedText: "", results: [] };
  }

  // 3. Validasi aturan deinflection & kelompokkan per (expression, reading)
  const groupedMap = new Map<string, LookupResultItem>();

  for (const row of matchedRows) {
    const dict = activeDictMap.get(row.dictId);
    if (!dict) continue;

    // Kumpulkan kandidat yang cocok dengan baris kamus ini (baik via expression maupun via reading untuk kata berkana)
    const possibleCandidates: SubstringCandidate[] = [];
    const exprCands = candidatesByExpression.get(row.expression);
    if (exprCands) possibleCandidates.push(...exprCands);

    const readCands = candidatesByReading.get(row.reading);
    if (readCands) possibleCandidates.push(...readCands);

    if (possibleCandidates.length === 0) continue;

    // Pilih kandidat yang valid secara gramatikal dengan sourceLength terpanjang
    // (dan jumlah langkah deinflection paling sedikit jika sourceLength sama)
    let bestCand: SubstringCandidate | null = null;
    for (const cand of possibleCandidates) {
      if (!matchesDeinflectRule(cand.requiredTags, row.rules, row.tags)) {
        continue;
      }
      if (
        !bestCand ||
        cand.sourceLength > bestCand.sourceLength ||
        (cand.sourceLength === bestCand.sourceLength &&
          cand.reasons.length < bestCand.reasons.length)
      ) {
        bestCand = cand;
      }
    }

    if (!bestCand) continue;

    const displayReading = row.rawReading || row.reading || row.expression;
    const groupKey = `${row.expression}\u0000${row.reading}`;

    const sense: DictionarySense = {
      dictId: row.dictId,
      dictTitle: dict.title,
      dictPriority: dict.priority,
      glossary: row.glossary,
      tags: row.tags,
      termTags: row.termTags,
      score: row.score,
    };

    const rowTags = `${row.tags} ${row.termTags}`
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const existing = groupedMap.get(groupKey);
    if (!existing) {
      groupedMap.set(groupKey, {
        expression: row.expression,
        reading: displayReading,
        readingHiragana: row.reading,
        matchLength: bestCand.sourceLength,
        matchedText: bestCand.sourceText,
        deinflectReasons: bestCand.reasons,
        rules: row.rules,
        tags: Array.from(new Set(rowTags)),
        bestDictPriority: dict.priority,
        maxScore: row.score,
        senses: [sense],
      });
    } else {
      if (
        bestCand.sourceLength > existing.matchLength ||
        (bestCand.sourceLength === existing.matchLength &&
          bestCand.reasons.length < existing.deinflectReasons.length)
      ) {
        existing.matchLength = bestCand.sourceLength;
        existing.matchedText = bestCand.sourceText;
        existing.deinflectReasons = bestCand.reasons;
      }
      if (dict.priority < existing.bestDictPriority) {
        existing.bestDictPriority = dict.priority;
      }
      if (row.score > existing.maxScore) {
        existing.maxScore = row.score;
      }
      for (const t of rowTags) {
        if (!existing.tags.includes(t)) {
          existing.tags.push(t);
        }
      }
      existing.senses.push(sense);
    }
  }

  const results = Array.from(groupedMap.values());
  if (results.length === 0) {
    return { matchedLength: 0, matchedText: "", results: [] };
  }

  // Urutkan senses di dalam tiap grup menurut prioritas kamus lalu skor
  for (const item of results) {
    item.senses.sort(
      (a, b) => a.dictPriority - b.dictPriority || b.score - a.score,
    );
  }

  // Urutkan hasil utama:
  // 1. Panjang kecocokan sumber (menurun)
  // 2. Prioritas kamus (menaik: 1 lebih utama dari 2)
  // 3. Score entri (menurun)
  results.sort(
    (a, b) =>
      b.matchLength - a.matchLength ||
      a.bestDictPriority - b.bestDictPriority ||
      b.maxScore - a.maxScore,
  );

  const top = results[0];
  return {
    matchedLength: top.matchLength,
    matchedText: top.matchedText,
    results,
  };
}

