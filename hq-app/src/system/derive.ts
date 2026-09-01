import {
  DOMAINS, STAT_KEYS, STAT_OF,
  type Domain, type Habit, type Rank, type StatKey, type XpEvent,
} from '../types';
import { addDays } from './dates';
import { levelProgress, rankFromLevel } from './levels';
import { statLevelFromXp } from './stats';
import { dueHabitsOn, isMetOn } from './streaks';
import { domainTotals, playerTotal } from './xp';

const MAX_SCAN = 400;

export interface PlayerState {
  totalXp: number;
  level: number;
  rank: Rank;
  into: number;
  need: number;
  pct: number;
  statLevels: Record<StatKey, number>;
  domainXp: Record<Domain, number>;
  questStreak: number;
}

/** A day is "cleared" when every habit due that day hit its target. */
export function isDayCleared(
  habits: ReadonlyArray<Habit>, index: Map<string, number>, date: string,
): boolean {
  const due = dueHabitsOn(habits, date, index);
  if (due.length === 0) return false;
  return due.every((h) => isMetOn(h, date, index));
}

/**
 * Consecutive fully-cleared days. Today counts only if already cleared;
 * an in-progress today never breaks the run.
 */
export function questStreakFrom(
  habits: ReadonlyArray<Habit>, index: Map<string, number>, today: string,
): number {
  let streak = 0;
  let cursor = today;
  if (!isDayCleared(habits, index, today)) cursor = addDays(today, -1);
  for (let i = 0; i < MAX_SCAN; i++) {
    if (!isDayCleared(habits, index, cursor)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function derivePlayer(
  events: ReadonlyArray<XpEvent>,
  habits: ReadonlyArray<Habit>,
  index: Map<string, number>,
  today: string,
): PlayerState {
  const totalXp = Math.max(0, playerTotal(events));
  const domainXp = domainTotals(events);
  const { level, into, need, pct } = levelProgress(totalXp);

  const statLevels = Object.fromEntries(
    STAT_KEYS.map((k) => [k, 0]),
  ) as Record<StatKey, number>;
  for (const d of DOMAINS) statLevels[STAT_OF[d]] = statLevelFromXp(domainXp[d]);

  return {
    totalXp, level, rank: rankFromLevel(level), into, need, pct,
    statLevels, domainXp,
    questStreak: questStreakFrom(habits, index, today),
  };
}
