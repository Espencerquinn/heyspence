import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import { loadSnapshot, type Snapshot } from '../data/snapshot';
import { setLog } from '../data/habitLogs';
import { award, revokeHabitAward } from '../data/xpEvents';
import { unlockTitle } from '../data/titles';
import { derivePlayer, isDayCleared, type PlayerState } from '../system/derive';
import { rankFromLevel } from '../system/levels';
import { buildLogIndex, isMetOn } from '../system/streaks';
import { todayISO } from '../system/dates';
import { evaluateTitles, emptyTitleContext } from '../system/titles';
import { XP } from '../system/xp';
import { useNotify } from './useNotifications';
import {
  DOMAIN_COLOR, DOMAIN_OF, DOMAINS, STAT_KEYS,
  type Domain, type Habit, type HabitLog,
} from '../types';

interface SystemValue {
  snapshot: Snapshot;
  player: PlayerState;
  index: Map<string, number>;
  today: string;
  reload: () => Promise<void>;
  tickHabit: (habit: Habit, count: number) => Promise<void>;
}

const Ctx = createContext<SystemValue | null>(null);

/** Per-domain count of days logged, used to evaluate log-count-based titles. */
function countLogsByDomain(habits: Habit[], logs: HabitLog[]): Record<Domain, number> {
  const byId = new Map(habits.map((h) => [h.id, h.domain] as const));
  const out = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  for (const l of logs) {
    const d = byId.get(l.habit_id);
    if (d) out[d] += 1;
  }
  return out;
}

export function SystemProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string>('');
  const today = todayISO();
  const notify = useNotify();

  const reload = useCallback(async () => {
    // Clear any prior failure first: without this, one transient error strands
    // the UI in the SYSTEM ERROR branch permanently, and the retry control
    // lives inside the subtree that stopped rendering.
    setError('');
    try { setSnapshot(await loadSnapshot()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const index = useMemo(
    () => buildLogIndex(snapshot?.logs ?? []), [snapshot]);

  const player = useMemo(
    () => derivePlayer(snapshot?.events ?? [], snapshot?.habits ?? [], index, today),
    [snapshot, index, today]);

  const tickHabit = useCallback(async (habit: Habit, count: number) => {
    const before = player;
    const wasMet = isMetOn(habit, today, index);
    const willBeMet = count >= habit.target_count;

    await setLog(habit.id, today, count);
    if (willBeMet && !wasMet) {
      await award({ amount: habit.xp_value, kind: 'habit', domain: habit.domain,
                    refId: habit.id, occurredOn: today });
    } else if (!willBeMet && wasMet) {
      await revokeHabitAward(habit.id, today);
    }

    // Re-read, then decide what the System has to say about it.
    let next = await loadSnapshot();
    let nextIndex = buildLogIndex(next.logs);

    // Full clear? Award the bonus once, then re-read again so the bonus counts.
    const cleared = isDayCleared(next.habits, nextIndex, today);
    const bonusAlready = next.events.some(
      (e) => e.kind === 'quest_bonus' && e.occurred_on === today);
    if (cleared && !bonusAlready) {
      await award({ amount: XP.questBonus, kind: 'quest_bonus', occurredOn: today });
      next = await loadSnapshot();
      nextIndex = buildLogIndex(next.logs);
    }

    const after = derivePlayer(next.events, next.habits, nextIndex, today);
    setSnapshot(next);

    if (cleared && !bonusAlready) {
      notify({
        kind: 'NOTIFICATION',
        huge: 'QUEST CLEARED',
        lead: 'The daily quest is complete. The System acknowledges your effort.',
        deltas: [
          { text: `+${XP.questBonus} BONUS` },
          { text: `STREAK ${after.questStreak}`, color: DOMAIN_COLOR.social },
        ],
      });
    }

    if (after.level > before.level) {
      notify({
        kind: 'LEVEL UP',
        huge: `LV. ${after.level}`,
        lead: `You have reached Level ${after.level}.`,
        deltas: STAT_KEYS
          .filter((k) => after.statLevels[k] > before.statLevels[k])
          .map((k) => ({ text: `${k} +${after.statLevels[k] - before.statLevels[k]}`,
                         color: DOMAIN_COLOR[DOMAIN_OF[k]] })),
      });
    }

    if (rankFromLevel(after.level) !== rankFromLevel(before.level)) {
      notify({
        kind: 'RANK UP',
        huge: `RANK ${after.rank}`,
        lead: `The System has re-evaluated you. You are now Rank ${after.rank}.`,
      });
    }

    // Titles
    const ctx = {
      ...emptyTitleContext(),
      currentStreak: after.questStreak,
      longestStreak: after.questStreak,
      statLevels: after.statLevels,
      domainLogCounts: countLogsByDomain(next.habits, next.logs),
      journalCount: 0,
    };
    const unlocked = new Set(next.titles.map((t) => t.code));
    for (const t of evaluateTitles(ctx, unlocked)) {
      await unlockTitle(t.code);
      notify({
        kind: 'TITLE ACQUIRED', huge: t.name.toUpperCase(),
        lead: t.detail, fine: 'Equipped automatically. Visible on your status window.',
      });
    }
  }, [today, index, player, notify]);

  if (error) {
    return (
      <div className="boot boot--error">
        <p>SYSTEM ERROR — {error}</p>
        <button className="btn" onClick={() => void reload()}>Retry</button>
      </div>
    );
  }
  if (!snapshot) return <div className="boot">LOADING PLAYER DATA…</div>;

  return (
    <Ctx.Provider value={{ snapshot, player, index, today, reload, tickHabit }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSystem(): SystemValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSystem must be used inside <SystemProvider>');
  return v;
}
