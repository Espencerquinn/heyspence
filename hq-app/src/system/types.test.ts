import { describe, expect, it } from 'vitest';
import { DOMAINS, DOMAIN_OF, STAT_KEYS, STAT_OF, DOMAIN_COLOR, DOMAIN_LABEL } from '../types';

describe('domain constants', () => {
  it('has exactly seven domains in spec order', () => {
    expect(DOMAINS).toEqual([
      'physical', 'intellectual', 'spiritual', 'social', 'musical', 'financial', 'marital',
    ]);
  });

  it('has exactly seven stat keys in display order', () => {
    expect(STAT_KEYS).toEqual(['STR', 'INT', 'WIS', 'CHA', 'SENSE', 'FOR', 'BND']);
  });

  it('maps every domain to a stat and back without loss', () => {
    for (const d of DOMAINS) {
      expect(DOMAIN_OF[STAT_OF[d]]).toBe(d);
    }
    expect(Object.keys(STAT_OF)).toHaveLength(7);
  });

  it('gives every domain a hex color and a label', () => {
    for (const d of DOMAINS) {
      expect(DOMAIN_COLOR[d]).toMatch(/^#[0-9a-f]{6}$/);
      expect(DOMAIN_LABEL[d].length).toBeGreaterThan(0);
    }
  });

  it('uses the locked stat colors', () => {
    expect(DOMAIN_COLOR.physical).toBe('#5ad8ff');
    expect(DOMAIN_COLOR.financial).toBe('#ffc46b');
    expect(DOMAIN_COLOR.musical).toBe('#ff9ad5');
    expect(DOMAIN_COLOR.marital).toBe('#ff7a6b');
  });
});
