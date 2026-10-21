import { describe, expect, it } from 'vitest';
import { nextDueLabel, scheduleLabel } from './protocol';
import type { Habit } from '../types';

const h = (over: Partial<Habit>): Habit => ({
  id: 'x', name: 'x', domain: 'physical', cadence: 'daily', weekdays: null,
  target_per_week: null, target_count: 1, xp_value: 10, sort_order: 0, archived_at: null, ...over,
});

describe('scheduleLabel', () => {
  it('names weekdays in calendar order', () => {
    expect(scheduleLabel(h({ cadence: 'weekdays', weekdays: [5, 1, 3] }))).toBe('Mon · Wed · Fri');
    expect(scheduleLabel(h({}))).toBe('Daily');
  });
});

describe('nextDueLabel', () => {
  // 2026-10-21 is a Wednesday
  it('finds the next scheduled day after today', () => {
    expect(nextDueLabel(h({ cadence: 'weekdays', weekdays: [0] }), '2026-10-21')).toBe('Sun');
    expect(nextDueLabel(h({ cadence: 'weekdays', weekdays: [4] }), '2026-10-21')).toBe('Tomorrow');
    expect(nextDueLabel(h({ cadence: 'weekdays', weekdays: [3] }), '2026-10-21')).toBe('Wed');
  });
});
