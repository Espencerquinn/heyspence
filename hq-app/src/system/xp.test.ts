import { describe, expect, it } from 'vitest';
import { XP, clampPenalty, domainTotals, playerTotal } from './xp';
import { cumulativeXpFor, levelFromXp } from './levels';

describe('XP values', () => {
  it('matches the spec', () => {
    expect(XP.habitDefault).toBe(25);
    expect(XP.task).toBe(15);
    expect(XP.focusTask).toBe(25);
    expect(XP.journal).toBe(20);
    expect(XP.milestone).toBe(150);
    expect(XP.goal).toBe(500);
    expect(XP.photo).toBe(30);
    expect(XP.questBonus).toBe(100);
    expect(XP.penalty).toBe(40);
  });
});

describe('clampPenalty', () => {
  it('applies the full penalty when there is room in the level', () => {
    const total = cumulativeXpFor(14) + 640;
    expect(clampPenalty(total, 40)).toBe(-40);
  });

  it('clamps to the level floor rather than dropping a level', () => {
    const total = cumulativeXpFor(14) + 10; // only 10 xp above the floor
    expect(clampPenalty(total, 40)).toBe(-10);
  });

  it('applies nothing when sitting exactly on a level boundary', () => {
    expect(clampPenalty(cumulativeXpFor(14), 40)).toBe(0);
  });

  it('applies nothing at level 1 with zero xp', () => {
    expect(clampPenalty(0, 40)).toBe(0);
  });

  // THE INVARIANT. No run of penalties may ever cost a level.
  it('never reduces the player level, over 500 consecutive penalties', () => {
    let total = cumulativeXpFor(14) + 640;
    const startLevel = levelFromXp(total);
    for (let i = 0; i < 500; i++) {
      total += clampPenalty(total, XP.penalty);
      expect(levelFromXp(total)).toBe(startLevel);
    }
  });
});

describe('playerTotal', () => {
  it('sums signed amounts', () => {
    expect(playerTotal([{ amount: 40 }, { amount: 25 }, { amount: -40 }])).toBe(25);
  });
  it('is zero for no events', () => {
    expect(playerTotal([])).toBe(0);
  });
});

describe('domainTotals', () => {
  it('buckets by domain and ignores null-domain events', () => {
    const t = domainTotals([
      { domain: 'physical', amount: 40 },
      { domain: 'physical', amount: 30 },
      { domain: 'musical', amount: 35 },
      { domain: null, amount: 100 },   // quest bonus — not attributable
    ]);
    expect(t.physical).toBe(70);
    expect(t.musical).toBe(35);
    expect(t.financial).toBe(0);
  });

  it('returns a key for all seven domains even with no events', () => {
    const t = domainTotals([]);
    expect(Object.keys(t).sort()).toEqual(
      ['financial', 'intellectual', 'marital', 'musical', 'physical', 'social', 'spiritual'],
    );
  });

  it('clamps a domain total at zero so a stat cannot go negative', () => {
    const t = domainTotals([{ domain: 'social', amount: -80 }]);
    expect(t.social).toBe(0);
  });
});
