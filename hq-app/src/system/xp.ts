import { DOMAINS, type Domain } from '../types';
import { cumulativeXpFor, levelFromXp } from './levels';

/** EXP awarded per action. `penalty` is stored POSITIVE; clampPenalty negates. */
export const XP = {
  habitDefault: 25,
  task: 15,
  focusTask: 25,
  journal: 20,
  milestone: 150,
  goal: 500,
  photo: 30,
  questBonus: 100,
  penalty: 40,
} as const;

/**
 * Returns the (negative, or zero) amount to actually apply for a penalty of
 * `requested` magnitude, clamped so the player NEVER loses a level.
 * This is a hard invariant of the design, not a nicety.
 */
export function clampPenalty(totalXp: number, requested: number): number {
  const floor = cumulativeXpFor(levelFromXp(totalXp));
  const room = Math.max(0, totalXp - floor);
  const deducted = Math.min(Math.abs(requested), room);
  return deducted > 0 ? -deducted : 0;
}

export function playerTotal(events: ReadonlyArray<{ amount: number }>): number {
  return events.reduce((sum, e) => sum + e.amount, 0);
}

/** Per-domain EXP pools, floored at zero so a stat can never read negative. */
export function domainTotals(
  events: ReadonlyArray<{ domain: Domain | null; amount: number }>,
): Record<Domain, number> {
  const totals = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  for (const e of events) {
    if (e.domain) totals[e.domain] += e.amount;
  }
  for (const d of DOMAINS) totals[d] = Math.max(0, totals[d]);
  return totals;
}
