import { describe, expect, it } from 'vitest';
import { derivePlayer, questStreakFrom } from './derive';
import { buildLogIndex } from './streaks';
import { cumulativeXpFor } from './levels';
import type { Habit, HabitLog, XpEvent } from '../types';

const habit = (id: string, over: Partial<Habit> = {}): Habit => ({
  id, name: id, domain: 'physical', cadence: 'daily', weekdays: null,
  target_per_week: null, target_count: 1, xp_value: 25, sort_order: 0,
  archived_at: null, ...over,
});

const ev = (amount: number, domain: XpEvent['domain'], kind: XpEvent['kind'] = 'habit'): XpEvent =>
  ({ id: crypto.randomUUID(), amount, domain, kind, ref_id: null, occurred_on: '2026-08-31' });

const logs = (...p: Array<[string, string]>): HabitLog[] =>
  p.map(([habit_id, log_date]) => ({ habit_id, log_date, count: 1 }));

describe('derivePlayer', () => {
  it('is level 1 rank E with no events', () => {
    const p = derivePlayer([], [], buildLogIndex([]), '2026-08-31');
    expect(p.totalXp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.rank).toBe('E');
    expect(p.statLevels.STR).toBe(0);
  });

  it('derives level and rank from the ledger total', () => {
    const events = [ev(cumulativeXpFor(14), 'physical'), ev(640, 'intellectual')];
    const p = derivePlayer(events, [], buildLogIndex([]), '2026-08-31');
    expect(p.level).toBe(14);
    expect(p.rank).toBe('D');
    expect(p.into).toBe(640);
    expect(p.need).toBe(1000);
  });

  it('derives per-stat levels from per-domain pools', () => {
    const p = derivePlayer([ev(1200, 'musical')], [], buildLogIndex([]), '2026-08-31');
    expect(p.statLevels.SENSE).toBe(10);
    expect(p.statLevels.STR).toBe(0);
  });

  it('excludes null-domain events from stats but counts them in the total', () => {
    const p = derivePlayer([ev(100, null, 'quest_bonus')], [], buildLogIndex([]), '2026-08-31');
    expect(p.totalXp).toBe(100);
    expect(p.statLevels.STR).toBe(0);
  });

  it('subtracts penalties from the total', () => {
    const p = derivePlayer(
      [ev(1000, 'physical'), ev(-40, null, 'penalty')], [], buildLogIndex([]), '2026-08-31');
    expect(p.totalXp).toBe(960);
  });
});

describe('questStreakFrom', () => {
  it('counts consecutive fully-cleared days ending yesterday or today', () => {
    const hs = [habit('a'), habit('b')];
    const idx = buildLogIndex(logs(
      ['a', '2026-08-29'], ['b', '2026-08-29'],
      ['a', '2026-08-30'], ['b', '2026-08-30'],
    ));
    expect(questStreakFrom(hs, idx, '2026-08-31')).toBe(2);
  });

  it('is zero when yesterday was incomplete', () => {
    const hs = [habit('a'), habit('b')];
    const idx = buildLogIndex(logs(['a', '2026-08-30']));
    expect(questStreakFrom(hs, idx, '2026-08-31')).toBe(0);
  });

  it('counts today when today is already fully cleared', () => {
    const hs = [habit('a')];
    const idx = buildLogIndex(logs(['a', '2026-08-30'], ['a', '2026-08-31']));
    expect(questStreakFrom(hs, idx, '2026-08-31')).toBe(2);
  });
});
