import type { Habit, HabitLog } from '../types';
import { addDays, dayOfWeek, eachDay, weekStart } from './dates';

/** Longest streak we will ever scan backwards. Keeps a corrupt index bounded. */
const MAX_SCAN = 400;

export function logKey(habitId: string, date: string): string {
  return `${habitId}:${date}`;
}

export function buildLogIndex(logs: ReadonlyArray<HabitLog>): Map<string, number> {
  const idx = new Map<string, number>();
  for (const l of logs) idx.set(logKey(l.habit_id, l.log_date), l.count);
  return idx;
}

function countThisWeek(habit: Habit, date: string, index: Map<string, number>): number {
  return eachDay(weekStart(date), date)
    .filter((d) => (index.get(logKey(habit.id, d)) ?? 0) >= habit.target_count)
    .length;
}

/**
 * Is this habit expected today?
 *  - daily      → always
 *  - weekdays   → only on the listed days of the week
 *  - n_per_week → while the Mon–Sun target is unmet, OR on a day already
 *                 logged (so ticking it does not make the row vanish)
 */
export function isDueOn(habit: Habit, date: string, index: Map<string, number>): boolean {
  if (habit.archived_at) return false;
  switch (habit.cadence) {
    case 'daily':
      return true;
    case 'weekdays':
      return (habit.weekdays ?? []).includes(dayOfWeek(date));
    case 'n_per_week': {
      if ((index.get(logKey(habit.id, date)) ?? 0) > 0) return true;
      const target = habit.target_per_week ?? 0;
      // count days BEFORE today in this week, so today still shows as due
      const before = eachDay(weekStart(date), date)
        .filter((d) => d !== date)
        .filter((d) => (index.get(logKey(habit.id, d)) ?? 0) >= habit.target_count)
        .length;
      return before < target;
    }
  }
}

/** Did the habit actually hit its target on this date? */
export function isMetOn(habit: Habit, date: string, index: Map<string, number>): boolean {
  return (index.get(logKey(habit.id, date)) ?? 0) >= habit.target_count;
}

/**
 * Consecutive met days ending at (or the day before) `today`.
 * An unticked TODAY does not break the streak — the day is still in progress.
 * Days the habit was not due are skipped, not counted and not breaking.
 */
export function streakFor(habit: Habit, index: Map<string, number>, today: string): number {
  let streak = 0;
  let cursor = today;
  for (let i = 0; i < MAX_SCAN; i++) {
    const due = isDueOn(habit, cursor, index);
    const met = isMetOn(habit, cursor, index);
    if (met) streak += 1;
    else if (due && cursor !== today) break;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function dueHabitsOn(
  habits: ReadonlyArray<Habit>, date: string, index: Map<string, number>,
): Habit[] {
  return habits
    .filter((h) => !h.archived_at && isDueOn(h, date, index))
    .sort((a, b) => a.sort_order - b.sort_order);
}
