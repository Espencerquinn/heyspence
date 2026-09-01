import { describe, expect, it } from 'vitest';
import { statLevelFromXp, statProgress, statXpFor } from './stats';

describe('statXpFor', () => {
  it('follows 12·n²', () => {
    expect(statXpFor(1)).toBe(12);
    expect(statXpFor(10)).toBe(1200);
    expect(statXpFor(22)).toBe(5808);
  });
});

describe('statLevelFromXp', () => {
  it('is zero before the first threshold', () => {
    expect(statLevelFromXp(0)).toBe(0);
    expect(statLevelFromXp(11)).toBe(0);
  });
  it('crosses exactly at the threshold', () => {
    expect(statLevelFromXp(5807)).toBe(21);
    expect(statLevelFromXp(5808)).toBe(22);
  });
  it('round-trips at every stat level from 1 to 60', () => {
    for (let n = 1; n <= 60; n++) {
      expect(statLevelFromXp(statXpFor(n))).toBe(n);
      expect(statLevelFromXp(statXpFor(n) - 1)).toBe(n - 1);
    }
  });
  it('never goes negative', () => {
    expect(statLevelFromXp(-100)).toBe(0);
  });
});

describe('statProgress', () => {
  it('reports progress toward the next stat level', () => {
    const p = statProgress(statXpFor(10) + 100);
    expect(p.level).toBe(10);
    expect(p.into).toBe(100);
    expect(p.need).toBe(statXpFor(11) - statXpFor(10));
    expect(p.pct).toBeGreaterThan(0);
    expect(p.pct).toBeLessThan(100);
  });
});
