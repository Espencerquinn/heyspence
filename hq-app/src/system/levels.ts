import type { Rank } from '../types';

/** EXP required to advance FROM `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  return 70 * level + 20;
}

/**
 * Total EXP required to have reached `level`.
 * Sum of (70k + 20) for k = 1..level-1  =>  (level-1)(35·level + 20).
 */
export function cumulativeXpFor(level: number): number {
  return (level - 1) * (35 * level + 20);
}

/**
 * Inverse of cumulativeXpFor. Solving 35n² - 15n - 20 - total = 0 gives
 *   n = (15 + sqrt(225 + 140(total + 20))) / 70
 * Verified to round-trip exactly at every boundary for levels 1..120.
 */
export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  const n = (15 + Math.sqrt(225 + 140 * (totalXp + 20))) / 70;
  return Math.max(1, Math.floor(n));
}

export function levelProgress(totalXp: number): {
  level: number; into: number; need: number; pct: number;
} {
  const level = levelFromXp(totalXp);
  const into = Math.max(0, totalXp) - cumulativeXpFor(level);
  const need = xpForNextLevel(level);
  return { level, into, need, pct: (into / need) * 100 };
}

const RANK_BANDS: ReadonlyArray<{ rank: Rank; from: number }> = [
  { rank: 'S', from: 70 },
  { rank: 'A', from: 50 },
  { rank: 'B', from: 35 },
  { rank: 'C', from: 20 },
  { rank: 'D', from: 10 },
  { rank: 'E', from: 1 },
];

export function rankFromLevel(level: number): Rank {
  return RANK_BANDS.find((b) => level >= b.from)?.rank ?? 'E';
}

export function nextRankAt(level: number): { rank: Rank; level: number } | null {
  const higher = [...RANK_BANDS].reverse().find((b) => b.from > level);
  return higher ? { rank: higher.rank, level: higher.from } : null;
}
