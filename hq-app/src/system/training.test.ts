import { describe, expect, it } from 'vitest';
import { coreDayFor, macroTotals, suggestTraining } from './training';
import type { FoodEntry } from '../types';

const tonal = (d: string) => ({ workout_date: d, name: 'Traditional Strength Training', source: 'Tonal' });
const walk = (d: string) => ({ workout_date: d, name: 'Outdoor Walk', source: 'Apple Watch' });

// 2026-10-19 is a Monday.
describe('suggestTraining', () => {
  it('starts the week on the first split focus', () => {
    const s = suggestTraining({ today: '2026-10-19', workouts: [], weeklyTarget: 4 });
    expect(s.kind).toBe('strength');
    expect(s.focus).toBe('Upper body');
  });

  it('advances the focus with each strength day already done this week', () => {
    const s = suggestTraining({
      today: '2026-10-22', workouts: [tonal('2026-10-19'), walk('2026-10-20')], weeklyTarget: 4,
    });
    expect(s.focus).toBe('Lower body + core');
    expect(s.doneThisWeek).toBe(1);
  });

  it('ignores last week', () => {
    const s = suggestTraining({ today: '2026-10-19', workouts: [tonal('2026-10-18')], weeklyTarget: 4 });
    expect(s.doneThisWeek).toBe(0);
  });

  it('calls recovery after two strength days in a row', () => {
    const s = suggestTraining({
      today: '2026-10-21', workouts: [tonal('2026-10-19'), tonal('2026-10-20')], weeklyTarget: 4,
    });
    expect(s.kind).toBe('recovery');
  });

  it('calls recovery once the weekly target is met', () => {
    const w = ['2026-10-19', '2026-10-21', '2026-10-23', '2026-10-24'].map(tonal);
    const s = suggestTraining({ today: '2026-10-25', workouts: w, weeklyTarget: 4 });
    expect(s.kind).toBe('recovery');
  });

  it('reports done when today already has a session', () => {
    const s = suggestTraining({ today: '2026-10-21', workouts: [tonal('2026-10-21')], weeklyTarget: 4 });
    expect(s.kind).toBe('done');
    expect(s.doneThisWeek).toBe(1);
  });
});

describe('coreDayFor', () => {
  it('rotates through A, B, C on consecutive days', () => {
    const codes = ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']
      .map((d) => coreDayFor(d).code);
    expect(new Set(codes.slice(0, 3)).size).toBe(3);
    expect(codes[3]).toBe(codes[0]);
  });
});

describe('macroTotals', () => {
  it('multiplies per-serving macros by servings', () => {
    const e = (over: Partial<FoodEntry>): FoodEntry => ({
      id: 'x', eaten_on: '2026-10-21', meal: 'lunch', name: 'x', servings: 1,
      kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: null,
      serving_label: null, source: 'manual', source_ref: null, created_at: '', ...over,
    });
    const t = macroTotals([
      e({ kcal: 120, protein_g: 24, servings: 2 }),
      e({ kcal: 200, carbs_g: 40, fat_g: 2.5, fiber_g: 3 }),
    ]);
    expect(t).toEqual({ kcal: 440, protein_g: 48, carbs_g: 40, fat_g: 2.5, fiber_g: 3 });
  });
});
