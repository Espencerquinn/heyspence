import { DOMAINS, STAT_KEYS, type Domain, type StatKey } from '../types';

export interface TitleContext {
  currentStreak: number;
  longestStreak: number;
  statLevels: Record<StatKey, number>;
  domainLogCounts: Record<Domain, number>;
  journalCount: number;
  /** Days taken to rebuild a streak after the last penalty; null if never penalized. */
  recoveredWithinDays: number | null;
}

export interface TitleDef {
  code: string;
  name: string;
  detail: string;
  test: (ctx: TitleContext) => boolean;
}

export function emptyTitleContext(): TitleContext {
  return {
    currentStreak: 0,
    longestStreak: 0,
    statLevels: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>,
    domainLogCounts: Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>,
    journalCount: 0,
    recoveredWithinDays: null,
  };
}

const allStatsAtLeast = (ctx: TitleContext, n: number) =>
  STAT_KEYS.every((k) => ctx.statLevels[k] >= n);

export const TITLE_DEFS: readonly TitleDef[] = [
  { code: 'awakened', name: 'The Awakened', detail: 'Hold a 7-day streak.',
    test: (c) => c.longestStreak >= 7 },
  { code: 'iron_will', name: 'Iron Will', detail: 'Hold a 30-day streak.',
    test: (c) => c.longestStreak >= 30 },
  { code: 'monarch_of_iron', name: 'Monarch of Iron', detail: 'Log 100 physical days.',
    test: (c) => c.domainLogCounts.physical >= 100 },
  { code: 'well_read', name: 'Well-Read', detail: 'Log 50 intellectual days.',
    test: (c) => c.domainLogCounts.intellectual >= 50 },
  { code: 'perfect_tempo', name: 'Perfect Tempo', detail: 'Log 30 musical days.',
    test: (c) => c.domainLogCounts.musical >= 30 },
  { code: 'the_devout', name: 'The Devout', detail: 'Log 30 spiritual days.',
    test: (c) => c.domainLogCounts.spiritual >= 30 },
  { code: 'beloved', name: 'Beloved', detail: 'Log 25 social days.',
    test: (c) => c.domainLogCounts.social >= 25 },
  { code: 'solvent', name: 'Solvent', detail: 'Log 60 financial days.',
    test: (c) => c.domainLogCounts.financial >= 60 },
  { code: 'two_as_one', name: 'Two as One', detail: 'Log 60 marital days.',
    test: (c) => c.domainLogCounts.marital >= 60 },
  { code: 'balanced', name: 'Balanced', detail: 'Bring all seven stats to 10.',
    test: (c) => allStatsAtLeast(c, 10) },
  { code: 'shadow_sovereign', name: 'Shadow Sovereign', detail: 'Bring all seven stats to 20.',
    test: (c) => allStatsAtLeast(c, 20) },
  { code: 'chronicler', name: 'Chronicler', detail: 'Write 100 journal entries.',
    test: (c) => c.journalCount >= 100 },
  { code: 'the_persistent', name: 'The Persistent',
    detail: 'Rebuild a streak within 2 days of a penalty.',
    test: (c) => c.recoveredWithinDays !== null && c.recoveredWithinDays <= 2 },
] as const;

/** Titles newly earned by this context that are not already unlocked. */
export function evaluateTitles(
  ctx: TitleContext, unlocked: ReadonlySet<string>,
): TitleDef[] {
  return TITLE_DEFS.filter((t) => !unlocked.has(t.code) && t.test(ctx));
}
