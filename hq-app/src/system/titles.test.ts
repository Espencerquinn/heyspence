import { describe, expect, it } from 'vitest';
import { TITLE_DEFS, emptyTitleContext, evaluateTitles } from './titles';

describe('TITLE_DEFS', () => {
  it('has unique codes', () => {
    const codes = TITLE_DEFS.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it('gives every title a name and a detail line', () => {
    for (const t of TITLE_DEFS) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.detail.length).toBeGreaterThan(0);
    }
  });
});

describe('evaluateTitles', () => {
  it('unlocks nothing on an empty context', () => {
    expect(evaluateTitles(emptyTitleContext(), new Set())).toEqual([]);
  });

  it('unlocks The Awakened at a 7-day streak', () => {
    const ctx = { ...emptyTitleContext(), longestStreak: 7 };
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).toContain('awakened');
  });

  it('does not unlock The Awakened at 6 days', () => {
    const ctx = { ...emptyTitleContext(), longestStreak: 6 };
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).not.toContain('awakened');
  });

  it('never re-reports an already-unlocked title', () => {
    const ctx = { ...emptyTitleContext(), longestStreak: 30 };
    const fresh = evaluateTitles(ctx, new Set());
    expect(fresh.length).toBeGreaterThan(0);
    const codes = new Set(fresh.map((t) => t.code));
    expect(evaluateTitles(ctx, codes)).toEqual([]);
  });

  it('unlocks Balanced only when ALL seven stats reach 10', () => {
    const six = {
      ...emptyTitleContext(),
      statLevels: { STR: 10, INT: 10, WIS: 10, CHA: 10, SENSE: 10, FOR: 10, BND: 9 },
    };
    expect(evaluateTitles(six, new Set()).map((t) => t.code)).not.toContain('balanced');

    const seven = { ...six, statLevels: { ...six.statLevels, BND: 10 } };
    expect(evaluateTitles(seven, new Set()).map((t) => t.code)).toContain('balanced');
  });

  it('unlocks Two as One at 60 marital logs', () => {
    const ctx = emptyTitleContext();
    ctx.domainLogCounts.marital = 60;
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).toContain('two_as_one');
  });

  it('unlocks Monarch of Iron at 100 physical logs', () => {
    const ctx = emptyTitleContext();
    ctx.domainLogCounts.physical = 100;
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).toContain('monarch_of_iron');
  });

  it('unlocks Chronicler at 100 journal entries', () => {
    const ctx = { ...emptyTitleContext(), journalCount: 100 };
    expect(evaluateTitles(ctx, new Set()).map((t) => t.code)).toContain('chronicler');
  });
});
