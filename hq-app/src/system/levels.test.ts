import { describe, expect, it } from 'vitest';
import {
  cumulativeXpFor, levelFromXp, levelProgress, nextRankAt, rankFromLevel, xpForNextLevel,
} from './levels';

describe('xpForNextLevel', () => {
  it('follows 70n + 20', () => {
    expect(xpForNextLevel(1)).toBe(90);
    expect(xpForNextLevel(14)).toBe(1000);
    expect(xpForNextLevel(50)).toBe(3520);
  });
});

describe('cumulativeXpFor', () => {
  it('is zero at level 1', () => {
    expect(cumulativeXpFor(1)).toBe(0);
  });
  it('matches the closed form (n-1)(35n+20)', () => {
    expect(cumulativeXpFor(14)).toBe(6630);
    expect(cumulativeXpFor(50)).toBe(86730);
  });
  it('is the running sum of xpForNextLevel', () => {
    let sum = 0;
    for (let n = 1; n < 40; n++) {
      expect(cumulativeXpFor(n)).toBe(sum);
      sum += xpForNextLevel(n);
    }
  });
});

describe('levelFromXp', () => {
  it('starts at level 1 with no xp', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  // The invariant that matters: the closed-form inverse must agree with the
  // curve at EVERY boundary, not just the ones we eyeballed.
  it('round-trips exactly at every level boundary from 1 to 120', () => {
    for (let n = 1; n <= 120; n++) {
      const at = cumulativeXpFor(n);
      expect(levelFromXp(at)).toBe(n);
      if (n > 1) expect(levelFromXp(at - 1)).toBe(n - 1);
    }
  });

  it('never returns below 1 for negative input', () => {
    expect(levelFromXp(-500)).toBe(1);
  });
});

describe('levelProgress', () => {
  it('reports progress into the current level', () => {
    const p = levelProgress(cumulativeXpFor(14) + 640);
    expect(p.level).toBe(14);
    expect(p.into).toBe(640);
    expect(p.need).toBe(1000);
    expect(p.pct).toBeCloseTo(64, 5);
  });
  it('is at zero percent exactly on a level boundary', () => {
    const p = levelProgress(cumulativeXpFor(9));
    expect(p.level).toBe(9);
    expect(p.into).toBe(0);
    expect(p.pct).toBe(0);
  });
});

describe('rankFromLevel', () => {
  it('uses the locked bands', () => {
    expect(rankFromLevel(1)).toBe('E');
    expect(rankFromLevel(9)).toBe('E');
    expect(rankFromLevel(10)).toBe('D');
    expect(rankFromLevel(14)).toBe('D');
    expect(rankFromLevel(20)).toBe('C');
    expect(rankFromLevel(35)).toBe('B');
    expect(rankFromLevel(50)).toBe('A');
    expect(rankFromLevel(70)).toBe('S');
    expect(rankFromLevel(999)).toBe('S');
  });
});

describe('nextRankAt', () => {
  it('names the next promotion', () => {
    expect(nextRankAt(14)).toEqual({ rank: 'C', level: 20 });
  });
  it('returns null at S rank', () => {
    expect(nextRankAt(70)).toBeNull();
  });
});
