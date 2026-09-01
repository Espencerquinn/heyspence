/**
 * Each domain levels off its own EXP pool on a decelerating curve:
 *   statLevel = floor(sqrt(domainXp / 12))   <=>   xp(n) = 12n²
 * ≈80 days of daily effort in one domain reaches stat level 20.
 */

export function statXpFor(statLevel: number): number {
  return 12 * statLevel * statLevel;
}

export function statLevelFromXp(domainXp: number): number {
  if (domainXp <= 0) return 0;
  return Math.floor(Math.sqrt(domainXp / 12));
}

export function statProgress(domainXp: number): {
  level: number; into: number; need: number; pct: number;
} {
  const level = statLevelFromXp(domainXp);
  const base = statXpFor(level);
  const need = statXpFor(level + 1) - base;
  const into = Math.max(0, domainXp) - base;
  return { level, into, need, pct: (into / need) * 100 };
}
