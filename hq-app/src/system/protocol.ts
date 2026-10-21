import type { Habit } from '../types';
import { addDays, dayOfWeek } from './dates';

export const isProtocol = (h: Habit) => h.kind === 'medication' || h.kind === 'supplement';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Daily", "Mon · Wed · Fri", "3× / week". */
export function scheduleLabel(h: Habit): string {
  switch (h.cadence) {
    case 'daily': return 'Daily';
    case 'weekdays': {
      const d = [...(h.weekdays ?? [])].sort();
      return d.length === 7 ? 'Daily' : d.map((x) => DAY[x]).join(' · ');
    }
    case 'n_per_week': return `${h.target_per_week ?? 0}× / week`;
  }
}

/** Next day strictly after `today` a weekday-scheduled item is due, as 'Sun' etc. */
export function nextDueLabel(h: Habit, today: string): string | null {
  if (h.cadence !== 'weekdays' || !h.weekdays?.length) return null;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i);
    if (h.weekdays.includes(dayOfWeek(d))) return i === 1 ? 'Tomorrow' : DAY[dayOfWeek(d)];
  }
  return null;
}

export const WEEKDAY_SHORT = DAY;
