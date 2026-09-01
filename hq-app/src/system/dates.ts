/**
 * All HQ day math operates on 'YYYY-MM-DD' strings in the user's LOCAL
 * calendar. Never call toISOString() on a local Date — it shifts the day for
 * anyone west of UTC, which silently corrupts streaks.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Parse 'YYYY-MM-DD' into a local-noon Date, immune to DST edges. */
function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function format(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return format(now);
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return format(d);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(iso: string): number {
  return parse(iso).getDay();
}

/** Monday of the week containing `iso`. Weeks run Monday–Sunday. */
export function weekStart(iso: string): string {
  const dow = dayOfWeek(iso);
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(iso, -back);
}

export function daysBetween(aISO: string, bISO: string): number {
  const ms = parse(bISO).getTime() - parse(aISO).getTime();
  return Math.round(ms / 86_400_000);
}

/** Inclusive range. Empty if `fromISO` is after `toISO`. */
export function eachDay(fromISO: string, toISO: string): string[] {
  const span = daysBetween(fromISO, toISO);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, i) => addDays(fromISO, i));
}

/** 'MON 31 AUG' — for the top bar and timeline headers. */
export function formatShort(iso: string): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const mons = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const d = parse(iso);
  return `${days[d.getDay()]} ${d.getDate()} ${mons[d.getMonth()]}`;
}
