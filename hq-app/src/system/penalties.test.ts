import { describe, expect, it } from 'vitest';
import { evaluatePenalties } from './penalties';
import { buildLogIndex } from './streaks';
import type { Habit, HabitLog } from '../types';

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id, name: id, domain: 'physical', cadence: 'daily', weekdays: null,
  target_per_week: null, target_count: 1, xp_value: 25, sort_order: 0,
  archived_at: null, ...over,
});

const logs = (...pairs: Array<[string, string]>): HabitLog[] =>
  pairs.map(([habit_id, log_date]) => ({ habit_id, log_date, count: 1 }));

describe('evaluatePenalties', () => {
  it('flags a day where a due habit went unlogged', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-30', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([{ date: '2026-08-30', missedHabitIds: ['a'] }]);
  });

  it('does not flag a fully cleared day', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-30', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex(logs(['a', '2026-08-30'])),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([]);
  });

  it('flags a partially cleared day and lists only what was missed', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-30', throughDate: '2026-08-30',
      habits: [habit('a'), habit('b')],
      index: buildLogIndex(logs(['a', '2026-08-30'])),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([{ date: '2026-08-30', missedHabitIds: ['b'] }]);
  });

  it('does not flag a day with no due habits at all', () => {
    const tuesdayOnly = habit('t', { cadence: 'weekdays', weekdays: [2] });
    const out = evaluatePenalties({
      fromDate: '2026-08-31', throughDate: '2026-08-31', // a Monday
      habits: [tuesdayOnly], index: buildLogIndex([]),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([]);
  });

  it('skips dates already penalized, so evaluation is idempotent', () => {
    const args = {
      fromDate: '2026-08-29', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
    };
    const first = evaluatePenalties({ ...args, alreadyPenalized: new Set() });
    expect(first.map((p) => p.date)).toEqual(['2026-08-29', '2026-08-30']);

    const second = evaluatePenalties({
      ...args, alreadyPenalized: new Set(first.map((p) => p.date)),
    });
    expect(second).toEqual([]);
  });

  it('evaluates a multi-day gap in order', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-28', throughDate: '2026-08-30',
      habits: [habit('a')],
      index: buildLogIndex(logs(['a', '2026-08-29'])),
      alreadyPenalized: new Set(),
    });
    expect(out.map((p) => p.date)).toEqual(['2026-08-28', '2026-08-30']);
  });

  it('returns nothing when the range is empty (nothing to catch up on)', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-31', throughDate: '2026-08-30', // from > through
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(),
    });
    expect(out).toEqual([]);
  });

  it('ignores archived habits', () => {
    const out = evaluatePenalties({
      fromDate: '2026-08-30', throughDate: '2026-08-30',
      habits: [habit('a', { archived_at: '2026-01-01' })],
      index: buildLogIndex([]), alreadyPenalized: new Set(),
    });
    expect(out).toEqual([]);
  });
});
