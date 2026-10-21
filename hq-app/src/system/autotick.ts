import type { Habit, Workout } from '../types';
import { isDueOn, logKey } from './streaks';

/** Tonal logs to Apple Health as a strength workout; match either signal. */
export function isStrength(w: Pick<Workout, 'name' | 'source'>): boolean {
  return /strength|tonal|weight/i.test(`${w.name} ${w.source ?? ''}`);
}

export interface AutoTick {
  habit: Habit;
  date: string;
  count: number;
}

/**
 * What synced health data says each auto-sourced habit's count should be.
 *
 * Only ever RAISES a count: a manual tick (say, steps walked with the phone
 * on a desk) is never undone by a lower synced number. A habit with no data
 * for the day is left alone rather than zeroed.
 */
export function planAutoTicks(input: {
  habits: ReadonlyArray<Habit>;
  dates: ReadonlyArray<string>;
  index: Map<string, number>;
  /** metric value by `${date}:${metric}` */
  health: Map<string, number>;
  workouts: ReadonlyArray<Pick<Workout, 'workout_date' | 'name' | 'source'>>;
}): AutoTick[] {
  const out: AutoTick[] = [];
  for (const habit of input.habits) {
    if (!habit.auto_source || habit.archived_at) continue;
    for (const date of input.dates) {
      if (!isDueOn(habit, date, input.index)) continue;
      const want = synced(habit, date, input.health, input.workouts);
      if (want === null) continue;
      const have = input.index.get(logKey(habit.id, date)) ?? 0;
      if (want > have) out.push({ habit, date, count: want });
    }
  }
  return out;
}

function synced(
  habit: Habit, date: string, health: Map<string, number>,
  workouts: ReadonlyArray<Pick<Workout, 'workout_date' | 'name' | 'source'>>,
): number | null {
  switch (habit.auto_source) {
    case 'steps': {
      const steps = health.get(`${date}:steps`);
      return steps === undefined ? null : Math.round(steps);
    }
    case 'workout':
    case 'strength': {
      const hit = workouts.some((w) => w.workout_date === date
        && (habit.auto_source === 'workout' || isStrength(w)));
      return hit ? habit.target_count : null;
    }
    default:
      return null;
  }
}
