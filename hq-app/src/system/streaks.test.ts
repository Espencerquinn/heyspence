import { describe, expect, it } from 'vitest';
import {
  buildLogIndex, dueHabitsOn, isDueOn, isMetOn, logKey, streakFor,
} from './streaks';
import type { Habit, HabitLog } from '../types';

const base: Omit<Habit, 'id' | 'cadence' | 'weekdays' | 'target_per_week'> = {
  name: 'Test',
  domain: 'physical',
  target_count: 1,
  xp_value: 25,
  sort_order: 0,
  archived_at: null,
};

const daily = (id = 'h1'): Habit =>
  ({ ...base, id, cadence: 'daily', weekdays: null, target_per_week: null });

const onWeekdays = (weekdays: number[], id = 'h2'): Habit =>
  ({ ...base, id, cadence: 'weekdays', weekdays, target_per_week: null });

const nPerWeek = (n: number, id = 'h3'): Habit =>
  ({ ...base, id, cadence: 'n_per_week', weekdays: null, target_per_week: n });

const logs = (...pairs: Array<[string, string, number?]>): HabitLog[] =>
  pairs.map(([habit_id, log_date, count]) => ({ habit_id, log_date, count: count ?? 1 }));

describe('logKey / buildLogIndex', () => {
  it('indexes counts by habit and date', () => {
    const idx = buildLogIndex(logs(['h1', '2026-08-31', 3]));
    expect(idx.get(logKey('h1', '2026-08-31'))).toBe(3);
    expect(idx.get(logKey('h1', '2026-08-30'))).toBeUndefined();
  });
});

describe('isDueOn — daily', () => {
  it('is due every day', () => {
    const idx = buildLogIndex([]);
    expect(isDueOn(daily(), '2026-08-31', idx)).toBe(true);
    expect(isDueOn(daily(), '2026-09-06', idx)).toBe(true);
  });
});

describe('isDueOn — weekdays', () => {
  it('is due only on the listed weekdays', () => {
    const idx = buildLogIndex([]);
    const h = onWeekdays([1, 3, 5]); // Mon/Wed/Fri
    expect(isDueOn(h, '2026-08-31', idx)).toBe(true);  // Monday
    expect(isDueOn(h, '2026-09-01', idx)).toBe(false); // Tuesday
    expect(isDueOn(h, '2026-09-02', idx)).toBe(true);  // Wednesday
  });
});

describe('isDueOn — n_per_week', () => {
  it('is due while the week target is unmet', () => {
    const idx = buildLogIndex([]);
    expect(isDueOn(nPerWeek(3), '2026-09-02', idx)).toBe(true);
  });

  it('stops being due once the week target is met', () => {
    // week of Mon 2026-08-31
    const idx = buildLogIndex(logs(
      ['h3', '2026-08-31'], ['h3', '2026-09-01'], ['h3', '2026-09-02'],
    ));
    expect(isDueOn(nPerWeek(3), '2026-09-03', idx)).toBe(false);
  });

  it('stays due on a day it was itself logged, so the tick stays visible', () => {
    const idx = buildLogIndex(logs(
      ['h3', '2026-08-31'], ['h3', '2026-09-01'], ['h3', '2026-09-02'],
    ));
    expect(isDueOn(nPerWeek(3), '2026-09-02', idx)).toBe(true);
  });

  it('resets with the new week', () => {
    const idx = buildLogIndex(logs(
      ['h3', '2026-08-31'], ['h3', '2026-09-01'], ['h3', '2026-09-02'],
    ));
    expect(isDueOn(nPerWeek(3), '2026-09-07', idx)).toBe(true); // next Monday
  });
});

describe('isMetOn', () => {
  it('requires reaching target_count, not merely being logged', () => {
    const steps: Habit = { ...daily('steps'), target_count: 10000 };
    const idx = buildLogIndex(logs(['steps', '2026-08-31', 6420]));
    expect(isMetOn(steps, '2026-08-31', idx)).toBe(false);

    const idx2 = buildLogIndex(logs(['steps', '2026-08-31', 10000]));
    expect(isMetOn(steps, '2026-08-31', idx2)).toBe(true);
  });
});

describe('streakFor', () => {
  it('is zero with no logs', () => {
    expect(streakFor(daily(), buildLogIndex([]), '2026-08-31')).toBe(0);
  });

  it('counts consecutive met days ending today', () => {
    const idx = buildLogIndex(logs(
      ['h1', '2026-08-29'], ['h1', '2026-08-30'], ['h1', '2026-08-31'],
    ));
    expect(streakFor(daily(), idx, '2026-08-31')).toBe(3);
  });

  it('does NOT break when today is simply not done yet', () => {
    // Today is still in progress — an unticked today must not zero the streak.
    const idx = buildLogIndex(logs(['h1', '2026-08-29'], ['h1', '2026-08-30']));
    expect(streakFor(daily(), idx, '2026-08-31')).toBe(2);
  });

  it('breaks on a missed day before today', () => {
    const idx = buildLogIndex(logs(
      ['h1', '2026-08-28'], ['h1', '2026-08-29'], ['h1', '2026-08-31'],
    ));
    expect(streakFor(daily(), idx, '2026-08-31')).toBe(1);
  });

  it('skips days the habit was not due', () => {
    const h = onWeekdays([1, 3, 5], 'mwf');
    // Mon 8/31, Wed 9/2, Fri 9/4 all met; Tue/Thu never due.
    const idx = buildLogIndex(logs(
      ['mwf', '2026-08-31'], ['mwf', '2026-09-02'], ['mwf', '2026-09-04'],
    ));
    expect(streakFor(h, idx, '2026-09-04')).toBe(3);
  });

  it('stops after 400 days rather than scanning forever', () => {
    const dates: Array<[string, string]> = [];
    let d = '2026-08-31';
    for (let i = 0; i < 500; i++) { dates.push(['h1', d]); d = addDaysLocal(d, -1); }
    const idx = buildLogIndex(logs(...dates));
    expect(streakFor(daily(), idx, '2026-08-31')).toBe(400);
  });
});

describe('dueHabitsOn', () => {
  it('filters to due, non-archived habits in sort order', () => {
    const idx = buildLogIndex([]);
    const a: Habit = { ...daily('a'), sort_order: 2 };
    const b: Habit = { ...daily('b'), sort_order: 1 };
    const gone: Habit = { ...daily('c'), archived_at: '2026-01-01' };
    const tue: Habit = { ...onWeekdays([2], 'd') };
    const out = dueHabitsOn([a, b, gone, tue], '2026-08-31', idx); // Monday
    expect(out.map((h) => h.id)).toEqual(['b', 'a']);
  });
});

// local helper so the test file does not depend on import order
function addDaysLocal(iso: string, n: number): string {
  const [y, m, dd] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, dd, 12);
  dt.setDate(dt.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
