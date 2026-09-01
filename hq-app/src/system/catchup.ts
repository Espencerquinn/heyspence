import type { Habit } from '../types';
import { evaluatePenalties } from './penalties';
import { XP, clampPenalty } from './xp';

export interface CatchupInput {
  fromDate: string;
  throughDate: string;
  habits: ReadonlyArray<Habit>;
  index: Map<string, number>;
  alreadyPenalized: ReadonlySet<string>;
  totalXp: number;
}

export interface CatchupPlan {
  penalties: Array<{ date: string; missedHabitIds: string[]; xpLost: number }>;
}

/**
 * Turns missed days into a list of penalties, applying the EXP floor
 * CUMULATIVELY — a two-week absence drains the current level's surplus and
 * then stops, rather than deleveling the player fourteen times over.
 */
export function planCatchup(input: CatchupInput): CatchupPlan {
  const missed = evaluatePenalties(input);
  let running = input.totalXp;

  const penalties = missed.map((m) => {
    const applied = clampPenalty(running, XP.penalty); // negative or zero
    running += applied;
    // Math.abs, not -applied: negating a literal 0 yields -0, which reaches
    // the DB's xp_lost column and any toBe(0) assertion as a distinct value.
    return { date: m.date, missedHabitIds: m.missedHabitIds, xpLost: Math.abs(applied) };
  });

  return { penalties };
}
