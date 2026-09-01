import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, daysBetween, eachDay, todayISO, weekStart } from './dates';

describe('todayISO', () => {
  it('uses LOCAL calendar date, not UTC', () => {
    // 2026-08-31 23:30 local. A naive toISOString() would yield 2026-09-01
    // for anyone west of UTC. The local date is what the user ticked.
    const local = new Date(2026, 7, 31, 23, 30, 0);
    expect(todayISO(local)).toBe('2026-08-31');
  });

  it('pads month and day', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('advances within a month', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
  });
  it('goes backwards', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('is identity for zero', () => {
    expect(addDays('2026-08-31', 0)).toBe('2026-08-31');
  });
});

describe('dayOfWeek', () => {
  it('returns 0 for Sunday and 1 for Monday', () => {
    expect(dayOfWeek('2026-08-30')).toBe(0); // Sunday
    expect(dayOfWeek('2026-08-31')).toBe(1); // Monday
  });
});

describe('weekStart', () => {
  it('returns the Monday of the containing week', () => {
    expect(weekStart('2026-09-02')).toBe('2026-08-31'); // Wed -> Mon
    expect(weekStart('2026-08-31')).toBe('2026-08-31'); // Mon -> itself
  });
  it('treats Sunday as the END of the week, not the start', () => {
    expect(weekStart('2026-09-06')).toBe('2026-08-31'); // Sunday -> prior Monday
  });
});

describe('eachDay', () => {
  it('is inclusive of both ends', () => {
    expect(eachDay('2026-08-30', '2026-09-01'))
      .toEqual(['2026-08-30', '2026-08-31', '2026-09-01']);
  });
  it('returns a single day when from === to', () => {
    expect(eachDay('2026-08-30', '2026-08-30')).toEqual(['2026-08-30']);
  });
  it('returns empty when from is after to', () => {
    expect(eachDay('2026-09-01', '2026-08-30')).toEqual([]);
  });
});

describe('daysBetween', () => {
  it('counts forward days', () => {
    expect(daysBetween('2026-08-30', '2026-09-01')).toBe(2);
  });
  it('is negative going backwards', () => {
    expect(daysBetween('2026-09-01', '2026-08-30')).toBe(-2);
  });
});
