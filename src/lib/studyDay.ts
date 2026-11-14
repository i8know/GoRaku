export const DEFAULT_DAY_START_HOUR = 4;

export function clampDayStartHour(dayStartHour: number = DEFAULT_DAY_START_HOUR): number {
  if (typeof dayStartHour !== "number" || !Number.isFinite(dayStartHour)) {
    return DEFAULT_DAY_START_HOUR;
  }
  return Math.max(0, Math.min(8, Math.floor(dayStartHour)));
}

function toDate(now: Date | number = Date.now()): Date {
  return new Date(typeof now === "number" ? now : now.getTime());
}

/**
 * Mengembalikan komponen tanggal kalender lokal (tahun, bulan 0-11, tanggal)
 * dari hari belajar untuk waktu `now`, yaitu tanggal lokal dari `(now - dayStartHour jam)`.
 */
function studyCalendarParts(
  now: Date | number = Date.now(),
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): { year: number; month: number; day: number; hour: number } {
  const h = clampDayStartHour(dayStartHour);
  const shifted = toDate(now);
  shifted.setHours(shifted.getHours() - h);
  return {
    year: shifted.getFullYear(),
    month: shifted.getMonth(),
    day: shifted.getDate(),
    hour: h,
  };
}

/**
 * Kunci string stabil ("YYYY-MM-DD") untuk hari belajar pada `now` dengan batas `dayStartHour`.
 */
export function studyDayKey(
  now: Date | number = Date.now(),
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): string {
  const { year, month, day } = studyCalendarParts(now, dayStartHour);
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/**
 * Timestamp (ms) awal hari belajar untuk `now` (pukul `dayStartHour:00:00.000` pada tanggal hari belajar).
 */
export function startOfStudyDay(
  now: Date | number = Date.now(),
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): number {
  const { year, month, day, hour } = studyCalendarParts(now, dayStartHour);
  return new Date(year, month, day, hour, 0, 0, 0).getTime();
}

/**
 * Timestamp (ms) awal hari belajar pada hari ke-`intervalDays` (>= 1) dari hari belajar `now`,
 * dihitung dengan aritmetika tanggal kalender lokal (bukan kelipatan 24 jam).
 */
export function scheduleNextStudyDay(
  now: Date | number = Date.now(),
  intervalDays: number,
  dayStartHour: number = DEFAULT_DAY_START_HOUR,
): number {
  const { year, month, day, hour } = studyCalendarParts(now, dayStartHour);
  const daysToAdd = Math.max(1, Math.round(intervalDays));
  return new Date(year, month, day + daysToAdd, hour, 0, 0, 0).getTime();
}

/**
 * Normalisasi kunci tanggal lama (`Date.prototype.toDateString()`, mis. "Sun May 10 2026")
 * menjadi format kanonik "YYYY-MM-DD" agar data sebelum Tahap 1 tetap cocok.
 */
export function normalizeStudyDayKey(rawDate: string | undefined): string {
  if (!rawDate) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
