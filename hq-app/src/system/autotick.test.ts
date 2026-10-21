import { describe, expect, it } from 'vitest';
import { isStrength, planAutoTicks } from './autotick';
import { buildLogIndex } from './streaks';
import type { Habit } from '../types';

const habit = (over: Partial<Habit>): Habit => ({
  id: 'h', name: 'h', domain: 'physical', cadence: 'daily', weekdays: null,
  target_per_week: null, target_count: 1, xp_value: 25, sort_order: 0,
  archived_at: null, ...over,
});

const steps = habit({ id: 'steps', target_count: 10000, auto_source: 'steps' });
const gym = habit({ id: 'gym', cadence: 'n_per_week', target_per_week: 4, auto_source: 'strength' });

describe('isStrength', () => {
  it('recognises Tonal sessions however Health names them', () => {
    expect(isStrength({ name: 'Traditional Strength Training', source: 'Tonal' })).toBe(true);
    expect(isStrength({ name: 'Functional Strength Training', source: null })).toBe(true);
    expect(isStrength({ name: 'Workout', source: 'Tonal' })).toBe(true);
    expect(isStrength({ name: 'Outdoor Walk', source: 'Apple Watch' })).toBe(false);
  });
});

describe('planAutoTicks', () => {
  const day = '2026-10-21';

  it('writes the synced step count, even below target', () => {
    const out = planAutoTicks({
      habits: [steps], dates: [day], index: buildLogIndex([]),
      health: new Map([[`${day}:steps`, 6421.6]]), workouts: [],
    });
    expect(out).toEqual([{ habit: steps, date: day, count: 6422 }]);
  });

  it('never lowers a manual tick', () => {
    const out = planAutoTicks({
      habits: [steps], dates: [day],
      index: buildLogIndex([{ habit_id: 'steps', log_date: day, count: 10000 }]),
      health: new Map([[`${day}:steps`, 4000]]), workouts: [],
    });
    expect(out).toEqual([]);
  });

  it('leaves a day with no synced data alone', () => {
    const out = planAutoTicks({
      habits: [steps], dates: [day], index: buildLogIndex([]),
      health: new Map(), workouts: [],
    });
    expect(out).toEqual([]);
  });

  it('ticks a strength habit only for a strength workout', () => {
    const walk = { workout_date: day, name: 'Outdoor Walk', source: 'Apple Watch' };
    const tonal = { workout_date: day, name: 'Traditional Strength Training', source: 'Tonal' };
    const base = { habits: [gym], dates: [day], index: buildLogIndex([]), health: new Map() };
    expect(planAutoTicks({ ...base, workouts: [walk] })).toEqual([]);
    expect(planAutoTicks({ ...base, workouts: [walk, tonal] }))
      .toEqual([{ habit: gym, date: day, count: 1 }]);
  });

  it('ignores habits before their active_from day', () => {
    const late = { ...steps, active_from: '2026-10-22' };
    const out = planAutoTicks({
      habits: [late], dates: [day], index: buildLogIndex([]),
      health: new Map([[`${day}:steps`, 12000]]), workouts: [],
    });
    expect(out).toEqual([]);
  });
});
