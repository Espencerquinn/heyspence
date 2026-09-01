import { describe, expect, it } from 'vitest';
import { planCatchup } from './catchup';
import { buildLogIndex } from './streaks';
import { cumulativeXpFor, levelFromXp } from './levels';
import type { Habit } from '../types';

const habit = (id: string): Habit => ({
  id, name: id, domain: 'physical', cadence: 'daily', weekdays: null,
  target_per_week: null, target_count: 1, xp_value: 25, sort_order: 0, archived_at: null,
});

describe('planCatchup', () => {
  it('plans one penalty per missed day', () => {
    const plan = planCatchup({
      fromDate: '2026-08-29', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(), totalXp: cumulativeXpFor(14) + 500,
    });
    expect(plan.penalties.map((p) => p.date)).toEqual(['2026-08-29', '2026-08-30']);
    expect(plan.penalties.every((p) => p.xpLost === 40)).toBe(true);
  });

  // The invariant, applied across a multi-day gap: a two-week vacation must
  // not delevel the player.
  it('clamps cumulatively so a long gap never costs a level', () => {
    const start = cumulativeXpFor(14) + 60; // only 60 xp of headroom
    const plan = planCatchup({
      fromDate: '2026-08-17', throughDate: '2026-08-30', // 14 days
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(), totalXp: start,
    });
    const totalLost = plan.penalties.reduce((s, p) => s + p.xpLost, 0);
    expect(totalLost).toBe(60);
    expect(levelFromXp(start - totalLost)).toBe(14);
  });

  it('plans nothing when there is no headroom at all', () => {
    const plan = planCatchup({
      fromDate: '2026-08-29', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(), totalXp: cumulativeXpFor(14),
    });
    expect(plan.penalties.every((p) => p.xpLost === 0)).toBe(true);
  });

  it('plans nothing for a player with no history at all', () => {
    const plan = planCatchup({
      fromDate: '2026-08-01', throughDate: '2026-08-30',
      habits: [habit('a')], index: buildLogIndex([]),
      alreadyPenalized: new Set(), totalXp: 0,
    });
    // No headroom and no history: every penalty must be zero-cost.
    expect(plan.penalties.every((p) => p.xpLost === 0)).toBe(true);
  });
});
