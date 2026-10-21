import type { FoodEntry, MacroTargets, Workout } from '../types';
import { addDays, daysBetween, eachDay, weekStart } from './dates';
import { isStrength } from './autotick';

/* ---------- daily core circuit ---------- */

export interface Move {
  name: string;
  dose: string;             // "3 × 30 s", "2 × 8 / side"
  cue: string;
  progress: string;         // what to do when it gets easy
}

export interface CoreDay {
  code: 'A' | 'B' | 'C';
  name: string;
  moves: Move[];
}

/**
 * Three rotating ~10-minute circuits, done every day after (or instead of)
 * Tonal. Anti-extension / anti-rotation work first, a little flexion last —
 * McGill-style. Pushups open every day so the daily pushup habit and the
 * circuit happen in one go.
 */
export const CORE_DAYS: readonly CoreDay[] = [
  {
    code: 'A', name: 'Brace',
    moves: [
      { name: 'Pushups', dose: '3 sets, 2 shy of failure', cue: 'Ribs down, glutes tight — a moving plank.', progress: 'Slow 3-s lowering, then deficit pushups.' },
      { name: 'Dead bug', dose: '2 × 8 / side', cue: 'Low back pinned to the floor; exhale as the leg reaches.', progress: 'Hold a light plate or band overhead.' },
      { name: 'Front plank', dose: '3 × 30–45 s', cue: 'Squeeze glutes and quads; push the floor away.', progress: 'Switch to RKC plank: 3 × 15 s at max tension.' },
      { name: 'Side plank', dose: '2 × 25 s / side', cue: 'Hips high, straight line ear to ankle.', progress: 'Top leg raised, or add 5 s per week.' },
    ],
  },
  {
    code: 'B', name: 'Hang',
    moves: [
      { name: 'Pushups', dose: '3 sets, 2 shy of failure', cue: 'Full range — chest to fist height.', progress: 'Feet elevated.' },
      { name: 'Hanging knee raise', dose: '3 × 10', cue: 'Curl the pelvis up; no swinging.', progress: 'Straight-leg raises, then toes-to-bar.' },
      { name: 'RKC plank', dose: '3 × 15 s', cue: 'Pull elbows toward toes; everything maximally tight.', progress: 'Add 5 s per set.' },
      { name: 'Bird dog', dose: '2 × 8 / side, 3-s hold', cue: 'Hips square; reach long, not high.', progress: 'Ankle weight or band.' },
    ],
  },
  {
    code: 'C', name: 'Hollow',
    moves: [
      { name: 'Pushups', dose: '3 sets, 2 shy of failure', cue: 'Elbows ~45°, not flared.', progress: 'Tempo: 3 s down, 1 s pause.' },
      { name: 'Hollow hold', dose: '3 × 20 s', cue: 'Low back glued down; bend knees if it lifts.', progress: 'Arms overhead, legs lower.' },
      { name: 'Reverse crunch', dose: '3 × 12', cue: 'Roll the hips off the floor, lower slowly.', progress: 'On a decline bench.' },
      { name: 'Ab wheel rollout', dose: '2 × 8 (knees)', cue: 'Stop before the low back sags.', progress: 'Longer range, then from toes.' },
    ],
  },
];

/** Rotates A → B → C by calendar day, so it is stable all day and across devices. */
export function coreDayFor(date: string): CoreDay {
  const n = daysBetween('2026-01-01', date);
  return CORE_DAYS[((n % 3) + 3) % 3];
}

/* ---------- Tonal suggestion ---------- */

/** Focus rotation across the week's strength sessions. */
export const SPLIT = ['Upper body', 'Lower body + core', 'Full body', 'Upper body + arms'] as const;

export type TrainingCall =
  | { kind: 'done'; focus: string; detail: string }
  | { kind: 'strength'; focus: string; detail: string }
  | { kind: 'recovery'; focus: string; detail: string };

/**
 * Today's call for the Tonal: a session with a suggested focus, or a
 * recovery day. Strength days are counted from synced workouts, Mon–Sun.
 */
export function suggestTraining(input: {
  today: string;
  workouts: ReadonlyArray<Pick<Workout, 'workout_date' | 'name' | 'source'>>;
  weeklyTarget: number;
}): TrainingCall & { doneThisWeek: number } {
  const { today, workouts, weeklyTarget } = input;
  const strengthOn = (d: string) =>
    workouts.some((w) => w.workout_date === d && isStrength(w));

  const week = eachDay(weekStart(today), today);
  const doneBefore = week.filter((d) => d !== today && strengthOn(d)).length;
  const doneThisWeek = doneBefore + (strengthOn(today) ? 1 : 0);

  if (strengthOn(today)) {
    return { kind: 'done', focus: 'Session logged', doneThisWeek,
      detail: `Tonal session ${doneThisWeek} of ${weeklyTarget} this week is in the books. Finish with the core circuit.` };
  }
  if (doneBefore >= weeklyTarget) {
    return { kind: 'recovery', focus: 'Active recovery', doneThisWeek,
      detail: `Weekly target hit (${doneBefore}/${weeklyTarget}). Walk 30–45 min, mobility, core circuit.` };
  }
  if (strengthOn(addDays(today, -1)) && strengthOn(addDays(today, -2))) {
    return { kind: 'recovery', focus: 'Active recovery', doneThisWeek,
      detail: 'Two strength days back to back — recover today. Zone-2 walk and the core circuit.' };
  }
  const focus = SPLIT[doneBefore % SPLIT.length];
  return { kind: 'strength', focus, doneThisWeek,
    detail: `Tonal session ${doneBefore + 1} of ${weeklyTarget}. Pick a ${focus.toLowerCase()} workout, ~45 min.` };
}

/* ---------- macros ---------- */

export interface MacroTotals { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }

export function macroTotals(entries: ReadonlyArray<FoodEntry>): MacroTotals {
  const t: MacroTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const e of entries) {
    const s = Number(e.servings);
    t.kcal += Number(e.kcal) * s;
    t.protein_g += Number(e.protein_g) * s;
    t.carbs_g += Number(e.carbs_g) * s;
    t.fat_g += Number(e.fat_g) * s;
    t.fiber_g += Number(e.fiber_g ?? 0) * s;
  }
  return t;
}

/** Fraction of each target eaten, 0..∞ (over-target shows past 1). */
export function macroProgress(t: MacroTotals, goal: MacroTargets): Record<keyof MacroTargets, number> {
  const frac = (a: number, b: number) => (b > 0 ? a / b : 0);
  return {
    kcal: frac(t.kcal, goal.kcal),
    protein_g: frac(t.protein_g, goal.protein_g),
    carbs_g: frac(t.carbs_g, goal.carbs_g),
    fat_g: frac(t.fat_g, goal.fat_g),
    fiber_g: frac(t.fiber_g, goal.fiber_g),
  };
}
