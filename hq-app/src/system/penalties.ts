import type { Habit } from '../types';
import { eachDay } from './dates';
import { dueHabitsOn, isMetOn } from './streaks';

export interface PenaltyInput {
  /** First day to evaluate (inclusive). */
  fromDate: string;
  /** Last day to evaluate (inclusive). Always YESTERDAY — today is still live. */
  throughDate: string;
  habits: ReadonlyArray<Habit>;
  index: Map<string, number>;
  /** Dates that already have a penalty row, so re-evaluation is idempotent. */
  alreadyPenalized: ReadonlySet<string>;
}

export interface PenaltyOutcome {
  date: string;
  missedHabitIds: string[];
}

/**
 * A day earns a penalty when it had at least one due habit and any of them
 * went unmet. Days with nothing due are free. Already-penalized days are
 * skipped so this can run on every app load without stacking penalties.
 */
export function evaluatePenalties(input: PenaltyInput): PenaltyOutcome[] {
  const { fromDate, throughDate, habits, index, alreadyPenalized } = input;
  const out: PenaltyOutcome[] = [];

  for (const date of eachDay(fromDate, throughDate)) {
    if (alreadyPenalized.has(date)) continue;
    const due = dueHabitsOn(habits, date, index);
    if (due.length === 0) continue;
    const missed = due.filter((h) => !isMetOn(h, date, index)).map((h) => h.id);
    if (missed.length > 0) out.push({ date, missedHabitIds: missed });
  }
  return out;
}
